-- Enable Row Level Security so users can only access their own organizations and projects.
-- Without this, anyone with a link could see another user's data when logged in.

-- Organizations: only the owner can read/write
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own organizations"
  ON organizations FOR SELECT
  USING (owner_id = auth.uid());

CREATE POLICY "Users can insert own organizations"
  ON organizations FOR INSERT
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Users can update own organizations"
  ON organizations FOR UPDATE
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Users can delete own organizations"
  ON organizations FOR DELETE
  USING (owner_id = auth.uid());

-- Projects: only accessible if the organization is owned by the user
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view projects in own organizations"
  ON projects FOR SELECT
  USING (
    organization_id IN (
      SELECT id FROM organizations WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert projects in own organizations"
  ON projects FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT id FROM organizations WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can update projects in own organizations"
  ON projects FOR UPDATE
  USING (
    organization_id IN (
      SELECT id FROM organizations WHERE owner_id = auth.uid()
    )
  )
  WITH CHECK (
    organization_id IN (
      SELECT id FROM organizations WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete projects in own organizations"
  ON projects FOR DELETE
  USING (
    organization_id IN (
      SELECT id FROM organizations WHERE owner_id = auth.uid()
    )
  );

-- Helper: projects the current user can access
-- Used by policies on child tables

-- token_sets
ALTER TABLE token_sets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage token_sets in own projects"
  ON token_sets FOR ALL
  USING (
    project_id IN (
      SELECT p.id FROM projects p
      JOIN organizations o ON o.id = p.organization_id
      WHERE o.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    project_id IN (
      SELECT p.id FROM projects p
      JOIN organizations o ON o.id = p.organization_id
      WHERE o.owner_id = auth.uid()
    )
  );

-- tokens
ALTER TABLE tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage tokens in own projects"
  ON tokens FOR ALL
  USING (
    project_id IN (
      SELECT p.id FROM projects p
      JOIN organizations o ON o.id = p.organization_id
      WHERE o.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    project_id IN (
      SELECT p.id FROM projects p
      JOIN organizations o ON o.id = p.organization_id
      WHERE o.owner_id = auth.uid()
    )
  );

-- token_references (access via from_token_id / to_token_id; both tokens must be in accessible projects)
ALTER TABLE token_references ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage token_references in own projects"
  ON token_references FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM tokens t
      JOIN projects p ON p.id = t.project_id
      JOIN organizations o ON o.id = p.organization_id
      WHERE o.owner_id = auth.uid()
        AND (t.id = from_token_id OR t.id = to_token_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM tokens t
      JOIN projects p ON p.id = t.project_id
      JOIN organizations o ON o.id = p.organization_id
      WHERE o.owner_id = auth.uid()
        AND (t.id = from_token_id OR t.id = to_token_id)
    )
  );

-- changes
ALTER TABLE changes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage changes in own projects"
  ON changes FOR ALL
  USING (
    project_id IN (
      SELECT p.id FROM projects p
      JOIN organizations o ON o.id = p.organization_id
      WHERE o.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    project_id IN (
      SELECT p.id FROM projects p
      JOIN organizations o ON o.id = p.organization_id
      WHERE o.owner_id = auth.uid()
    )
  );

-- releases
ALTER TABLE releases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage releases in own projects"
  ON releases FOR ALL
  USING (
    project_id IN (
      SELECT p.id FROM projects p
      JOIN organizations o ON o.id = p.organization_id
      WHERE o.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    project_id IN (
      SELECT p.id FROM projects p
      JOIN organizations o ON o.id = p.organization_id
      WHERE o.owner_id = auth.uid()
    )
  );

-- github_integrations
ALTER TABLE github_integrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage github_integrations in own projects"
  ON github_integrations FOR ALL
  USING (
    project_id IN (
      SELECT p.id FROM projects p
      JOIN organizations o ON o.id = p.organization_id
      WHERE o.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    project_id IN (
      SELECT p.id FROM projects p
      JOIN organizations o ON o.id = p.organization_id
      WHERE o.owner_id = auth.uid()
    )
  );

-- slack_integrations
ALTER TABLE slack_integrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage slack_integrations in own projects"
  ON slack_integrations FOR ALL
  USING (
    project_id IN (
      SELECT p.id FROM projects p
      JOIN organizations o ON o.id = p.organization_id
      WHERE o.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    project_id IN (
      SELECT p.id FROM projects p
      JOIN organizations o ON o.id = p.organization_id
      WHERE o.owner_id = auth.uid()
    )
  );
