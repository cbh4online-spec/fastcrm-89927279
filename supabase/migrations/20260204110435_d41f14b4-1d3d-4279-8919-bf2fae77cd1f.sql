-- Enable realtime for meetings and calendar_events tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.meetings;
ALTER PUBLICATION supabase_realtime ADD TABLE public.calendar_events;