/**
 * Módulo WhatsApp — ponto de entrada canónico.
 *
 * Esta pasta vai gradualmente acolher hooks, componentes e páginas
 * do domínio WhatsApp (actualmente dispersos em `src/hooks/`,
 * `src/components/whatsapp-pro/` e `src/pages/`).
 *
 * Edge functions canónicas:
 * - `whatsapp-pro-send`        envio (texto, media, template, produto)
 * - `whatsapp-pro-webhook`     inbound + status
 * - `whatsapp-pro-*-dispatch`  campanhas, sequências, recorrentes, agendados
 *
 * Edge functions legacy (manter como proxy até remoção):
 * - `whatsapp-send-message`, `whatsapp-zapi-send`
 * - `whatsapp-webhook`, `whatsapp-zapi-webhook`
 * - `whatsapp-send-scheduled-reminders`
 */
export { useSendWhatsApp } from "./hooks/useSendWhatsApp";
