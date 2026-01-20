/**
 * FastCRM Marketing - Domain Configuration
 * 
 * Official sending and tracking domains for email marketing.
 * All emails are sent from the shared infrastructure - tenants don't control DNS in V1.
 */

// =============================================================================
// SENDING DOMAIN
// =============================================================================

/**
 * Official email sending domain
 * ❌ Never use fastcrm.metodopare.ai directly
 * ✔️ All marketing emails are sent exclusively from m.fastcrm.metodopare.ai
 */
export const MARKETING_SEND_DOMAIN = 'm.fastcrm.metodopare.ai';

/**
 * Default sender email format
 * Example: news@m.fastcrm.metodopare.ai
 */
export const getMarketingSenderEmail = (alias: string = 'news'): string => {
  return `${alias}@${MARKETING_SEND_DOMAIN}`;
};

/**
 * Format a complete "From" header
 * Example: "Nome da Empresa" <news@m.fastcrm.metodopare.ai>
 */
export const formatMarketingFromHeader = (name: string, alias: string = 'news'): string => {
  const email = getMarketingSenderEmail(alias);
  return `"${name.replace(/"/g, '\\"')}" <${email}>`;
};

// =============================================================================
// CLICK TRACKING DOMAIN
// =============================================================================

/**
 * Click tracking domain
 * All links in marketing emails are rewritten to pass through this domain
 */
export const MARKETING_CLICK_DOMAIN = 'r.fastcrm.metodopare.ai';

/**
 * Generate a click tracking URL
 * @param clickId - Unique click identifier
 */
export const getClickTrackingUrl = (clickId: string): string => {
  return `https://${MARKETING_CLICK_DOMAIN}/c/${clickId}`;
};

// =============================================================================
// OPEN TRACKING & UNSUBSCRIBE DOMAIN
// =============================================================================

/**
 * Open tracking and unsubscribe domain
 */
export const MARKETING_TRACKING_DOMAIN = 'u.fastcrm.metodopare.ai';

/**
 * Generate an open tracking pixel URL
 * @param openId - Unique open identifier
 */
export const getOpenTrackingPixelUrl = (openId: string): string => {
  return `https://${MARKETING_TRACKING_DOMAIN}/o/${openId}.png`;
};

/**
 * Generate an unsubscribe URL
 * @param token - Secure unsubscribe token
 */
export const getUnsubscribeUrl = (token: string): string => {
  return `https://${MARKETING_TRACKING_DOMAIN}/unsub/${token}`;
};

// =============================================================================
// DISPLAY CONFIGURATION
// =============================================================================

/**
 * Configuration for displaying domain info in the UI
 */
export const MARKETING_DOMAIN_CONFIG = {
  sendDomain: MARKETING_SEND_DOMAIN,
  clickDomain: MARKETING_CLICK_DOMAIN,
  trackingDomain: MARKETING_TRACKING_DOMAIN,
  
  // DNS Configuration (for reference/documentation)
  dns: {
    spf: 'v=spf1 include:_spf.resend.com ~all',
    dmarc: 'v=DMARC1; p=none; rua=mailto:dmarc@metodopare.ai;',
    // DKIM CNAMEs are provided by Resend
  },
  
  // Feature flags
  features: {
    clickTracking: true,
    openTracking: true,
    autoUnsubscribeFooter: true,
    webhookEvents: true,
  },
} as const;

/**
 * Default sender aliases available
 */
export const MARKETING_SENDER_ALIASES = [
  { value: 'news', label: 'Notícias', example: 'news@m.fastcrm.metodopare.ai' },
  { value: 'info', label: 'Informação', example: 'info@m.fastcrm.metodopare.ai' },
  { value: 'noreply', label: 'Sem resposta', example: 'noreply@m.fastcrm.metodopare.ai' },
  { value: 'marketing', label: 'Marketing', example: 'marketing@m.fastcrm.metodopare.ai' },
] as const;

export type MarketingSenderAlias = typeof MARKETING_SENDER_ALIASES[number]['value'];
