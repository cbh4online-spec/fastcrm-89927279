import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { checkProspectingIdentity, describeProspectingIdentity, importProspectingLead, isSeparateProspectingInstance, prospectingIdentityHref } from "./identity";

const workspaceId = "6e874265-fce7-4a8f-8e95-542bd89dd713";
const profileId = "d2761fce-2e1d-42d0-9f39-b79c45a39afc";
function clientWith(data: unknown, error: { message: string } | null = null) {
  const rpc = vi.fn().mockResolvedValue({ data, error });
  return { client: { rpc } as unknown as SupabaseClient<Database>, rpc };
}

describe("prospecting identity RPC boundary", () => {
  it("checks the selected workspace and profile rather than trusting a search result flag", async () => {
    const match = { entity_type: "contact", entity_id: "c1", name: "Clínica Sol", field: "phone", strength: "strong", blocked: false, opportunity_id: null };
    const { client, rpc } = clientWith({ status: "exists", matches: [match] });
    const result = await checkProspectingIdentity(client, workspaceId, { name: "Clínica Sol", phone: "+351 912 345 678" }, profileId);
    expect(result.status).toBe("exists");
    expect(describeProspectingIdentity(result)).toContain("contacto Clínica Sol (mesmo telefone)");
    expect(prospectingIdentityHref(result)).toBe("/dashboard/contacts/c1");
    expect(rpc).toHaveBeenCalledWith("prospecting_identity_check", {
      p_workspace_id: workspaceId,
      p_candidate: { name: "Clínica Sol", phone: "+351 912 345 678" },
      p_profile_id: profileId,
    });
  });

  it("does not treat RPC failure or malformed success as permission to import", async () => {
    const broken = clientWith(null, { message: "function missing" });
    await expect(importProspectingLead(broken.client, workspaceId, { name: "Empresa", source: "google_local" }))
      .rejects.toThrow("function missing");
    const malformed = clientWith({ status: "created" });
    await expect(importProspectingLead(malformed.client, workspaceId, { name: "Empresa", source: "google_local" }))
      .rejects.toThrow("não confirmou o lead");
  });

  it("returns a review without lead id; explicit review travels to the atomic import RPC", async () => {
    const review = clientWith({ status: "review", matches: [{ entity_type: "company", entity_id: "x", name: "Alfa", field: "name", strength: "possible", blocked: false, opportunity_id: null }] });
    const lead = { name: "Alfa", source: "web_search", website: "https://alfa.pt" };
    const result = await importProspectingLead(review.client, workspaceId, lead, undefined, false);
    expect(result.lead_id).toBeUndefined();
    expect(result.status).toBe("review");
    await importProspectingLead(review.client, workspaceId, lead, profileId, true);
    expect(review.rpc).toHaveBeenLastCalledWith("prospecting_import_lead_safe", {
      p_workspace_id: workspaceId,
      p_candidate: lead,
      p_lead: lead,
      p_profile_id: profileId,
      p_allow_possible: true,
    });
  });

  it("only reports a created lead when the server supplies its id", async () => {
    const { client } = clientWith({ status: "created", lead_id: "lead-123", matches: [] });
    const result = await importProspectingLead(client, workspaceId, { name: "Alfa", source: "web_search" });
    expect(result.lead_id).toBe("lead-123");
  });

  it("requires review when the source has no reliable identifier", async () => {
    const { client } = clientWith({ status: "review", matches: [], reason: "missing_identifier" });
    const result = await checkProspectingIdentity(client, workspaceId, { name: "Clínica sem telefone" });
    expect(result.status).toBe("review");
    expect(describeProspectingIdentity(result)).toContain("Sem identificador fiável");
  });

  it("does not treat a blocked name-only match as confirmable review", async () => {
    const blocked = {
      status: "blocked",
      matches: [{ entity_type: "contact", entity_id: "blocked-contact", name: "Clínica Sol", field: "name", strength: "possible", blocked: true, opportunity_id: null }],
    };
    const { client } = clientWith(blocked);
    const candidate = { name: "Clínica Sol", source: "google_local" };
    const check = await checkProspectingIdentity(client, workspaceId, candidate);
    expect(check.status).toBe("blocked");
    expect(describeProspectingIdentity(check)).toContain("Não contactar");
    expect(describeProspectingIdentity(check)).toContain("mesmo nome");
    const result = await importProspectingLead(client, workspaceId, candidate, undefined, true);
    expect(result.status).toBe("blocked");
    expect(result.lead_id).toBeUndefined();
  });

  it("keeps a name-only open opportunity out of the confirmable review path", async () => {
    const { client } = clientWith({
      status: "opportunity",
      matches: [{ entity_type: "company", entity_id: "co1", name: "Clínica Sol", field: "name", strength: "possible", blocked: false, opportunity_id: "op1" }],
    });
    const result = await importProspectingLead(client, workspaceId, { name: "Clínica Sol", source: "google_local" }, undefined, true);
    expect(result.status).toBe("opportunity");
    expect(result.lead_id).toBeUndefined();
    expect(prospectingIdentityHref(result)).toBe("/dashboard/opportunities/op1");
  });

  it("fails closed for a separate or malformed workspace data instance", () => {
    const main = "https://main.supabase.co";
    expect(isSeparateProspectingInstance(null, main)).toBe(false);
    expect(isSeparateProspectingInstance("https://main.supabase.co/", main)).toBe(false);
    expect(isSeparateProspectingInstance("https://tenant.supabase.co", main)).toBe(true);
    expect(isSeparateProspectingInstance("not-a-url", main)).toBe(true);
  });
});
