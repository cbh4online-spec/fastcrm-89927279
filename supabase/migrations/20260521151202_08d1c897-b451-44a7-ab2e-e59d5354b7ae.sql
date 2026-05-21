UPDATE public.saft_imports
SET status = 'preview_ready', completed_at = NULL, error_message = NULL
WHERE status = 'completed';