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

# Import directly from agent's dependencies instead of importing agent module
from perception import extract_perception
from memory import MemoryManager, MemoryItem
from decision import generate_plan
from action import execute_tool
from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client

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

def log(stage: str, msg: str):
    """Logging function similar to agent.py"""
    now = datetime.datetime.now().strftime("%H:%M:%S")
    print(f"[{now}] [{stage}] {msg}")

def start_mcp_server():
    """Start the MCP server as a subprocess"""
    global mcp_server_process
    if mcp_server_process is None or mcp_server_process.poll() is not None:
        print("Starting MCP server...")
        mcp_server_process = subprocess.Popen(
            [sys.executable, "mcp-server.py"],
            cwd="./",
            stdout=None,
            stderr=None,
        )
        print(f"MCP server started with PID {mcp_server_process.pid}")
        return True
    return False

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

async def process_agent_directly(session_id: str, query: str):
    """Process an agent query directly without using agent.py module"""
    try:
        # Make sure we have a session record
        if session_id not in sessions:
            sessions[session_id] = {
                "status": "initializing",
                "results": {},
                "final_answer": None,
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
                            
                            # Update the result in session with completed status
                            sessions[session_id]["results"][f"tool_{step}"] = {
                                "tool": result.tool_name,
                                "result": str(result.result),
                                "status": "Finished"
                            }
                            
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
            "final_answer": None
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
        "final_answer": session_data["final_answer"]
    }

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
        uvicorn.run("api:app", host="0.0.0.0", port=8000, reload=False)
    finally:
        # Ensure MCP server is stopped when API exits
        stop_mcp_server() 