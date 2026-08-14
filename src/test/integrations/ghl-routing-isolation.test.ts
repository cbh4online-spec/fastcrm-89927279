import { describe, it, expect } from "vitest";
import {
  resolveWorkspaceForMessage,
  matchAccountId,
  toSocialType,
  type SocialChannelRow,
} from "../../../supabase/functions/_shared/ghlRouting";

/**
 * Isolamento GHL — location partilhada entre workspaces.
 *
 * Cenário real do projecto:
 *   location 9peybYsaEdbhFf2GO0Bx  ->  PHARLISS + Blecksen (partilhada)
 *   location z0oqqJ6TRofvoDePpGO0  ->  METODOPARE (exclusiva)
 */

const PHARLISS = "0662fc16-6286-4156-a908-08c7dfec0fb7";
const BLECKSEN = "6d108e84-389c-42de-bd19-277f210823f2";
const METODOPARE = "d9e3d0ae-5893-41e9-97f3-7d7ce6a06f0f";

const sharedConfigs = [
  { workspace_id: PHARLISS, sync_messages: true, is_primary: true },
  { workspace_id: BLECKSEN, sync_messages: true, is_primary: false },
];

const ch = (
  workspace_id: string,
  channel_type: string,
  ghl_account_id: string,
  is_active = true,
): SocialChannelRow => ({ workspace_id, channel_type, ghl_account_id, is_active });

describe("resolveWorkspaceForMessage — isolamento entre workspaces", () => {
  it("location exclusiva → resolve directamente para o único workspace", () => {
    const d = resolveWorkspaceForMessage({
      configs: [{ workspace_id: METODOPARE, is_primary: true }],
      channels: [],
      socialType: "whatsapp",
      candidateAccountIds: [],
    });
    expect(d).toMatchObject({ ok: true, workspaceId: METODOPARE, method: "single_config" });
  });

  it("location partilhada → escolhe o workspace dono do account_id", () => {
    const d = resolveWorkspaceForMessage({
      configs: sharedConfigs,
      channels: [
        ch(PHARLISS, "instagram", "69ddf2eb_9peybYsaEdbhFf2GO0Bx_17841462675469795"),
        ch(BLECKSEN, "instagram", "69ddf2eb_9peybYsaEdbhFf2GO0Bx_17841444347607539"),
      ],
      socialType: "instagram",
      candidateAccountIds: ["17841444347607539"],
    });
    expect(d).toMatchObject({ ok: true, workspaceId: BLECKSEN, method: "account_id_match" });
  });

  it("location partilhada sem account_id no payload → falha fechado", () => {
    const d = resolveWorkspaceForMessage({
      configs: sharedConfigs,
      channels: [ch(PHARLISS, "instagram", "x_9peyb_1784144")],
      socialType: "instagram",
      candidateAccountIds: [],
    });
    expect(d).toEqual({
      ok: false,
      reason: "social_channel_missing_account_id",
      candidateWorkspaces: [PHARLISS, BLECKSEN],
    });
  });

  it("account_id desconhecido → falha fechado, nunca cai no is_primary", () => {
    const d = resolveWorkspaceForMessage({
      configs: sharedConfigs,
      channels: [ch(PHARLISS, "whatsapp", "9peybYsaEdbhFf2GO0Bx")],
      socialType: "whatsapp",
      candidateAccountIds: ["+351911111111"],
    });
    expect(d).toEqual({
      ok: false,
      reason: "no_workspace_owns_account_id",
      candidateWorkspaces: [PHARLISS, BLECKSEN],
    });
  });

  it("mesmo account_id reclamado por dois workspaces → ambíguo, falha fechado", () => {
    // Caso do WhatsApp: ambos gravam ghl_account_id = location id.
    const d = resolveWorkspaceForMessage({
      configs: sharedConfigs,
      channels: [
        ch(PHARLISS, "whatsapp", "9peybYsaEdbhFf2GO0Bx"),
        ch(BLECKSEN, "whatsapp", "9peybYsaEdbhFf2GO0Bx"),
      ],
      socialType: "whatsapp",
      candidateAccountIds: ["9peybYsaEdbhFf2GO0Bx"],
    });
    expect(d).toEqual({
      ok: false,
      reason: "ambiguous_account_id_match",
      candidateWorkspaces: [PHARLISS, BLECKSEN],
    });
  });

  it("canal inactivo não é considerado dono do account_id", () => {
    const d = resolveWorkspaceForMessage({
      configs: sharedConfigs,
      channels: [ch(PHARLISS, "whatsapp", "9peybYsaEdbhFf2GO0Bx_351999", false)],
      socialType: "whatsapp",
      candidateAccountIds: ["351999"],
    });
    expect(d.ok).toBe(false);
  });

  it("canal não social (sms/email) mantém fallback para o primary", () => {
    const d = resolveWorkspaceForMessage({
      configs: sharedConfigs,
      channels: [],
      socialType: null,
      candidateAccountIds: [],
    });
    expect(d).toMatchObject({ ok: true, workspaceId: PHARLISS, method: "non_social_fallback" });
  });

  it("canais de outros workspaces (fora da location) são ignorados", () => {
    const d = resolveWorkspaceForMessage({
      configs: sharedConfigs,
      channels: [
        // linha indevida da METODOPARE com a location alheia
        ch(METODOPARE, "whatsapp", "9peybYsaEdbhFf2GO0Bx"),
      ],
      socialType: "whatsapp",
      candidateAccountIds: ["9peybYsaEdbhFf2GO0Bx"],
    });
    expect(d).toEqual({
      ok: false,
      reason: "no_workspace_owns_account_id",
      candidateWorkspaces: [PHARLISS, BLECKSEN],
    });
  });
});

describe("helpers de correspondência", () => {
  it("matchAccountId aceita exacto e sufixo", () => {
    expect(matchAccountId("prov_loc_12345", "12345")).toBe(true);
    expect(matchAccountId("prov_loc_12345", "prov_loc_12345")).toBe(true);
    expect(matchAccountId("prov_loc_12345", "99999")).toBe(false);
  });

  it("toSocialType normaliza rótulos do GHL", () => {
    expect(toSocialType("messenger")).toBe("facebook");
    expect(toSocialType("IG")).toBe("instagram");
    expect(toSocialType("WhatsApp")).toBe("whatsapp");
    expect(toSocialType("sms")).toBeNull();
  });
});
