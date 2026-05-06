/**
 * FastCRM WhatsApp Pro — Webhook security helpers (frontend stubs).
 * A validação real acontece nas edge functions; este ficheiro existe para
 * manter simetria de imports entre cliente e contratos partilhados.
 */
export interface WebhookValidationConfig {
  webhookToken?: string | null;
  signatureHeader?: string | null;
}

export function buildWebhookUrl(opts: {
  supabaseUrl: string;
  provider: string;
  workspaceId: string;
  instanceId?: string | null;
  webhookToken?: string | null;
}): string {
  const u = new URL(`${opts.supabaseUrl}/functions/v1/whatsapp-pro-webhook`);
  u.searchParams.set("provider", opts.provider);
  u.searchParams.set("workspace_id", opts.workspaceId);
  if (opts.instanceId) u.searchParams.set("instance_id", opts.instanceId);
  if (opts.webhookToken) u.searchParams.set("token", opts.webhookToken);
  return u.toString();
}
