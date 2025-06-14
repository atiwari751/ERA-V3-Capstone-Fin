import React, { useState, useEffect, Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment } from '@react-three/drei';
import axios from 'axios';
import './App.css';
import CuboidModel from './components/CuboidModel';

// API URL for the backend
const API_URL = "http://localhost:8002";

function App() {
  const [cuboids, setCuboids] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [userPrompt, setUserPrompt] = useState('');

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

  const handlePromptSubmit = (e) => {
    e.preventDefault();
    console.log("User prompt submitted:", userPrompt);
    // Here you would normally send the prompt to the agent
    // For now, we'll just log it and clear the input
    setUserPrompt('');
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
            {/* This area will contain agent responses and step tracking */}
            <div className="placeholder-content">
              {/* Placeholder for agent responses */}
            </div>
          </div>
          
          {/* User Input Area */}
          <div className="user-input-area">
            <form onSubmit={handlePromptSubmit}>
              <input
                type="text"
                value={userPrompt}
                onChange={(e) => setUserPrompt(e.target.value)}
                placeholder="Enter your prompt here..."
              />
              <button type="submit">Send</button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App; 