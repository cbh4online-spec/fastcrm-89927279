import { supabase } from "@/integrations/supabase/client";

/**
 * Check if a value already exists in a table for a given field within the same workspace.
 * Returns the name of the duplicate record if found, null otherwise.
 */
export async function checkDuplicate(
  table: "contacts" | "companies" | "leads",
  field: "email" | "tax_id",
  value: string,
  workspaceId: string,
  excludeId: string
): Promise<string | null> {
  const cleanValue = value.trim();
  if (!cleanValue) return null;

  const query = supabase
    .from(table)
    .select("id, name")
    .eq("workspace_id", workspaceId)
    .eq(field, cleanValue)
    .neq("id", excludeId)
    .limit(1);

  // For contacts and companies, exclude soft-deleted
  if (table !== "leads") {
    query.is("deleted_at", null);
  }

  const { data } = await query;
  if (data && data.length > 0) {
    return data[0].name;
  }
  return null;
}
