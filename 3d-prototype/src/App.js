import React, { useState, useEffect, Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment } from '@react-three/drei';
import axios from 'axios';
import './App.css';
import CuboidModel from './components/CuboidModel';
import AgentSession from './components/AgentSession';
import mockAgentService from './services/mockAgentService';
import './components/AgentSession.css';

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
          <div className="controls">
            <h3>3D Visualization</h3>
            <p>Use mouse to rotate, scroll to zoom</p>
            <p>Click on cuboids to animate</p>
          </div>
          
          <Canvas camera={{ position: [0, 2, 10], fov: 60 }}>
            <ambientLight intensity={0.5} />
            <directionalLight position={[10, 10, 5]} intensity={1} />
            <directionalLight position={[-10, -10, -5]} intensity={0.5} />
            
            <Suspense fallback={null}>
              <Environment preset="city" />
              
              {/* Render each cuboid from the data */}
              {cuboids.map((cuboid) => (
                <CuboidModel 
                  key={cuboid.id}
                  width={cuboid.width}
                  height={cuboid.height}
                  depth={cuboid.depth}
                  position={[cuboid.position_x, cuboid.position_y, cuboid.position_z]}
                  color={cuboid.color}
                />
              ))}
              
              {/* Ground plane */}
              <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1, 0]} receiveShadow>
                <planeGeometry args={[100, 100]} />
                <shadowMaterial opacity={0.4} />
              </mesh>
            </Suspense>
            
            <OrbitControls />
          </Canvas>
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