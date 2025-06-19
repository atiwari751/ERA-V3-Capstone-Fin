from fastapi import FastAPI, BackgroundTasks, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import asyncio
from typing import Dict, Any, List, Optional
import subprocess
import sys
import os
import datetime
import uuid
import json
import requests
import time
import re

# Import directly from agent's dependencies instead of importing agent module
from perception import extract_perception
from memory import MemoryManager, MemoryItem
from decision import generate_plan
from action import execute_tool
from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client

# Import scheme service for integration
from scheme_service import scheme_service

app = FastAPI(title="Agent API")

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins in development
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Store sessions and their results
sessions = {}

# MCP server process management
mcp_server_process = None

# Scheme API URL
SCHEME_API_URL = "http://localhost:8002"

def log(stage: str, msg: str):
    """Logging function similar to agent.py"""
    now = datetime.datetime.now().strftime("%H:%M:%S")
    print(f"[{now}] [{stage}] {msg}")

def start_mcp_server():
    """Start the MCP server as a subprocess"""
    global mcp_server_process
    if mcp_server_process is None or mcp_server_process.poll() is not None:
        print("Starting MCP server...")
        try:
            # Use absolute path to the Python executable and script
            python_exe = sys.executable
            script_path = os.path.join(os.getcwd(), "mcp-server.py")
            
            # Ensure the script exists
            if not os.path.exists(script_path):
                print(f"ERROR: MCP server script not found at {script_path}")
                return False
                
            # Start the process with stdout and stderr redirected to files for debugging
            log_dir = os.path.join(os.getcwd(), "logs")
            os.makedirs(log_dir, exist_ok=True)
            
            stdout_file = open(os.path.join(log_dir, "mcp_stdout.log"), "w")
            stderr_file = open(os.path.join(log_dir, "mcp_stderr.log"), "w")
            
            mcp_server_process = subprocess.Popen(
                [python_exe, script_path],
                cwd=os.getcwd(),
                stdout=stdout_file,
                stderr=stderr_file,
                # Pass environment variables
                env=os.environ.copy()
            )
            
            # Wait a moment to ensure the server starts
            time.sleep(2)
            
            # Check if the process is still running
            if mcp_server_process.poll() is not None:
                print(f"ERROR: MCP server failed to start. Exit code: {mcp_server_process.returncode}")
                print("Check logs in the logs directory for details.")
                return False
                
            print(f"MCP server started with PID {mcp_server_process.pid}")
            return True
        except Exception as e:
            print(f"ERROR starting MCP server: {e}")
            import traceback
            traceback.print_exc()
            return False
    return True

def stop_mcp_server():
    """Stop the MCP server subprocess"""
    global mcp_server_process
    if mcp_server_process is not None:
        print("Stopping MCP server...")
        try:
            mcp_server_process.terminate()
            mcp_server_process.wait(timeout=5)
            print("MCP server stopped")
        except Exception as e:
            print(f"Error stopping MCP server: {e}")
            if mcp_server_process.poll() is None:
                mcp_server_process.kill()
        mcp_server_process = None

class QueryRequest(BaseModel):
    query: str

class QueryResponse(BaseModel):
    session_id: str
    message: str

class SessionStatusResponse(BaseModel):
    status: str
    results: Optional[Dict[str, Any]] = None
    final_answer: Optional[str] = None
    schemes: Optional[List[Dict[str, Any]]] = None

async def process_agent_directly(session_id: str, query: str):
    """Process an agent query directly without using agent.py module"""
    try:
        # Make sure we have a session record
        if session_id not in sessions:
            sessions[session_id] = {
                "status": "initializing",
                "results": {},
                "final_answer": None,
                "schemes": []
            }
        
        # Define constants
        max_steps = 30
        
        # Ensure MCP server is running before we try to connect to it
        start_mcp_server()
        
        # Connect to MCP server
        print("[API] Starting agent processing...")
        print(f"[API] Current working directory: {os.getcwd()}")
        
        # Create new server parameters for this session
        server_params = StdioServerParameters(
            command="python",
            args=["mcp-server.py"],
            cwd="./.",
            env=os.environ
        )
        
        # Connect to MCP server
        try:
            async with stdio_client(server_params) as (read, write):
                print("[API] Connection established, creating session...")
                
                async with ClientSession(read, write) as session:
                    print("[API] Session created, initializing...")
                    
                    # Initialize the session
                    await session.initialize()
                    print("[API] MCP session initialized")
                    
                    # Get available tools
                    tools_result = await session.list_tools()
                    tools = tools_result.tools
                    tool_descriptions = "\n".join(
                        f"- {tool.name}: {getattr(tool, 'description', 'No description')}" 
                        for tool in tools
                    )
                    
                    log("agent", f"{len(tools)} tools loaded")
                    
                    # Initialize memory and tracking variables
                    memory = MemoryManager()
                    memory_session_id = f"session-{int(datetime.datetime.now().timestamp())}"
                    user_input = query  # Store original intent
                    original_query = query
                    step = 0
                    results_so_far = {}  # Store important results
                    
                    # Update session status to running
                    sessions[session_id]["status"] = "running"
                    
                    # Start the agent loop
                    while step < max_steps:
                        log("loop", f"Step {step + 1} started")
                        
                        # Add accumulated results to the user input for better context
                        context_input = user_input
                        if results_so_far:
                            context_input += "\n\nPrevious results: " + ", ".join(
                                [f"{k}: {v}" for k, v in results_so_far.items()]
                            )
                        
                        # Get perception
                        perception = extract_perception(context_input)
                        log("perception", f"Intent: {perception.intent}, Tool hint: {perception.tool_hint}")
                        
                        # Get memory
                        retrieved = memory.retrieve(
                            query=context_input, 
                            top_k=5, 
                            session_filter=memory_session_id
                        )
                        log("memory", f"Retrieved {len(retrieved)} relevant memories")
                        
                        # Generate plan
                        plan = generate_plan(
                            perception, 
                            retrieved, 
                            tool_descriptions=tool_descriptions
                        )
                        log("plan", f"Plan generated: {plan}")
                        
                        # Check for final answer
                        if plan.startswith("FINAL_ANSWER:"):
                            final_answer = plan.replace("FINAL_ANSWER:", "").strip()
                            log("agent", f"✅ FINAL RESULT: {final_answer}")
                            sessions[session_id]["status"] = "completed"
                            sessions[session_id]["final_answer"] = final_answer
                            
                            break
                        
                        # Execute tool
                        try:
                            # First, create a placeholder for the tool with "Running" status
                            tool_name = plan.strip().split('(')[0] if '(' in plan else plan.strip()
                            
                            # Add to session results with Running status
                            sessions[session_id]["results"][f"tool_{step}"] = {
                                "tool": tool_name,
                                "result": "Executing...",
                                "status": "Running"
                            }
                            
                            # Small delay to allow frontend to pick up the "Running" status
                            await asyncio.sleep(0.5)
                            
                            # Actually execute the tool
                            result = await execute_tool(session, tools, plan)
                            log("tool", f"{result.tool_name} returned: {result.result}")
                            
                            # Check if this is an AiForm tool call
                            if "ai_form_schemer" in result.tool_name.lower():
                                try:
                                    # Extract input parameters from the arguments
                                    if isinstance(result.arguments, dict) and 'input' in result.arguments:
                                        # Get the input parameters
                                        input_params = result.arguments['input']
                                        
                                        # Create a scheme with these parameters
                                        scheme_data = {
                                            "extents_x": input_params.get('extents_x'),
                                            "extents_y": input_params.get('extents_y'),
                                            "grid_spacing_x": input_params.get('grid_spacing_x'),
                                            "grid_spacing_y": input_params.get('grid_spacing_y'),
                                            "no_of_floors": input_params.get('no_of_floors')
                                        }
                                        
                                        # Extract evaluation metrics from the result
                                        if isinstance(result.result, str):
                                            try:
                                                # Parse JSON from result
                                                json_match = re.search(r'\{.*\}', result.result)
                                                if json_match:
                                                    json_data = json.loads(json_match.group(0))
                                                    # Add evaluation metrics to scheme_data
                                                    for key in ["steel_tonnage", "column_size", "structural_depth", "concrete_tonnage", "trustworthy"]:
                                                        if key in json_data:
                                                            scheme_data[key] = json_data[key]
                                            except Exception as e:
                                                log("error", f"Failed to parse evaluation metrics from result: {e}")
                                        
                                    # Create the scheme
                                    new_scheme = scheme_service.create_scheme_from_agent_data(scheme_data)
                                    
                                    # Add to session schemes
                                    if "schemes" not in sessions[session_id]:
                                        sessions[session_id]["schemes"] = []
                                    
                                    scheme_dict = new_scheme.dict()
                                    sessions[session_id]["schemes"].append(scheme_dict)
                                    log("schemes", f"Created new scheme from AiForm tool: {new_scheme.id}")
                                except Exception as e:
                                    log("error", f"Failed to create scheme from AiForm: {e}")
                            
                            # Update the result in session with completed status
                            sessions[session_id]["results"][f"tool_{step}"] = {
                                "tool": result.tool_name,
                                "result": str(result.result),
                                "status": "Finished"
                            }
                            
                            # Process result for scheme creation
                            try:
                                # Extract scheme data from tool results
                                scheme_data = {}
                                
                                # Case 1: ai_form_schemer tool (already handled above)
                                if result.tool_name == "ai_form_schemer":
                                    # Already handled above, no need to duplicate
                                    pass
                                
                                # Case 2: Extract from any tool result that might contain building parameters
                                elif isinstance(result.result, str):
                                    # Look for common building parameters in the result string
                                    param_patterns = {
                                        "extents_x": r'(?:extents?[_\s-]*x|width|building[_\s]*width)[=:\s]+(\d+(?:\.\d+)?)',
                                        "extents_y": r'(?:extents?[_\s-]*y|depth|building[_\s]*depth)[=:\s]+(\d+(?:\.\d+)?)',
                                        "grid_spacing_x": r'(?:grid[_\s-]*spacing[_\s-]*x)[=:\s]+(\d+(?:\.\d+)?)',
                                        "grid_spacing_y": r'(?:grid[_\s-]*spacing[_\s-]*y)[=:\s]+(\d+(?:\.\d+)?)',
                                        "no_of_floors": r'(?:floors|no[_\s]*of[_\s]*floors|number[_\s]*of[_\s]*floors|stories|storeys)[=:\s]+(\d+(?:\.\d+)?)'
                                    }
                                    
                                    # Search for each parameter in the result string
                                    for param, pattern in param_patterns.items():
                                        match = re.search(pattern, result.result, re.IGNORECASE)
                                        if match:
                                            scheme_data[param] = match.group(1)
                                    
                                    # Also try to extract JSON from the result
                                    json_match = re.search(r'\{.*\}', result.result)
                                    if json_match:
                                        try:
                                            json_data = json.loads(json_match.group(0))
                                            # Extract building parameters if they exist
                                            for key in ["extents_x", "extents_y", "grid_spacing_x", "grid_spacing_y", "no_of_floors"]:
                                                if key in json_data:
                                                    scheme_data[key] = json_data[key]
                                            
                                            # Also check for nested parameters
                                            if "parameters" in json_data and isinstance(json_data["parameters"], dict):
                                                for key, value in json_data["parameters"].items():
                                                    scheme_data[key] = value
                                            
                                            # Check for evaluations too
                                            if "evaluations" in json_data and isinstance(json_data["evaluations"], dict):
                                                for key, value in json_data["evaluations"].items():
                                                    scheme_data[key] = value
                                                    
                                            # Check for building_scheme
                                            if "building_scheme" in json_data and isinstance(json_data["building_scheme"], dict):
                                                for key, value in json_data["building_scheme"].items():
                                                    scheme_data[key] = value
                                        except:
                                            pass
                                
                                # Case 3: Check for scheme data in the final answer text
                                elif result.tool_name == "final_answer" and isinstance(result.result, str):
                                    # Look for scheme patterns in the final answer
                                    scheme_patterns = [
                                        r'Scheme\s+\d+:\s+extents_x=(\d+(?:\.\d+)?),\s+extents_y=(\d+(?:\.\d+)?),\s+.*?no_of_floors=(\d+)',
                                        r'extents_x=(\d+(?:\.\d+)?),\s+extents_y=(\d+(?:\.\d+)?),\s+.*?no_of_floors=(\d+)'
                                    ]
                                    
                                    for pattern in scheme_patterns:
                                        matches = re.findall(pattern, result.result, re.IGNORECASE)
                                        for i, match in enumerate(matches):
                                            if len(match) >= 3:
                                                scheme_data = {
                                                    "extents_x": match[0],
                                                    "extents_y": match[1],
                                                    "no_of_floors": match[2]
                                                }
                                                
                                                # Create scheme from parameters
                                                new_scheme = scheme_service.create_scheme_from_agent_data(scheme_data)
                                                
                                                # Add to session schemes
                                                if "schemes" not in sessions[session_id]:
                                                    sessions[session_id]["schemes"] = []
                                                
                                                scheme_dict = new_scheme.dict()
                                                sessions[session_id]["schemes"].append(scheme_dict)
                                                log("schemes", f"Created new scheme from final answer: {new_scheme.id}")
                                
                                # Create a new scheme if we have enough parameters
                                required_params = ["extents_x", "extents_y"]
                                if any(param in scheme_data for param in required_params) and len(scheme_data) >= 2:
                                    # Set defaults for missing parameters
                                    if "grid_spacing_x" not in scheme_data:
                                        scheme_data["grid_spacing_x"] = 6
                                    if "grid_spacing_y" not in scheme_data:
                                        scheme_data["grid_spacing_y"] = 6
                                    if "no_of_floors" not in scheme_data:
                                        scheme_data["no_of_floors"] = 3
                                        
                                    # Create scheme from parameters
                                    new_scheme = scheme_service.create_scheme_from_agent_data(scheme_data)
                                    
                                    # Add to session schemes
                                    if "schemes" not in sessions[session_id]:
                                        sessions[session_id]["schemes"] = []
                                    
                                    scheme_dict = new_scheme.dict()
                                    sessions[session_id]["schemes"].append(scheme_dict)
                                    log("schemes", f"Created new scheme from tool result: {new_scheme.id}")
                            except Exception as e:
                                log("error", f"Failed to create scheme from tool result: {e}")
                            
                            # Store important results based on tool type
                            if result.tool_name in ['add', 'subtract', 'multiply', 'divide']:
                                results_so_far[f"math_{step}"] = result.result
                            elif result.tool_name == 'search_documents':
                                if isinstance(result.result, list) and result.result:
                                    query_key = str(result.arguments).replace(" ", "_")[:30]
                                    results_so_far[f"search_{query_key}"] = f"Retrieved information about: {result.arguments}"
                                    
                                    search_summary = f"Found information about {result.arguments}"
                                    memory.add(MemoryItem(
                                        text=f"SEARCH SUMMARY: {search_summary}",
                                        type="fact",
                                        tool_name="search_summary",
                                        user_query=user_input,
                                        tags=["search_summary"],
                                        session_id=memory_session_id
                                    ))
                            elif result.tool_name.startswith('search_') or result.tool_name.startswith('get_'):
                                param_key = str(result.arguments).replace(" ", "_")[:30]
                                results_so_far[f"{result.tool_name}_{param_key}"] = f"Retrieved data about {result.arguments}"
                                
                                memory.add(MemoryItem(
                                    text=f"RETRIEVAL SUMMARY: Used {result.tool_name} to get information about {result.arguments}",
                                    type="fact",
                                    tool_name=result.tool_name,
                                    user_query=user_input,
                                    tags=["retrieval_summary"],
                                    session_id=memory_session_id
                                ))
                            
                            # Add tool result to memory
                            memory.add(MemoryItem(
                                text=f"Tool call: {result.tool_name} with {result.arguments}, got: {result.result}",
                                type="tool_output",
                                tool_name=result.tool_name,
                                user_query=user_input,
                                tags=[result.tool_name],
                                session_id=memory_session_id
                            ))
                            
                            # Set up for the next iteration
                            user_input = f"Original task: {original_query}\nPrevious steps: {results_so_far}\nWhat should I do next?"
                            
                        except Exception as e:
                            error_msg = f"Tool execution failed: {e}"
                            log("error", error_msg)
                            
                            # Update the result with error status
                            sessions[session_id]["results"][f"tool_{step}"] = {
                                "tool": tool_name,
                                "result": error_msg,
                                "status": "Error"
                            }
                            
                            sessions[session_id]["status"] = "error"
                            sessions[session_id]["error"] = error_msg
                            break
                        
                        step += 1
                    
                    # If we reached the maximum number of steps without a final answer
                    if step >= max_steps and sessions[session_id]["status"] == "running":
                        sessions[session_id]["status"] = "completed"
                        sessions[session_id]["final_answer"] = "Reached maximum number of steps without finding a final answer."
        
        except Exception as e:
            error_msg = f"Session processing error: {e}"
            print(error_msg)
            import traceback
            traceback.print_exc()
            sessions[session_id]["status"] = "error"
            sessions[session_id]["error"] = error_msg
    
    except Exception as e:
        error_msg = f"Overall agent processing error: {e}"
        print(error_msg)
        import traceback
        traceback.print_exc()
        sessions[session_id]["status"] = "error"
        sessions[session_id]["error"] = error_msg

# Helper function to run agent in background
async def run_agent_task(session_id: str, query: str):
    """Run the agent processing in a background task"""
    try:
        # Initialize session
        sessions[session_id] = {
            "status": "initializing",
            "results": {},
            "final_answer": None,
            "schemes": []
        }
        
        # Process the agent directly
        await process_agent_directly(session_id, query)
        
    except Exception as e:
        error_msg = f"Error running agent task: {e}"
        print(error_msg)
        sessions[session_id]["status"] = "error"
        sessions[session_id]["error"] = error_msg

@app.post("/query", response_model=QueryResponse)
async def create_query(request: QueryRequest, background_tasks: BackgroundTasks):
    session_id = str(uuid.uuid4())
    
    # Start agent processing in background
    background_tasks.add_task(run_agent_task, session_id, request.query)
    
    return {"session_id": session_id, "message": "Query is being processed"}

@app.get("/session/{session_id}", response_model=SessionStatusResponse)
async def get_session_status(session_id: str):
    if session_id not in sessions:
        raise HTTPException(status_code=404, detail="Session not found")
        
    session_data = sessions[session_id]
    return {
        "status": session_data["status"],
        "results": session_data["results"],
        "final_answer": session_data["final_answer"],
        "schemes": session_data.get("schemes", [])
    }

@app.get("/schemes", response_model=List[Dict[str, Any]])
async def get_schemes():
    """Get all schemes from the scheme service"""
    schemes = scheme_service.get_schemes()
    return [scheme.dict() for scheme in schemes]

@app.post("/schemes/clear")
async def clear_schemes():
    """Clear all schemes"""
    scheme_service.clear_schemes()
    return {"message": "All schemes cleared"}

@app.get("/health")
async def health_check():
    return {"status": "healthy"}

# Handle startup
@app.on_event("startup")
async def startup_event():
    # Start MCP server when API starts
    start_mcp_server()

# Handle shutdown
@app.on_event("shutdown")
async def shutdown_event():
    # Stop MCP server when API stops
    stop_mcp_server()

if __name__ == "__main__":
    import uvicorn
    try:
        # Start MCP server before starting API
        start_mcp_server()
        # Run FastAPI server without reload to avoid duplicate MCP processes
        uvicorn.run("api:app", host="0.0.0.0", port=8001, reload=False)
    finally:
        # Ensure MCP server is stopped when API exits
        stop_mcp_server() 