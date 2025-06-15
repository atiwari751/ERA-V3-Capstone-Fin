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
  const [rotation, setRotation] = useState({ x: 0, y: 0 });
  const [isAnimating, setIsAnimating] = useState(false);
  const cuboidRef = useRef(null);
  
  // Handle mouse interactions
  const handleMouseEnter = () => {
    setHovered(true);
    setIsAnimating(true);
  };
  
  const handleMouseLeave = () => {
    setHovered(false);
    setIsAnimating(false);
    setRotation({ x: 0, y: 0 });
  };
  
  // Animation effect
  React.useEffect(() => {
    let animationFrame;
    
    if (isAnimating) {
      const animate = () => {
        setRotation(prev => ({
          x: prev.x,
          y: prev.y + 0.5
        }));
        animationFrame = requestAnimationFrame(animate);
      };
      
      animationFrame = requestAnimationFrame(animate);
    }
    
    return () => {
      if (animationFrame) {
        cancelAnimationFrame(animationFrame);
      }
    };
  }, [isAnimating]);
  
  // Determine color and styles
  const color = scheme.color || "#4287f5";
  const hoverScale = hovered ? 1.05 : 1;
  const rotateStyle = `rotateX(${rotation.x}deg) rotateY(${rotation.y}deg)`;
  
  return (
    <div 
      className="scheme-frame-fallback" 
      onClick={() => onClick(scheme, index)}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div className="scheme-title-fallback">Scheme {index + 1}</div>
      <div className="scheme-visual-fallback">
        <div 
          ref={cuboidRef}
          className="scheme-cuboid-fallback"
          style={{
            backgroundColor: color,
            transform: `${rotateStyle} scale(${hoverScale})`,
            width: `${Math.min(80, scheme.width * 10)}%`,
            height: `${Math.min(80, scheme.height * 10)}%`,
            transition: 'transform 0.2s ease'
          }}
        >
          {/* Cuboid faces */}
          <div className="cuboid-face front" style={{ backgroundColor: color }}></div>
          <div className="cuboid-face back" style={{ backgroundColor: color, opacity: 0.8 }}></div>
          <div className="cuboid-face right" style={{ backgroundColor: color, opacity: 0.9 }}></div>
          <div className="cuboid-face left" style={{ backgroundColor: color, opacity: 0.9 }}></div>
          <div className="cuboid-face top" style={{ backgroundColor: color, opacity: 0.95 }}></div>
          <div className="cuboid-face bottom" style={{ backgroundColor: color, opacity: 0.7 }}></div>
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
      ...scheme,
      id: scheme.id || index + 1
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