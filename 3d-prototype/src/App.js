import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';
import SchemeGrid from './components/SchemeGrid';
import ChatInterface from './components/ChatInterface';
import mockAgentService from './services/mockAgentService';
import './components/ChatInterface.css';
import './components/SchemeGrid.css';

// API URL for the backend
const API_URL = "http://localhost:8002";

function App() {
  const [cuboids, setCuboids] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
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

  // Handle message from chat interface
  const handleSendMessage = async (message, onUpdate) => {
    if (!message.trim() || isProcessing) return;
    
    setIsProcessing(true);
    
    try {
      // Process the query with the mock agent service
      await mockAgentService.processQuery(message, onUpdate);
    } catch (error) {
      console.error("Error processing query:", error);
    } finally {
      setIsProcessing(false);
    }
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
          <ChatInterface 
            onSendMessage={handleSendMessage}
            isProcessing={isProcessing}
          />
        </div>
      </div>
    </div>
  );
}

export default App; 