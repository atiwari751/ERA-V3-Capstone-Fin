# Agent UI Setup

This project implements a separated backend and frontend architecture for the agent:
- FastAPI backend to run the agent logic and MCP server
- Streamlit frontend for user interaction

## Setup

1. Install dependencies:
```bash
pip install -r requirements.txt
```

## Running the Application

### Step 1: Start the FastAPI Backend

Start the backend server:
```bash
python api.py
```

This will start both the MCP server and the FastAPI server on http://localhost:8000. You can access the API documentation at http://localhost:8000/docs.

### Step 2: Start the Streamlit Frontend

In a separate terminal, start the Streamlit frontend:
```bash
streamlit run frontend.py
```

This will start the Streamlit UI, usually on http://localhost:8501.

## Architecture

- `api.py`: FastAPI backend that runs the agent in the background, manages the MCP server, and provides endpoints for submitting queries and getting results
- `frontend.py`: Streamlit UI that communicates with the backend API
- `agent.py`: Original standalone agent (not used in the UI workflow)

## System Flow

1. User interacts with the Streamlit frontend
2. Frontend sends query to FastAPI backend
3. Backend processes the query using agent components
4. Backend communicates with the MCP server to execute tools
5. Backend sends results back to frontend
6. Frontend displays results to user

## Troubleshooting

If you encounter connection issues, try the following steps:

1. Restart the API server first, then the frontend
2. If you get "connection refused" errors, make sure the API server is running
3. Each component should be run in a separate terminal window
4. The FastAPI server needs to be running without reload mode (default when running with `python api.py`)

## Shutdown Procedure

To properly shut down the system:

1. Stop the Streamlit frontend (Ctrl+C)
2. Stop the FastAPI backend (Ctrl+C) - this will also stop the MCP server

## API Endpoints

- `POST /query`: Submit a new query to the agent
- `GET /session/{session_id}`: Get the status and results of a session

## Features

- Real-time updates of agent progress
- Display of intermediate tool results
- Final answer display
- Session management 