-- Add unique constraint to workspace_modules to prevent duplicate module installations per workspace
ALTER TABLE workspace_modules 
ADD CONSTRAINT workspace_modules_workspace_module_unique 
UNIQUE (workspace_id, module_id);