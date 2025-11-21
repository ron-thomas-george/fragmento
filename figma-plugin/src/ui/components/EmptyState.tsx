import React from 'react';

interface EmptyStateProps {
  onImportVariables: () => void;
}

const EmptyState: React.FC<EmptyStateProps> = ({ onImportVariables }) => {
  return (
    <div className="empty-state">
      <div className="empty-state-content">
        <div className="empty-state-icon">
          <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
            <rect x="8" y="12" width="32" height="24" rx="4" stroke="#9CA3AF" strokeWidth="2" fill="none"/>
            <path d="M16 20h16M16 24h12M16 28h8" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        </div>
        
        <h3>Ready to sync your design tokens</h3>
        <p>
          Import your Figma variables to sync them with your Fragmento project. 
          Variables will be organized by collections and can be pushed to your web app.
        </p>

        <div className="empty-state-actions">
          <button 
            className="primary-button"
            onClick={onImportVariables}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M8 1v10M4 7l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Import Variables
          </button>
        </div>

        <div className="empty-state-info">
          <h4>How it works:</h4>
          <ol>
            <li>Import variables from your current Figma file</li>
            <li>Review variables organized by collections</li>
            <li>Push selected variables to your Fragmento project</li>
            <li>Variables appear in Pending Changes for release creation</li>
          </ol>
        </div>
      </div>
    </div>
  );
};

export default EmptyState;
