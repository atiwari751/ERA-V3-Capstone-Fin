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
        
        return True
    except Exception as e:
        st.error(f"Error submitting query: {str(e)}")
        return False

def poll_results():
    """Poll for agent results"""
    if not st.session_state.session_id or not st.session_state.polling_active:
        return
    
    try:
        response = requests.get(f"{API_URL}/session/{st.session_state.session_id}")
        response.raise_for_status()
        data = response.json()
        
        st.session_state.status = data["status"]
        st.session_state.agent_results = data.get("results", {})
        st.session_state.final_answer = data.get("final_answer")
        
        # Stop polling if the agent has completed or encountered an error
        if data["status"] in ["completed", "error"]:
            st.session_state.polling_active = False
            
    except Exception as e:
        st.error(f"Error polling results: {str(e)}")
        st.session_state.polling_active = False

def reset_session():
    """Reset the session state"""
    st.session_state.session_id = None
    st.session_state.query_submitted = False
    st.session_state.polling_active = False
    st.session_state.status = "idle"
    st.session_state.agent_results = {}
    st.session_state.final_answer = None

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
        poll_results()
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
        
        for key, result in st.session_state.agent_results.items():
            with st.expander(f"Tool: {result.get('tool', 'Unknown')}"):
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

# Footer
st.write("---")
st.caption("Agent UI powered by FastAPI and Streamlit") 