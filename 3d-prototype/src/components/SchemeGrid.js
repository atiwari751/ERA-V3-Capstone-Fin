import React from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment } from '@react-three/drei';
import CuboidModel from './CuboidModel';

// Component for a single scheme with frame and title
const SchemeFrame = ({ scheme, index }) => {
  return (
    <div className="scheme-frame">
      <div className="scheme-title">Scheme {index + 1}</div>
      <div className="scheme-canvas-container">
        <Canvas camera={{ position: [0, 2, 5], fov: 50 }}>
          <ambientLight intensity={0.5} />
          <directionalLight position={[5, 5, 5]} intensity={1} />
          <directionalLight position={[-5, -5, -5]} intensity={0.3} />
          
          <CuboidModel 
            width={scheme.width}
            height={scheme.height}
            depth={scheme.depth}
            position={[0, 0, 0]} // Center position for each scheme
            color={scheme.color}
          />
          
          {/* Ground plane */}
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1, 0]} receiveShadow>
            <planeGeometry args={[10, 10]} />
            <shadowMaterial opacity={0.2} />
          </mesh>
          
          <Environment preset="city" />
          <OrbitControls 
            enablePan={false} 
            minDistance={3}
            maxDistance={8}
          />
        </Canvas>
      </div>
    </div>
  );
};

// Main component for the grid of schemes
const SchemeGrid = ({ schemes }) => {
  return (
    <div className="scheme-grid">
      {schemes.map((scheme, index) => (
        <SchemeFrame 
          key={index} 
          scheme={scheme} 
          index={index} 
        />
      ))}
    </div>
  );
};

export default SchemeGrid; 