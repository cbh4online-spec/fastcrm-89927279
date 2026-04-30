ALTER TABLE public.entity_notes
  DROP CONSTRAINT IF EXISTS entity_notes_note_type_check;

ALTER TABLE public.entity_notes
  ADD CONSTRAINT entity_notes_note_type_check
  CHECK (note_type = ANY (ARRAY['text'::text, 'voice'::text, 'team'::text]));