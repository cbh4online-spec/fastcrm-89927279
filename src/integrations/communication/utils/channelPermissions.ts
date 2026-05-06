import type { CommunicationChannelType } from "../channels/types";

/**
 * Permissões por canal — preparação para channel_access_permissions.
 * Por agora deriva do papel global do utilizador no workspace.
 *
 * access_level:
 *  - read     → ver conversas
 *  - reply    → responder
 *  - manage   → atribuir, fechar, etiquetar
 *  - admin    → configurar canal, credenciais, webhooks
 */
export type ChannelAccessLevel = "read" | "reply" | "manage" | "admin";

export type WorkspaceRole = "owner" | "admin" | "manager" | "sales" | "support" | "agent" | "viewer";

const ROLE_DEFAULTS: Record<WorkspaceRole, ChannelAccessLevel> = {
  owner: "admin",
  admin: "admin",
  manager: "manage",
  sales: "reply",
  support: "reply",
  agent: "reply",
  viewer: "read",
};

const SUPPORT_CHANNELS: CommunicationChannelType[] = [
  "email",
  "website_chat",
  "website_form",
  "phone",
];

const SALES_CHANNELS: CommunicationChannelType[] = [
  "whatsapp",
  "instagram_dm",
  "facebook_messenger",
];

export function resolveChannelAccess(
  role: WorkspaceRole | null | undefined,
  channelType: CommunicationChannelType
): ChannelAccessLevel {
  if (!role) return "read";

  const baseline = ROLE_DEFAULTS[role] ?? "read";

  // Sales-only roles não devem gerir canais de suporte e vice-versa.
  if (role === "sales" && SUPPORT_CHANNELS.includes(channelType)) return "read";
  if (role === "support" && SALES_CHANNELS.includes(channelType)) return "read";

  return baseline;
}

export function canReply(level: ChannelAccessLevel): boolean {
  return level === "reply" || level === "manage" || level === "admin";
}

export function canManage(level: ChannelAccessLevel): boolean {
  return level === "manage" || level === "admin";
}

export function canConfigureChannel(level: ChannelAccessLevel): boolean {
  return level === "admin";
}
