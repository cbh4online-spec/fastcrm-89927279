// Resolve o endereço de envio de um workspace a partir de marketing_settings.
// Fallback: news@m.fastcrm.metodopare.ai (domínio da plataforma).
export const DEFAULT_SENDER_DOMAIN = "m.fastcrm.metodopare.ai";
export const DEFAULT_SENDER_PREFIX = "news";

const DOMAIN_RE = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/;
const PREFIX_RE = /^[a-z0-9._-]{1,40}$/;

// deno-lint-ignore no-explicit-any
export async function resolveSenderEmail(supabase: any, workspaceId: string | null | undefined): Promise<string> {
  if (!workspaceId) return `${DEFAULT_SENDER_PREFIX}@${DEFAULT_SENDER_DOMAIN}`;
  try {
    const { data } = await supabase
      .from("marketing_settings")
      .select("sender_domain, sender_prefix")
      .eq("workspace_id", workspaceId)
      .maybeSingle();
    const domain = (data?.sender_domain || "").toLowerCase();
    const prefix = (data?.sender_prefix || "").toLowerCase();
    return `${PREFIX_RE.test(prefix) ? prefix : DEFAULT_SENDER_PREFIX}@${DOMAIN_RE.test(domain) ? domain : DEFAULT_SENDER_DOMAIN}`;
  } catch {
    return `${DEFAULT_SENDER_PREFIX}@${DEFAULT_SENDER_DOMAIN}`;
  }
}
