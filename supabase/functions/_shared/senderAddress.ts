// Resolve o endereço de envio de um workspace a partir de marketing_settings.
// Fallback: news@m.fastcrm.metodopare.ai (domínio da plataforma).
export const DEFAULT_SENDER_DOMAIN = "m.fastcrm.metodopare.ai";
export const DEFAULT_SENDER_PREFIX = "news";

const DOMAIN_RE = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/;
const PREFIX_RE = /^[a-z0-9._-]{1,40}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface SenderDefaults { email: string; fromName: string | null; replyTo: string | null }

// deno-lint-ignore no-explicit-any
export async function resolveSenderDefaults(supabase: any, workspaceId: string | null | undefined): Promise<SenderDefaults> {
  const fallback = { email: `${DEFAULT_SENDER_PREFIX}@${DEFAULT_SENDER_DOMAIN}`, fromName: null, replyTo: null };
  if (!workspaceId) return fallback;
  try {
    const { data } = await supabase
      .from("marketing_settings")
      .select("sender_domain, sender_prefix, default_from_name, default_reply_to")
      .eq("workspace_id", workspaceId)
      .maybeSingle();
    const domain = (data?.sender_domain || "").toLowerCase();
    const prefix = (data?.sender_prefix || "").toLowerCase();
    const reply = (data?.default_reply_to || "").trim();
    return {
      email: `${PREFIX_RE.test(prefix) ? prefix : DEFAULT_SENDER_PREFIX}@${DOMAIN_RE.test(domain) ? domain : DEFAULT_SENDER_DOMAIN}`,
      fromName: (data?.default_from_name || "").trim() || null,
      replyTo: EMAIL_RE.test(reply) ? reply : null,
    };
  } catch {
    return fallback;
  }
}

// deno-lint-ignore no-explicit-any
export async function resolveSenderEmail(supabase: any, workspaceId: string | null | undefined): Promise<string> {
  return (await resolveSenderDefaults(supabase, workspaceId)).email;
}
