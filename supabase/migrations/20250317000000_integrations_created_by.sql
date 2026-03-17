-- Add created_by to integrations for "Added by" display
ALTER TABLE github_integrations
ADD COLUMN IF NOT EXISTS created_by text;

ALTER TABLE slack_integrations
ADD COLUMN IF NOT EXISTS created_by text;
