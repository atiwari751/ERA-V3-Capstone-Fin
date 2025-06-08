from fastapi import FastAPI, BackgroundTasks, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import asyncio
from typing import Dict, Any, List, Optional
import agent
import uuid
import json
import subprocess
import os
import signal
import atexit
import sys

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

class QueryRequest(BaseModel):
    query: str

class QueryResponse(BaseModel):
    session_id: str
    message: str

class SessionStatusResponse(BaseModel):
    status: str
    results: Optional[Dict[str, Any]] = None
    final_answer: Optional[str] = None
    
# Helper function to run agent in background
async def run_agent_task(session_id: str, query: str):
    try:
        # Create a queue to get results from the agent
        result_queue = asyncio.Queue()
        sessions[session_id] = {
            "status": "running",
            "results": {},
            "final_answer": None,
            "queue": result_queue
        }
        
        # Monkey patch the log function to capture results
        original_log = agent.log
        
        def patched_log(stage: str, msg: str):
            original_log(stage, msg)
            if stage == "agent" and msg.startswith("✅ FINAL RESULT:"):
                final_answer = msg.replace("✅ FINAL RESULT:", "").strip()
                asyncio.create_task(result_queue.put({"type": "final", "data": final_answer}))
            elif stage == "tool":
                # Extract tool results - this is simplified and may need adjustment
                asyncio.create_task(result_queue.put({"type": "tool_result", "data": msg}))
                
        # Replace the log function temporarily
        agent.log = patched_log
        
        # Run the agent in a separate task
        agent_task = asyncio.create_task(agent.main(query))
        
        # Process results as they come in
        while True:
            try:
                result = await asyncio.wait_for(result_queue.get(), timeout=1.0)
                if result["type"] == "final":
                    sessions[session_id]["status"] = "completed"
                    sessions[session_id]["final_answer"] = result["data"]
                    break
                elif result["type"] == "tool_result":
                    # Parse and store tool results
                    tool_data = result["data"]
                    if "returned:" in tool_data:
                        parts = tool_data.split("returned:")
                        if len(parts) >= 2:
                            tool_name = parts[0].strip()
                            tool_result = parts[1].strip()
                            sessions[session_id]["results"][f"tool_{len(sessions[session_id]['results'])}"] = {
                                "tool": tool_name,
                                "result": tool_result
                            }
            except asyncio.TimeoutError:
                # Check if the agent task is done
                if agent_task.done():
                    if not sessions[session_id]["final_answer"]:
                        sessions[session_id]["status"] = "completed"
                        sessions[session_id]["final_answer"] = "Agent completed without final answer"
                    break
            except Exception as e:
                sessions[session_id]["status"] = "error"
                sessions[session_id]["error"] = str(e)
                break
                
        # Wait for agent to complete
        try:
            await agent_task
        except Exception as e:
            sessions[session_id]["status"] = "error"
            sessions[session_id]["error"] = str(e)
            
        # Restore original log function
        agent.log = original_log
        
    except Exception as e:
        sessions[session_id]["status"] = "error"
        sessions[session_id]["error"] = str(e)

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

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("api:app", host="0.0.0.0", port=8000, reload=True) 