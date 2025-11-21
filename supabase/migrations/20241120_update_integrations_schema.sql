-- Update github_integrations table to match new schema
ALTER TABLE github_integrations 
ADD COLUMN IF NOT EXISTS access_token text,
ADD COLUMN IF NOT EXISTS repository_owner text,
ADD COLUMN IF NOT EXISTS repository_name text,
ADD COLUMN IF NOT EXISTS branch_name text DEFAULT 'main',
ADD COLUMN IF NOT EXISTS verified boolean DEFAULT false;

-- Drop old columns if they exist
ALTER TABLE github_integrations 
DROP COLUMN IF EXISTS repo_owner,
DROP COLUMN IF EXISTS repo_name,
DROP COLUMN IF EXISTS default_branch;

-- Update slack_integrations table to be project-based
ALTER TABLE slack_integrations 
DROP COLUMN IF EXISTS organization_id,
ADD COLUMN IF NOT EXISTS project_id uuid REFERENCES projects(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS channel_name text,
ADD COLUMN IF NOT EXISTS verified boolean DEFAULT false;

-- Drop old channel column if it exists
ALTER TABLE slack_integrations 
DROP COLUMN IF EXISTS channel;

-- Update releases table schema
ALTER TABLE releases 
ADD COLUMN IF NOT EXISTS type text CHECK (type IN ('major','minor','patch')),
ADD COLUMN IF NOT EXISTS commit_message text,
ADD COLUMN IF NOT EXISTS release_notes text,
ADD COLUMN IF NOT EXISTS changes_count integer DEFAULT 0;

-- Drop old columns if they exist
ALTER TABLE releases 
DROP COLUMN IF EXISTS kind,
DROP COLUMN IF EXISTS message,
DROP COLUMN IF EXISTS notes;

-- Update changes table
ALTER TABLE changes 
ADD COLUMN IF NOT EXISTS released_in uuid REFERENCES releases(id) ON DELETE SET NULL;

-- Clean up any artificial changes that were created for existing tokens
-- These should only be real changes from actual token modifications
DELETE FROM changes 
WHERE change_type = 'created' 
  AND before IS NULL 
  AND released_in IS NULL
  AND created_at < NOW() - INTERVAL '1 hour'; 

-- Update created_by columns to text type
ALTER TABLE changes ALTER COLUMN created_by TYPE text;
ALTER TABLE releases ALTER COLUMN created_by TYPE text;
