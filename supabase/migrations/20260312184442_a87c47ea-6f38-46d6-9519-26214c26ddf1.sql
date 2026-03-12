
-- 1. Drop trigger
DROP TRIGGER IF EXISTS tr_order_notes_recompute_needs ON public.order_notes;

-- 2. Drop policies that reference order_note_status enum
DROP POLICY IF EXISTS order_note_items_client_delete ON public.order_note_items;
DROP POLICY IF EXISTS order_note_items_client_insert ON public.order_note_items;
DROP POLICY IF EXISTS order_note_items_client_update ON public.order_note_items;
DROP POLICY IF EXISTS order_notes_client_update ON public.order_notes;

-- 3. Convert status from enum to text
ALTER TABLE public.order_notes 
  ALTER COLUMN status DROP DEFAULT,
  ALTER COLUMN status TYPE TEXT USING status::TEXT,
  ALTER COLUMN status SET DEFAULT 'draft';

-- 4. Add check constraint
ALTER TABLE public.order_notes 
  ADD CONSTRAINT order_notes_status_check 
  CHECK (status IN ('draft', 'submitted', 'awaiting_approval', 'approved', 'rejected', 'in_preparation', 'invoiced', 'cancelled'));

-- 5. Recreate trigger
CREATE TRIGGER tr_order_notes_recompute_needs
  AFTER UPDATE OF status ON public.order_notes
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION trigger_recompute_procurement_needs();

-- 6. Recreate policies with text comparisons
CREATE POLICY order_note_items_client_delete ON public.order_note_items
  FOR DELETE TO public
  USING (order_note_id IN (
    SELECT on2.id FROM order_notes on2
    JOIN client_users cu ON cu.id = on2.client_user_id
    WHERE cu.auth_user_id = auth.uid() AND on2.status = 'draft'
  ));

CREATE POLICY order_note_items_client_insert ON public.order_note_items
  FOR INSERT TO public
  WITH CHECK (order_note_id IN (
    SELECT on2.id FROM order_notes on2
    JOIN client_users cu ON cu.id = on2.client_user_id
    WHERE cu.auth_user_id = auth.uid() AND on2.status = 'draft'
  ));

CREATE POLICY order_note_items_client_update ON public.order_note_items
  FOR UPDATE TO public
  USING (order_note_id IN (
    SELECT on2.id FROM order_notes on2
    JOIN client_users cu ON cu.id = on2.client_user_id
    WHERE cu.auth_user_id = auth.uid() AND on2.status = 'draft'
  ));

CREATE POLICY order_notes_client_update ON public.order_notes
  FOR UPDATE TO public
  USING (
    client_user_id IN (SELECT id FROM client_users WHERE auth_user_id = auth.uid())
    AND status IN ('draft', 'submitted')
  );
