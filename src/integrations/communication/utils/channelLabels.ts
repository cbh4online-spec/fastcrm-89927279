import type { CommunicationChannelType } from "../channels/types";

/**
 * Etiquetas humanas em PT-PT para cada canal.
 * SSoT — usar em UI, badges, filtros e dashboards.
 */
export const CHANNEL_LABELS: Record<CommunicationChannelType, string> = {
  whatsapp: "WhatsApp",
  email: "Email",
  instagram_dm: "Instagram DM",
  facebook_messenger: "Facebook Messenger",
  website_chat: "Chat do Site",
  website_form: "Formulário",
  phone: "Telefone",
  sms: "SMS",
  telegram: "Telegram",
  manual: "Nota Manual",
};

export const CHANNEL_SHORT_LABELS: Record<CommunicationChannelType, string> = {
  whatsapp: "WA",
  email: "Email",
  instagram_dm: "IG",
  facebook_messenger: "FB",
  website_chat: "Chat",
  website_form: "Form",
  phone: "Tel",
  sms: "SMS",
  telegram: "TG",
  manual: "Nota",
};

export function channelLabel(type: string | null | undefined): string {
  if (!type) return "Desconhecido";
  return CHANNEL_LABELS[type as CommunicationChannelType] ?? type;
}

export function channelShortLabel(type: string | null | undefined): string {
  if (!type) return "—";
  return CHANNEL_SHORT_LABELS[type as CommunicationChannelType] ?? type;
}
