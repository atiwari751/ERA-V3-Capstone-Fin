import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import './App.css';
import FallbackSchemeGrid from './components/FallbackSchemeGrid';
import AgentSession from './components/AgentSession';
import { getAllSchemes } from './services/mockSchemeData';

// API URL for the backend
const API_URL = "http://localhost:8001"; // FastAPI backend URL

function App() {
  // State for schemes/cuboids
  const [schemes, setSchemes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Agent state
  const [userPrompt, setUserPrompt] = useState('');
  const [sessionId, setSessionId] = useState(null);
  const [sessionStatus, setSessionStatus] = useState('idle');
  const [sessionResults, setSessionResults] = useState({});
  const [finalAnswer, setFinalAnswer] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [pollingActive, setPollingActive] = useState(false);

  // Load schemes on component mount
  useEffect(() => {
    try {
      const schemeData = getAllSchemes();
      setSchemes(schemeData);
      setLoading(false);
    } catch (err) {
      console.error("Error loading schemes:", err);
      setError("Failed to load schemes. Please try again later.");
      setLoading(false);
    }
  }, []);

  // Poll results function with useCallback to avoid dependency issues
  const pollResults = useCallback(async () => {
    if (!sessionId || !pollingActive) return false;
    
    try {
      const response = await axios.get(`${API_URL}/session/${sessionId}`);
      const data = response.data;
      
      // Check if results have changed
      const currentResults = data.results || {};
      if (JSON.stringify(currentResults) !== JSON.stringify(sessionResults)) {
        setSessionResults(currentResults);
      }
      
      // Update other state
      setSessionStatus(data.status);
      setFinalAnswer(data.final_answer);
      
      // Stop polling if the agent has completed or encountered an error
      if (data.status === 'completed' || data.status === 'error') {
        setPollingActive(false);
        setIsProcessing(false);
      }
      
      return true;
    } catch (error) {
      console.error("Error polling results:", error);
      setPollingActive(false);
      setIsProcessing(false);
      return false;
    }
  }, [sessionId, pollingActive, sessionResults]);

  // Set up polling effect
  useEffect(() => {
    let interval;
    
    if (pollingActive) {
      interval = setInterval(() => {
        pollResults();
      }, 1000); // Poll every second
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [pollingActive, sessionId, pollResults]);

  // Handle user prompt submission
  const handlePromptSubmit = async (e) => {
    e.preventDefault();
    
    if (!userPrompt.trim() || isProcessing) return;
    
    setIsProcessing(true);
    
    try {
      const response = await axios.post(`${API_URL}/query`, { query: userPrompt });
      const data = response.data;
      
      setSessionId(data.session_id);
      setPollingActive(true);
      setSessionStatus('running');
      setSessionResults({});
      setFinalAnswer(null);
    } catch (error) {
      console.error("Error processing query:", error);
      setIsProcessing(false);
    }
    
    // Clear the input field
    setUserPrompt('');
  };
  
  // Handle starting a new query
  const handleNewQuery = () => {
    setSessionId(null);
    setSessionStatus('idle');
    setSessionResults({});
    setFinalAnswer(null);
    setPollingActive(false);
    setIsProcessing(false);
  };

  if (loading) {
    return <div className="loading">Loading schemes...</div>;
  }

  if (error) {
    return <div className="loading">{error}</div>;
  }

  return (
    <div className="app-container">
      {/* Split layout with visualization area and agent area */}
      <div className="split-layout">
        {/* Visualization Area (Left Side) */}
        <div className="visualization-area">
          <div className="vis-header">
            <h3>3D Visualization</h3>
            <p>Click on a scheme to view its details in a side panel. Click and drag to rotate, scroll to zoom.</p>
          </div>
          
          {/* Add scrollable container */}
          <div className="visualization-content">
            {/* Use the FallbackSchemeGrid component */}
            <FallbackSchemeGrid schemes={schemes} />
          </div>
        </div>
        
        {/* Agent Area (Right Side) */}
        <div className="agent-area">
          <div className="agent-header">
            <h2>AGENT</h2>
          </div>
          
          <div className="agent-content">
            {sessionId ? (
              <AgentSession
                sessionId={sessionId}
                status={sessionStatus}
                results={sessionResults}
                finalAnswer={finalAnswer}
                onNewQuery={handleNewQuery}
              />
            ) : (
              <div className="agent-placeholder">
                <p>Enter a prompt below to start a new session.</p>
                <p>Try queries like "show me a house" or "design an office building".</p>
              </div>
            )}
          </div>
          
          {/* User Input Area */}
          <div className="user-input-area">
            <form onSubmit={handlePromptSubmit}>
              <input
                type="text"
                value={userPrompt}
                onChange={(e) => setUserPrompt(e.target.value)}
                placeholder="Enter your prompt here..."
                disabled={isProcessing}
              />
              <button type="submit" disabled={isProcessing || !userPrompt.trim()}>
                {isProcessing ? "Processing..." : "Send"}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App; 