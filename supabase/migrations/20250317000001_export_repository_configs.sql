-- Persist per-format GitHub repository selection for exports/releases
CREATE TABLE IF NOT EXISTS export_repository_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  format text NOT NULL CHECK (format IN ('shadcn','android','ios','tailwind','raw-json')),
  github_integration_id uuid REFERENCES github_integrations(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (project_id, format)
);

-- RLS
ALTER TABLE export_repository_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage export_repository_configs in own projects"
  ON export_repository_configs FOR ALL
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

