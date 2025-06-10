import streamlit as st
import requests
import json
import time
from typing import Dict, Any

API_URL = "http://localhost:8000"  # FastAPI backend URL

st.set_page_config(
    page_title="Agent UI",
    page_icon="🤖",
    layout="wide"
)

# Initialize session state variables
if "session_id" not in st.session_state:
    st.session_state.session_id = None
if "query_submitted" not in st.session_state:
    st.session_state.query_submitted = False
if "agent_results" not in st.session_state:
    st.session_state.agent_results = {}
if "final_answer" not in st.session_state:
    st.session_state.final_answer = None
if "polling_active" not in st.session_state:
    st.session_state.polling_active = False
if "status" not in st.session_state:
    st.session_state.status = "idle"
if "last_result_count" not in st.session_state:
    st.session_state.last_result_count = 0

def submit_query(query: str):
    """Submit a query to the agent API"""
    try:
        response = requests.post(
            f"{API_URL}/query",
            json={"query": query}
        )
        response.raise_for_status()
        data = response.json()
        
        st.session_state.session_id = data["session_id"]
        st.session_state.query_submitted = True
        st.session_state.polling_active = True
        st.session_state.status = "running"
        st.session_state.agent_results = {}
        st.session_state.final_answer = None
        st.session_state.last_result_count = 0
        
        return True
    except Exception as e:
        st.error(f"Error submitting query: {str(e)}")
        return False

def poll_results():
    """Poll for agent results"""
    if not st.session_state.session_id or not st.session_state.polling_active:
        return False
    
    try:
        response = requests.get(f"{API_URL}/session/{st.session_state.session_id}")
        response.raise_for_status()
        data = response.json()
        
        # Check if there are new or updated results
        current_results = data.get("results", {})
        has_changes = False
        
        # Check if results have changed
        if current_results != st.session_state.agent_results:
            has_changes = True
            st.session_state.agent_results = current_results
        
        # Update other session state
        st.session_state.status = data["status"]
        st.session_state.final_answer = data.get("final_answer")
        
        # Stop polling if the agent has completed or encountered an error
        if data["status"] in ["completed", "error"]:
            st.session_state.polling_active = False
            return True  # Force refresh on completion
            
        return has_changes
    except Exception as e:
        st.error(f"Error polling results: {str(e)}")
        st.session_state.polling_active = False
        return False

def reset_session():
    """Reset the session state"""
    st.session_state.session_id = None
    st.session_state.query_submitted = False
    st.session_state.polling_active = False
    st.session_state.status = "idle"
    st.session_state.agent_results = {}
    st.session_state.final_answer = None
    st.session_state.last_result_count = 0

# Page title
st.title("🤖 Agent UI")

# Query input
with st.container():
    st.write("What do you want to solve today?")
    query = st.text_area("Query", height=100, placeholder="Enter your query here...")
    
    col1, col2 = st.columns([1, 5])
    with col1:
        submit_button = st.button("Submit", type="primary", disabled=st.session_state.polling_active)
    with col2:
        if st.session_state.polling_active:
            st.write("Processing query... please wait")
            
    if submit_button and query:
        submit_query(query)

# Results display
if st.session_state.query_submitted:
    # Poll for results if active
    if st.session_state.polling_active:
        has_changes = poll_results()
        # If there are changes, rerun to update the UI
        if has_changes:
            time.sleep(0.3)  # Small delay to avoid too many refreshes
            st.rerun()
    
    # Display session information
    st.write("---")
    st.subheader("Session Information")
    st.write(f"Session ID: `{st.session_state.session_id}`")
    st.write(f"Status: **{st.session_state.status.upper()}**")
    
    # Display intermediate results
    if st.session_state.agent_results:
        st.write("---")
        st.subheader("Intermediate Results")
        
        # Sort results by key to ensure they appear in order
        sorted_results = sorted(st.session_state.agent_results.items(), key=lambda x: x[0])
        
        for key, result in sorted_results:
            # Get tool status and add visual indicator
            status = result.get('status', 'Unknown')
            if status == 'Running':
                status_indicator = "⏳ "
                disabled = True
            elif status == 'Finished':
                status_indicator = "✅ "
                disabled = False
            elif status == 'Error':
                status_indicator = "❌ "
                disabled = False
            else:
                status_indicator = "ℹ️ "
                disabled = False
                
            # Create expander with status indicator
            tool_label = f"Tool: {result.get('tool', 'Unknown')} - {status_indicator}{status}"
            
            with st.expander(tool_label, expanded=False):
                if result.get('result') == "Executing...":
                    st.info("Tool is currently executing...")
                else:
                    st.code(result.get('result', 'No result'))
    
    # Display final answer
    if st.session_state.final_answer:
        st.write("---")
        st.subheader("Final Answer")
        st.success(st.session_state.final_answer)
        
        # Reset button
        if st.button("Start New Query"):
            reset_session()
            st.rerun()
    
    # Auto-refresh while polling is active
    if st.session_state.polling_active:
        st.empty()  # Create an empty element
        time.sleep(1)  # Wait 1 second
        st.rerun()  # Rerun the app to update

# Footer
st.write("---")
st.caption("Agent UI powered by FastAPI and Streamlit") 