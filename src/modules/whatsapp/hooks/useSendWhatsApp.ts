/**
 * useSendWhatsApp — wrapper canónico de envio WhatsApp.
 *
 * Re-exporta `useWhatsAppProSend` para que o frontend tenha um único
 * ponto de entrada futuro. Novas features devem importar daqui em vez
 * de chamarem `supabase.functions.invoke('whatsapp-pro-send', ...)`
 * directamente ou usarem hooks legacy como `useSendWhatsAppZapi`.
 *
 * Edge function canónica: `whatsapp-pro-send`.
 */
export { useWhatsAppProSend as useSendWhatsApp } from "@/hooks/useWhatsAppPro";
