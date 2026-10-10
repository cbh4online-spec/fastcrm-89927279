import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { phoneOptOutVariants } from "@/lib/whatsapp/phoneVariants";

const sql = readFileSync("drizzle/migrations/0068_prospecting_confirm_linked_lead_guards.sql", "utf8");

// Port literal da função SQL prospecting_phone_variants para verificar paridade.
function sqlVariants(raw: string | null): string[] {
  let d = String(raw ?? "").replace(/\D/g, "");
  if (d.startsWith("00")) d = d.slice(2);
  if (d.length < 6) return [];
  const base = [d];
  if (d.length === 9 && /^[239]/.test(d)) base.push(`351${d}`);
  if (d.startsWith("351") && d.length === 12) base.push(d.slice(3));
  return [...base, ...base.map((x) => `+${x}`)];
}

describe("0068 guards de follow-up de perfil convertido", () => {
  it("exige vínculo real, lead não arquivado e workspace", () => {
    expect(sql).toMatch(/prospecting_profile_id IS DISTINCT FROM p_profile_id/);
    expect(sql).toMatch(/archived_at IS NOT NULL/);
    expect(sql).toMatch(/l\.workspace_id = p_workspace_id/);
  });
  it("bloqueia supressões de perfil e lead e opt-out WhatsApp", () => {
    expect(sql).toMatch(/s\.entity_type = 'lead' AND s\.entity_id = v_lead\.id/);
    expect(sql).toMatch(/s\.entity_type = 'profile' AND s\.entity_id = p_profile_id/);
    expect(sql).toMatch(/whatsapp_optouts o[\s\S]*o\.workspace_id = p_workspace_id/);
    expect(sql).toMatch(/v_profile\.extracted_phone/);
  });
  it("mantém gates anteriores e renumeração segura", () => {
    expect(sql).toMatch(/p_step_index - 1 AND status = 'sent'/);
    expect(sql).toMatch(/linked_lead_opportunity/);
    expect(sql).toMatch(/status NOT IN \('scheduled', 'ready', 'pending'\)/);
    expect(sql).toMatch(/REVOKE ALL ON FUNCTION public\.prospecting_confirm_outreach[\s\S]*anon/);
  });
  it.each(["912 345 678", "+351 912345678", "00351912345678", "123", "", "351212345678"])(
    "variantes SQL = TS para %s",
    (raw) => expect(new Set(sqlVariants(raw))).toEqual(new Set(phoneOptOutVariants(raw))),
  );
});
