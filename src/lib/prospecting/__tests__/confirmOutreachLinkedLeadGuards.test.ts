import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const sql = readFileSync("drizzle/migrations/0069_prospecting_confirm_drop_unsafe_optout_guard.sql", "utf8");
const body = sql.slice(sql.indexOf("CREATE OR REPLACE FUNCTION"));

describe("0069 guards de follow-up de perfil convertido", () => {
  it("exige vínculo real, lead não arquivado e workspace (legados NULL falham fechado)", () => {
    expect(body).toMatch(/prospecting_profile_id IS DISTINCT FROM p_profile_id/);
    expect(body).toMatch(/archived_at IS NOT NULL/);
    expect(body).toMatch(/l\.workspace_id = p_workspace_id/);
  });
  it("mantém supressão só do lead, sem entity_type profile", () => {
    expect(body).toMatch(/s\.entity_type = 'lead' AND s\.entity_id = v_lead\.id/);
    expect(body).not.toMatch(/entity_type = 'profile'/);
  });
  it("não aplica opt-out WhatsApp indiscriminado (RPC sem canal)", () => {
    expect(body).not.toMatch(/whatsapp_optouts/);
  });
  it("mantém gates anteriores e renumeração segura de 0067", () => {
    expect(body).toMatch(/p_step_index - 1 AND status = 'sent'/);
    expect(body).toMatch(/linked_lead_opportunity/);
    expect(body).toMatch(/status NOT IN \('scheduled', 'ready', 'pending'\)/);
    expect(body).toMatch(/REVOKE ALL ON FUNCTION public\.prospecting_confirm_outreach[\s\S]*anon/);
  });
});
