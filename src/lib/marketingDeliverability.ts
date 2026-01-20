/**
 * FastCRM Marketing - Deliverability Rules & Validation
 * 
 * Implements the V1 deliverability checklist for safe email sending.
 */

import { MARKETING_DOMAIN_CONFIG } from '@/config/marketingDomains';

// =============================================================================
// WARM-UP CONFIGURATION
// =============================================================================

/**
 * Warm-up schedule: limits per day during ramp-up period
 * Day 1-3: very conservative
 * Day 4-7: gradual increase
 * Day 8+: full capacity
 */
export const WARMUP_SCHEDULE = [
  { day: 1, dailyLimit: 50, description: 'Início conservador' },
  { day: 2, dailyLimit: 75, description: 'Aumentando gradualmente' },
  { day: 3, dailyLimit: 100, description: 'Aumentando gradualmente' },
  { day: 4, dailyLimit: 150, description: 'Crescimento moderado' },
  { day: 5, dailyLimit: 200, description: 'Crescimento moderado' },
  { day: 6, dailyLimit: 300, description: 'Aproximando do normal' },
  { day: 7, dailyLimit: 400, description: 'Aproximando do normal' },
  { day: 8, dailyLimit: 500, description: 'Capacidade quase total' },
  { day: 9, dailyLimit: 750, description: 'Capacidade quase total' },
  { day: 10, dailyLimit: 1000, description: 'Capacidade total' },
] as const;

export function getWarmupLimit(warmupDaysCompleted: number, baseDailyLimit: number): number {
  if (warmupDaysCompleted >= WARMUP_SCHEDULE.length) {
    return baseDailyLimit;
  }
  const scheduleEntry = WARMUP_SCHEDULE[warmupDaysCompleted] || WARMUP_SCHEDULE[0];
  return Math.min(scheduleEntry.dailyLimit, baseDailyLimit);
}

// =============================================================================
// ANTI-ABUSE THRESHOLDS
// =============================================================================

export const ANTI_ABUSE = {
  /** Alert when bounce rate exceeds this (5%) */
  BOUNCE_RATE_ALERT: 5.0,
  
  /** Block sending when bounce rate exceeds this (10%) */
  BOUNCE_RATE_BLOCK: 10.0,
  
  /** Block sending when complaint rate exceeds this (0.3%) */
  COMPLAINT_RATE_BLOCK: 0.3,
  
  /** Auto-unsubscribe on hard bounce */
  AUTO_UNSUBSCRIBE_HARD_BOUNCE: true,
  
  /** Minimum sends before calculating rates */
  MIN_SENDS_FOR_RATES: 50,
} as const;

export type HealthStatus = 'healthy' | 'warning' | 'critical' | 'blocked';

export interface TenantHealthCheck {
  status: HealthStatus;
  bounceRate: number;
  complaintRate: number;
  healthScore: number;
  alerts: string[];
  canSend: boolean;
}

export function checkTenantHealth(
  totalSent: number,
  totalBounced: number,
  totalComplained: number
): TenantHealthCheck {
  const alerts: string[] = [];
  let status: HealthStatus = 'healthy';
  let canSend = true;
  
  // Calculate rates
  const bounceRate = totalSent > 0 ? (totalBounced / totalSent) * 100 : 0;
  const complaintRate = totalSent > 0 ? (totalComplained / totalSent) * 100 : 0;
  
  // Only apply rules if we have enough data
  if (totalSent >= ANTI_ABUSE.MIN_SENDS_FOR_RATES) {
    // Check bounce rate
    if (bounceRate >= ANTI_ABUSE.BOUNCE_RATE_BLOCK) {
      status = 'blocked';
      canSend = false;
      alerts.push(`Taxa de bounce muito alta (${bounceRate.toFixed(1)}%). Envio bloqueado.`);
    } else if (bounceRate >= ANTI_ABUSE.BOUNCE_RATE_ALERT) {
      status = 'warning';
      alerts.push(`Taxa de bounce elevada (${bounceRate.toFixed(1)}%). Recomendamos limpar a lista.`);
    }
    
    // Check complaint rate
    if (complaintRate >= ANTI_ABUSE.COMPLAINT_RATE_BLOCK) {
      status = 'blocked';
      canSend = false;
      alerts.push(`Taxa de complaints muito alta (${complaintRate.toFixed(2)}%). Envio bloqueado.`);
    }
  }
  
  // Calculate health score (0-100)
  let healthScore = 100;
  healthScore -= bounceRate * 5; // Each 1% bounce = -5 points
  healthScore -= complaintRate * 100; // Each 0.1% complaint = -10 points
  healthScore = Math.max(0, Math.min(100, healthScore));
  
  if (healthScore < 50 && status === 'healthy') {
    status = 'warning';
  }
  if (healthScore < 25) {
    status = 'critical';
  }
  
  return {
    status,
    bounceRate,
    complaintRate,
    healthScore,
    alerts,
    canSend,
  };
}

// =============================================================================
// CONTENT VALIDATION
// =============================================================================

const SPAM_WORDS = [
  'free', 'grátis', 'garantia', 'guarantee', '$$$', '100%', 'urgent', 
  'urgente', 'act now', 'limited time', 'tempo limitado', 'click here',
  'clique aqui', 'winner', 'vencedor', 'congratulations', 'parabéns',
];

export interface ContentValidation {
  isValid: boolean;
  warnings: string[];
  errors: string[];
}

export function validateEmailContent(
  subject: string,
  bodyHtml: string,
  hasUnsubscribeLink: boolean
): ContentValidation {
  const warnings: string[] = [];
  const errors: string[] = [];
  
  // Check subject
  if (!subject || subject.trim().length === 0) {
    errors.push('O assunto é obrigatório');
  } else {
    // Check for ALL CAPS
    if (subject === subject.toUpperCase() && subject.length > 5) {
      warnings.push('Evite usar CAPS LOCK no assunto - pode ser marcado como spam');
    }
    
    // Check for spam words
    const lowerSubject = subject.toLowerCase();
    for (const word of SPAM_WORDS) {
      if (lowerSubject.includes(word.toLowerCase())) {
        warnings.push(`A palavra "${word}" no assunto pode afetar a entregabilidade`);
        break;
      }
    }
    
    // Check length
    if (subject.length > 60) {
      warnings.push('Assunto com mais de 60 caracteres pode ser cortado em alguns clientes');
    }
  }
  
  // Check body
  if (!bodyHtml || bodyHtml.trim().length === 0) {
    errors.push('O conteúdo do email é obrigatório');
  } else {
    // Count links
    const linkCount = (bodyHtml.match(/<a\s/gi) || []).length;
    if (linkCount > 5) {
      warnings.push(`Muitos links (${linkCount}). Recomendamos no máximo 3-5 para evitar filtros de spam`);
    }
    
    // Check for images without alt text
    const imagesWithoutAlt = (bodyHtml.match(/<img(?![^>]*alt=)/gi) || []).length;
    if (imagesWithoutAlt > 0) {
      warnings.push('Algumas imagens não têm texto alternativo (alt)');
    }
  }
  
  // Check unsubscribe link
  if (!hasUnsubscribeLink) {
    errors.push('Link de cancelamento de subscrição é obrigatório');
  }
  
  return {
    isValid: errors.length === 0,
    warnings,
    errors,
  };
}

// =============================================================================
// LIST HYGIENE RULES
// =============================================================================

export interface ListHygieneCheck {
  allowed: boolean;
  reason?: string;
}

/**
 * Check if an email is allowed to be added to marketing list
 */
export function checkEmailForList(
  email: string,
  hasConsent: boolean,
  consentSource?: string
): ListHygieneCheck {
  const lowerEmail = email.toLowerCase();
  
  // Block generic role emails in V1
  const blockedPatterns = [
    /^info@/,
    /^sales@/,
    /^support@/,
    /^contact@/,
    /^admin@/,
    /^noreply@/,
    /^no-reply@/,
  ];
  
  for (const pattern of blockedPatterns) {
    if (pattern.test(lowerEmail)) {
      return {
        allowed: false,
        reason: 'Emails genéricos (info@, sales@, etc.) não são permitidos em campanhas de marketing',
      };
    }
  }
  
  // Require consent source in V1
  if (!hasConsent || !consentSource) {
    return {
      allowed: false,
      reason: 'É necessário ter consentimento registado com fonte (CRM, opt-in, etc.)',
    };
  }
  
  return { allowed: true };
}

// =============================================================================
// TRACKING REQUIREMENTS
// =============================================================================

/**
 * Inject mandatory footer with unsubscribe link and sender identification
 */
export function injectMandatoryFooter(
  bodyHtml: string,
  unsubscribeUrl: string,
  senderName: string,
  customFooter?: string
): string {
  const footerHtml = `
    <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e0e0e0; font-size: 12px; color: #666; text-align: center;">
      ${customFooter ? `<p>${customFooter}</p>` : ''}
      <p>${senderName}</p>
      <p>
        <a href="${unsubscribeUrl}" style="color: #666; text-decoration: underline;">
          Cancelar subscrição
        </a>
      </p>
    </div>
  `;
  
  // Insert before closing body tag
  if (bodyHtml.includes('</body>')) {
    return bodyHtml.replace('</body>', `${footerHtml}</body>`);
  }
  
  return bodyHtml + footerHtml;
}

/**
 * Rewrite links for click tracking
 */
export function rewriteLinksForTracking(
  bodyHtml: string,
  campaignId: string,
  recipientId: string,
  generateTrackingUrl: (originalUrl: string, campaignId: string, recipientId: string) => string
): string {
  // Match href attributes
  return bodyHtml.replace(
    /href="([^"]+)"/gi,
    (match, url) => {
      // Don't rewrite unsubscribe links or mailto/tel links
      if (url.includes('unsub') || url.startsWith('mailto:') || url.startsWith('tel:')) {
        return match;
      }
      const trackingUrl = generateTrackingUrl(url, campaignId, recipientId);
      return `href="${trackingUrl}"`;
    }
  );
}

/**
 * Add open tracking pixel
 */
export function addOpenTrackingPixel(bodyHtml: string, pixelUrl: string): string {
  const pixelHtml = `<img src="${pixelUrl}" width="1" height="1" alt="" style="display:none;width:1px;height:1px;" />`;
  
  // Insert before closing body tag
  if (bodyHtml.includes('</body>')) {
    return bodyHtml.replace('</body>', `${pixelHtml}</body>`);
  }
  
  return bodyHtml + pixelHtml;
}

// =============================================================================
// THROTTLING
// =============================================================================

export const THROTTLE_CONFIG = {
  /** Milliseconds between each email send */
  SEND_DELAY_MS: 100,
  
  /** Batch size for parallel sending */
  BATCH_SIZE: 10,
  
  /** Delay between batches in ms */
  BATCH_DELAY_MS: 1000,
} as const;

/**
 * Calculate optimal send timing to avoid blast
 */
export function calculateSendSchedule(recipientCount: number): {
  estimatedDurationMinutes: number;
  batchCount: number;
} {
  const batchCount = Math.ceil(recipientCount / THROTTLE_CONFIG.BATCH_SIZE);
  const totalDelayMs = 
    (recipientCount * THROTTLE_CONFIG.SEND_DELAY_MS) + 
    (batchCount * THROTTLE_CONFIG.BATCH_DELAY_MS);
  
  return {
    estimatedDurationMinutes: Math.ceil(totalDelayMs / 60000),
    batchCount,
  };
}
