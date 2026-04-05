-- Enable realtime for sdr_enrollments to power the activity feed
ALTER PUBLICATION supabase_realtime ADD TABLE public.sdr_enrollments;