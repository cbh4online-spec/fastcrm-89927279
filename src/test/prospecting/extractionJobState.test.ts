import { describe, it, expect } from "vitest";
import {
  friendlyJobError,
  isUnsupportedSource,
  resolveJobDisplay,
  STALL_AFTER_MS,
  UNSUPPORTED_SOURCE_MESSAGE,
  UNSUPPORTED_SOURCE_LEGACY_MESSAGE,
} from "@/lib/prospecting/extractionJobState";
import * as server from "../../../supabase/functions/_shared/instagramSources";

const NOW = Date.parse("2026-10-09T09:00:00Z");
const base = { source: "list", status: "running", error: null, found_count: 0, updated_at: new Date(NOW - 30_000).toISOString() };

describe("origens não suportadas", () => {
  it("seguidores e seguidos estão bloqueados no ecrã e no servidor", () => {
    for (const s of ["followers", "following"]) {
      expect(isUnsupportedSource(s)).toBe(true);
      expect(server.isUnsupportedSource(s)).toBe(true);
    }
    expect(isUnsupportedSource("list")).toBe(false);
    expect(server.isUnsupportedSource("web_search")).toBe(false);
  });

  it("mensagem igual no ecrã e no servidor", () => {
    expect(UNSUPPORTED_SOURCE_MESSAGE).toBe(server.UNSUPPORTED_SOURCE_MESSAGE);
    expect(UNSUPPORTED_SOURCE_LEGACY_MESSAGE).toBe(server.UNSUPPORTED_SOURCE_LEGACY_MESSAGE);
  });

  it("servidor nunca pede /followers nem /following", () => {
    expect(server.listingRequest("followers", "grandhaportugal", null)).toBeNull();
    expect(server.listingRequest("following", "grandhaportugal", null)).toBeNull();
  });
});

describe("estado apresentado", () => {
  it("job antigo concluído com 404 de /followers aparece como Falhou, sem JSON", () => {
    const d = resolveJobDisplay(
      {
        ...base,
        source: "followers",
        status: "completed",
        error: 'Instagram API 404: {"message":"Endpoint \'/followers\' does not exist"}',
      },
      NOW,
    );
    expect(d.kind).toBe("failed");
    expect(d.label).toBe("Falhou");
    expect(d.isActive).toBe(false);
    expect(d.message).toBe(UNSUPPORTED_SOURCE_LEGACY_MESSAGE);
    expect(d.message).not.toMatch(/Nenhum pedido/);
    expect(d.message).not.toMatch(/[{}]/);
  });

  it("concluído com erro e zero recolhidos é falha, não sucesso", () => {
    const d = resolveJobDisplay({ ...base, source: "hashtag", status: "completed", error: "Instagram API 404: {}" }, NOW);
    expect(d.kind).toBe("failed");
    expect(d.message).toBe("O fornecedor de Instagram não disponibiliza este tipo de recolha.");
  });

  it("concluído com erro mas com perfis recolhidos é Incompleto", () => {
    const d = resolveJobDisplay({ ...base, status: "completed", error: "Falha a meio", found_count: 4 }, NOW);
    expect(d.kind).toBe("partial");
    expect(d.isError).toBe(true);
  });

  it("concluído sem erro é Concluído", () => {
    expect(resolveJobDisplay({ ...base, status: "completed", found_count: 3 }, NOW).kind).toBe("completed");
  });

  it("em curso com atualização recente continua ativo", () => {
    const d = resolveJobDisplay(base, NOW);
    expect(d.kind).toBe("running");
    expect(d.isActive).toBe(true);
  });

  it("em curso sem atualização há mais de 10 minutos é dado como parado e deixa de atualizar", () => {
    const d = resolveJobDisplay({ ...base, updated_at: new Date(NOW - STALL_AFTER_MS - 1000).toISOString() }, NOW);
    expect(d.kind).toBe("stalled");
    expect(d.label).toBe("Falhou");
    expect(d.isActive).toBe(false);
  });

  it("job legado de seguidores ainda em curso não é tratado como ativo", () => {
    expect(resolveJobDisplay({ ...base, source: "following" }, NOW).isActive).toBe(false);
  });
});

describe("erros do fornecedor", () => {
  it("traduz códigos sem expor JSON", () => {
    expect(friendlyJobError('Instagram API 429: {"message":"x"}', "hashtag")).toMatch(/Limite/);
    expect(friendlyJobError('Instagram API 503: {"message":"x"}', "hashtag")).toMatch(/indisponível/);
    expect(server.friendlyProviderError(404, "/tag-feeds")).not.toMatch(/[{}]/);
  });
  it("mantém mensagens já legíveis", () => {
    expect(friendlyJobError("Perfil não encontrado", "list")).toBe("Perfil não encontrado");
    expect(friendlyJobError(null, "list")).toBeNull();
  });
});
