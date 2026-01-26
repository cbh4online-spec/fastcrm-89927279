-- Drop the old constraint that doesn't support organizational goals (both null)
ALTER TABLE public.productivity_goals DROP CONSTRAINT IF EXISTS goal_owner_check;

-- Add new constraint that supports:
-- 1. Individual goals: user_id is NOT NULL, team_id is NULL
-- 2. Team goals: user_id is NULL, team_id is NOT NULL  
-- 3. Organizational goals: both user_id and team_id are NULL (goal_scope = 'organizational')
ALTER TABLE public.productivity_goals 
ADD CONSTRAINT goal_owner_check CHECK (
  -- Individual goal: user_id set, team_id null, scope is individual
  (user_id IS NOT NULL AND team_id IS NULL AND goal_scope = 'individual')
  OR
  -- Team goal: team_id set, user_id null
  (user_id IS NULL AND team_id IS NOT NULL)
  OR
  -- Organizational goal: both null, scope is organizational
  (user_id IS NULL AND team_id IS NULL AND goal_scope = 'organizational')
);