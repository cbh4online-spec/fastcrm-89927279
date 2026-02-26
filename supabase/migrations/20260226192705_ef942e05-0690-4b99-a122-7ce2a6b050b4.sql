-- Drop foreign key constraints first
ALTER TABLE object_relationships 
  DROP CONSTRAINT IF EXISTS object_relationships_source_object_id_fkey,
  DROP CONSTRAINT IF EXISTS object_relationships_target_object_id_fkey;

-- Now alter columns to text
ALTER TABLE object_relationships 
  ALTER COLUMN source_object_id TYPE text,
  ALTER COLUMN target_object_id TYPE text;