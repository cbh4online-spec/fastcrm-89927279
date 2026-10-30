import { describe, it, expect } from "vitest";
import { isMetaInstanceAllowed, toMetaRecipient, describeMetaError } from "../../../supabase/functions/_shared/whatsappMetaOfficial";

const METODOPARE = "d9e3d0ae-5893-41e9-97f3-7d7ce6a06f0f";
const PHARLISS = "0662fc16-6286-4156-a908-08c7dfec0fb7";
const inst = { id: "i1", workspace_id: METODOPARE, provider_name: "meta_cloud_api", active: true, metadata: { allowed_workspace_id: METODOPARE } };

describe("linha oficial Meta", () => {
  it("só o METODOPARE pode usar a linha", () => {
    expect(isMetaInstanceAllowed(inst, METODOPARE)).toBe(true);
    expect(isMetaInstanceAllowed(inst, PHARLISS)).toBe(false);
  });
  it("recusa instância sem workspace autorizado", () => {
    expect(isMetaInstanceAllowed({ ...inst, metadata: {} }, METODOPARE)).toBe(false);
    expect(isMetaInstanceAllowed({ ...inst, active: false }, METODOPARE)).toBe(false);
  });
  it("normaliza número PT para dígitos com 351", () => {
    expect(toMetaRecipient("932 380 092")).toBe("351932380092");
    expect(toMetaRecipient("+351 932 380 092")).toBe("351932380092");
    expect(toMetaRecipient("12")).toBeNull();
  });
  it("erro 131047 vira aviso das 24 h", () => {
    expect(describeMetaError(400, JSON.stringify({ error: { code: 131047 } })).code).toBe("OUTSIDE_24H");
  });
});
