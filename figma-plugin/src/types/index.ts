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
  | 'get-auth-status'
  | 'authenticate'
  | 'auth-initiated'
  | 'get-variables'
  | 'push-variables'
  | 'fetch-organizations'
  | 'fetch-projects'
  | 'organizations-loaded'
  | 'projects-loaded'
  | 'user-info-loaded'
  | 'store-organization'
  | 'store-project'
  | 'clear-organization'
  | 'clear-project'
  | 'set-auth-token'
  | 'logout';

export interface PluginMessage {
  type: MessageType;
  payload?: any;
}
