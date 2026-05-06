import {
  MessageCircle,
  Mail,
  Instagram,
  Facebook,
  MessageSquare,
  FileText,
  Phone,
  Smartphone,
  Send,
  StickyNote,
  type LucideIcon,
} from "lucide-react";
import type { CommunicationChannelType } from "../channels/types";

/**
 * Ícones e cores semânticas por canal.
 * As cores usam tokens HSL do design system — não cores directas.
 */
export const CHANNEL_ICONS: Record<CommunicationChannelType, LucideIcon> = {
  whatsapp: MessageCircle,
  email: Mail,
  instagram_dm: Instagram,
  facebook_messenger: Facebook,
  website_chat: MessageSquare,
  website_form: FileText,
  phone: Phone,
  sms: Smartphone,
  telegram: Send,
  manual: StickyNote,
};

/**
 * Classes Tailwind com tokens semânticos. Cada canal tem uma "tonalidade"
 * discreta. Evitar cores hard-coded — usar variantes do design system.
 */
export const CHANNEL_BADGE_CLASSES: Record<CommunicationChannelType, string> = {
  whatsapp: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20 dark:text-emerald-400",
  email: "bg-blue-500/10 text-blue-600 border-blue-500/20 dark:text-blue-400",
  instagram_dm: "bg-pink-500/10 text-pink-600 border-pink-500/20 dark:text-pink-400",
  facebook_messenger: "bg-indigo-500/10 text-indigo-600 border-indigo-500/20 dark:text-indigo-400",
  website_chat: "bg-violet-500/10 text-violet-600 border-violet-500/20 dark:text-violet-400",
  website_form: "bg-amber-500/10 text-amber-700 border-amber-500/20 dark:text-amber-400",
  phone: "bg-cyan-500/10 text-cyan-600 border-cyan-500/20 dark:text-cyan-400",
  sms: "bg-teal-500/10 text-teal-600 border-teal-500/20 dark:text-teal-400",
  telegram: "bg-sky-500/10 text-sky-600 border-sky-500/20 dark:text-sky-400",
  manual: "bg-muted text-muted-foreground border-border",
};

export function channelIcon(type: string | null | undefined): LucideIcon {
  if (!type) return StickyNote;
  return CHANNEL_ICONS[type as CommunicationChannelType] ?? StickyNote;
}

export function channelBadgeClass(type: string | null | undefined): string {
  if (!type) return CHANNEL_BADGE_CLASSES.manual;
  return CHANNEL_BADGE_CLASSES[type as CommunicationChannelType] ?? CHANNEL_BADGE_CLASSES.manual;
}
