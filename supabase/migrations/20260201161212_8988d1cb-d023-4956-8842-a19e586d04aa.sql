-- Enable realtime for Student Journey tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.sj_profiles;
ALTER PUBLICATION supabase_realtime ADD TABLE public.sj_enrollments;