DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'notify' AND enumtypid = 'public.automation_action_type'::regtype) THEN
    ALTER TYPE public.automation_action_type ADD VALUE 'notify';
  END IF;
END $$;