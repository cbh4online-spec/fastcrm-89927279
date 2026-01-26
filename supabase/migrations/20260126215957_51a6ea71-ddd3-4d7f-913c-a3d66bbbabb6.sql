-- Adicionar novos valores ao ENUM goal_period
ALTER TYPE public.goal_period ADD VALUE IF NOT EXISTS 'quarterly';
ALTER TYPE public.goal_period ADD VALUE IF NOT EXISTS 'semiannual';