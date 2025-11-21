import React, { useState } from 'react';
import { FigmaCollection } from '../../types';
import PushConfirmationDialog from './PushConfirmationDialog';

interface VariablesViewProps {
  collections: FigmaCollection[];
  onPushVariables: (collections: FigmaCollection[]) => void;
  onBack: () => void;
}

const VariablesView: React.FC<VariablesViewProps> = ({
  collections,
  onPushVariables,
  onBack
}) => {
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [selectedCollections, setSelectedCollections] = useState<FigmaCollection[]>([]);

  const handlePushClick = () => {
    setSelectedCollections(collections);
    setShowConfirmDialog(true);
  };

  const handleConfirmPush = () => {
    onPushVariables(selectedCollections);
    setShowConfirmDialog(false);
  };

  const handleCancelPush = () => {
    setShowConfirmDialog(false);
  };

  const formatVariableValue = (variable: any) => {
    // Get the first mode's value
    const modeIds = Object.keys(variable.valuesByMode);
    if (modeIds.length === 0) return 'No value';
    
    const value = variable.valuesByMode[modeIds[0]];
    
    if (variable.resolvedType === 'COLOR' && typeof value === 'object' && value !== null) {
      const color = value as any;
      return `rgb(${Math.round(color.r * 255)}, ${Math.round(color.g * 255)}, ${Math.round(color.b * 255)})`;
    }
    
    return String(value);
  };

  return (
    <div className="variables-view">
      <div className="variables-header">
        <button className="back-button" onClick={onBack}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M10 12l-4-4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Back
        </button>
        
        <h2>All Variables</h2>
        
        <button 
          className="push-button"
          onClick={handlePushClick}
          disabled={collections.length === 0}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M8 15V5M4 9l4-4 4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Push to Fragmento
        </button>
      </div>

      <div className="variables-content">
        {collections.length === 0 ? (
          <div className="no-variables">
            <p>No variables found in this Figma file.</p>
            <p>Create some variables in Figma and try importing again.</p>
          </div>
        ) : (
          collections.map(collection => (
            <div key={collection.id} className="collection">
              <h3 className="collection-title">{collection.name}</h3>
              
              <div className="variables-table">
                <div className="table-header">
                  <div className="table-cell">Name</div>
                  <div className="table-cell">Type</div>
                  <div className="table-cell">Value</div>
                  <div className="table-cell">Description</div>
                </div>
                
                {collection.variables.map(variable => (
                  <div key={variable.id} className="table-row">
                    <div className="table-cell variable-name">{variable.name}</div>
                    <div className="table-cell variable-type">
                      <span className={`type-badge type-${variable.resolvedType.toLowerCase()}`}>
                        {variable.resolvedType.toLowerCase()}
                      </span>
                    </div>
                    <div className="table-cell variable-value">
                      {variable.resolvedType === 'COLOR' ? (
                        <div className="color-value">
                          <div 
                            className="color-swatch"
                            style={{ backgroundColor: formatVariableValue(variable) }}
                          ></div>
                          <span>{formatVariableValue(variable)}</span>
                        </div>
                      ) : (
                        <span>{formatVariableValue(variable)}</span>
                      )}
                    </div>
                    <div className="table-cell variable-description">
                      {variable.description || '—'}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      {showConfirmDialog && (
        <PushConfirmationDialog
          collections={selectedCollections}
          onConfirm={handleConfirmPush}
          onCancel={handleCancelPush}
        />
      )}
    </div>
  );
};

export default VariablesView;
