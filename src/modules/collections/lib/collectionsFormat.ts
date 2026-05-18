import { formatDistanceToNow, format } from "date-fns";
import { pt } from "date-fns/locale";
import type { CollectionStatus, CollectionActionType, CollectionChannel } from "../types/collections";

export function formatEur(value: number | null | undefined): string {
  const n = Number(value ?? 0);
  return new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR" }).format(n);
}

export function formatRelative(date: string | Date | null | undefined): string {
  if (!date) return "—";
  try {
    return formatDistanceToNow(new Date(date), { addSuffix: true, locale: pt });
  } catch {
    return "—";
  }
}

export function formatAbsolute(date: string | Date | null | undefined): string {
  if (!date) return "—";
  try {
    return format(new Date(date), "dd/MM/yyyy HH:mm", { locale: pt });
  } catch {
    return "—";
  }
}

export const STATUS_LABELS: Record<CollectionStatus, string> = {
  new: "Novo",
  in_progress: "Em curso",
  promise: "Promessa",
  plan: "Plano",
  paid: "Pago",
  partially_paid: "Pago parcial",
  escalated: "Escalado",
  closed: "Fechado",
};

export const STATUS_TONE: Record<CollectionStatus, "default" | "secondary" | "destructive" | "outline"> = {
  new: "secondary",
  in_progress: "default",
  promise: "outline",
  plan: "outline",
  paid: "secondary",
  partially_paid: "secondary",
  escalated: "destructive",
  closed: "outline",
};

export const ACTION_LABELS: Record<CollectionActionType, string> = {
  email_sent: "Email enviado",
  whatsapp_sent: "WhatsApp enviado",
  sms_sent: "SMS enviado",
  call_logged: "Chamada registada",
  note: "Nota",
  promise_created: "Promessa criada",
  plan_created: "Plano criado",
  payment_received: "Pagamento recebido",
  escalation: "Escalada",
  portal_view: "Visita ao portal",
  system: "Sistema",
};

export const CHANNEL_LABELS: Record<CollectionChannel, string> = {
  email: "Email",
  whatsapp: "WhatsApp",
  sms: "SMS",
  phone: "Telefone",
  portal: "Portal",
  system: "Sistema",
};
