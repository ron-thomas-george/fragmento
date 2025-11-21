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
  console.log('Fragmento plugin initializing...');
  try {
    // Check for existing auth token
    const storedToken = await figma.clientStorage.getAsync(AUTH_TOKEN_KEY);
    
    if (storedToken) {
      const authToken: AuthToken = JSON.parse(storedToken);
      
      // Check if token is expired
      if (authToken.expiresAt > Date.now()) {
        // Token is valid, fetch user info and send to UI
        try {
          const userResponse = await fetch('https://fragmento-theta.vercel.app/api/user', {
            headers: {
              'Authorization': `Bearer ${authToken.token}`
            }
          });
          
          if (userResponse.ok) {
            const userInfo = await userResponse.json();
            
            figma.ui.postMessage({
              type: 'auth-status',
              payload: { isAuthenticated: true, authToken, userInfo }
            });
            
            // Automatically fetch organizations
            await handleFetchOrganizations(authToken);
          } else {
            throw new Error('Failed to fetch user info');
          }
        } catch (userError) {
          console.error('Error fetching user info during init:', userError);
          // Send auth status without user info
          figma.ui.postMessage({
            type: 'auth-status',
            payload: { isAuthenticated: true, authToken, userInfo: null }
          });
          
          // Still fetch organizations
          await handleFetchOrganizations(authToken);
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
      console.log('No auth token found, sending unauthenticated status');
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
    console.log('Plugin received message:', msg.type);
    switch (msg.type) {
      case 'get-auth-status':
        await init(); // Re-run initialization to send current auth status
        break;
        
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
        
      case 'store-organization':
        await figma.clientStorage.setAsync(SELECTED_ORG_KEY, JSON.stringify(msg.payload.organization));
        break;
        
      case 'store-project':
        await figma.clientStorage.setAsync(SELECTED_PROJECT_KEY, JSON.stringify(msg.payload.project));
        break;
        
      case 'clear-organization':
        await figma.clientStorage.deleteAsync(SELECTED_ORG_KEY);
        await figma.clientStorage.deleteAsync(SELECTED_PROJECT_KEY);
        break;
        
      case 'clear-project':
        await figma.clientStorage.deleteAsync(SELECTED_PROJECT_KEY);
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
  const authUrl = `https://fragmento-theta.vercel.app/auth/figma?state=${state}`;
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
    
    // Store the token
    await figma.clientStorage.setAsync(AUTH_TOKEN_KEY, JSON.stringify(authToken));
    
    console.log('Authentication token stored successfully');
    
    // Fetch user info and send success message to UI
    try {
      const userResponse = await fetch('https://fragmento-theta.vercel.app/api/user', {
        headers: {
          'Authorization': `Bearer ${authToken.token}`
        }
      });
      
      if (userResponse.ok) {
        const userInfo = await userResponse.json();
        
        // Send success message with user info to UI
        figma.ui.postMessage({
          type: 'auth-success',
          payload: { authToken, userInfo }
        });
        
        // Automatically fetch organizations
        await handleFetchOrganizations(authToken);
      } else {
        throw new Error('Failed to fetch user info');
      }
    } catch (userError) {
      console.error('Error fetching user info:', userError);
      // Send success without user info, UI will handle gracefully
      figma.ui.postMessage({
        type: 'auth-success',
        payload: { authToken, userInfo: null }
      });
      
      // Still fetch organizations
      await handleFetchOrganizations(authToken);
    }
    
  } catch (error) {
    console.error('Error setting auth token:', error);
    figma.ui.postMessage({
      type: 'auth-error',
      payload: { message: 'Failed to store authentication token' }
    });
  }
}

// Note: Custom URL scheme handling will be done by the browser redirect
// The web app will redirect to figma://auth-callback which Figma will handle
// and pass the parameters to the plugin through the normal message system

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
    const response = await fetch('https://fragmento-theta.vercel.app/api/figma/push-tokens', {
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
    const response = await fetch('https://fragmento-theta.vercel.app/api/organizations', {
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

    // Auto-select if only one organization or restore previous selection
    if (organizations.length === 1) {
      const org = organizations[0];
      await figma.clientStorage.setAsync(SELECTED_ORG_KEY, JSON.stringify(org));
      
      // Fetch projects for the auto-selected organization
      await handleFetchProjects(authToken, org.id);
    } else if (organizations.length > 1) {
      // Try to restore previous selection
      const savedOrg = await figma.clientStorage.getAsync(SELECTED_ORG_KEY);
      if (savedOrg) {
        const org = JSON.parse(savedOrg);
        const foundOrg = organizations.find((o: any) => o.id === org.id);
        if (foundOrg) {
          // Fetch projects for the restored organization
          await handleFetchProjects(authToken, foundOrg.id);
        }
      }
    }
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
    const response = await fetch(`https://fragmento-theta.vercel.app/api/organizations/${organizationId}/projects`, {
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

    // Try to restore previous project selection
    const savedProject = await figma.clientStorage.getAsync(SELECTED_PROJECT_KEY);
    if (savedProject) {
      const project = JSON.parse(savedProject);
      const foundProject = projects.find((p: any) => p.id === project.id);
      if (foundProject) {
        // Project is still valid, keep the selection
        await figma.clientStorage.setAsync(SELECTED_PROJECT_KEY, JSON.stringify(foundProject));
      } else {
        // Project no longer exists, clear the selection
        await figma.clientStorage.deleteAsync(SELECTED_PROJECT_KEY);
      }
    }
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

// Initialize the plugin with a small delay to ensure UI is ready
setTimeout(() => {
  init();
}, 100);
