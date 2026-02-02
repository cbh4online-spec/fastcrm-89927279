-- Remove a FK antiga que aponta para auth.users
ALTER TABLE proposals 
  DROP CONSTRAINT IF EXISTS proposals_assigned_to_fkey;

-- Cria nova FK que aponta para profiles(user_id)
-- Isto permite ao PostgREST fazer o join automaticamente
ALTER TABLE proposals
  ADD CONSTRAINT proposals_assigned_to_fkey 
  FOREIGN KEY (assigned_to) 
  REFERENCES profiles(user_id) 
  ON DELETE SET NULL;