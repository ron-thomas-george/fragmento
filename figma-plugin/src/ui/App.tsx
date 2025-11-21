import React, { useState, useEffect } from 'react';
import { AppState, PluginMessage, AuthToken, Organization, Project, FigmaCollection } from '../types';
import AuthScreen from './components/AuthScreen';
import MainScreen from './components/MainScreen';

const App: React.FC = () => {
  const [appState, setAppState] = useState<AppState>({
    isAuthenticated: false,
    authToken: null,
    selectedOrganization: null,
    selectedProject: null,
    organizations: [],
    projects: [],
    collections: [],
    isLoading: true,
    error: null
  });

  // Add debugging
  console.log('App component rendered, appState:', appState);

  useEffect(() => {
    // Listen for messages from the plugin
    window.onmessage = (event) => {
      const message = event.data.pluginMessage;
      if (!message) return;

      handlePluginMessage(message);
    };

    // Initialize plugin - this will check for existing auth
    // The plugin will respond with auth-status message
  }, []);

  const handlePluginMessage = (message: any) => {
    switch (message.type) {
      case 'auth-status':
        setAppState(prev => ({
          ...prev,
          isAuthenticated: message.payload.isAuthenticated,
          authToken: message.payload.authToken,
          isLoading: false
        }));
        break;

      case 'auth-success':
        setAppState(prev => ({
          ...prev,
          isAuthenticated: true,
          authToken: message.payload.authToken,
          error: null
        }));
        // Fetch organizations after successful auth
        postMessage({ 
          type: 'fetch-organizations', 
          payload: { authToken: message.payload.authToken } 
        });
        break;

      case 'auth-error':
        setAppState(prev => ({
          ...prev,
          error: message.payload.message,
          isLoading: false
        }));
        break;

      case 'organizations-loaded':
        setAppState(prev => ({
          ...prev,
          organizations: message.payload.organizations
        }));
        break;

      case 'projects-loaded':
        setAppState(prev => ({
          ...prev,
          projects: message.payload.projects
        }));
        break;

      case 'variables-loaded':
        setAppState(prev => ({
          ...prev,
          collections: message.payload.collections
        }));
        break;

      case 'push-success':
        setAppState(prev => ({
          ...prev,
          error: null
        }));
        alert('Variables successfully pushed to Fragmento!');
        break;

      case 'push-error':
        setAppState(prev => ({
          ...prev,
          error: message.payload.message
        }));
        break;

      case 'error':
        setAppState(prev => ({
          ...prev,
          error: message.payload.message
        }));
        break;

      case 'restore-selection':
        setAppState(prev => ({
          ...prev,
          selectedOrganization: message.payload.organization,
          selectedProject: message.payload.project
        }));
        break;

      case 'logout-success':
        setAppState({
          isAuthenticated: false,
          authToken: null,
          selectedOrganization: null,
          selectedProject: null,
          organizations: [],
          projects: [],
          collections: [],
          isLoading: false,
          error: null
        });
        break;
    }
  };

  const postMessage = (message: PluginMessage) => {
    parent.postMessage({ pluginMessage: message }, '*');
  };

  const handleAuthenticate = () => {
    postMessage({ type: 'authenticate' });
  };

  const handleOrganizationSelect = (organization: Organization) => {
    setAppState(prev => ({
      ...prev,
      selectedOrganization: organization,
      selectedProject: null,
      projects: []
    }));
    
    if (appState.authToken) {
      postMessage({ 
        type: 'fetch-projects', 
        payload: { 
          authToken: appState.authToken, 
          organizationId: organization.id 
        } 
      });
    }
  };

  const handleProjectSelect = (project: Project) => {
    setAppState(prev => ({
      ...prev,
      selectedProject: project
    }));
  };

  const handleImportVariables = () => {
    postMessage({ type: 'get-variables' });
  };

  const handlePushVariables = (collections: FigmaCollection[]) => {
    if (!appState.authToken || !appState.selectedProject) return;
    
    postMessage({ 
      type: 'push-variables', 
      payload: { 
        collections, 
        authToken: appState.authToken, 
        projectId: appState.selectedProject.id 
      } 
    });
  };

  const handleLogout = () => {
    postMessage({ type: 'logout' });
  };

  if (appState.isLoading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Loading...</p>
      </div>
    );
  }

  if (!appState.isAuthenticated) {
    return (
      <AuthScreen 
        onAuthenticate={handleAuthenticate}
        error={appState.error}
      />
    );
  }

  return (
    <MainScreen 
      appState={appState}
      onOrganizationSelect={handleOrganizationSelect}
      onProjectSelect={handleProjectSelect}
      onImportVariables={handleImportVariables}
      onPushVariables={handlePushVariables}
      onLogout={handleLogout}
    />
  );
};

export default App;
