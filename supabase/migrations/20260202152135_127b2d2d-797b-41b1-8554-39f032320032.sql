-- Add assigned_to column to proposals table
ALTER TABLE proposals 
ADD COLUMN assigned_to uuid REFERENCES auth.users(id);

-- Create index for performance
CREATE INDEX idx_proposals_assigned_to ON proposals(assigned_to);