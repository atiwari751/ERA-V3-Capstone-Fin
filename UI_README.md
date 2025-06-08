# Agent UI Setup

This project implements a separated backend and frontend architecture for the agent:
- FastAPI backend to run the agent logic
- Streamlit frontend for user interaction
- Standalone MCP server for tools execution

## Setup

1. Install dependencies:
```bash
pip install -r requirements.txt
```

## Running the Application

### Step 1: Start the MCP Server First (Important!)

Start the MCP server in a dedicated terminal:
```bash
python run_mcp_server.py
```

Keep this terminal open during the entire session. The MCP server provides the tooling infrastructure for the agent.

### Step 2: Start the FastAPI Backend

In a separate terminal, start the backend server:
```bash
python api.py
```

This will start the FastAPI server on http://localhost:8000. You can access the API documentation at http://localhost:8000/docs.

### Step 3: Start the Streamlit Frontend

In a third terminal, start the Streamlit frontend:
```bash
streamlit run frontend.py
```

This will start the Streamlit UI, usually on http://localhost:8501.

## Architecture

- `run_mcp_server.py`: Runs the MCP server as a standalone process
- `api.py`: FastAPI backend that runs the agent in the background and provides endpoints for submitting queries and getting results
- `frontend.py`: Streamlit UI that communicates with the backend API
- `agent.py`: Core agent logic that performs the actual tasks

## System Flow

1. User interacts with the Streamlit frontend
2. Frontend sends query to FastAPI backend
3. Backend runs the agent with the query
4. Agent communicates with the MCP server to execute tools
5. Backend sends results back to frontend
6. Frontend displays results to user

## Troubleshooting

If you encounter connection issues, try the following steps:

1. Make sure the MCP server is running first before starting the API
2. If the agent can't connect to MCP, restart all components in the correct order
3. Check that all components are using the same Python environment

## Shutdown Procedure

1. Stop the Streamlit frontend (Ctrl+C)
2. Stop the FastAPI backend (Ctrl+C)
3. Stop the MCP server (Ctrl+C)

## API Endpoints

- `POST /query`: Submit a new query to the agent
- `GET /session/{session_id}`: Get the status and results of a session
- `GET /health`: Health check endpoint

## Features

- Real-time updates of agent progress
- Display of intermediate tool results
- Final answer display
- Session management 