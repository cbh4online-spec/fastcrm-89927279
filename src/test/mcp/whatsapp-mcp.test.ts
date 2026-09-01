import { describe, it, expect } from "vitest";
import type { WhatsAppMcpGateway, ResolvedEntity } from "@/lib/mcp/whatsapp/gateway";
import {
  getWhatsAppConversation,
  scheduleWhatsAppMessage,
  sendWhatsApp,
} from "@/lib/mcp/whatsapp/service";
import {
  assertMediaUrl,
  buildIdempotencyKey,
  McpWhatsAppError,
  normalizeE164,
  stripSecrets,
} from "@/lib/mcp/whatsapp/policy";
import type { WorkspaceRole } from "@/contexts/WorkspaceContext";

const WS = "11111111-1111-1111-1111-111111111111";
const OTHER_WS = "22222222-2222-2222-2222-222222222222";
const CONTACT: ResolvedEntity = { kind: "contact", id: "c1", name: "Ana", phone: "+351912345678" };

interface FakeOptions {
  role?: WorkspaceRole | null;
  optedOut?: boolean;
  hasConsent?: boolean;
  rateLimited?: boolean;
  sendResult?: { success: boolean; providerMessageId?: string | null; error?: string };
  contacts?: Record<string, ResolvedEntity>;
  workspaceId?: string;
}

function fakeGateway(opts: FakeOptions = {}) {
  const calls: Record<string, unknown[]> = { send: [], audit: [], schedule: [], idem: [] };
  const idem = new Map<string, Record<string, unknown>>();
  const allowedWs = opts.workspaceId ?? WS;
  const gateway: WhatsAppMcpGateway = {
    getUserId: () => "u1",
    async getMembership(workspaceId) {
      if (workspaceId !== allowedWs) return { role: null, isSuperAdmin: false };
      return { role: opts.role === undefined ? "admin" : opts.role, isSuperAdmin: false };
    },
    async getContact(workspaceId, id) {
      if (workspaceId !== allowedWs) return null;
      return (opts.contacts ?? { c1: CONTACT })[id] ?? null;
    },
    async getLead() {
      return null;
    },
    async findEntitiesByPhone() {
      return [];
    },
    async isOptedOut() {
      return !!opts.optedOut;
    },
    async hasConsent() {
      return opts.hasConsent !== false;
    },
    async isRateLimited() {
      return !!opts.rateLimited;
    },
    async lookupIdempotency(_ws, key) {
      return idem.get(key) ?? null;
    },
    async recordIdempotency(_ws, key, tool, result) {
      calls.idem.push({ key, tool });
      idem.set(key, result);
    },
    async send(payload) {
      calls.send.push(payload);
      return opts.sendResult ?? { success: true, providerMessageId: "msg-1" };
    },
    async findConversationId() {
      return "conv-1";
    },
    async listMessages() {
      return [
        {
          id: "m1",
          direction: "outbound",
          message_type: "text",
          content: "olá",
          media_url: null,
          provider_status: "sent",
          external_message_id: "zaap-1",
          sent_at: "2026-01-01T00:00:00Z",
          delivered_at: null,
          read_at: null,
        },
      ];
    },
    async schedule(payload) {
      calls.schedule.push(payload);
      return { id: "sched-1" };
    },
    async audit(entry) {
      calls.audit.push(entry);
    },
  };
  return { gateway, calls };
}

const baseSend = {
  workspace_id: WS,
  contact_id: "c1",
  messageType: "text" as const,
  text: "Olá",
};

describe("MCP WhatsApp — E.164 e validações", () => {
  it("normaliza número nacional para E.164", () => {
    expect(normalizeE164("912345678", "PT")).toBe("+351912345678");
  });

  it("rejeita número inválido", () => {
    expect(() => normalizeE164("123")).toThrowError(McpWhatsAppError);
  });

  it("rejeita URL de media não HTTPS ou com extensão inválida", () => {
    expect(() => assertMediaUrl("http://x.com/a.jpg", "image")).toThrowError(/HTTPS/);
    expect(() => assertMediaUrl("https://x.com/a.exe", "image")).toThrowError(/Extensão/);
    expect(assertMediaUrl("https://x.com/a.mp4", "video")).toBe("https://x.com/a.mp4");
  });

  it("exige exactamente um destino", async () => {
    const { gateway } = fakeGateway();
    await expect(sendWhatsApp(gateway, "t", { workspace_id: WS, messageType: "text", text: "x" }))
      .rejects.toThrowError(/target_required|Indique/);
    await expect(
      sendWhatsApp(gateway, "t", {
        workspace_id: WS,
        contact_id: "c1",
        phone: "+351912345678",
        messageType: "text",
        text: "x",
      }),
    ).rejects.toThrowError(/apenas um destino/);
  });
});

describe("MCP WhatsApp — autorização", () => {
  it("bloqueia workspace de que o utilizador não é membro", async () => {
    const { gateway, calls } = fakeGateway();
    await expect(sendWhatsApp(gateway, "t", { ...baseSend, workspace_id: OTHER_WS })).rejects.toThrowError(
      /Sem acesso/,
    );
    expect(calls.send).toHaveLength(0);
  });

  it("bloqueia role sem capability de resposta (viewer)", async () => {
    const { gateway, calls } = fakeGateway({ role: "viewer" });
    await expect(sendWhatsApp(gateway, "t", baseSend)).rejects.toThrowError(/inbox.reply/);
    expect(calls.send).toHaveLength(0);
  });

  it("permite leitura a viewer", async () => {
    const { gateway } = fakeGateway({ role: "viewer" });
    const res = await getWhatsAppConversation(gateway, { workspace_id: WS, contact_id: "c1" });
    expect(res.count).toBe(1);
  });

  it("não resolve entidades de outro workspace", async () => {
    const { gateway } = fakeGateway();
    await expect(
      getWhatsAppConversation(gateway, { workspace_id: OTHER_WS, contact_id: "c1" }),
    ).rejects.toThrowError(/Sem acesso/);
  });
});

describe("MCP WhatsApp — consentimento e opt-out", () => {
  it("bloqueia marketing sem consentimento (fail-closed)", async () => {
    const { gateway, calls } = fakeGateway({ hasConsent: false });
    await expect(sendWhatsApp(gateway, "t", baseSend)).rejects.toThrowError(/consentimento/);
    expect(calls.send).toHaveLength(0);
  });

  it("bloqueia sempre em opt-out, mesmo transacional", async () => {
    const { gateway, calls } = fakeGateway({ optedOut: true });
    await expect(
      sendWhatsApp(gateway, "t", { ...baseSend, purpose: "transactional" }),
    ).rejects.toThrowError(/opt-out/);
    expect(calls.send).toHaveLength(0);
  });

  it("permite transacional sem consentimento de marketing", async () => {
    const { gateway, calls } = fakeGateway({ hasConsent: false });
    const res = await sendWhatsApp(gateway, "t", { ...baseSend, purpose: "transactional" });
    expect(res.status).toBe("sent");
    expect(calls.send).toHaveLength(1);
  });
});

describe("MCP WhatsApp — throttling, idempotência e erros", () => {
  it("bloqueia quando o rate limit é atingido", async () => {
    const { gateway, calls } = fakeGateway({ rateLimited: true });
    await expect(sendWhatsApp(gateway, "t", baseSend)).rejects.toThrowError(/Limite de envios/);
    expect(calls.send).toHaveLength(0);
  });

  it("não reenvia com a mesma chave de idempotência", async () => {
    const { gateway, calls } = fakeGateway();
    const first = await sendWhatsApp(gateway, "send_whatsapp_text", baseSend);
    const second = await sendWhatsApp(gateway, "send_whatsapp_text", baseSend);
    expect(first.status).toBe("sent");
    expect(second.status).toBe("duplicate");
    expect(calls.send).toHaveLength(1);
  });

  it("gera chaves distintas para conteúdos distintos", () => {
    const a = buildIdempotencyKey({ tool: "t", workspaceId: WS, userId: "u", phone: "+1", payload: "a" });
    const b = buildIdempotencyKey({ tool: "t", workspaceId: WS, userId: "u", phone: "+1", payload: "b" });
    expect(a).not.toBe(b);
  });

  it("propaga falha do Z-API sem marcar como enviado", async () => {
    const { gateway, calls } = fakeGateway({ sendResult: { success: false, error: "Falha ao enviar via Z-API" } });
    await expect(sendWhatsApp(gateway, "t", baseSend)).rejects.toThrowError(/Z-API/);
    expect(calls.idem).toHaveLength(0);
    expect(calls.audit).toHaveLength(0);
  });

  it("regista auditoria e messageId em envio com sucesso", async () => {
    const { gateway, calls } = fakeGateway();
    const res = await sendWhatsApp(gateway, "send_whatsapp_text", baseSend);
    expect(res.message_id).toBe("msg-1");
    expect(calls.audit).toHaveLength(1);
  });
});

describe("MCP WhatsApp — segredos e agendamento", () => {
  it("nunca devolve credenciais do provider", () => {
    const cleaned = stripSecrets({
      ok: true,
      instanceId: "abc",
      instance_token: "x",
      clientToken: "y",
      nested: { client_token: "z", keep: 1 },
    }) as Record<string, unknown>;
    expect(JSON.stringify(cleaned)).not.toMatch(/abc|"x"|"y"|"z"/);
    expect((cleaned.nested as Record<string, unknown>).keep).toBe(1);
  });

  it("agenda no scheduler existente e rejeita datas passadas", async () => {
    const { gateway, calls } = fakeGateway();
    const future = new Date(Date.now() + 3600_000).toISOString();
    const res = (await scheduleWhatsAppMessage(gateway, {
      workspace_id: WS,
      contact_id: "c1",
      message: "Olá",
      scheduled_at: future,
    })) as Record<string, unknown>;
    expect(res.scheduled_message_id).toBe("sched-1");
    expect(calls.schedule).toHaveLength(1);

    await expect(
      scheduleWhatsAppMessage(gateway, {
        workspace_id: WS,
        contact_id: "c1",
        message: "Olá",
        scheduled_at: "2020-01-01T00:00:00Z",
      }),
    ).rejects.toThrowError(/scheduled_at/);
  });
});
