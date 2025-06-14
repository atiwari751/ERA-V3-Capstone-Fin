import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';
import SchemeGrid from './components/SchemeGrid';
import AgentSession from './components/AgentSession';
import mockAgentService from './services/mockAgentService';
import './components/AgentSession.css';
import './components/SchemeGrid.css';

// API URL for the backend
const API_URL = "http://localhost:8002";

function App() {
  const [cuboids, setCuboids] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [userPrompt, setUserPrompt] = useState('');
  
  // Agent session state
  const [sessionId, setSessionId] = useState(null);
  const [sessionStatus, setSessionStatus] = useState('idle');
  const [sessionResults, setSessionResults] = useState({});
  const [finalAnswer, setFinalAnswer] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Fetch cuboid data from the backend
  useEffect(() => {
    const fetchCuboids = async () => {
      try {
        const response = await axios.get(`${API_URL}/cuboids`);
        setCuboids(response.data);
        setLoading(false);
      } catch (err) {
        console.error("Error fetching cuboid data:", err);
        setError("Failed to load 3D models. Please try again later.");
        setLoading(false);
      }
    };

    fetchCuboids();
  }, []);

  // Handle user prompt submission
  const handlePromptSubmit = async (e) => {
    e.preventDefault();
    
    if (!userPrompt.trim() || isProcessing) return;
    
    setIsProcessing(true);
    
    try {
      // Process the query with the mock agent service
      await mockAgentService.processQuery(userPrompt, (update) => {
        setSessionId(update.sessionId);
        setSessionStatus(update.status);
        setSessionResults(update.results);
        setFinalAnswer(update.finalAnswer);
      });
    } catch (error) {
      console.error("Error processing query:", error);
    } finally {
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
  };

  if (loading) {
    return <div className="loading">Loading 3D models...</div>;
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
            {/* Use the SchemeGrid component */}
            <SchemeGrid schemes={cuboids} />
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