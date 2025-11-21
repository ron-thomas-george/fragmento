import React from 'react';
import { FigmaCollection } from '../../types';

interface PushConfirmationDialogProps {
  collections: FigmaCollection[];
  onConfirm: () => void;
  onCancel: () => void;
}

const PushConfirmationDialog: React.FC<PushConfirmationDialogProps> = ({
  collections,
  onConfirm,
  onCancel
}) => {
  const totalVariables = collections.reduce((sum, collection) => sum + collection.variables.length, 0);

  return (
    <div className="dialog-overlay">
      <div className="dialog">
        <div className="dialog-header">
          <h3>Confirm Push to Fragmento</h3>
          <button className="dialog-close" onClick={onCancel}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M12 4L4 12M4 4l8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        <div className="dialog-content">
          <p>
            You are about to push <strong>{totalVariables} variables</strong> from{' '}
            <strong>{collections.length} collection{collections.length !== 1 ? 's' : ''}</strong> to your Fragmento project.
          </p>

          <div className="collections-summary">
            {collections.map(collection => (
              <div key={collection.id} className="collection-summary">
                <strong>{collection.name}</strong>
                <span>{collection.variables.length} variable{collection.variables.length !== 1 ? 's' : ''}</span>
              </div>
            ))}
          </div>

          <div className="push-info">
            <h4>What will happen:</h4>
            <ul>
              <li>Collections matching existing sets will update those sets</li>
              <li>New collections will create new token sets</li>
              <li>Variables with matching names will update existing tokens</li>
              <li>All changes will appear in Pending Changes for release creation</li>
            </ul>
          </div>
        </div>

        <div className="dialog-actions">
          <button className="secondary-button" onClick={onCancel}>
            Cancel
          </button>
          <button className="primary-button" onClick={onConfirm}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M8 15V5M4 9l4-4 4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Push Variables
          </button>
        </div>
      </div>
    </div>
  );
};

export default PushConfirmationDialog;
