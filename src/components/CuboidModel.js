import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';

const CuboidModel = ({ width = 1, height = 1, depth = 1, position = [0, 0, 0], color = "#4287f5" }) => {
  // Reference to the mesh
  const meshRef = useRef();
  
  // Ensure all values are valid numbers
  const safeWidth = typeof width === 'number' && !isNaN(width) && width > 0 ? width : 1;
  const safeHeight = typeof height === 'number' && !isNaN(height) && height > 0 ? height : 1;
  const safeDepth = typeof depth === 'number' && !isNaN(depth) && depth > 0 ? depth : 1;
  
  // Ensure position is a valid array
  const safePosition = Array.isArray(position) && position.length >= 3 ? 
    position.map(val => typeof val === 'number' && !isNaN(val) ? val : 0) : 
    [0, 0, 0];
  
  // Safe color value
  const safeColor = typeof color === 'string' && color ? color : "#4287f5";
  
  // Animation - gentle rotation
  useFrame((state, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += delta * 0.2; // Rotate slowly around Y axis
    }
  });

  try {
    return (
      <mesh 
        ref={meshRef} 
        position={safePosition}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[safeWidth, safeHeight, safeDepth]} />
        <meshStandardMaterial 
          color={safeColor} 
          roughness={0.5}
          metalness={0.2}
        />
      </mesh>
    );
  } catch (error) {
    console.error("Error rendering CuboidModel:", error);
    // Return a minimal fallback that shouldn't cause errors
    return null;
  }
};

export default CuboidModel; 