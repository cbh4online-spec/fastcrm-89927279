import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

/** Only persisted task fields; read errors must remain distinct from an empty result. */
export async function fetchContactNextTask(client: SupabaseClient<Database>, workspaceId: string, contactId: string) {
  if (!workspaceId || !contactId) throw new Error("Contacto ou workspace indisponível");
  const { data, error } = await client
    .from("tasks")
    .select("id,title,due_at")
    .eq("workspace_id", workspaceId)
    .eq("related_type", "contact")
    .eq("related_id", contactId)
    .eq("status", "pending")
    .order("due_at", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: false })
    .limit(1);
  if (error) throw error;
  return data?.[0] ?? null;
}