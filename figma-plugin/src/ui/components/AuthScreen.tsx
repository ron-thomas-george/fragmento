import React from 'react';

interface AuthScreenProps {
  onAuthenticate: () => void;
  error: string | null;
}

const AuthScreen: React.FC<AuthScreenProps> = ({ onAuthenticate, error }) => {
  return (
    <div className="auth-screen">
      <div className="auth-header">
        <div className="logo">
          <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
            <rect width="32" height="32" rx="8" fill="#6366F1"/>
            <path d="M8 12h16v2H8v-2zm0 4h12v2H8v-2zm0 4h8v2H8v-2z" fill="white"/>
          </svg>
        </div>
        <h1>Fragmento</h1>
        <p>Design Token Management</p>
      </div>

      <div className="auth-content">
        <h2>Connect to Fragmento</h2>
        <p>
          Sync your Figma variables with your design token system. 
          Authenticate with your Fragmento account to get started.
        </p>

        {error && (
          <div className="error-message">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M8 1.5a6.5 6.5 0 100 13 6.5 6.5 0 000-13zM7 5h2v4H7V5zm0 5h2v1H7v-1z" fill="#EF4444"/>
            </svg>
            {error}
          </div>
        )}

        <button 
          className="auth-button"
          onClick={onAuthenticate}
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M10 2L3 7v11h4v-6h6v6h4V7l-7-5z" fill="currentColor"/>
          </svg>
          Authenticate with Fragmento
        </button>

        <div className="auth-info">
          <h3>This plugin will request access to:</h3>
          <ul>
            <li>Read and write Figma variables</li>
            <li>Access your Fragmento projects and tokens</li>
            <li>Sync changes between Figma and your web app</li>
          </ul>
        </div>
      </div>

      <div className="auth-footer">
        <p>
          Need help? <a href="https://fragmento.app/support" target="_blank" rel="noopener noreferrer">Contact Support</a>
        </p>
      </div>
    </div>
  );
};

export default AuthScreen;
