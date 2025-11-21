import React from 'react';
import { Organization } from '../../types';

interface OrganizationSelectorProps {
  organizations: Organization[];
  selectedOrganization: Organization | null;
  onSelect: (org: Organization) => void;
}

const OrganizationSelector: React.FC<OrganizationSelectorProps> = ({
  organizations,
  selectedOrganization,
  onSelect
}) => {
  return (
    <div className="selector">
      <label htmlFor="organization-select">Organization</label>
      <select
        id="organization-select"
        value={selectedOrganization?.id || ''}
        onChange={(e) => {
          const org = organizations.find(o => o.id === e.target.value);
          if (org) onSelect(org);
        }}
      >
        <option value="">Select an organization</option>
        {organizations.map(org => (
          <option key={org.id} value={org.id}>
            {org.name}
          </option>
        ))}
      </select>
    </div>
  );
};

export default OrganizationSelector;
