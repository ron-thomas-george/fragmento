import React, { useState } from 'react';
import { AppState, Organization, Project, FigmaCollection } from '../../types';
import OrganizationSelector from './OrganizationSelector';
import ProjectSelector from './ProjectSelector';
import VariablesView from './VariablesView';
import EmptyState from './EmptyState';

interface MainScreenProps {
  appState: AppState;
  onOrganizationSelect: (org: Organization) => void;
  onProjectSelect: (project: Project) => void;
  onImportVariables: () => void;
  onPushVariables: (collections: FigmaCollection[]) => void;
  onLogout: () => void;
}

const MainScreen: React.FC<MainScreenProps> = ({
  appState,
  onOrganizationSelect,
  onProjectSelect,
  onImportVariables,
  onPushVariables,
  onLogout
}) => {
  const [showVariables, setShowVariables] = useState(false);

  const handleImportClick = () => {
    setShowVariables(true);
    onImportVariables();
  };

  const handleBackToEmpty = () => {
    setShowVariables(false);
  };

  return (
    <div className="main-screen">
      <div className="main-header">
        <div className="header-content">
          <div className="logo-small">
            <svg width="24" height="24" viewBox="0 0 32 32" fill="none">
              <rect width="32" height="32" rx="8" fill="#6366F1"/>
              <path d="M8 12h16v2H8v-2zm0 4h12v2H8v-2zm0 4h8v2H8v-2z" fill="white"/>
            </svg>
            <span>Fragmento</span>
          </div>
          <button className="logout-button" onClick={onLogout}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M6 2H3a1 1 0 00-1 1v10a1 1 0 001 1h3M10 6l4 4-4 4M14 10H6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>
      </div>

      <div className="main-content">
        <div className="selectors">
          <OrganizationSelector
            organizations={appState.organizations}
            selectedOrganization={appState.selectedOrganization}
            onSelect={onOrganizationSelect}
          />
          
          {appState.selectedOrganization && (
            <ProjectSelector
              projects={appState.projects}
              selectedProject={appState.selectedProject}
              onSelect={onProjectSelect}
            />
          )}
        </div>

        {appState.error && (
          <div className="error-message">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M8 1.5a6.5 6.5 0 100 13 6.5 6.5 0 000-13zM7 5h2v4H7V5zm0 5h2v1H7v-1z" fill="#EF4444"/>
            </svg>
            {appState.error}
          </div>
        )}

        {appState.selectedProject && !showVariables && (
          <EmptyState onImportVariables={handleImportClick} />
        )}

        {appState.selectedProject && showVariables && (
          <VariablesView
            collections={appState.collections}
            onPushVariables={onPushVariables}
            onBack={handleBackToEmpty}
          />
        )}
      </div>
    </div>
  );
};

export default MainScreen;
