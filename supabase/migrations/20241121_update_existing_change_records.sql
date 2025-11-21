-- Update existing change records to use proper user names instead of "shadcn"
-- This is a one-time fix for existing data

-- Update all change records that have "shadcn" as created_by
-- You can replace 'Your Name' with the actual user name you want to use
UPDATE changes 
SET created_by = 'Your Name'  -- Replace with actual user name
WHERE created_by = 'shadcn';

-- Alternative: If you want to use a more generic name
-- UPDATE changes 
-- SET created_by = 'Admin User'
-- WHERE created_by = 'shadcn';

-- Alternative: If you have user information and want to map to specific users
-- UPDATE changes 
-- SET created_by = CASE 
--   WHEN project_id = 'your-project-id' THEN 'Actual User Name'
--   ELSE 'Admin User'
-- END
-- WHERE created_by = 'shadcn';
