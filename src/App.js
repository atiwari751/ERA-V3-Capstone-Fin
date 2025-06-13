import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';

const API_URL = "http://localhost:8001"; // FastAPI backend URL

function App() {
  // State variables
  const [query, setQuery] = useState('');
  const [sessionId, setSessionId] = useState(null);
  const [querySubmitted, setQuerySubmitted] = useState(false);
  const [agentResults, setAgentResults] = useState({});
  const [finalAnswer, setFinalAnswer] = useState(null);
  const [pollingActive, setPollingActive] = useState(false);
  const [status, setStatus] = useState('idle');
  
  // Submit query function
  const submitQuery = async () => {
    try {
      const response = await axios.post(`${API_URL}/query`, { query });
      const data = response.data;
      
      setSessionId(data.session_id);
      setQuerySubmitted(true);
      setPollingActive(true);
      setStatus('running');
      setAgentResults({});
      setFinalAnswer(null);
      
      return true;
    } catch (error) {
      console.error("Error submitting query:", error);
      alert(`Error submitting query: ${error.message}`);
      return false;
    }
  };
  
  // Poll results function
  const pollResults = async () => {
    if (!sessionId || !pollingActive) return false;
    
    try {
      const response = await axios.get(`${API_URL}/session/${sessionId}`);
      const data = response.data;
      
      // Check if results have changed
      const currentResults = data.results || {};
      if (JSON.stringify(currentResults) !== JSON.stringify(agentResults)) {
        setAgentResults(currentResults);
      }
      
      // Update other state
      setStatus(data.status);
      setFinalAnswer(data.final_answer);
      
      // Stop polling if the agent has completed or encountered an error
      if (data.status === 'completed' || data.status === 'error') {
        setPollingActive(false);
      }
      
      return true;
    } catch (error) {
      console.error("Error polling results:", error);
      setPollingActive(false);
      return false;
    }
  };
  
  // Reset session function
  const resetSession = () => {
    setSessionId(null);
    setQuerySubmitted(false);
    setPollingActive(false);
    setStatus('idle');
    setAgentResults({});
    setFinalAnswer(null);
  };
  
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
  }, [pollingActive, sessionId]);
  
  // Sort results by key
  const sortedResults = Object.entries(agentResults).sort((a, b) => a[0].localeCompare(b[0]));
  
  return (
    <div className="app">
      <header>
        <h1>🤖 Agent UI</h1>
      </header>
      
      <main>
        <div className="query-container">
          <h2>What do you want to solve today?</h2>
          <textarea
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Enter your query here..."
            rows={5}
            disabled={pollingActive}
          />
          
          <div className="button-row">
            <button 
              className="submit-button" 
              onClick={submitQuery} 
              disabled={pollingActive || !query.trim()}
            >
              Submit
            </button>
            
            {pollingActive && <span>Processing query... please wait</span>}
          </div>
        </div>
        
        {querySubmitted && (
          <div className="results-container">
            <hr />
            <h2>Session Information</h2>
            <p>Session ID: <code>{sessionId}</code></p>
            <p>Status: <strong>{status.toUpperCase()}</strong></p>
            
            {Object.keys(agentResults).length > 0 && (
              <>
                <hr />
                <h2>Intermediate Results</h2>
                
                <div className="results-list">
                  {sortedResults.map(([key, result]) => {
                    // Get tool status and add visual indicator
                    const status = result.status || 'Unknown';
                    let statusIndicator = 'ℹ️';
                    
                    if (status === 'Running') statusIndicator = '⏳';
                    else if (status === 'Finished') statusIndicator = '✅';
                    else if (status === 'Error') statusIndicator = '❌';
                    
                    return (
                      <details key={key} className="result-item">
                        <summary>
                          Tool: {result.tool || 'Unknown'} - {statusIndicator} {status}
                        </summary>
                        <div className="result-content">
                          {result.result === "Executing..." ? (
                            <div className="info-message">Tool is currently executing...</div>
                          ) : (
                            <pre>{result.result || 'No result'}</pre>
                          )}
                        </div>
                      </details>
                    );
                  })}
                </div>
              </>
            )}
            
            {finalAnswer && (
              <>
                <hr />
                <h2>Final Answer</h2>
                <div className="final-answer">
                  {finalAnswer}
                </div>
                
                <button className="reset-button" onClick={resetSession}>
                  Start New Query
                </button>
              </>
            )}
          </div>
        )}
      </main>
      
      <footer>
        <hr />
        <p>Agent UI powered by FastAPI and React</p>
      </footer>
    </div>
  );
}

export default App; 