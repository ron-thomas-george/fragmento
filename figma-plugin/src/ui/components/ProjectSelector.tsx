import React from 'react';
import { Project } from '../../types';

interface ProjectSelectorProps {
  projects: Project[];
  selectedProject: Project | null;
  onSelect: (project: Project) => void;
}

const ProjectSelector: React.FC<ProjectSelectorProps> = ({
  projects,
  selectedProject,
  onSelect
}) => {
  return (
    <div className="selector">
      <label htmlFor="project-select">Project</label>
      <select
        id="project-select"
        value={selectedProject?.id || ''}
        onChange={(e) => {
          const project = projects.find(p => p.id === e.target.value);
          if (project) onSelect(project);
        }}
      >
        <option value="">Select a project</option>
        {projects.map(project => (
          <option key={project.id} value={project.id}>
            {project.name}
          </option>
        ))}
      </select>
    </div>
  );
};

export default ProjectSelector;
