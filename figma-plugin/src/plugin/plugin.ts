/// <reference types="@figma/plugin-typings" />

import { PluginMessage, AuthToken, FigmaCollection, FigmaVariable } from '../types';

// Show the plugin UI
figma.showUI(__html__, { 
  width: 400, 
  height: 600,
  themeColors: true 
});

// Storage keys
const AUTH_TOKEN_KEY = 'fragmento_auth_token';
const SELECTED_ORG_KEY = 'fragmento_selected_org';
const SELECTED_PROJECT_KEY = 'fragmento_selected_project';

// Initialize plugin
async function init() {
  try {
    // Check for existing auth token
    const storedToken = await figma.clientStorage.getAsync(AUTH_TOKEN_KEY);
    
    if (storedToken) {
      const authToken: AuthToken = JSON.parse(storedToken);
      
      // Check if token is expired
      if (authToken.expiresAt > Date.now()) {
        // Token is valid, send to UI
        figma.ui.postMessage({
          type: 'auth-status',
          payload: { isAuthenticated: true, authToken }
        });
        
        // Load saved organization and project
        const savedOrg = await figma.clientStorage.getAsync(SELECTED_ORG_KEY);
        const savedProject = await figma.clientStorage.getAsync(SELECTED_PROJECT_KEY);
        
        if (savedOrg && savedProject) {
          figma.ui.postMessage({
            type: 'restore-selection',
            payload: {
              organization: JSON.parse(savedOrg),
              project: JSON.parse(savedProject)
            }
          });
        }
      } else {
        // Token expired, clear storage
        await figma.clientStorage.deleteAsync(AUTH_TOKEN_KEY);
        figma.ui.postMessage({
          type: 'auth-status',
          payload: { isAuthenticated: false, authToken: null }
        });
      }
    } else {
      // No token found
      figma.ui.postMessage({
        type: 'auth-status',
        payload: { isAuthenticated: false, authToken: null }
      });
    }
  } catch (error) {
    console.error('Plugin initialization error:', error);
    figma.ui.postMessage({
      type: 'error',
      payload: { message: 'Failed to initialize plugin' }
    });
  }
}

// Handle messages from UI
figma.ui.onmessage = async (msg: PluginMessage) => {
  try {
    switch (msg.type) {
      case 'authenticate':
        await handleAuthentication();
        break;
        
      case 'set-auth-token':
        await handleSetAuthToken(msg.payload);
        break;
        
      case 'get-variables':
        await handleGetVariables();
        break;
        
      case 'push-variables':
        await handlePushVariables(msg.payload);
        break;
        
      case 'fetch-organizations':
        await handleFetchOrganizations(msg.payload.authToken);
        break;
        
      case 'fetch-projects':
        await handleFetchProjects(msg.payload.authToken, msg.payload.organizationId);
        break;
        
      case 'logout':
        await handleLogout();
        break;
        
      default:
        console.warn('Unknown message type:', msg.type);
    }
  } catch (error) {
    console.error('Error handling message:', error);
    figma.ui.postMessage({
      type: 'error',
      payload: { message: 'An error occurred processing your request' }
    });
  }
};

async function handleAuthentication() {
  // Generate a unique state parameter for security
  const state = Math.random().toString(36).substring(2, 15);
  
  // Store state for verification
  await figma.clientStorage.setAsync('auth_state', state);
  
  // Open browser for authentication
  const authUrl = `https://fragmento.app/auth/figma?state=${state}`;
  figma.openExternal(authUrl);
  
  figma.ui.postMessage({
    type: 'auth-initiated',
    payload: { message: 'Authentication opened in browser' }
  });
}

async function handleSetAuthToken(payload: { token: string; userId: string; expiresIn: number }) {
  try {
    const authToken: AuthToken = {
      token: payload.token,
      userId: payload.userId,
      expiresAt: Date.now() + (payload.expiresIn * 1000)
    };
    
    // Store token securely
    await figma.clientStorage.setAsync(AUTH_TOKEN_KEY, JSON.stringify(authToken));
    
    figma.ui.postMessage({
      type: 'auth-success',
      payload: { authToken }
    });
  } catch (error) {
    console.error('Error setting auth token:', error);
    figma.ui.postMessage({
      type: 'auth-error',
      payload: { message: 'Failed to store authentication token' }
    });
  }
}

async function handleGetVariables() {
  try {
    const collections = await figma.variables.getLocalVariableCollectionsAsync();
    const figmaCollections: FigmaCollection[] = [];
    
    for (const collection of collections) {
      const variables = await Promise.all(
        collection.variableIds.map(async (id) => {
          const variable = await figma.variables.getVariableByIdAsync(id);
          if (variable) {
            return {
              id: variable.id,
              name: variable.name,
              resolvedType: variable.resolvedType,
              valuesByMode: variable.valuesByMode,
              description: variable.description,
              collectionId: collection.id
            } as FigmaVariable;
          }
          return null;
        })
      );
      
      figmaCollections.push({
        id: collection.id,
        name: collection.name,
        variables: variables.filter(v => v !== null) as FigmaVariable[]
      });
    }
    
    figma.ui.postMessage({
      type: 'variables-loaded',
      payload: { collections: figmaCollections }
    });
  } catch (error) {
    console.error('Error getting variables:', error);
    figma.ui.postMessage({
      type: 'error',
      payload: { message: 'Failed to load Figma variables' }
    });
  }
}

async function handlePushVariables(payload: { collections: FigmaCollection[]; authToken: AuthToken; projectId: string }) {
  try {
    // Transform Figma variables to Fragmento format
    const tokenSets = payload.collections.map(collection => ({
      name: collection.name,
      tokens: collection.variables.map(variable => ({
        name: variable.name,
        type: getTokenType(variable.resolvedType),
        value: getTokenValue(variable.valuesByMode, variable.resolvedType),
        description: variable.description || ''
      }))
    }));
    
    // Send to Fragmento API
    const response = await fetch('https://api.fragmento.app/api/figma/push-tokens', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${payload.authToken.token}`
      },
      body: JSON.stringify({
        projectId: payload.projectId,
        tokenSets
      })
    });
    
    if (!response.ok) {
      throw new Error(`API request failed: ${response.statusText}`);
    }
    
    const result = await response.json();
    
    figma.ui.postMessage({
      type: 'push-success',
      payload: { message: 'Variables successfully pushed to Fragmento', result }
    });
  } catch (error) {
    console.error('Error pushing variables:', error);
    figma.ui.postMessage({
      type: 'push-error',
      payload: { message: 'Failed to push variables to Fragmento' }
    });
  }
}

async function handleFetchOrganizations(authToken: AuthToken) {
  try {
    const response = await fetch('https://api.fragmento.app/api/organizations', {
      headers: {
        'Authorization': `Bearer ${authToken.token}`
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch organizations: ${response.statusText}`);
    }
    
    const organizations = await response.json();
    
    figma.ui.postMessage({
      type: 'organizations-loaded',
      payload: { organizations }
    });
  } catch (error) {
    console.error('Error fetching organizations:', error);
    figma.ui.postMessage({
      type: 'error',
      payload: { message: 'Failed to load organizations' }
    });
  }
}

async function handleFetchProjects(authToken: AuthToken, organizationId: string) {
  try {
    const response = await fetch(`https://api.fragmento.app/api/organizations/${organizationId}/projects`, {
      headers: {
        'Authorization': `Bearer ${authToken.token}`
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch projects: ${response.statusText}`);
    }
    
    const projects = await response.json();
    
    figma.ui.postMessage({
      type: 'projects-loaded',
      payload: { projects }
    });
  } catch (error) {
    console.error('Error fetching projects:', error);
    figma.ui.postMessage({
      type: 'error',
      payload: { message: 'Failed to load projects' }
    });
  }
}

async function handleLogout() {
  try {
    await figma.clientStorage.deleteAsync(AUTH_TOKEN_KEY);
    await figma.clientStorage.deleteAsync(SELECTED_ORG_KEY);
    await figma.clientStorage.deleteAsync(SELECTED_PROJECT_KEY);
    
    figma.ui.postMessage({
      type: 'logout-success',
      payload: { message: 'Successfully logged out' }
    });
  } catch (error) {
    console.error('Error during logout:', error);
    figma.ui.postMessage({
      type: 'error',
      payload: { message: 'Failed to logout' }
    });
  }
}

// Helper functions
function getTokenType(resolvedType: VariableResolvedDataType): string {
  switch (resolvedType) {
    case 'COLOR':
      return 'color';
    case 'FLOAT':
      return 'number';
    case 'STRING':
      return 'string';
    case 'BOOLEAN':
      return 'boolean';
    default:
      return 'string';
  }
}

function getTokenValue(valuesByMode: { [modeId: string]: VariableValue }, resolvedType: VariableResolvedDataType): string {
  // Get the first mode's value (assuming single mode for simplicity)
  const modeIds = Object.keys(valuesByMode);
  if (modeIds.length === 0) return '';
  
  const value = valuesByMode[modeIds[0]];
  
  if (resolvedType === 'COLOR' && typeof value === 'object' && value !== null) {
    const color = value as RGB;
    return `rgb(${Math.round(color.r * 255)}, ${Math.round(color.g * 255)}, ${Math.round(color.b * 255)})`;
  }
  
  return String(value);
}

// Initialize the plugin
init();
