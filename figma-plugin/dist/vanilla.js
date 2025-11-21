// Vanilla JavaScript implementation for Figma plugin UI
console.log('Fragmento plugin UI loaded');

class FragmentoPlugin {
  constructor() {
    this.state = {
      isAuthenticated: false,
      authToken: null,
      selectedOrganization: null,
      selectedProject: null,
      organizations: [],
      projects: [],
      collections: [],
      isLoading: true,
      error: null
    };
    
    this.init();
  }

  init() {
    // Listen for messages from the plugin
    window.onmessage = (event) => {
      const message = event.data.pluginMessage;
      if (!message) return;
      this.handlePluginMessage(message);
    };

    this.render();
  }

  handlePluginMessage(message) {
    console.log('Received message:', message);
    
    switch (message.type) {
      case 'auth-status':
        this.state.isAuthenticated = message.payload.isAuthenticated;
        this.state.authToken = message.payload.authToken;
        this.state.isLoading = false;
        this.render();
        break;

      case 'auth-success':
        this.state.isAuthenticated = true;
        this.state.authToken = message.payload.authToken;
        this.state.error = null;
        this.render();
        // Fetch organizations
        this.postMessage({ 
          type: 'fetch-organizations', 
          payload: { authToken: message.payload.authToken } 
        });
        break;

      case 'organizations-loaded':
        this.state.organizations = message.payload.organizations;
        this.render();
        break;

      case 'projects-loaded':
        this.state.projects = message.payload.projects;
        this.render();
        break;

      case 'variables-loaded':
        this.state.collections = message.payload.collections;
        this.showVariablesView();
        break;

      case 'push-success':
        this.state.error = null;
        alert('Variables successfully pushed to Fragmento!');
        break;

      case 'error':
      case 'auth-error':
      case 'push-error':
        this.state.error = message.payload.message;
        this.render();
        break;

      case 'logout-success':
        this.state = {
          isAuthenticated: false,
          authToken: null,
          selectedOrganization: null,
          selectedProject: null,
          organizations: [],
          projects: [],
          collections: [],
          isLoading: false,
          error: null
        };
        this.render();
        break;
    }
  }

  postMessage(message) {
    parent.postMessage({ pluginMessage: message }, '*');
  }

  render() {
    const container = document.getElementById('react-page');
    
    if (this.state.isLoading) {
      container.innerHTML = this.renderLoading();
    } else if (!this.state.isAuthenticated) {
      container.innerHTML = this.renderAuthScreen();
    } else {
      container.innerHTML = this.renderMainScreen();
    }
    
    this.attachEventListeners();
  }

  renderLoading() {
    return `
      <div class="loading-container">
        <div class="loading-spinner"></div>
        <p>Loading...</p>
      </div>
    `;
  }

  renderAuthScreen() {
    return `
      <div class="auth-screen">
        <div class="auth-header">
          <div class="logo">
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
              <rect width="32" height="32" rx="8" fill="#6366F1"/>
              <path d="M8 12h16v2H8v-2zm0 4h12v2H8v-2zm0 4h8v2H8v-2z" fill="white"/>
            </svg>
          </div>
          <h1>Fragmento</h1>
          <p>Design Token Management</p>
        </div>

        <div class="auth-content">
          <h2>Connect to Fragmento</h2>
          <p>
            Sync your Figma variables with your design token system. 
            Authenticate with your Fragmento account to get started.
          </p>

          ${this.state.error ? `
            <div class="error-message">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M8 1.5a6.5 6.5 0 100 13 6.5 6.5 0 000-13zM7 5h2v4H7V5zm0 5h2v1H7v-1z" fill="#EF4444"/>
              </svg>
              ${this.state.error}
            </div>
          ` : ''}

          <button class="auth-button" id="auth-btn">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M10 2L3 7v11h4v-6h6v6h4V7l-7-5z" fill="currentColor"/>
            </svg>
            Authenticate with Fragmento
          </button>

          <div class="auth-info">
            <h3>This plugin will request access to:</h3>
            <ul>
              <li>Read and write Figma variables</li>
              <li>Access your Fragmento projects and tokens</li>
              <li>Sync changes between Figma and your web app</li>
            </ul>
          </div>
        </div>

        <div class="auth-footer">
          <p>
            Need help? <a href="https://fragmento.app/support" target="_blank" rel="noopener noreferrer">Contact Support</a>
          </p>
        </div>
      </div>
    `;
  }

  renderMainScreen() {
    return `
      <div class="main-screen">
        <div class="main-header">
          <div class="header-content">
            <div class="logo-small">
              <svg width="24" height="24" viewBox="0 0 32 32" fill="none">
                <rect width="32" height="32" rx="8" fill="#6366F1"/>
                <path d="M8 12h16v2H8v-2zm0 4h12v2H8v-2zm0 4h8v2H8v-2z" fill="white"/>
              </svg>
              <span>Fragmento</span>
            </div>
            <button class="logout-button" id="logout-btn">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M6 2H3a1 1 0 00-1 1v10a1 1 0 001 1h3M10 6l4 4-4 4M14 10H6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </button>
          </div>
        </div>

        <div class="main-content">
          <div class="selectors">
            ${this.renderOrganizationSelector()}
            ${this.state.selectedOrganization ? this.renderProjectSelector() : ''}
          </div>

          ${this.state.error ? `
            <div class="error-message">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M8 1.5a6.5 6.5 0 100 13 6.5 6.5 0 000-13zM7 5h2v4H7V5zm0 5h2v1H7v-1z" fill="#EF4444"/>
              </svg>
              ${this.state.error}
            </div>
          ` : ''}

          ${this.state.selectedProject ? this.renderEmptyState() : ''}
        </div>
      </div>
    `;
  }

  renderOrganizationSelector() {
    return `
      <div class="selector">
        <label for="organization-select">Organization</label>
        <select id="organization-select">
          <option value="">Select an organization</option>
          ${this.state.organizations.map(org => 
            `<option value="${org.id}" ${this.state.selectedOrganization?.id === org.id ? 'selected' : ''}>${org.name}</option>`
          ).join('')}
        </select>
      </div>
    `;
  }

  renderProjectSelector() {
    return `
      <div class="selector">
        <label for="project-select">Project</label>
        <select id="project-select">
          <option value="">Select a project</option>
          ${this.state.projects.map(project => 
            `<option value="${project.id}" ${this.state.selectedProject?.id === project.id ? 'selected' : ''}>${project.name}</option>`
          ).join('')}
        </select>
      </div>
    `;
  }

  renderEmptyState() {
    return `
      <div class="empty-state">
        <div class="empty-state-content">
          <div class="empty-state-icon">
            <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
              <rect x="8" y="12" width="32" height="24" rx="4" stroke="#9CA3AF" stroke-width="2" fill="none"/>
              <path d="M16 20h16M16 24h12M16 28h8" stroke="#9CA3AF" stroke-width="2" stroke-linecap="round"/>
            </svg>
          </div>
          
          <h3>Ready to sync your design tokens</h3>
          <p>
            Import your Figma variables to sync them with your Fragmento project. 
            Variables will be organized by collections and can be pushed to your web app.
          </p>

          <div class="empty-state-actions">
            <button class="primary-button" id="import-btn">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M8 1v10M4 7l4 4 4-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
              Import Variables
            </button>
          </div>

          <div class="empty-state-info">
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
    `;
  }

  showVariablesView() {
    const container = document.getElementById('react-page');
    container.innerHTML = `
      <div class="variables-view">
        <div class="variables-header">
          <button class="back-button" id="back-btn">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M10 12l-4-4 4-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            Back
          </button>
          
          <h2>All Variables</h2>
          
          <button class="push-button" id="push-btn" ${this.state.collections.length === 0 ? 'disabled' : ''}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M8 15V5M4 9l4-4 4 4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            Push to Fragmento
          </button>
        </div>

        <div class="variables-content">
          ${this.state.collections.length === 0 ? `
            <div class="no-variables">
              <p>No variables found in this Figma file.</p>
              <p>Create some variables in Figma and try importing again.</p>
            </div>
          ` : this.state.collections.map(collection => this.renderCollection(collection)).join('')}
        </div>
      </div>
    `;
    
    this.attachEventListeners();
  }

  renderCollection(collection) {
    return `
      <div class="collection">
        <h3 class="collection-title">${collection.name}</h3>
        
        <div class="variables-table">
          <div class="table-header">
            <div class="table-cell">Name</div>
            <div class="table-cell">Type</div>
            <div class="table-cell">Value</div>
            <div class="table-cell">Description</div>
          </div>
          
          ${collection.variables.map(variable => `
            <div class="table-row">
              <div class="table-cell variable-name">${variable.name}</div>
              <div class="table-cell variable-type">
                <span class="type-badge type-${variable.resolvedType.toLowerCase()}">
                  ${variable.resolvedType.toLowerCase()}
                </span>
              </div>
              <div class="table-cell variable-value">
                ${this.formatVariableValue(variable)}
              </div>
              <div class="table-cell variable-description">
                ${variable.description || '—'}
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  formatVariableValue(variable) {
    const modeIds = Object.keys(variable.valuesByMode);
    if (modeIds.length === 0) return 'No value';
    
    const value = variable.valuesByMode[modeIds[0]];
    
    if (variable.resolvedType === 'COLOR' && typeof value === 'object' && value !== null) {
      const rgbValue = `rgb(${Math.round(value.r * 255)}, ${Math.round(value.g * 255)}, ${Math.round(value.b * 255)})`;
      return `
        <div class="color-value">
          <div class="color-swatch" style="background-color: ${rgbValue}"></div>
          <span>${rgbValue}</span>
        </div>
      `;
    }
    
    return String(value);
  }

  attachEventListeners() {
    // Auth button
    const authBtn = document.getElementById('auth-btn');
    if (authBtn) {
      authBtn.onclick = () => this.postMessage({ type: 'authenticate' });
    }

    // Logout button
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
      logoutBtn.onclick = () => this.postMessage({ type: 'logout' });
    }

    // Organization selector
    const orgSelect = document.getElementById('organization-select');
    if (orgSelect) {
      orgSelect.onchange = (e) => {
        const org = this.state.organizations.find(o => o.id === e.target.value);
        if (org) {
          this.state.selectedOrganization = org;
          this.state.selectedProject = null;
          this.state.projects = [];
          this.render();
          
          if (this.state.authToken) {
            this.postMessage({ 
              type: 'fetch-projects', 
              payload: { 
                authToken: this.state.authToken, 
                organizationId: org.id 
              } 
            });
          }
        }
      };
    }

    // Project selector
    const projectSelect = document.getElementById('project-select');
    if (projectSelect) {
      projectSelect.onchange = (e) => {
        const project = this.state.projects.find(p => p.id === e.target.value);
        if (project) {
          this.state.selectedProject = project;
          this.render();
        }
      };
    }

    // Import button
    const importBtn = document.getElementById('import-btn');
    if (importBtn) {
      importBtn.onclick = () => this.postMessage({ type: 'get-variables' });
    }

    // Back button
    const backBtn = document.getElementById('back-btn');
    if (backBtn) {
      backBtn.onclick = () => this.render();
    }

    // Push button
    const pushBtn = document.getElementById('push-btn');
    if (pushBtn) {
      pushBtn.onclick = () => {
        if (confirm(`Push ${this.state.collections.reduce((sum, col) => sum + col.variables.length, 0)} variables to Fragmento?`)) {
          this.postMessage({ 
            type: 'push-variables', 
            payload: { 
              collections: this.state.collections, 
              authToken: this.state.authToken, 
              projectId: this.state.selectedProject.id 
            } 
          });
        }
      };
    }
  }
}

// Initialize the plugin
new FragmentoPlugin();
