-- Step 1: Delete messages from Instagram conversations in Blecksen and Be a leader
-- These were leaked from METODOPARE due to incorrect channel resolution
DELETE FROM public.messages
WHERE workspace_id IN (
  '6d108e84-389c-42de-bd19-277f210823f2',  -- Blecksen
  'b1b7c602-17af-4a2d-ac41-b2a50b918d1d'   -- Be a leader
)
AND conversation_id IN (
  SELECT id FROM public.conversations
  WHERE workspace_id IN (
    '6d108e84-389c-42de-bd19-277f210823f2',
    'b1b7c602-17af-4a2d-ac41-b2a50b918d1d'
  )
  AND channel = 'instagram'
);

-- Step 2: Delete the leaked Instagram conversations themselves
DELETE FROM public.conversations
WHERE workspace_id IN (
  '6d108e84-389c-42de-bd19-277f210823f2',  -- Blecksen
  'b1b7c602-17af-4a2d-ac41-b2a50b918d1d'   -- Be a leader
)
AND channel = 'instagram';