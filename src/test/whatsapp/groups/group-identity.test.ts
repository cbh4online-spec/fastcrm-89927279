import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  isGroupJid,
  normalizeGroupId,
  extractGroupIdFromPayload,
  isGroupPayload,
  normalizeParticipantId,
  parseGroupsListResponse,
  mapZapiGroup,
  mapZapiParticipant,
  mapParticipantStatus,
  diffMissingParticipants,
  toIso,
} from "@/lib/whatsapp/groups";

describe("identificação de grupos", () => {
  it("reconhece JIDs @g.us", () => {
    expect(isGroupJid("120363043211112222@g.us")).toBe(true);
    expect(isGroupJid("351912345678-1600000000")).toBe(true);
  });

  it("não trata telefones 1:1 como grupos", () => {
    expect(isGroupJid("351912345678")).toBe(false);
    expect(isGroupJid("351912345678@c.us")).toBe(false);
    expect(isGroupJid("+351 912 345 678")).toBe(false);
    expect(isGroupJid("")).toBe(false);
    expect(isGroupJid(null)).toBe(false);
  });

  it("normaliza o group id removendo o sufixo", () => {
    expect(normalizeGroupId("120363043211112222@g.us")).toBe("120363043211112222");
    expect(normalizeGroupId("351912345678")).toBeNull();
  });

  it("extrai o group id do payload sem confundir com o telefone", () => {
    expect(extractGroupIdFromPayload({ phone: "120363043211112222-1600000000" }))
      .toBe("120363043211112222-1600000000");
    expect(extractGroupIdFromPayload({ phone: "351912345678", isGroup: true })).toBeNull();
    expect(isGroupPayload({ phone: "351912345678", isGroup: true })).toBe(false);
    expect(isGroupPayload({ chatId: "12036304321@g.us" })).toBe(true);
  });
});

describe("participantes", () => {
  it("normaliza telefone, LID e nome", () => {
    expect(normalizeParticipantId("351912345678@c.us")).toEqual({
      participantIdRaw: "351912345678@c.us",
      normalizedPhone: "351912345678",
      lid: null,
    });
    expect(normalizeParticipantId("998877665544@lid")).toEqual({
      participantIdRaw: "998877665544@lid",
      normalizedPhone: null,
      lid: "998877665544",
    });
    expect(normalizeParticipantId("")).toBeNull();
  });

  it("mapeia participante Z-API", () => {
    const p = mapZapiParticipant({ phone: "351912345678", isAdmin: true, name: "Ana" });
    expect(p?.normalizedPhone).toBe("351912345678");
    expect(p?.isAdmin).toBe(true);
    expect(p?.displayName).toBe("Ana");
    expect(p?.membershipStatus).toBe("ACTIVE");
  });

  it("mapeia estados de membro", () => {
    expect(mapParticipantStatus({ pendingApproval: true })).toBe("PENDING_APPROVAL");
    expect(mapParticipantStatus({ invited: true })).toBe("INVITED");
    expect(mapParticipantStatus({ notAdded: true })).toBe("NOT_ADDED");
    expect(mapParticipantStatus({ removed: true })).toBe("REMOVED");
    expect(mapParticipantStatus(null)).toBe("UNKNOWN");
  });

  it("reconcilia participantes em falta", () => {
    expect(diffMissingParticipants(["a", "b", "c"], ["a", "c"])).toEqual(["b"]);
    expect(diffMissingParticipants([], ["a"])).toEqual([]);
  });
});

describe("listagem e mapeamento de grupos", () => {
  it("aceita array, {groups} e {chats}", () => {
    expect(parseGroupsListResponse([{ id: "1@g.us" }])).toHaveLength(1);
    expect(parseGroupsListResponse({ groups: [{ id: "1@g.us" }] })).toHaveLength(1);
    expect(parseGroupsListResponse({ chats: [{ id: "1@g.us" }] })).toHaveLength(1);
    expect(parseGroupsListResponse(null)).toEqual([]);
  });

  it("ignora entradas que não são grupos", () => {
    expect(mapZapiGroup({ phone: "351912345678", name: "Ana" })).toBeNull();
  });

  it("normaliza flags e contagens", () => {
    const g = mapZapiGroup({
      id: "12036304321@g.us",
      subject: "Clientes VIP",
      participants: [{ phone: "351912345678" }, { phone: "351911111111" }],
      isAdmin: true,
      announcement: true,
      archived: true,
      unread: 3,
    });
    expect(g?.groupId).toBe("12036304321");
    expect(g?.name).toBe("Clientes VIP");
    expect(g?.participantsCount).toBe(2);
    expect(g?.isAdmin).toBe(true);
    expect(g?.isAnnouncement).toBe(true);
    expect(g?.isArchived).toBe(true);
    expect(g?.unreadCount).toBe(3);
  });

  it("converte timestamps em segundos e milissegundos", () => {
    expect(toIso(1700000000)).toBe(new Date(1700000000000).toISOString());
    expect(toIso(1700000000000)).toBe(new Date(1700000000000).toISOString());
    expect(toIso(0)).toBeNull();
    expect(toIso(null)).toBeNull();
  });
});

describe("SSoT espelhado", () => {
  it("frontend e edge function têm o mesmo ficheiro de grupos", () => {
    const a = readFileSync(resolve(process.cwd(), "src/lib/whatsapp/groups.ts"), "utf8");
    const b = readFileSync(
      resolve(process.cwd(), "supabase/functions/_shared/whatsappGroups.ts"),
      "utf8",
    );
    expect(b).toBe(a);
  });

  it("as capabilities de grupos existem nos dois lados", () => {
    const front = readFileSync(resolve(process.cwd(), "src/lib/permissions/capabilities.ts"), "utf8");
    const back = readFileSync(
      resolve(process.cwd(), "supabase/functions/_shared/capabilities.ts"),
      "utf8",
    );
    const caps = front.match(/"whatsapp_groups\.[a-z_]+"/g) ?? [];
    const unique = [...new Set(caps)];
    expect(unique.length).toBe(18);
    for (const c of unique) expect(back).toContain(c);
  });
});

describe("envio seguro", () => {
  it("a sincronização não chama endpoints de envio directamente", () => {
    const src = readFileSync(
      resolve(process.cwd(), "supabase/functions/whatsapp-zapi-sync-groups/index.ts"),
      "utf8",
    );
    expect(src).not.toContain("/send-text");
    expect(src).toContain("/light-group-metadata/");
    expect(src).toContain("pageSize=");
  });

  it("o frontend nunca chama /send-text da Z-API", () => {
    const hooks = readFileSync(resolve(process.cwd(), "src/hooks/useWhatsAppZapi.ts"), "utf8");
    expect(hooks).not.toContain("api.z-api.io");
  });
});
