-- The checkout and Stripe sync now use Starter/Growth/Scale. The original
-- workspace_subscriptions.plan enum still only accepted free/basic/pro/agency.
-- Keep legacy labels for existing subscriptions and add the current names.
-- Do not use the new enum values in this migration: PostgreSQL requires a
-- commit before newly added enum values can be inserted.
ALTER TYPE public.subscription_plan ADD VALUE IF NOT EXISTS 'starter';
ALTER TYPE public.subscription_plan ADD VALUE IF NOT EXISTS 'growth';
ALTER TYPE public.subscription_plan ADD VALUE IF NOT EXISTS 'scale';
