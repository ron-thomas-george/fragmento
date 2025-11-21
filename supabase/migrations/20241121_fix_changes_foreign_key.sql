-- Fix foreign key constraint for changes table to allow deleted tokens
-- This allows change records to reference tokens that have been deleted

-- Drop the existing foreign key constraint that prevents tracking deleted tokens
ALTER TABLE changes DROP CONSTRAINT IF EXISTS changes_token_id_fkey;

-- We're removing the foreign key constraint entirely because:
-- 1. For deleted tokens, we need to keep the token_id for reference even after the token is gone
-- 2. All token information is stored in the 'before' field for deleted tokens
-- 3. For other change types (created, modified), the token still exists so referential integrity is maintained by application logic
-- 4. This gives us full audit trail capability for all token operations

-- Note: We still maintain data integrity through application logic and the rich data stored in before/after fields
