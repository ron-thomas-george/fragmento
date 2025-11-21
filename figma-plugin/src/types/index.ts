/// <reference types="@figma/plugin-typings" />

export interface AuthToken {
  token: string;
  expiresAt: number;
  userId: string;
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
}

export interface Project {
  id: string;
  name: string;
  organizationId: string;
}

export interface TokenSet {
  id: string;
  name: string;
  projectId: string;
}

export interface Token {
  id: string;
  name: string;
  type: string;
  value: string;
  description?: string;
  setId: string;
}

export interface FigmaVariable {
  id: string;
  name: string;
  resolvedType: VariableResolvedDataType;
  valuesByMode: { [modeId: string]: VariableValue };
  description: string;
  collectionId: string;
}

export interface FigmaCollection {
  id: string;
  name: string;
  variables: FigmaVariable[];
}

export interface AppState {
  isAuthenticated: boolean;
  authToken: AuthToken | null;
  selectedOrganization: Organization | null;
  selectedProject: Project | null;
  organizations: Organization[];
  projects: Project[];
  collections: FigmaCollection[];
  isLoading: boolean;
  error: string | null;
}

export type MessageType = 
  | 'ping'
  | 'pong'
  | 'get-auth-status'
  | 'authenticate'
  | 'auth-initiated'
  | 'auth-success'
  | 'auth-error'
  | 'set-auth-token'
  | 'token-found'
  | 'poll-token'
  | 'get-variables'
  | 'variables-loaded'
  | 'push-variables'
  | 'push-success'
  | 'push-error'
  | 'fetch-organizations'
  | 'organizations-loaded'
  | 'fetch-projects'
  | 'projects-loaded'
  | 'store-organization'
  | 'store-project'
  | 'clear-organization'
  | 'clear-project'
  | 'user-info-loaded'
  | 'logout'
  | 'load-project'
  | 'project-loaded'
  | 'scan-variables'
  | 'variables-scanned'
  | 'import-variables'
  | 'import-success'
  | 'import-error'
  | 'push-progress'
  | 'push-success'
  | 'push-error'
  | 'open-url';

export interface PluginMessage {
  type: MessageType;
  payload?: any;
}
