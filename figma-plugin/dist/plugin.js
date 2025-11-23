"use strict";
(() => {
  var __defProp = Object.defineProperty;
  var __defProps = Object.defineProperties;
  var __getOwnPropDescs = Object.getOwnPropertyDescriptors;
  var __getOwnPropSymbols = Object.getOwnPropertySymbols;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __propIsEnum = Object.prototype.propertyIsEnumerable;
  var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
  var __spreadValues = (a, b) => {
    for (var prop in b || (b = {}))
      if (__hasOwnProp.call(b, prop))
        __defNormalProp(a, prop, b[prop]);
    if (__getOwnPropSymbols)
      for (var prop of __getOwnPropSymbols(b)) {
        if (__propIsEnum.call(b, prop))
          __defNormalProp(a, prop, b[prop]);
      }
    return a;
  };
  var __spreadProps = (a, b) => __defProps(a, __getOwnPropDescs(b));

  // src/plugin/plugin.ts
  figma.showUI(__html__, {
    width: 400,
    height: 600,
    themeColors: true
  });
  var AUTH_TOKEN_KEY = "fragmento_auth_token";
  var SELECTED_ORG_KEY = "fragmento_selected_org";
  var SELECTED_PROJECT_KEY = "fragmento_selected_project";
  var LAST_PUSHED_STATE_KEY = "fragmento_last_pushed_state";
  async function init() {
    console.log("Fragmento plugin initializing...");
    const initTimeout = setTimeout(() => {
      console.error("Plugin initialization timeout");
      figma.ui.postMessage({
        type: "auth-status",
        payload: { isAuthenticated: false, authToken: null }
      });
    }, 1e4);
    try {
      const storedToken = await figma.clientStorage.getAsync(AUTH_TOKEN_KEY);
      console.log("Stored token found:", !!storedToken);
      if (storedToken) {
        const authToken = JSON.parse(storedToken);
        if (authToken.expiresAt > Date.now()) {
          console.log("Token is valid, sending authenticated status");
          figma.ui.postMessage({
            type: "auth-status",
            payload: { isAuthenticated: true, authToken, userInfo: null }
          });
          fetchUserInfoBackground(authToken);
        } else {
          console.log("Token expired, clearing storage");
          await figma.clientStorage.deleteAsync(AUTH_TOKEN_KEY);
          figma.ui.postMessage({
            type: "auth-status",
            payload: { isAuthenticated: false, authToken: null }
          });
        }
      } else {
        console.log("No auth token found, sending unauthenticated status");
        figma.ui.postMessage({
          type: "auth-status",
          payload: { isAuthenticated: false, authToken: null }
        });
      }
      clearTimeout(initTimeout);
    } catch (error) {
      clearTimeout(initTimeout);
      console.error("Plugin initialization error:", error);
      figma.ui.postMessage({
        type: "error",
        payload: { message: "Failed to initialize plugin" }
      });
    }
  }
  async function fetchUserInfoBackground(authToken) {
    try {
      console.log("Fetching user info in background...");
      const userResponse = await fetch("https://fragmento-theta.vercel.app/api/user", {
        headers: {
          "Authorization": `Bearer ${authToken.token}`
        }
      });
      if (userResponse.ok) {
        const userInfo = await userResponse.json();
        console.log("User info fetched successfully");
        figma.ui.postMessage({
          type: "user-info-loaded",
          payload: { userInfo }
        });
        await handleFetchOrganizations(authToken);
      } else {
        console.error("Failed to fetch user info:", userResponse.status);
        await handleFetchOrganizations(authToken);
      }
    } catch (error) {
      console.error("Error fetching user info in background:", error);
      try {
        await handleFetchOrganizations(authToken);
      } catch (orgError) {
        console.error("Error fetching organizations:", orgError);
      }
    }
  }
  figma.ui.onmessage = async (msg) => {
    try {
      console.log("Plugin received message:", msg.type);
      switch (msg.type) {
        case "ping":
          console.log("Ping received, sending pong...");
          figma.ui.postMessage({
            type: "pong",
            payload: { message: "Plugin is connected and working!" }
          });
          break;
        case "get-auth-status":
          console.log("Manual auth status check requested");
          await init();
          break;
        case "authenticate":
          await handleAuthentication();
          break;
        case "set-auth-token":
          await handleSetAuthToken(msg.payload);
          break;
        case "get-variables":
          await handleGetVariables();
          break;
        case "scan-variables":
          await handleScanVariables();
          break;
        case "import-variables":
          await handleImportVariables(msg.payload.selectedVariables);
          break;
        case "push-variables":
          if (msg.payload.selectedVariables) {
            await handlePushSelectedVariables(msg.payload.selectedVariables);
          } else {
            await handlePushVariables(msg.payload);
          }
          break;
        case "open-url":
          if (msg.payload.url) {
            figma.openExternal(msg.payload.url);
          }
          break;
        case "fetch-organizations":
          await handleFetchOrganizations(msg.payload.authToken);
          break;
        case "fetch-projects":
          const storedToken = await figma.clientStorage.getAsync(AUTH_TOKEN_KEY);
          if (storedToken) {
            const authToken = JSON.parse(storedToken);
            await handleFetchProjects(authToken, msg.payload.organizationId);
          } else {
            console.error("No auth token found for fetch-projects");
            figma.ui.postMessage({
              type: "auth-error",
              payload: { message: "Authentication required" }
            });
          }
          break;
        case "store-organization":
          await figma.clientStorage.setAsync(SELECTED_ORG_KEY, JSON.stringify(msg.payload.organization));
          break;
        case "store-project":
          await figma.clientStorage.setAsync(SELECTED_PROJECT_KEY, JSON.stringify(msg.payload.project));
          break;
        case "clear-organization":
          await figma.clientStorage.deleteAsync(SELECTED_ORG_KEY);
          await figma.clientStorage.deleteAsync(SELECTED_PROJECT_KEY);
          break;
        case "clear-project":
          await figma.clientStorage.deleteAsync(SELECTED_PROJECT_KEY);
          break;
        case "load-project":
          await handleLoadProject(msg.payload.organizationId, msg.payload.projectId);
          break;
        case "token-found":
          if (currentPollInterval) {
            clearInterval(currentPollInterval);
            currentPollInterval = null;
          }
          await handleSetAuthToken({
            token: msg.payload.token,
            userId: msg.payload.userId,
            expiresIn: msg.payload.expiresIn
          });
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
    const authUrl = `https://fragmento-theta.vercel.app/auth/figma?state=${state}`;
    figma.openExternal(authUrl);
    figma.ui.postMessage({
      type: "auth-initiated",
      payload: { message: "Authentication opened in browser" }
    });
    startTokenPolling(state);
  }
  var currentPollInterval = null;
  var pollAttempts = 0;
  async function startTokenPolling(state) {
    console.log("Starting token polling for state:", state);
    if (currentPollInterval) {
      clearInterval(currentPollInterval);
      currentPollInterval = null;
    }
    pollAttempts = 0;
    const maxAttempts = 60;
    const pollFunction = () => {
      pollAttempts++;
      console.log(`Polling attempt ${pollAttempts}/${maxAttempts}`);
      try {
        figma.ui.postMessage({
          type: "poll-token",
          payload: { state, attempt: pollAttempts }
        });
      } catch (error) {
        console.error("Token polling error:", error);
      }
      if (pollAttempts >= maxAttempts) {
        console.log("Token polling timeout");
        if (currentPollInterval) {
          clearInterval(currentPollInterval);
          currentPollInterval = null;
        }
        figma.ui.postMessage({
          type: "auth-error",
          payload: { message: "Authentication timeout. Please try again." }
        });
      }
    };
    currentPollInterval = setInterval(pollFunction, 5e3);
  }
  async function handleSetAuthToken(payload) {
    try {
      const authToken = {
        token: payload.token,
        userId: payload.userId,
        expiresAt: Date.now() + payload.expiresIn * 1e3
      };
      await figma.clientStorage.setAsync(AUTH_TOKEN_KEY, JSON.stringify(authToken));
      console.log("Authentication token stored successfully");
      try {
        const userResponse = await fetch("https://fragmento-theta.vercel.app/api/user", {
          headers: {
            "Authorization": `Bearer ${authToken.token}`
          }
        });
        if (userResponse.ok) {
          const userInfo = await userResponse.json();
          figma.ui.postMessage({
            type: "auth-success",
            payload: { authToken, userInfo }
          });
          await handleFetchOrganizations(authToken);
        } else {
          throw new Error("Failed to fetch user info");
        }
      } catch (userError) {
        console.error("Error fetching user info:", userError);
        figma.ui.postMessage({
          type: "auth-success",
          payload: { authToken, userInfo: null }
        });
        await handleFetchOrganizations(authToken);
      }
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
      const response = await fetch("https://fragmento-theta.vercel.app/api/figma/push-tokens", {
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
      console.log("Fetching organizations...");
      const response = await fetch("https://fragmento-theta.vercel.app/api/organizations", {
        headers: {
          "Authorization": `Bearer ${authToken.token}`
        }
      });
      if (!response.ok) {
        throw new Error(`Failed to fetch organizations: ${response.statusText}`);
      }
      const organizations = await response.json();
      console.log("Organizations fetched:", organizations.length);
      figma.ui.postMessage({
        type: "organizations-loaded",
        payload: { organizations }
      });
      if (organizations.length === 1) {
        const org = organizations[0];
        await figma.clientStorage.setAsync(SELECTED_ORG_KEY, JSON.stringify(org));
        console.log("Auto-selected single organization:", org.name);
        handleFetchProjects(authToken, org.id).catch((error) => {
          console.error("Error auto-fetching projects:", error);
        });
      } else if (organizations.length > 1) {
        try {
          const savedOrg = await figma.clientStorage.getAsync(SELECTED_ORG_KEY);
          if (savedOrg) {
            const org = JSON.parse(savedOrg);
            const foundOrg = organizations.find((o) => o.id === org.id);
            if (foundOrg) {
              console.log("Restored previous organization:", foundOrg.name);
              handleFetchProjects(authToken, foundOrg.id).catch((error) => {
                console.error("Error restoring projects:", error);
              });
            }
          }
        } catch (restoreError) {
          console.error("Error restoring organization selection:", restoreError);
        }
      }
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
      const response = await fetch(`https://fragmento-theta.vercel.app/api/organizations/${organizationId}/projects`, {
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
      const savedProject = await figma.clientStorage.getAsync(SELECTED_PROJECT_KEY);
      if (savedProject) {
        const project = JSON.parse(savedProject);
        const foundProject = projects.find((p) => p.id === project.id);
        if (foundProject) {
          await figma.clientStorage.setAsync(SELECTED_PROJECT_KEY, JSON.stringify(foundProject));
        } else {
          await figma.clientStorage.deleteAsync(SELECTED_PROJECT_KEY);
        }
      }
    } catch (error) {
      console.error("Error fetching projects:", error);
      figma.ui.postMessage({
        type: "error",
        payload: { message: "Failed to load projects" }
      });
    }
  }
  async function handleLoadProject(organizationId, projectId) {
    try {
      console.log("Loading project:", projectId, "from organization:", organizationId);
      const project = { id: projectId, organizationId };
      await figma.clientStorage.setAsync(SELECTED_PROJECT_KEY, JSON.stringify(project));
      const storedToken = await figma.clientStorage.getAsync(AUTH_TOKEN_KEY);
      if (storedToken) {
        const authToken = JSON.parse(storedToken);
        try {
          const response = await fetch(`https://fragmento-theta.vercel.app/api/organizations/${organizationId}/projects`, {
            headers: {
              "Authorization": `Bearer ${authToken.token}`
            }
          });
          if (response.ok) {
            const projects = await response.json();
            const selectedProject = projects.find((p) => p.id === projectId);
            if (selectedProject) {
              figma.ui.postMessage({
                type: "project-loaded",
                payload: {
                  project: selectedProject
                }
              });
              return;
            }
          }
        } catch (fetchError) {
          console.error("Error fetching project details:", fetchError);
        }
      }
      figma.ui.postMessage({
        type: "project-loaded",
        payload: {
          project: {
            id: projectId,
            name: "Selected Project",
            organizationId
          }
        }
      });
    } catch (error) {
      console.error("Error loading project:", error);
      figma.ui.postMessage({
        type: "auth-error",
        payload: { message: "Failed to load project" }
      });
    }
  }
  function detectChanges(currentCollections, lastPushedState) {
    var _a;
    const changes = {
      added: [],
      modified: [],
      deleted: [],
      collections: {
        added: [],
        deleted: []
      },
      summary: {
        totalAdded: 0,
        totalModified: 0,
        totalDeleted: 0,
        collectionsAdded: 0,
        collectionsDeleted: 0
      }
    };
    const currentVariableMap = /* @__PURE__ */ new Map();
    const lastVariableMap = /* @__PURE__ */ new Map();
    currentCollections.forEach((collection) => {
      collection.variables.forEach((variable) => {
        const key = `${collection.id}:${variable.id}`;
        currentVariableMap.set(key, __spreadProps(__spreadValues({}, variable), {
          collectionName: collection.name,
          collectionId: collection.id
        }));
      });
    });
    if (lastPushedState.collections) {
      lastPushedState.collections.forEach((collection) => {
        collection.variables.forEach((variable) => {
          const key = `${collection.id}:${variable.id}`;
          lastVariableMap.set(key, __spreadProps(__spreadValues({}, variable), {
            collectionName: collection.name,
            collectionId: collection.id
          }));
        });
      });
    }
    currentVariableMap.forEach((currentVar, key) => {
      const lastVar = lastVariableMap.get(key);
      if (!lastVar) {
        changes.added.push(__spreadProps(__spreadValues({}, currentVar), {
          changeType: "added"
        }));
        changes.summary.totalAdded++;
      } else if (currentVar.value !== lastVar.value || currentVar.tokenType !== lastVar.tokenType || currentVar.name !== lastVar.name) {
        changes.modified.push(__spreadProps(__spreadValues({}, currentVar), {
          changeType: "modified",
          oldValue: lastVar.value,
          oldType: lastVar.tokenType,
          oldName: lastVar.name
        }));
        changes.summary.totalModified++;
      }
    });
    lastVariableMap.forEach((lastVar, key) => {
      if (!currentVariableMap.has(key)) {
        changes.deleted.push(__spreadProps(__spreadValues({}, lastVar), {
          changeType: "deleted"
        }));
        changes.summary.totalDeleted++;
      }
    });
    const currentCollectionNames = new Set(currentCollections.map((c) => c.name));
    const lastCollectionNames = new Set(((_a = lastPushedState.collections) == null ? void 0 : _a.map((c) => c.name)) || []);
    currentCollectionNames.forEach((name) => {
      if (!lastCollectionNames.has(name)) {
        changes.collections.added.push(name);
        changes.summary.collectionsAdded++;
      }
    });
    lastCollectionNames.forEach((name) => {
      if (!currentCollectionNames.has(name)) {
        changes.collections.deleted.push(String(name));
        changes.summary.collectionsDeleted++;
      }
    });
    return changes;
  }
  async function saveCurrentStateAsLastPushed(tokenSets) {
    try {
      const collections = await figma.variables.getLocalVariableCollectionsAsync();
      const currentState = {
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        collections: await Promise.all(collections.map(async (collection) => ({
          id: collection.id,
          name: collection.name,
          variables: (await Promise.all(collection.variableIds.map(async (id) => {
            const variable = await figma.variables.getVariableByIdAsync(id);
            if (!variable)
              return null;
            const modes = Object.keys(variable.valuesByMode);
            let value = "";
            let tokenType = "unknown";
            if (modes.length > 0) {
              const defaultValue = variable.valuesByMode[modes[0]];
              if (typeof defaultValue === "object" && "type" in defaultValue && defaultValue.type === "VARIABLE_ALIAS") {
                const aliasVariable = await figma.variables.getVariableByIdAsync(defaultValue.id);
                value = aliasVariable ? `{${aliasVariable.name}}` : "unknown";
                tokenType = mapFigmaTypeToFragmento(variable.resolvedType).type;
              } else {
                const typeMapping = mapFigmaTypeToFragmento(variable.resolvedType, variable.name, defaultValue);
                tokenType = typeMapping.type;
                if (variable.resolvedType === "COLOR" && typeof defaultValue === "object" && "r" in defaultValue) {
                  const r = Math.round(defaultValue.r * 255);
                  const g = Math.round(defaultValue.g * 255);
                  const b = Math.round(defaultValue.b * 255);
                  value = `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
                } else if (variable.resolvedType === "FLOAT") {
                  const floatValue = Number(defaultValue);
                  value = tokenType === "spacing" ? `${floatValue}px` : String(floatValue);
                } else {
                  value = String(defaultValue);
                }
              }
            }
            return {
              id: variable.id,
              name: variable.name,
              resolvedType: variable.resolvedType,
              tokenType,
              value
            };
          }))).filter(Boolean)
        })))
      };
      await figma.clientStorage.setAsync(LAST_PUSHED_STATE_KEY, JSON.stringify(currentState));
      console.log("Saved current state as last pushed state");
    } catch (error) {
      console.error("Error saving current state:", error);
    }
  }
  function mapFigmaTypeToFragmento(figmaType, variableName, value) {
    switch (figmaType) {
      case "COLOR":
        return { type: "color", hasWarning: false, warningMessage: "" };
      case "FLOAT":
        if (variableName) {
          const name = variableName.toLowerCase();
          if (name.includes("spacing") || name.includes("gap") || name.includes("margin") || name.includes("padding") || name.includes("size") || name.includes("width") || name.includes("height") || name.includes("radius")) {
            return { type: "spacing", hasWarning: false, warningMessage: "" };
          }
        }
        return { type: "number", hasWarning: false, warningMessage: "" };
      case "STRING":
        if (variableName && value) {
          const name = variableName.toLowerCase();
          const stringValue = String(value).toLowerCase();
          if (name.includes("font") || name.includes("family") || stringValue.includes("arial") || stringValue.includes("helvetica") || stringValue.includes("times") || stringValue.includes("georgia") || stringValue.includes("sans") || stringValue.includes("serif") || stringValue.includes("mono")) {
            return { type: "fontFamily", hasWarning: false, warningMessage: "" };
          }
        }
        return { type: "string", hasWarning: false, warningMessage: "" };
      case "BOOLEAN":
        return {
          type: "string",
          hasWarning: true,
          warningMessage: "BOOLEAN variables are not directly supported and will be converted to strings"
        };
      default:
        return {
          type: "unknown",
          hasWarning: true,
          warningMessage: `Unknown variable type: ${figmaType}`
        };
    }
  }
  async function handleScanVariables() {
    try {
      console.log("Scanning Figma variables...");
      const collections = await figma.variables.getLocalVariableCollectionsAsync();
      console.log("Found collections:", collections.length);
      const lastPushedStateStr = await figma.clientStorage.getAsync(LAST_PUSHED_STATE_KEY);
      const lastPushedState = lastPushedStateStr ? JSON.parse(lastPushedStateStr) : null;
      const processedCollections = [];
      let totalVariableCount = 0;
      for (const collection of collections) {
        const variables = (await Promise.all(collection.variableIds.map(async (id) => {
          const variable = await figma.variables.getVariableByIdAsync(id);
          if (!variable)
            return null;
          let value = "";
          let isAlias = false;
          let aliasName = "";
          let tokenType = "unknown";
          let hasWarning = false;
          let warningMessage = "";
          const modes = Object.keys(variable.valuesByMode);
          if (modes.length > 0) {
            const defaultValue = variable.valuesByMode[modes[0]];
            if (typeof defaultValue === "object" && "type" in defaultValue && defaultValue.type === "VARIABLE_ALIAS") {
              isAlias = true;
              const aliasVariable = await figma.variables.getVariableByIdAsync(defaultValue.id);
              aliasName = aliasVariable ? aliasVariable.name : "unknown";
              value = `{${aliasName}}`;
              tokenType = mapFigmaTypeToFragmento(variable.resolvedType).type;
            } else {
              const typeMapping = mapFigmaTypeToFragmento(variable.resolvedType, variable.name, defaultValue);
              tokenType = typeMapping.type;
              hasWarning = typeMapping.hasWarning;
              warningMessage = typeMapping.warningMessage;
              if (variable.resolvedType === "COLOR") {
                if (typeof defaultValue === "object" && "r" in defaultValue) {
                  const r = Math.round(defaultValue.r * 255);
                  const g = Math.round(defaultValue.g * 255);
                  const b = Math.round(defaultValue.b * 255);
                  value = `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
                } else {
                  value = String(defaultValue);
                }
              } else if (variable.resolvedType === "FLOAT") {
                const floatValue = Number(defaultValue);
                if (tokenType === "spacing") {
                  value = `${floatValue}px`;
                } else {
                  value = String(floatValue);
                }
              } else {
                value = String(defaultValue);
              }
            }
          }
          return {
            id: variable.id,
            name: variable.name,
            resolvedType: variable.resolvedType,
            tokenType,
            value,
            isAlias,
            aliasName,
            hasWarning,
            warningMessage
          };
        }))).filter(Boolean);
        totalVariableCount += variables.length;
        processedCollections.push({
          id: collection.id,
          name: collection.name,
          variables
        });
      }
      console.log(`Processed ${totalVariableCount} variables across ${processedCollections.length} collections`);
      let changeAnalysis = null;
      if (lastPushedState) {
        changeAnalysis = detectChanges(processedCollections, lastPushedState);
        console.log("Change analysis:", changeAnalysis);
      }
      figma.ui.postMessage({
        type: "variables-scanned",
        payload: {
          collections: processedCollections,
          totalCount: totalVariableCount,
          changeAnalysis,
          isFirstScan: !lastPushedState
        }
      });
    } catch (error) {
      console.error("Error scanning variables:", error);
      figma.ui.postMessage({
        type: "auth-error",
        payload: { message: "Failed to scan variables" }
      });
    }
  }
  async function handleImportVariables(selectedVariables) {
    try {
      console.log("Importing variables:", selectedVariables.length);
      const storedToken = await figma.clientStorage.getAsync(AUTH_TOKEN_KEY);
      const storedProject = await figma.clientStorage.getAsync(SELECTED_PROJECT_KEY);
      if (!storedToken || !storedProject) {
        throw new Error("Missing authentication or project selection");
      }
      const authToken = JSON.parse(storedToken);
      const project = JSON.parse(storedProject);
      const variablesToImport = [];
      const collections = await figma.variables.getLocalVariableCollectionsAsync();
      for (const selection of selectedVariables) {
        const variable = await figma.variables.getVariableByIdAsync(selection.variableId);
        const collection = collections.find((c) => c.id === selection.collectionId);
        if (variable && collection) {
          const modes = Object.keys(variable.valuesByMode);
          let value = "";
          if (modes.length > 0) {
            const defaultValue = variable.valuesByMode[modes[0]];
            if (typeof defaultValue === "object" && "type" in defaultValue && defaultValue.type === "VARIABLE_ALIAS") {
              const aliasVariable = await figma.variables.getVariableByIdAsync(defaultValue.id);
              value = aliasVariable ? `{${aliasVariable.name}}` : "unknown";
            } else if (variable.resolvedType === "COLOR" && typeof defaultValue === "object" && "r" in defaultValue) {
              const r = Math.round(defaultValue.r * 255);
              const g = Math.round(defaultValue.g * 255);
              const b = Math.round(defaultValue.b * 255);
              value = `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
            } else {
              value = String(defaultValue);
            }
          }
          variablesToImport.push({
            name: variable.name,
            type: variable.resolvedType.toLowerCase(),
            value,
            collection: collection.name,
            figmaId: variable.id
          });
        }
      }
      console.log("Variables to import:", variablesToImport);
      figma.ui.postMessage({
        type: "import-success",
        payload: {
          message: `Successfully imported ${variablesToImport.length} variables`,
          count: variablesToImport.length
        }
      });
    } catch (error) {
      console.error("Error importing variables:", error);
      figma.ui.postMessage({
        type: "import-error",
        payload: { message: "Failed to import variables" }
      });
    }
  }
  async function handlePushSelectedVariables(selectedVariables) {
    try {
      console.log("Pushing selected variables to Fragmento:", selectedVariables.length);
      const storedToken = await figma.clientStorage.getAsync(AUTH_TOKEN_KEY);
      const storedProject = await figma.clientStorage.getAsync(SELECTED_PROJECT_KEY);
      if (!storedToken || !storedProject) {
        throw new Error("Missing authentication or project selection");
      }
      const authToken = JSON.parse(storedToken);
      const project = JSON.parse(storedProject);
      const collectionMap = /* @__PURE__ */ new Map();
      const collections = await figma.variables.getLocalVariableCollectionsAsync();
      for (const selection of selectedVariables) {
        const variable = await figma.variables.getVariableByIdAsync(selection.variableId);
        const collection = collections.find((c) => c.id === selection.collectionId);
        if (variable && collection) {
          if (!collectionMap.has(collection.id)) {
            collectionMap.set(collection.id, {
              id: collection.id,
              name: collection.name,
              variables: []
            });
          }
          const modes = Object.keys(variable.valuesByMode);
          let value = "";
          let tokenType = "unknown";
          if (modes.length > 0) {
            const defaultValue = variable.valuesByMode[modes[0]];
            if (typeof defaultValue === "object" && "type" in defaultValue && defaultValue.type === "VARIABLE_ALIAS") {
              const aliasVariable = await figma.variables.getVariableByIdAsync(defaultValue.id);
              value = aliasVariable ? `{${aliasVariable.name}}` : "unknown";
              tokenType = mapFigmaTypeToFragmento(variable.resolvedType).type;
            } else {
              const typeMapping = mapFigmaTypeToFragmento(variable.resolvedType, variable.name, defaultValue);
              tokenType = typeMapping.type;
              if (variable.resolvedType === "COLOR" && typeof defaultValue === "object" && "r" in defaultValue) {
                const r = Math.round(defaultValue.r * 255);
                const g = Math.round(defaultValue.g * 255);
                const b = Math.round(defaultValue.b * 255);
                value = `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
              } else if (variable.resolvedType === "FLOAT") {
                const floatValue = Number(defaultValue);
                value = tokenType === "spacing" ? `${floatValue}px` : String(floatValue);
              } else {
                value = String(defaultValue);
              }
            }
          }
          collectionMap.get(collection.id).variables.push({
            name: variable.name,
            type: tokenType,
            value,
            figmaId: variable.id,
            resolvedType: variable.resolvedType
          });
        }
      }
      const tokenSets = Array.from(collectionMap.values()).map((collection) => ({
        name: collection.name,
        tokens: collection.variables.map((variable) => ({
          name: variable.name,
          type: variable.type,
          value: variable.value,
          description: ""
        }))
      }));
      console.log("Token sets to push:", tokenSets);
      figma.ui.postMessage({
        type: "push-progress",
        payload: {
          stage: "pushing",
          message: "Pushing variables to Fragmento..."
        }
      });
      try {
        const response = await fetch("https://fragmento-theta.vercel.app/api/figma/push-variables", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${authToken.token}`
          },
          body: JSON.stringify({
            projectId: project.id,
            tokenSets,
            metadata: {
              figmaFileId: figma.fileKey,
              figmaFileName: figma.root.name,
              timestamp: (/* @__PURE__ */ new Date()).toISOString(),
              source: "figma_plugin"
            }
          })
        });
        figma.ui.postMessage({
          type: "push-progress",
          payload: {
            stage: "processing",
            message: "Processing tokens and creating sets..."
          }
        });
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
        }
        const result = await response.json();
        figma.ui.postMessage({
          type: "push-progress",
          payload: {
            stage: "completing",
            message: "Finalizing changes..."
          }
        });
        await saveCurrentStateAsLastPushed(tokenSets);
        figma.ui.postMessage({
          type: "push-success",
          payload: {
            message: result.message,
            results: result.results,
            changes: result.changes,
            projectUrl: result.projectUrl,
            summary: {
              totalVariables: selectedVariables.length,
              tokensCreated: result.results.tokensCreated,
              tokensUpdated: result.results.tokensUpdated,
              setsCreated: result.results.setsCreated,
              errors: result.results.errors
            }
          }
        });
      } catch (apiError) {
        console.error("API Error:", apiError);
        throw apiError;
      }
    } catch (error) {
      console.error("Error pushing variables:", error);
      figma.ui.postMessage({
        type: "push-error",
        payload: { message: "Failed to push variables to Fragmento" }
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
  function cleanup() {
    if (currentPollInterval) {
      clearInterval(currentPollInterval);
      currentPollInterval = null;
    }
  }
  figma.on("close", cleanup);
  setTimeout(() => {
    try {
      init().catch((error) => {
        console.error("Plugin initialization failed:", error);
        figma.ui.postMessage({
          type: "auth-status",
          payload: { isAuthenticated: false, authToken: null }
        });
      });
    } catch (error) {
      console.error("Plugin initialization error:", error);
      figma.ui.postMessage({
        type: "auth-status",
        payload: { isAuthenticated: false, authToken: null }
      });
    }
  }, 500);
})();
