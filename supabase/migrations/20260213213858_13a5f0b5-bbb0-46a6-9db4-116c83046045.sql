
-- 1. Coluna updated_at em messages + trigger
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();
CREATE TRIGGER update_messages_updated_at BEFORE UPDATE ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. Coluna updated_at em crm_activities + trigger
ALTER TABLE public.crm_activities ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();
CREATE TRIGGER update_crm_activities_updated_at BEFORE UPDATE ON public.crm_activities
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. Trigger auto-incremento unread_count (apenas para inbound, ignora se conversa acabou de ser criada com unread_count=1)
CREATE OR REPLACE FUNCTION public.increment_unread_on_inbound_message()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.direction = 'inbound' THEN
    UPDATE public.conversations
    SET unread_count = unread_count + 1
    WHERE id = NEW.conversation_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trg_increment_unread
  AFTER INSERT ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION public.increment_unread_on_inbound_message();

-- 4. RLS policies em falta
CREATE POLICY "Admins can delete messages"
  ON public.messages FOR DELETE
  USING (public.is_workspace_admin_or_owner(auth.uid(), workspace_id));

CREATE POLICY "Members can update activities"
  ON public.crm_activities FOR UPDATE
  USING (public.is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "Admins can delete activities"
  ON public.crm_activities FOR DELETE
  USING (public.is_workspace_admin_or_owner(auth.uid(), workspace_id));
