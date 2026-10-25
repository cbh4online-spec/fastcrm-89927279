import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { z } from "zod";

const phoneInput = z.string().trim().min(1).max(40);
export const LOOKUP_LIMIT = 20;

/** Format validation only; does not establish ownership/existence of a number. */
export function normalizeLookupPhone(raw: string): string | null {
  const parsed = phoneInput.safeParse(raw);
  if (!parsed.success) return null;
  let digits = parsed.data.replace(/[\s\-.()/\u00A0]/g, "");
  if (digits.startsWith("+")) digits = digits.slice(1);
  else if (digits.startsWith("00")) digits = digits.slice(2);
  else if (/^[239]\d{8}$/.test(digits)) digits = `351${digits}`;
  else return null;
  if (!/^[1-9]\d{7,14}$/.test(digits)) return null;
  if (digits.startsWith("351") && !/^351[239]\d{8}$/.test(digits)) return null;
  return `+${digits}`;
}

export function lookupPhoneVariants(raw: string): string[] {
  const e164 = normalizeLookupPhone(raw);
  if (!e164) return [];
  const digits = e164.slice(1);
  const variants = [e164, `00${digits}`, digits];
  if (/^351[239]\d{8}$/.test(digits)) variants.push(digits.slice(3));
  return variants;
}

/** No arbitrary user text enters PostgREST's OR grammar. Every value is derived digits. */
export async function queryLookup(
  client: SupabaseClient<Database>, workspaceId: string, raw: string, signal: AbortSignal,
) {
  const variants = lookupPhoneVariants(raw);
  if (!workspaceId || !variants.length) throw new Error("invalid_lookup");
  const values = variants.join(",");
  const [contacts, leads] = await Promise.all([
    client.from("contacts").select("id,workspace_id,name,phone,whatsapp_number,company")
      .eq("workspace_id", workspaceId).is("deleted_at", null).is("archived_at", null)
      .or(`phone.in.(${values}),whatsapp_number.in.(${values})`)
      .order("id").limit(LOOKUP_LIMIT).abortSignal(signal),
    client.from("leads").select("id,workspace_id,name,phone,status")
      .eq("workspace_id", workspaceId).is("archived_at", null)
      .in("phone", variants).order("id").limit(LOOKUP_LIMIT).abortSignal(signal),
  ]);
  return { contacts, leads };
}