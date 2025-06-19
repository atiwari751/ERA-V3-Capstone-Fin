import React, { useState, useEffect, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import CuboidModel from './CuboidModel';
import SchemeSidePanel from './SchemeSidePanel';
import './SchemeGrid.css';

// Error boundary component to catch Three.js errors
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Three.js rendering error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}

// Simple placeholder component to avoid Three.js errors during initial render
const SimpleCuboid = ({ color }) => {
  return (
    <div 
      className="simple-cuboid" 
      style={{ 
        backgroundColor: color || '#4287f5',
        width: '100%',
        height: '100%',
        borderRadius: '8px'
      }}
    />
  );
};

// Component for a single scheme with frame and title
const SchemeFrame = ({ scheme, index, onSchemeClick }) => {
  // Ensure scheme has default values to prevent undefined errors
  const safeScheme = {
    id: index + 1,
    width: 1,
    height: 1,
    depth: 1,
    color: "#4287f5",
    ...(scheme || {})
  };

  // Use a state flag to determine if we should try to render 3D
  const [shouldRender3D, setShouldRender3D] = useState(false);
  const [renderError, setRenderError] = useState(false);

  // After initial render, try to enable 3D
  useEffect(() => {
    // Small delay to ensure the component is fully mounted
    const timer = setTimeout(() => {
      setShouldRender3D(true);
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  const handleError = () => {
    setRenderError(true);
    console.error("Failed to render 3D view for scheme", safeScheme);
  };

  return (
    <div 
      className="scheme-frame" 
      onClick={() => onSchemeClick(safeScheme, index)}
    >
      <div className="scheme-title">Scheme {safeScheme.id || index + 1}</div>
      <div className="scheme-canvas-container">
        {shouldRender3D && !renderError ? (
          <ErrorBoundary fallback={<SimpleCuboid color={safeScheme.color} />}>
            <React.Suspense fallback={<SimpleCuboid color={safeScheme.color} />}>
              <Canvas camera={{ position: [0, 2, 5], fov: 50 }} onError={handleError}>
                <ambientLight intensity={0.5} />
                <directionalLight position={[5, 5, 5]} intensity={1} />
                
                <CuboidModel 
                  width={Number(safeScheme.width) || 1}
                  height={Number(safeScheme.height) || 1}
                  depth={Number(safeScheme.depth) || 1}
                  position={[0, 0, 0]}
                  color={safeScheme.color || "#4287f5"}
                />
                
                {/* Ground plane */}
                <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1, 0]} receiveShadow>
                  <planeGeometry args={[10, 10]} />
                  <shadowMaterial opacity={0.2} />
                </mesh>
                
                <OrbitControls 
                  enablePan={false} 
                  minDistance={3}
                  maxDistance={8}
                />
              </Canvas>
            </React.Suspense>
          </ErrorBoundary>
        ) : (
          <SimpleCuboid color={safeScheme.color} />
        )}
      </div>
    </div>
  );
};

// Empty state component when no schemes are available
const EmptyState = () => {
  return (
    <div className="empty-state">
      <div className="empty-state-content">
        <h3>No Schemes Available</h3>
        <p>Enter a query to generate building schemes.</p>
        <p>Try something like: "Generate a building scheme with 5 floors"</p>
      </div>
    </div>
  );
};

// Main component for the grid of schemes
const SchemeGrid = ({ schemes = [] }) => {
  const [selectedScheme, setSelectedScheme] = useState(null);
  const [isSidePanelOpen, setIsSidePanelOpen] = useState(false);

  const handleSchemeClick = (scheme, index) => {
    // Make sure the scheme has an ID
    const safeScheme = {
      ...scheme,
      id: scheme.id || index + 1
    };
    setSelectedScheme(safeScheme);
    setIsSidePanelOpen(true);
  };

  const handleCloseSidePanel = () => {
    setIsSidePanelOpen(false);
  };

  // If no schemes, show empty state
  if (!schemes || !Array.isArray(schemes) || schemes.length === 0) {
    return <EmptyState />;
  }

  // Calculate grid layout based on number of schemes
  let gridClassName = "scheme-grid";
  if (schemes.length === 1) {
    gridClassName += " single-scheme";
  } else if (schemes.length === 2) {
    gridClassName += " two-schemes";
  } else if (schemes.length <= 4) {
    gridClassName += " four-schemes";
  }

  return (
    <div className="scheme-grid-container">
      <div className={gridClassName}>
        {schemes.map((scheme, index) => (
          <SchemeFrame 
            key={`scheme-${index}`} 
            scheme={scheme} 
            index={index}
            onSchemeClick={handleSchemeClick}
          />
        ))}
      </div>
      
      <SchemeSidePanel 
        scheme={selectedScheme}
        isOpen={isSidePanelOpen}
        onClose={handleCloseSidePanel}
      />
    </div>
  );
};

export default SchemeGrid; 