
-- First, remove the orphaned record
DELETE FROM public.user_roles WHERE user_id = '444ba746-3e86-4283-a363-ad2b27b81dc9';

-- Drop existing foreign key constraint (if any remains)
ALTER TABLE public.user_roles 
DROP CONSTRAINT IF EXISTS user_roles_user_id_fkey;

-- Add new foreign key to profiles table
ALTER TABLE public.user_roles
ADD CONSTRAINT user_roles_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- Insert the super_admin role for jorge.cardoso@digital4ads.pt
INSERT INTO public.user_roles (user_id, role)
VALUES ('4fef01e3-0141-4bee-8309-0bac5d4fb6ae', 'super_admin')
ON CONFLICT (user_id, role) DO NOTHING;
