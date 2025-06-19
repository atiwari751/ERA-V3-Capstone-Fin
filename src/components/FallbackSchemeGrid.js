import React, { useState, useRef, useEffect } from 'react';
import './FallbackSchemeGrid.css';

// Component for displaying scheme details in a side panel
const SchemeSidePanel = ({ scheme, isOpen, onClose }) => {
  if (!scheme || !isOpen) return null;

  const formatKey = (key) => {
    if (!key) return '';
    return key
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  return (
    <div className="scheme-side-panel-fallback">
      <div className="side-panel-header-fallback">
        <h2>Scheme {scheme.id || ''} Details</h2>
        <button className="close-panel-button-fallback" onClick={onClose}>×</button>
      </div>
      
      <div className="side-panel-content-fallback">
        {/* Parameters Section */}
        <div className="details-section-fallback">
          <h3>Parameters</h3>
          <div className="details-list-fallback">
            {scheme.parameters && Object.keys(scheme.parameters).length > 0 ? (
              Object.entries(scheme.parameters).map(([key, value]) => (
                <div className="detail-item-fallback" key={key}>
                  <div className="detail-name-fallback">{formatKey(key)}</div>
                  <div className="detail-value-fallback">{String(value)}</div>
                </div>
              ))
            ) : (
              <div className="detail-item-fallback">
                <div className="detail-name-fallback">No parameters available</div>
                <div className="detail-value-fallback">-</div>
              </div>
            )}
          </div>
        </div>
        
        {/* Evaluations Section */}
        <div className="details-section-fallback">
          <h3>Evaluations</h3>
          <div className="details-list-fallback">
            {scheme.evaluations && Object.keys(scheme.evaluations).length > 0 ? (
              Object.entries(scheme.evaluations).map(([key, value]) => (
                <div className="detail-item-fallback" key={key}>
                  <div className="detail-name-fallback">{formatKey(key)}</div>
                  <div className="detail-value-fallback">{String(value)}</div>
                </div>
              ))
            ) : (
              <div className="detail-item-fallback">
                <div className="detail-name-fallback">No evaluations available</div>
                <div className="detail-value-fallback">-</div>
              </div>
            )}
          </div>
        </div>
        
        {/* Visualization Properties Section */}
        <div className="details-section-fallback">
          <h3>Visualization Properties</h3>
          <div className="details-list-fallback">
            <div className="detail-item-fallback">
              <div className="detail-name-fallback">Width</div>
              <div className="detail-value-fallback">{scheme.width || 'Default'}</div>
            </div>
            <div className="detail-item-fallback">
              <div className="detail-name-fallback">Height</div>
              <div className="detail-value-fallback">{scheme.height || 'Default'}</div>
            </div>
            <div className="detail-item-fallback">
              <div className="detail-name-fallback">Depth</div>
              <div className="detail-value-fallback">{scheme.depth || 'Default'}</div>
            </div>
            <div className="detail-item-fallback">
              <div className="detail-name-fallback">Color</div>
              <div className="detail-value-fallback">
                <span className="color-preview-fallback" style={{ backgroundColor: scheme.color || '#cccccc' }}></span>
                {scheme.color || 'Default'}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Interactive cuboid component
const SchemeCuboid = ({ scheme, index, onClick }) => {
  const [hovered, setHovered] = useState(false);
  const [rotation, setRotation] = useState({ x: 20, y: 30 });
  const cuboidRef = useRef(null);
  
  // Handle mouse interactions
  const handleMouseEnter = () => {
    setHovered(true);
  };
  
  const handleMouseLeave = () => {
    setHovered(false);
  };
  
  // Get dimensions from scheme, with fallbacks
  const width = parseFloat(scheme.width) || 30;
  const height = parseFloat(scheme.height) || 9;
  const depth = parseFloat(scheme.depth) || 24;
  
  // Scale factors to keep cuboids reasonably sized in the UI
  const maxDimension = Math.max(width, height, depth);
  const scaleFactor = 100 / maxDimension; // Base size of 100px for largest dimension
  
  // Scaled dimensions
  const scaledWidth = width * scaleFactor;
  const scaledHeight = height * scaleFactor;
  const scaledDepth = depth * scaleFactor;
  
  // Determine color and styles
  const color = scheme.color || "#4287f5";
  const hoverScale = hovered ? 1.05 : 1;
  
  // Create a proper isometric view with 3 visible faces
  return (
    <div 
      className="scheme-frame-fallback" 
      onClick={() => onClick(scheme, index)}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div className="scheme-title-fallback">Scheme {scheme.id}</div>
      <div className="scheme-visual-container">
        <div 
          ref={cuboidRef}
          className="cuboid-container"
          style={{
            transform: `rotateX(${rotation.x}deg) rotateY(${rotation.y}deg) scale(${hoverScale})`,
          }}
        >
          {/* Top face */}
          <div 
            className="cuboid-face cuboid-face-top"
            style={{
              width: `${scaledWidth}px`,
              height: `${scaledDepth}px`,
              transform: `rotateX(90deg) translateZ(${scaledHeight/2}px)`,
              backgroundColor: `${color}`,
            }}
          />
          
          {/* Front face */}
          <div 
            className="cuboid-face cuboid-face-front"
            style={{
              width: `${scaledWidth}px`,
              height: `${scaledHeight}px`,
              transform: `translateZ(${scaledDepth/2}px)`,
              backgroundColor: `${color}`,
            }}
          />
          
          {/* Right face */}
          <div 
            className="cuboid-face cuboid-face-right"
            style={{
              width: `${scaledDepth}px`,
              height: `${scaledHeight}px`,
              transform: `rotateY(90deg) translateZ(${scaledWidth/2}px)`,
              backgroundColor: `${color}`,
            }}
          />
        </div>
        
        {/* Display dimensions label */}
        <div className="scheme-dimensions-label">
          {width}m × {depth}m × {height}m
        </div>
      </div>
    </div>
  );
};

// Empty state component
const EmptyState = () => {
  return (
    <div className="empty-state-fallback">
      <div className="empty-state-content-fallback">
        <h3>No Schemes Available</h3>
        <p>Enter a query to generate building schemes.</p>
        <p>Try something like: "Generate a building scheme with 5 floors"</p>
      </div>
    </div>
  );
};

// Main grid component
const FallbackSchemeGrid = ({ schemes = [] }) => {
  const [selectedScheme, setSelectedScheme] = useState(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  // Close details panel when schemes change
  useEffect(() => {
    if (selectedScheme) {
      // Check if the selected scheme still exists
      const schemeExists = schemes.some(scheme => scheme.id === selectedScheme.id);
      if (!schemeExists) {
        setSelectedScheme(null);
        setIsDetailsOpen(false);
      }
    }
  }, [schemes, selectedScheme]);

  const handleSchemeClick = (scheme, index) => {
    const safeScheme = {
      ...scheme
    };
    setSelectedScheme(safeScheme);
    setIsDetailsOpen(true);
  };

  const handleClose = () => {
    setIsDetailsOpen(false);
  };

  if (!schemes || schemes.length === 0) {
    return <EmptyState />;
  }

  return (
    <div className="scheme-grid-container-fallback">
      <div className="scheme-grid-fallback">
        {schemes.map((scheme, index) => (
          <SchemeCuboid 
            key={`scheme-${scheme.id || index}`} 
            scheme={scheme} 
            index={index}
            onClick={handleSchemeClick}
          />
        ))}
      </div>
      
      <SchemeSidePanel 
        scheme={selectedScheme}
        isOpen={isDetailsOpen}
        onClose={handleClose}
      />
    </div>
  );
};

export default FallbackSchemeGrid; 