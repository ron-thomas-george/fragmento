"use strict";
(() => {
  // src/plugin/plugin.ts
  figma.showUI(__html__, {
    width: 400,
    height: 600,
    themeColors: true
  });
  var AUTH_TOKEN_KEY = "fragmento_auth_token";
  var SELECTED_ORG_KEY = "fragmento_selected_org";
  var SELECTED_PROJECT_KEY = "fragmento_selected_project";
  async function init() {
    try {
      const storedToken = await figma.clientStorage.getAsync(AUTH_TOKEN_KEY);
      if (storedToken) {
        const authToken = JSON.parse(storedToken);
        if (authToken.expiresAt > Date.now()) {
          figma.ui.postMessage({
            type: "auth-status",
            payload: { isAuthenticated: true, authToken }
          });
          const savedOrg = await figma.clientStorage.getAsync(SELECTED_ORG_KEY);
          const savedProject = await figma.clientStorage.getAsync(SELECTED_PROJECT_KEY);
          if (savedOrg && savedProject) {
            figma.ui.postMessage({
              type: "restore-selection",
              payload: {
                organization: JSON.parse(savedOrg),
                project: JSON.parse(savedProject)
              }
            });
          }
        } else {
          await figma.clientStorage.deleteAsync(AUTH_TOKEN_KEY);
          figma.ui.postMessage({
            type: "auth-status",
            payload: { isAuthenticated: false, authToken: null }
          });
        }
      } else {
        figma.ui.postMessage({
          type: "auth-status",
          payload: { isAuthenticated: false, authToken: null }
        });
      }
    } catch (error) {
      console.error("Plugin initialization error:", error);
      figma.ui.postMessage({
        type: "error",
        payload: { message: "Failed to initialize plugin" }
      });
    }
  }
  figma.ui.onmessage = async (msg) => {
    try {
      switch (msg.type) {
        case "authenticate":
          await handleAuthentication();
          break;
        case "set-auth-token":
          await handleSetAuthToken(msg.payload);
          break;
        case "get-variables":
          await handleGetVariables();
          break;
        case "push-variables":
          await handlePushVariables(msg.payload);
          break;
        case "fetch-organizations":
          await handleFetchOrganizations(msg.payload.authToken);
          break;
        case "fetch-projects":
          await handleFetchProjects(msg.payload.authToken, msg.payload.organizationId);
          break;
        case "logout":
          await handleLogout();
          break;
        default:
          console.warn("Unknown message type:", msg.type);
      }
    } catch (error) {
      console.error("Error handling message:", error);
      figma.ui.postMessage({
        type: "error",
        payload: { message: "An error occurred processing your request" }
      });
    }
  };
  async function handleAuthentication() {
    const state = Math.random().toString(36).substring(2, 15);
    await figma.clientStorage.setAsync("auth_state", state);
    const authUrl = `https://fragmento.app/auth/figma?state=${state}`;
    figma.openExternal(authUrl);
    figma.ui.postMessage({
      type: "auth-initiated",
      payload: { message: "Authentication opened in browser" }
    });
  }
  async function handleSetAuthToken(payload) {
    try {
      const authToken = {
        token: payload.token,
        userId: payload.userId,
        expiresAt: Date.now() + payload.expiresIn * 1e3
      };
      await figma.clientStorage.setAsync(AUTH_TOKEN_KEY, JSON.stringify(authToken));
      figma.ui.postMessage({
        type: "auth-success",
        payload: { authToken }
      });
    } catch (error) {
      console.error("Error setting auth token:", error);
      figma.ui.postMessage({
        type: "auth-error",
        payload: { message: "Failed to store authentication token" }
      });
    }
  }
  async function handleGetVariables() {
    try {
      const collections = await figma.variables.getLocalVariableCollectionsAsync();
      const figmaCollections = [];
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
              };
            }
            return null;
          })
        );
        figmaCollections.push({
          id: collection.id,
          name: collection.name,
          variables: variables.filter((v) => v !== null)
        });
      }
      figma.ui.postMessage({
        type: "variables-loaded",
        payload: { collections: figmaCollections }
      });
    } catch (error) {
      console.error("Error getting variables:", error);
      figma.ui.postMessage({
        type: "error",
        payload: { message: "Failed to load Figma variables" }
      });
    }
  }
  async function handlePushVariables(payload) {
    try {
      const tokenSets = payload.collections.map((collection) => ({
        name: collection.name,
        tokens: collection.variables.map((variable) => ({
          name: variable.name,
          type: getTokenType(variable.resolvedType),
          value: getTokenValue(variable.valuesByMode, variable.resolvedType),
          description: variable.description || ""
        }))
      }));
      const response = await fetch("https://api.fragmento.app/api/figma/push-tokens", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${payload.authToken.token}`
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
        type: "push-success",
        payload: { message: "Variables successfully pushed to Fragmento", result }
      });
    } catch (error) {
      console.error("Error pushing variables:", error);
      figma.ui.postMessage({
        type: "push-error",
        payload: { message: "Failed to push variables to Fragmento" }
      });
    }
  }
  async function handleFetchOrganizations(authToken) {
    try {
      const response = await fetch("https://api.fragmento.app/api/organizations", {
        headers: {
          "Authorization": `Bearer ${authToken.token}`
        }
      });
      if (!response.ok) {
        throw new Error(`Failed to fetch organizations: ${response.statusText}`);
      }
      const organizations = await response.json();
      figma.ui.postMessage({
        type: "organizations-loaded",
        payload: { organizations }
      });
    } catch (error) {
      console.error("Error fetching organizations:", error);
      figma.ui.postMessage({
        type: "error",
        payload: { message: "Failed to load organizations" }
      });
    }
  }
  async function handleFetchProjects(authToken, organizationId) {
    try {
      const response = await fetch(`https://api.fragmento.app/api/organizations/${organizationId}/projects`, {
        headers: {
          "Authorization": `Bearer ${authToken.token}`
        }
      });
      if (!response.ok) {
        throw new Error(`Failed to fetch projects: ${response.statusText}`);
      }
      const projects = await response.json();
      figma.ui.postMessage({
        type: "projects-loaded",
        payload: { projects }
      });
    } catch (error) {
      console.error("Error fetching projects:", error);
      figma.ui.postMessage({
        type: "error",
        payload: { message: "Failed to load projects" }
      });
    }
  }
  async function handleLogout() {
    try {
      await figma.clientStorage.deleteAsync(AUTH_TOKEN_KEY);
      await figma.clientStorage.deleteAsync(SELECTED_ORG_KEY);
      await figma.clientStorage.deleteAsync(SELECTED_PROJECT_KEY);
      figma.ui.postMessage({
        type: "logout-success",
        payload: { message: "Successfully logged out" }
      });
    } catch (error) {
      console.error("Error during logout:", error);
      figma.ui.postMessage({
        type: "error",
        payload: { message: "Failed to logout" }
      });
    }
  }
  function getTokenType(resolvedType) {
    switch (resolvedType) {
      case "COLOR":
        return "color";
      case "FLOAT":
        return "number";
      case "STRING":
        return "string";
      case "BOOLEAN":
        return "boolean";
      default:
        return "string";
    }
  }
  function getTokenValue(valuesByMode, resolvedType) {
    const modeIds = Object.keys(valuesByMode);
    if (modeIds.length === 0)
      return "";
    const value = valuesByMode[modeIds[0]];
    if (resolvedType === "COLOR" && typeof value === "object" && value !== null) {
      const color = value;
      return `rgb(${Math.round(color.r * 255)}, ${Math.round(color.g * 255)}, ${Math.round(color.b * 255)})`;
    }
    return String(value);
  }
  init();
})();
