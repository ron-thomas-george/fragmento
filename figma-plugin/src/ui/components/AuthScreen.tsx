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
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M17.1834 0.585787C16.8083 0.210715 16.2996 0 15.7692 0H8.23084C7.70041 0 7.19171 0.210713 6.81663 0.585785L0.585787 6.81662C0.210714 7.19169 0 7.7004 0 8.23083V15.7692C0 16.2996 0.210714 16.8083 0.585786 17.1834L6.81663 23.4142C7.19171 23.7893 7.70041 24 8.23085 24H15.7692C16.2996 24 16.8083 23.7893 17.1834 23.4142L23.4142 17.1834C23.7893 16.8083 24 16.2996 24 15.7692V8.23083C24 7.7004 23.7893 7.19169 23.4142 6.81662L17.1834 0.585787ZM8.6747 16.7132L5.34675 13.3853C4.5657 12.6042 4.5657 11.3379 5.34675 10.5569L8.6747 7.22892C10.4675 5.43614 13.4169 5.43614 15.2096 7.22892L18.5376 10.5569C19.3186 11.3379 19.3186 12.6042 18.5376 13.3853L15.2096 16.7132C13.4169 18.506 10.5253 18.506 8.6747 16.7132Z" fill="white" />
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
