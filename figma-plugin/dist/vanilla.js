// Vanilla JavaScript implementation for Figma plugin UI
console.log('Fragmento plugin UI loaded');

// Signal that JavaScript loaded successfully
if (window.jsLoaded) {
  window.jsLoaded();
}

class FragmentoPlugin {
  constructor() {
    this.state = {
      isAuthenticated: false,
      authToken: null,
      userInfo: null,
      selectedOrganization: null,
      selectedProject: null,
      organizations: [],
      projects: [],
      collections: [],
      isLoading: true,
      isLoadingProjects: false,
      error: null
    };
    
    this.init();
  }

  init() {
    console.log('FragmentoPlugin UI initializing...');
    
    // Listen for messages from the plugin
    window.onmessage = (event) => {
      console.log('UI received message:', event.data);
      const message = event.data.pluginMessage;
      if (!message) return;
      this.handlePluginMessage(message);
    };

    // Show initial loading state
    this.render();
    
    // Request initial auth status after a short delay
    setTimeout(() => {
      console.log('UI requesting initial auth status...');
      this.postMessage({ type: 'get-auth-status' });
    }, 200);
  }

  handlePluginMessage(message) {
    console.log('Received message:', message);
    
    switch (message.type) {
      case 'auth-status':
        console.log('Received auth-status:', message.payload);
        this.state.isAuthenticated = message.payload.isAuthenticated;
        this.state.authToken = message.payload.authToken;
        this.state.userInfo = message.payload.userInfo;
        this.state.isLoading = false;
        console.log('Updated state - isAuthenticated:', this.state.isAuthenticated);
        this.render();
        break;

      case 'auth-success':
        this.state.isAuthenticated = true;
        this.state.authToken = message.payload.authToken;
        this.state.userInfo = message.payload.userInfo;
        this.state.error = null;
        this.render();
        // Organizations will be fetched automatically by the plugin
        break;

      case 'organizations-loaded':
        this.state.organizations = message.payload.organizations;
        this.render();
        break;

      case 'projects-loaded':
        this.state.projects = message.payload.projects;
        this.state.isLoadingProjects = false;
        this.render();
        break;

      case 'user-info-loaded':
        this.state.userInfo = message.payload.userInfo;
        this.render();
        break;

      case 'auth-initiated':
        this.state.error = null;
        this.state.isLoading = true;
        this.render();
        break;

      case 'poll-token':
        this.handleTokenPolling(message.payload.state, message.payload.attempt);
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

  async handleTokenPolling(state, attempt) {
    try {
      console.log(`UI polling attempt ${attempt} for state: ${state}`);
      
      const response = await fetch(`https://fragmento-theta.vercel.app/api/figma/poll-token?state=${state}`);
      
      if (response.ok) {
        const tokenData = await response.json();
        console.log('Token found via UI polling');
        
        // Send token back to plugin
        this.postMessage({
          type: 'token-found',
          payload: {
            token: tokenData.token,
            userId: tokenData.userId,
            expiresIn: tokenData.expiresIn
          }
        });
      } else if (response.status === 404) {
        // Token not ready yet, plugin will continue polling
        console.log('Token not ready, plugin will continue polling...');
      } else {
        console.error('Token polling failed:', response.status);
      }
    } catch (error) {
      console.error('UI token polling error:', error);
    }
  }

  render() {
    const container = document.getElementById('app');
    
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
        <p>Waiting for authorization...</p>
        <p class="loading-subtext">Complete the authorization in your browser, then return to Figma.</p>
      </div>
    `;
  }

  renderAuthScreen() {
    return `
      <div class="auth-screen">
        <div class="auth-header">
          <div class="logo">
            <svg width="24" height="24" viewBox="0 0 32 32" fill="none">
              <rect width="32" height="32" rx="8" fill="var(--figma-color-bg-brand)"/>
              <path d="M8 12h16v2H8v-2zm0 4h12v2H8v-2zm0 4h8v2H8v-2z" fill="white"/>
            </svg>
          </div>
          <h1>Fragmento</h1>
          <p>Design Token Management</p>
        </div>

        <div class="auth-content">
          ${this.state.error ? `
            <div class="error-message">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M8 1.5a6.5 6.5 0 100 13 6.5 6.5 0 000-13zM7 5h2v4H7V5zm0 5h2v1H7v-1z" fill="#f24822"/>
              </svg>
              ${this.state.error}
              <button class="retry-button" id="retry-btn">Try Again</button>
            </div>
          ` : ''}

          <button class="auth-button" id="auth-btn">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M8 1L3 5v8h2V9h6v4h2V5l-5-4z" fill="currentColor"/>
            </svg>
            Authenticate with Fragmento
          </button>
          
          <button class="secondary-button" id="test-token-btn" style="margin-top: 8px;">
            Check Auth Status
          </button>
          
          <button class="secondary-button" id="debug-btn" style="margin-top: 8px;">
            Debug Info
          </button>

          <div class="auth-description">
            <p>
              This will open your browser to authorize the plugin. You'll be able to review 
              the permissions before granting access.
            </p>
          </div>
        </div>

        <div class="auth-footer">
          <p>
            Need help? <a href="https://fragmento-theta.vercel.app/support" target="_blank" rel="noopener noreferrer">Contact Support</a>
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
              <svg width="20" height="20" viewBox="0 0 32 32" fill="none">
                <rect width="32" height="32" rx="8" fill="var(--figma-color-bg-brand)"/>
                <path d="M8 12h16v2H8v-2zm0 4h12v2H8v-2zm0 4h8v2H8v-2z" fill="white"/>
              </svg>
              <span>Fragmento</span>
            </div>
            <button class="logout-button" id="logout-btn" title="Sign out">
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                <path d="M6 2H3a1 1 0 00-1 1v10a1 1 0 001 1h3M10 6l4 4-4 4M14 10H6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </button>
          </div>
        </div>

        ${this.renderUserInfo()}

        <div class="main-content">
          ${this.state.error ? `
            <div class="error-message">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M8 1.5a6.5 6.5 0 100 13 6.5 6.5 0 000-13zM7 5h2v4H7V5zm0 5h2v1H7v-1z" fill="#f24822"/>
              </svg>
              ${this.state.error}
              <button class="retry-button" id="error-retry-btn">Try Again</button>
            </div>
          ` : ''}

          <div class="selectors">
            ${this.renderOrganizationSelector()}
            ${this.state.selectedOrganization ? this.renderProjectSelector() : ''}
          </div>

          ${this.state.selectedProject ? this.renderProjectActions() : this.renderEmptyState()}
        </div>
      </div>
    `;
  }

  renderUserInfo() {
    if (!this.state.authToken || !this.state.userInfo) return '';
    
    const user = this.state.userInfo;
    const initials = user.full_name ? 
      user.full_name.split(' ').map(n => n[0]).join('').toUpperCase() : 
      user.email[0].toUpperCase();
    
    return `
      <div class="user-info">
        <div class="user-avatar">
          ${user.avatar_url ? 
            `<img src="${user.avatar_url}" alt="${user.full_name || user.email}" />` :
            `<span class="avatar-initials">${initials}</span>`
          }
        </div>
        <div class="user-details">
          <div class="user-name">${user.full_name || 'User'}</div>
          <div class="user-email">${user.email}</div>
        </div>
      </div>
    `;
  }

  renderOrganizationSelector() {
    const hasOrganizations = this.state.organizations.length > 0;
    const isLoading = this.state.isLoading && this.state.organizations.length === 0;
    
    return `
      <div class="selector">
        <label for="organization-select">Organization</label>
        <select id="organization-select" ${isLoading ? 'disabled' : ''}>
          ${isLoading ? 
            '<option value="">Loading organizations...</option>' :
            hasOrganizations ? 
              `<option value="">Select an organization</option>
               ${this.state.organizations.map(org => 
                 `<option value="${org.id}" ${this.state.selectedOrganization?.id === org.id ? 'selected' : ''}>
                   ${org.name}
                 </option>`
               ).join('')}` :
              '<option value="">No organizations available</option>'
          }
        </select>
        ${!hasOrganizations && !isLoading ? `
          <div class="selector-help">
            <a href="https://fragmento-theta.vercel.app/organizations/new" target="_blank" rel="noopener noreferrer">
              Create your first organization
            </a>
          </div>
        ` : ''}
      </div>
    `;
  }

  renderProjectSelector() {
    const hasProjects = this.state.projects.length > 0;
    const isLoading = this.state.isLoadingProjects;
    
    return `
      <div class="selector">
        <label for="project-select">Project</label>
        <select id="project-select" ${isLoading || !this.state.selectedOrganization ? 'disabled' : ''}>
          ${isLoading ? 
            '<option value="">Loading projects...</option>' :
            hasProjects ? 
              `<option value="">Select a project</option>
               ${this.state.projects.map(project => 
                 `<option value="${project.id}" ${this.state.selectedProject?.id === project.id ? 'selected' : ''}>
                   ${project.name} ${project.access_level ? `(${project.access_level})` : ''}
                 </option>`
               ).join('')}` :
              this.state.selectedOrganization ? 
                '<option value="">No projects available</option>' :
                '<option value="">Select an organization first</option>'
          }
        </select>
        ${hasProjects === false && this.state.selectedOrganization && !isLoading ? `
          <div class="selector-help">
            <a href="https://fragmento-theta.vercel.app/organizations/${this.state.selectedOrganization.id}/projects/new" target="_blank" rel="noopener noreferrer">
              Create your first project
            </a>
          </div>
        ` : ''}
      </div>
    `;
  }

  renderProjectActions() {
    if (!this.state.selectedProject) return '';
    
    return `
      <div class="project-actions">
        <div class="project-info">
          <h3>${this.state.selectedProject.name}</h3>
          <p>Ready to sync your design tokens with this project.</p>
        </div>
        
        <div class="action-buttons">
          <button class="primary-button" id="import-btn">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M8 1v10M4 7l4 4 4-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            Import Variables
          </button>
        </div>

        <div class="sync-info">
          <h4>How it works:</h4>
          <ol>
            <li>Import variables from your current Figma file</li>
            <li>Review variables organized by collections</li>
            <li>Push selected variables to your Fragmento project</li>
            <li>Variables appear in Pending Changes for release creation</li>
          </ol>
        </div>
      </div>
    `;
  }

  renderEmptyState() {
    if (this.state.selectedProject) return '';
    
    if (!this.state.selectedOrganization) {
      return `
        <div class="empty-state">
          <div class="empty-state-content">
            <div class="empty-state-icon">
              <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
                <rect x="8" y="12" width="32" height="24" rx="4" stroke="var(--figma-color-icon-secondary)" stroke-width="2" fill="none"/>
                <path d="M16 20h16M16 24h12M16 28h8" stroke="var(--figma-color-icon-secondary)" stroke-width="2" stroke-linecap="round"/>
              </svg>
            </div>
            
            <h3>Select an organization</h3>
            <p>Choose an organization to view its projects and start syncing design tokens.</p>
          </div>
        </div>
      `;
    }
    
    return `
      <div class="empty-state">
        <div class="empty-state-content">
          <div class="empty-state-icon">
            <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
              <rect x="8" y="12" width="32" height="24" rx="4" stroke="var(--figma-color-icon-secondary)" stroke-width="2" fill="none"/>
              <path d="M16 20h16M16 24h12M16 28h8" stroke="var(--figma-color-icon-secondary)" stroke-width="2" stroke-linecap="round"/>
            </svg>
          </div>
          
          <h3>Select a project</h3>
          <p>Choose a project to start syncing your Figma variables with your design token system.</p>
        </div>
      </div>
    `;
  }

  showVariablesView() {
    const container = document.getElementById('app');
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

    // Test token button
    const testTokenBtn = document.getElementById('test-token-btn');
    if (testTokenBtn) {
      testTokenBtn.onclick = () => this.postMessage({ type: 'get-auth-status' });
    }

    // Debug button
    const debugBtn = document.getElementById('debug-btn');
    if (debugBtn) {
      debugBtn.onclick = () => {
        console.log('=== PLUGIN DEBUG INFO ===');
        console.log('State:', this.state);
        console.log('Is Authenticated:', this.state.isAuthenticated);
        console.log('Auth Token:', this.state.authToken);
        console.log('User Info:', this.state.userInfo);
        console.log('Organizations:', this.state.organizations);
        console.log('Projects:', this.state.projects);
        console.log('========================');
        alert('Debug info logged to console. Check Developer Console.');
      };
    }

    // Retry button
    const retryBtn = document.getElementById('retry-btn');
    if (retryBtn) {
      retryBtn.onclick = () => {
        this.state.error = null;
        this.render();
        this.postMessage({ type: 'authenticate' });
      };
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
          this.state.isLoadingProjects = true;
          this.render();
          
          // Store selection persistently
          this.postMessage({ 
            type: 'store-organization', 
            payload: { organization: org } 
          });
          
          if (this.state.authToken) {
            this.postMessage({ 
              type: 'fetch-projects', 
              payload: { 
                authToken: this.state.authToken, 
                organizationId: org.id 
              } 
            });
          }
        } else {
          // Clear selection
          this.state.selectedOrganization = null;
          this.state.selectedProject = null;
          this.state.projects = [];
          this.render();
          
          this.postMessage({ 
            type: 'clear-organization'
          });
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
          
          // Store selection persistently
          this.postMessage({ 
            type: 'store-project', 
            payload: { project: project } 
          });
        } else {
          // Clear selection
          this.state.selectedProject = null;
          this.render();
          
          this.postMessage({ 
            type: 'clear-project'
          });
        }
      };
    }

    // Error retry button
    const errorRetryBtn = document.getElementById('error-retry-btn');
    if (errorRetryBtn) {
      errorRetryBtn.onclick = () => {
        this.state.error = null;
        this.render();
        
        // Retry the last failed operation
        if (this.state.authToken && this.state.organizations.length === 0) {
          this.postMessage({ 
            type: 'fetch-organizations', 
            payload: { authToken: this.state.authToken } 
          });
        } else if (this.state.selectedOrganization && this.state.projects.length === 0) {
          this.postMessage({ 
            type: 'fetch-projects', 
            payload: { 
              authToken: this.state.authToken, 
              organizationId: this.state.selectedOrganization.id 
            } 
          });
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
