import { describe, expect, it } from "vitest";
import {
  guessConsentMapping,
  planConsentImport,
  validateConsentImport,
  type ConsentImportMapping,
} from "@/lib/whatsapp/consentImport";

const mapping: ConsentImportMapping = {
  phone: "telefone",
  status: "estado",
  captured_at: "data",
  source: "origem",
  proof_reference: "prova",
};

function row(over: Record<string, string> = {}) {
  return {
    telefone: "+351912345678",
    estado: "granted",
    data: "2026-01-10T10:00:00Z",
    origem: "formulario-site",
    prova: "form-2026-01-10#123",
    ...over,
  };
}

describe("guessConsentMapping", () => {
  it("reconhece cabeçalhos PT e EN", () => {
    const m = guessConsentMapping(["Telemóvel", "Status", "captured_at", "Origem", "Prova", "Categoria"]);
    expect(m.phone).toBe("Telemóvel");
    expect(m.status).toBe("Status");
    expect(m.captured_at).toBe("captured_at");
    expect(m.source).toBe("Origem");
    expect(m.proof_reference).toBe("Prova");
    expect(m.scope).toBe("Categoria");
  });
});

describe("validateConsentImport", () => {
  it("aceita linha completa e normaliza para E.164", () => {
    const res = validateConsentImport([row({ telefone: "912 345 678" })], mapping);
    expect(res.rejected).toHaveLength(0);
    expect(res.valid[0].phone).toBe("+351912345678");
    expect(res.valid[0].scope).toBe("marketing");
  });

  it("rejeita telefone inválido", () => {
    const res = validateConsentImport([row({ telefone: "123" })], mapping);
    expect(res.valid).toHaveLength(0);
    expect(res.rejected[0].reason).toMatch(/Telefone inválido/);
  });

  it("rejeita granted sem prova", () => {
    const res = validateConsentImport([row({ prova: "" })], mapping);
    expect(res.valid).toHaveLength(0);
    expect(res.rejected[0].reason).toMatch(/proof_reference/);
  });

  it("rejeita granted sem captured_at válido", () => {
    const res = validateConsentImport([row({ data: "não é data" })], mapping);
    expect(res.rejected[0].reason).toMatch(/captured_at/);
  });

  it("rejeita data futura como prova", () => {
    const future = new Date(Date.now() + 86_400_000).toISOString();
    const res = validateConsentImport([row({ data: future })], mapping);
    expect(res.rejected[0].reason).toMatch(/captured_at/);
  });

  it("rejeita estado desconhecido", () => {
    const res = validateConsentImport([row({ estado: "talvez" })], mapping);
    expect(res.rejected[0].reason).toMatch(/Estado inválido/);
  });

  it("deduplica pelo registo mais recente", () => {
    const res = validateConsentImport(
      [
        row({ data: "2026-01-01T10:00:00Z", prova: "antigo" }),
        row({ data: "2026-02-01T10:00:00Z", prova: "recente" }),
      ],
      mapping,
    );
    expect(res.valid).toHaveLength(1);
    expect(res.duplicates).toBe(1);
    expect(res.valid[0].proofReference).toBe("recente");
  });

  it("rejeita tudo quando faltam colunas obrigatórias", () => {
    const res = validateConsentImport([row()], { phone: "telefone" });
    expect(res.valid).toHaveLength(0);
    expect(res.rejected[0].reason).toMatch(/Colunas obrigatórias/);
  });

  it("aceita revoked sem prova (revogação é sempre válida)", () => {
    const res = validateConsentImport([row({ estado: "revoked", prova: "" })], mapping);
    expect(res.valid[0].status).toBe("revoked");
  });
});

describe("planConsentImport", () => {
  const valid = validateConsentImport([row({ data: "2026-01-10T10:00:00Z" })], mapping).valid;

  it("insere quando não existe registo", () => {
    const plan = planConsentImport(valid, []);
    expect(plan.toUpsert).toHaveLength(1);
    expect(plan.alreadyExisting).toBe(0);
  });

  it("não substitui revogação mais recente", () => {
    const plan = planConsentImport(valid, [
      { phone: "+351912345678", scope: "marketing", status: "revoked", updatedAt: "2026-03-01T10:00:00Z" },
    ]);
    expect(plan.toUpsert).toHaveLength(0);
    expect(plan.skippedNewerRevocation[0].reason).toMatch(/revogação mais recente/);
  });

  it("atualiza quando a revogação é anterior à prova", () => {
    const plan = planConsentImport(valid, [
      { phone: "+351912345678", scope: "marketing", status: "revoked", updatedAt: "2025-12-01T10:00:00Z" },
    ]);
    expect(plan.toUpsert).toHaveLength(1);
    expect(plan.alreadyExisting).toBe(1);
  });
});
