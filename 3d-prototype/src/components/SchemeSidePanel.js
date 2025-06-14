import React from 'react';
import './SchemeSidePanel.css';

const SchemeSidePanel = ({ scheme, isOpen, onClose }) => {
  if (!scheme) return null;

  return (
    <div className={`scheme-side-panel ${isOpen ? 'open' : ''}`}>
      <div className="side-panel-header">
        <h2>Scheme {scheme.id} Details</h2>
        <button className="close-panel-button" onClick={onClose}>×</button>
      </div>
      
      <div className="side-panel-content">
        {/* Parameters Section */}
        <div className="details-section">
          <h3>Parameters</h3>
          <div className="details-list">
            <div className="detail-item">
              <div className="detail-name">Grid Spacing X</div>
              <div className="detail-value">{6 + scheme.id - 1}m</div>
            </div>
            <div className="detail-item">
              <div className="detail-name">Grid Spacing Y</div>
              <div className="detail-value">{7 + scheme.id - 1}m</div>
            </div>
            <div className="detail-item">
              <div className="detail-name">Extents X</div>
              <div className="detail-value">{30 + (scheme.id - 1) * 2}m</div>
            </div>
            <div className="detail-item">
              <div className="detail-name">Extents Y</div>
              <div className="detail-value">{24 + (scheme.id - 1) * 2}m</div>
            </div>
            <div className="detail-item">
              <div className="detail-name">No of Floors</div>
              <div className="detail-value">{3 + scheme.id - 1}</div>
            </div>
          </div>
        </div>
        
        {/* Evaluations Section */}
        <div className="details-section">
          <h3>Evaluations</h3>
          <div className="details-list">
            <div className="detail-item">
              <div className="detail-name">Steel Tonnage</div>
              <div className="detail-value">{150 + (scheme.id - 1) * 20} tonnes</div>
            </div>
            <div className="detail-item">
              <div className="detail-name">Column Size</div>
              <div className="detail-value">{300 + (scheme.id - 1) * 25}mm</div>
            </div>
            <div className="detail-item">
              <div className="detail-name">Structural Depth</div>
              <div className="detail-value">{600 + (scheme.id - 1) * 30}mm</div>
            </div>
            <div className="detail-item">
              <div className="detail-name">Concrete Tonnage</div>
              <div className="detail-value">{300 + (scheme.id - 1) * 40} tonnes</div>
            </div>
            <div className="detail-item">
              <div className="detail-name">Total Emissions</div>
              <div className="detail-value">{75 + (scheme.id - 1) * 15} tonnes CO₂e</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SchemeSidePanel; 