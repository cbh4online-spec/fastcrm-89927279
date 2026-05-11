// WhatsApp Birthday Greetings — runs every hour via pg_cron.
// For each workspace with birthday_enabled, if local hour matches birthday_send_hour,
// finds contacts/leads/companies with birth_date matching today (month+day) and sends
// a WhatsApp message via whatsapp-pro-send. De-duplicates per year via whatsapp_birthday_logs.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.0";
import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.95.0/cors";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

interface SettingsRow {
  workspace_id: string;
  birthday_enabled: boolean;
  birthday_message_template: string;
  birthday_send_hour: number;
  timezone: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supa = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });
  const summary = { workspaces: 0, sent: 0, skipped: 0, errors: 0 };

  try {
    const { data: settings, error } = await supa
      .from("whatsapp_settings")
      .select("workspace_id, birthday_enabled, birthday_message_template, birthday_send_hour, timezone")
      .eq("birthday_enabled", true);

    if (error) throw error;

    const now = new Date();
    const year = now.getUTCFullYear();

    for (const s of (settings ?? []) as SettingsRow[]) {
      summary.workspaces++;
      const tz = s.timezone || "Europe/Lisbon";
      const localHour = getLocalHour(now, tz);
      if (localHour !== s.birthday_send_hour) {
        summary.skipped++;
        continue;
      }
      const { month, day } = getLocalMonthDay(now, tz);

      const recipients = await collectRecipients(supa, s.workspace_id, month, day);

      for (const r of recipients) {
        if (!r.phone) {
          summary.skipped++;
          continue;
        }

        // Dedupe via UNIQUE constraint on insert
        const { error: dupErr } = await supa.from("whatsapp_birthday_logs").insert({
          workspace_id: s.workspace_id,
          entity_type: r.entity_type,
          entity_id: r.entity_id,
          phone: r.phone,
          message_year: year,
          status: "queued",
        });
        if (dupErr) {
          // already sent this year for this entity
          summary.skipped++;
          continue;
        }

        const message = renderTemplate(s.birthday_message_template, {
          name: r.name || "",
          first_name: (r.name || "").split(" ")[0] || "",
        });

        try {
          const sendResp = await supa.functions.invoke("whatsapp-pro-send", {
            body: {
              workspaceId: s.workspace_id,
              phone: r.phone,
              messageType: "text",
              text: message,
              contactId: r.entity_type === "contact" ? r.entity_id : null,
              metadata: { source: "birthday_greeting", entity_type: r.entity_type, entity_id: r.entity_id },
            },
          });
          if (sendResp.error || sendResp.data?.error) {
            await supa
              .from("whatsapp_birthday_logs")
              .update({ status: "failed", error: String(sendResp.error?.message ?? sendResp.data?.error) })
              .eq("workspace_id", s.workspace_id)
              .eq("entity_type", r.entity_type)
              .eq("entity_id", r.entity_id)
              .eq("message_year", year);
            summary.errors++;
          } else {
            await supa
              .from("whatsapp_birthday_logs")
              .update({ status: "sent" })
              .eq("workspace_id", s.workspace_id)
              .eq("entity_type", r.entity_type)
              .eq("entity_id", r.entity_id)
              .eq("message_year", year);
            summary.sent++;
          }
        } catch (e) {
          summary.errors++;
          console.error("birthday send failed", r, e);
        }
      }
    }

    return json({ success: true, ...summary });
  } catch (e) {
    console.error("birthday greetings error", e);
    return json({ error: "internal_error", fallback: true, ...summary }, 200);
  }
});

interface Recipient {
  entity_type: "contact" | "lead" | "company";
  entity_id: string;
  name: string | null;
  phone: string | null;
}

async function collectRecipients(
  supa: ReturnType<typeof createClient>,
  workspaceId: string,
  month: number,
  day: number,
): Promise<Recipient[]> {
  const out: Recipient[] = [];

  const matchMD = (d: string | null): boolean => {
    if (!d) return false;
    const dt = new Date(d);
    return dt.getUTCMonth() + 1 === month && dt.getUTCDate() === day;
  };

  const { data: contacts } = await (supa
    .from("contacts")
    .select("id, name, phone, birth_date") as any)
    .eq("workspace_id", workspaceId)
    .not("birth_date", "is", null);

  for (const c of (contacts ?? []) as any[]) {
    if (matchMD(c.birth_date)) {
      out.push({ entity_type: "contact", entity_id: c.id, name: c.name, phone: c.phone });
    }
  }

  const { data: leads } = await (supa
    .from("leads")
    .select("id, name, phone, birth_date") as any)
    .eq("workspace_id", workspaceId)
    .not("birth_date", "is", null);
  for (const l of (leads ?? []) as any[]) {
    if (matchMD(l.birth_date)) {
      out.push({ entity_type: "lead", entity_id: l.id, name: l.name, phone: l.phone });
    }
  }

  const { data: companies } = await (supa
    .from("companies")
    .select("id, name, phone, birth_date") as any)
    .eq("workspace_id", workspaceId)
    .not("birth_date", "is", null);
  for (const co of (companies ?? []) as any[]) {
    if (matchMD(co.birth_date)) {
      out.push({ entity_type: "company", entity_id: co.id, name: co.name, phone: co.phone });
    }
  }
  return out;
}

function renderTemplate(tpl: string, vars: Record<string, string>): string {
  return tpl.replace(/\{\{\s*([\w_]+)\s*\}\}/g, (_, k) => vars[k] ?? "");
}

function getLocalHour(d: Date, tz: string): number {
  try {
    const fmt = new Intl.DateTimeFormat("en-GB", { timeZone: tz, hour: "2-digit", hour12: false });
    return Number(fmt.format(d));
  } catch {
    return d.getUTCHours();
  }
}

function getLocalMonthDay(d: Date, tz: string): { month: number; day: number } {
  try {
    const fmt = new Intl.DateTimeFormat("en-GB", { timeZone: tz, month: "2-digit", day: "2-digit" });
    const [day, month] = fmt.format(d).split("/").map(Number);
    return { month, day };
  } catch {
    return { month: d.getUTCMonth() + 1, day: d.getUTCDate() };
  }
}

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
