/**
 * SSoT — lógica pura de identificação e normalização de grupos WhatsApp (Z-API).
 *
 * ESPELHADO em `supabase/functions/_shared/whatsappGroups.ts`.
 * Qualquer alteração aqui tem de ser copiada para lá (há um teste que compara
 * os dois ficheiros byte a byte).
 *
 * Sem imports — para poder ser usado no browser, em Deno e nos testes.
 */

export const GROUP_JID_SUFFIX = "@g.us";

export type GroupStatus =
  | "ACTIVE"
  | "INACTIVE"
  | "LEFT"
  | "REMOVED"
  | "SYNC_ERROR"
  | "UNKNOWN";

export type ParticipantStatus =
  | "ACTIVE"
  | "PENDING_APPROVAL"
  | "INVITED"
  | "NOT_ADDED"
  | "REMOVED"
  | "LEFT"
  | "REJECTED"
  | "UNKNOWN";

export interface NormalizedGroup {
  groupId: string;
  name: string | null;
  description: string | null;
  pictureUrl: string | null;
  participantsCount: number;
  isAdmin: boolean;
  isOwner: boolean;
  isAnnouncement: boolean;
  isCommunity: boolean;
  isArchived: boolean;
  isMuted: boolean;
  isPinned: boolean;
  unreadCount: number;
  lastMessageAt: string | null;
  adminOnlyMessage: boolean | null;
  adminOnlySettings: boolean | null;
  adminOnlyAddMember: boolean | null;
  requireAdminApproval: boolean | null;
}

export interface NormalizedParticipant {
  participantIdRaw: string;
  normalizedPhone: string | null;
  lid: string | null;
  displayName: string | null;
  isAdmin: boolean;
  isOwner: boolean;
  membershipStatus: ParticipantStatus;
}

type Raw = Record<string, unknown>;

function str(v: unknown): string | null {
  if (typeof v === "string" && v.trim()) return v.trim();
  if (typeof v === "number") return String(v);
  return null;
}

function bool(v: unknown): boolean {
  return v === true || v === "true";
}

function boolOrNull(v: unknown): boolean | null {
  if (v === true || v === "true") return true;
  if (v === false || v === "false") return false;
  return null;
}

function num(v: unknown): number {
  const n = typeof v === "number" ? v : typeof v === "string" ? Number(v) : NaN;
  return Number.isFinite(n) ? n : 0;
}

/**
 * Um identificador é de grupo quando termina em `@g.us` ou tem o formato
 * `<criador>-<timestamp>` (formato legado do WhatsApp).
 * Um telefone normal (só dígitos, opcionalmente com `+` ou `@c.us`) NUNCA é grupo.
 */
export function isGroupJid(raw: unknown): boolean {
  const s = str(raw);
  if (!s) return false;
  if (s.endsWith(GROUP_JID_SUFFIX)) return true;
  return /^\d{5,}-\d{5,}$/.test(s);
}

/** Devolve o group id canónico (sem sufixo `@g.us`), ou `null` se não for grupo. */
export function normalizeGroupId(raw: unknown): string | null {
  const s = str(raw);
  if (!s) return null;
  if (!isGroupJid(s)) return null;
  return s.endsWith(GROUP_JID_SUFFIX)
    ? s.slice(0, -GROUP_JID_SUFFIX.length)
    : s;
}

/**
 * Extrai o group id de um payload de webhook Z-API.
 * Nunca usa `phone` de um contacto 1:1 como group id.
 */
export function extractGroupIdFromPayload(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") return null;
  const p = payload as Raw;
  const candidates = [p.groupId, p.chatId, p.chatLid, p.phone, p.from, p.to];
  for (const c of candidates) {
    const id = normalizeGroupId(c);
    if (id) return id;
  }
  return null;
}

/** `true` quando o payload representa uma mensagem de grupo. */
export function isGroupPayload(payload: unknown): boolean {
  if (!payload || typeof payload !== "object") return false;
  const p = payload as Raw;
  if (extractGroupIdFromPayload(p)) return true;
  // `isGroup: true` só é aceite se houver mesmo um id de grupo válido.
  return false;
}

/**
 * Normaliza o identificador de um participante.
 * Aceita `351912345678@c.us`, `351912345678`, `+351 912 345 678` e LIDs (`...@lid`).
 */
export function normalizeParticipantId(raw: unknown): {
  participantIdRaw: string;
  normalizedPhone: string | null;
  lid: string | null;
} | null {
  const s = str(raw);
  if (!s) return null;
  const isLid = s.endsWith("@lid");
  const bare = s.replace(/@(c\.us|s\.whatsapp\.net|lid)$/i, "");
  const digits = bare.replace(/\D/g, "");
  return {
    participantIdRaw: s,
    normalizedPhone: !isLid && digits.length >= 8 ? digits : null,
    lid: isLid ? bare : null,
  };
}

/** Extrai a lista bruta de grupos das várias formas de resposta da Z-API. */
export function parseGroupsListResponse(data: unknown): Raw[] {
  if (Array.isArray(data)) return data as Raw[];
  if (!data || typeof data !== "object") return [];
  const d = data as Raw;
  for (const key of ["groups", "chats", "data", "result"]) {
    const v = d[key];
    if (Array.isArray(v)) return v as Raw[];
  }
  return [];
}

/** Normaliza um grupo devolvido pela Z-API. Devolve `null` se não tiver id de grupo. */
export function mapZapiGroup(raw: unknown): NormalizedGroup | null {
  if (!raw || typeof raw !== "object") return null;
  const g = raw as Raw;
  const groupId =
    normalizeGroupId(g.id) ??
    normalizeGroupId(g.groupId) ??
    normalizeGroupId(g.phone) ??
    normalizeGroupId(g.chatId);
  if (!groupId) return null;

  const participants = Array.isArray(g.participants) ? (g.participants as Raw[]) : null;

  return {
    groupId,
    name: str(g.name) ?? str(g.subject) ?? str(g.title),
    description: str(g.description) ?? str(g.desc),
    pictureUrl: str(g.imageUrl) ?? str(g.image) ?? str(g.profileThumbnail) ?? str(g.pictureUrl),
    participantsCount: participants ? participants.length : num(g.participantsCount ?? g.membersCount),
    isAdmin: bool(g.isAdmin) || bool(g.iAmAdmin) || bool(g.isSuperAdmin) || bool(g.iAmOwner),
    isOwner: bool(g.isOwner) || bool(g.iAmOwner),
    isAnnouncement: bool(g.announcement) || bool(g.isAnnouncement) || bool(g.adminOnlyMessage),
    isCommunity: bool(g.community) || bool(g.isCommunity),
    isArchived: bool(g.archived) || bool(g.isArchived),
    isMuted: bool(g.muted) || bool(g.isMuted) || num(g.muteEndTime) > 0,
    isPinned: bool(g.pinned) || bool(g.isPinned),
    unreadCount: num(g.unread ?? g.unreadCount),
    lastMessageAt: toIso(g.messageTime ?? g.lastMessageTime ?? g.lastMessageAt),
    adminOnlyMessage: boolOrNull(g.adminOnlyMessage ?? g.announcement),
    adminOnlySettings: boolOrNull(g.adminOnlySettings ?? g.restrict),
    adminOnlyAddMember: boolOrNull(g.adminOnlyAddMember),
    requireAdminApproval: boolOrNull(g.requireAdminApproval ?? g.membershipApproval),
  };
}

/** Converte timestamps Z-API (ms ou s) para ISO. */
export function toIso(v: unknown): string | null {
  if (v === null || v === undefined || v === "") return null;
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(n) || n <= 0) {
    return typeof v === "string" && !Number.isNaN(Date.parse(v))
      ? new Date(v).toISOString()
      : null;
  }
  const ms = n > 1e12 ? n : n * 1000;
  return new Date(ms).toISOString();
}

/** Normaliza um participante devolvido pela Z-API (light-group-metadata). */
export function mapZapiParticipant(raw: unknown): NormalizedParticipant | null {
  if (!raw || typeof raw !== "object") {
    const ident = normalizeParticipantId(raw);
    if (!ident) return null;
    return {
      ...ident,
      displayName: null,
      isAdmin: false,
      isOwner: false,
      membershipStatus: "ACTIVE",
    };
  }
  const p = raw as Raw;
  const ident = normalizeParticipantId(p.phone ?? p.id ?? p.participant ?? p.lid);
  if (!ident) return null;
  const lid = ident.lid ?? str(p.lid);
  return {
    participantIdRaw: ident.participantIdRaw,
    normalizedPhone: ident.normalizedPhone,
    lid,
    displayName: str(p.name) ?? str(p.pushname) ?? str(p.short) ?? null,
    isAdmin: bool(p.isAdmin) || bool(p.isSuperAdmin) || bool(p.admin),
    isOwner: bool(p.isSuperAdmin) || bool(p.isOwner),
    membershipStatus: mapParticipantStatus(p),
  };
}

/** Estado de membro a partir das flags da Z-API. */
export function mapParticipantStatus(raw: unknown): ParticipantStatus {
  if (!raw || typeof raw !== "object") return "UNKNOWN";
  const p = raw as Raw;
  if (bool(p.pendingApproval) || bool(p.isPending)) return "PENDING_APPROVAL";
  if (bool(p.invited)) return "INVITED";
  if (bool(p.notAdded) || bool(p.isNotAdded)) return "NOT_ADDED";
  if (bool(p.removed)) return "REMOVED";
  if (bool(p.left)) return "LEFT";
  if (bool(p.rejected)) return "REJECTED";
  return "ACTIVE";
}

/**
 * Reconciliação: dado o conjunto de participantes conhecidos em base de dados e
 * o conjunto devolvido pela sincronização, devolve os `participantIdRaw` que
 * deixaram de estar no grupo (a marcar como `REMOVED`).
 */
export function diffMissingParticipants(
  known: string[],
  synced: string[],
): string[] {
  const set = new Set(synced);
  return known.filter((id) => !set.has(id));
}
