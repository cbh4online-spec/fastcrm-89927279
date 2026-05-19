/**
 * Módulo WhatsApp — ponto de entrada canónico.
 *
 * Edge functions canónicas (Fase D consolidada):
 * - `whatsapp-pro-send`              envio (texto, media, audio/ptt, template, produto, grupos, botões)
 * - `whatsapp-pro-webhook`           inbound + status
 * - `whatsapp-pro-campaign-dispatch` campanhas
 * - `whatsapp-pro-sequence-dispatch` sequências/drips
 * - `whatsapp-pro-recurring-tick`    mensagens recorrentes
 * - `whatsapp-pro-scheduled-dispatch` envios agendados
 * - `whatsapp-pro-bot-dispatch`      bot
 * - `whatsapp-pro-health-monitor`    health checks
 * - `whatsapp-pro-optout-detect`     opt-out automático
 *
 * Transporte interno (não chamar directamente do frontend):
 * - `whatsapp-zapi-send` — só invocado por `whatsapp-pro-send` e jobs server-side
 *   (ex.: `store-cart-recovery`, `replenishment-send-whatsapp`).
 *
 * Edge functions a depreciar quando for seguro (após auditoria de logs 30d):
 * - `whatsapp-send-message`, `whatsapp-webhook`, `whatsapp-send-scheduled-reminders`
 *
 * Regra de ouro: todo o envio WhatsApp do frontend passa por `useSendWhatsApp`.
 */
export { useSendWhatsApp } from "./hooks/useSendWhatsApp";
