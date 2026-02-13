/**
 * Privacy-First Analytics Helpers
 * 
 * Pure functions for bucketizing, sanitizing, and pushing events
 * to the dataLayer (GTM/Clarity) without any personal data.
 */

// ── Blocked fields that must NEVER be sent ──
const BLOCKED_FIELDS = new Set([
  'content', 'body', 'subject', 'name', 'email', 'phone',
  'message', 'text', 'address', 'first_name', 'last_name',
  'full_name', 'password', 'token', 'secret',
]);

// ── PII detection patterns ──
const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
const PHONE_REGEX = /(\+?\d{1,4}[\s-]?)?\(?\d{2,4}\)?[\s.-]?\d{3,4}[\s.-]?\d{3,4}/;

// ── Value Bucketizers ──

export function bucketizeValue(value: number): string {
  if (value <= 0) return '0';
  if (value <= 500) return '0-500';
  if (value <= 2000) return '500-2000';
  return '2000+';
}

export function bucketizeTime(minutes: number): string {
  if (minutes < 5) return '<5min';
  if (minutes <= 30) return '5-30';
  if (minutes <= 120) return '30-120';
  return '120+';
}

export function bucketizeScore(score: number): string {
  if (score <= 0) return '0';
  if (score <= 40) return '0-40';
  if (score <= 70) return '40-70';
  return '70+';
}

export function bucketizeCount(count: number): string {
  if (count <= 2) return '1-2';
  if (count <= 5) return '3-5';
  return '5+';
}

export function bucketizeDays(days: number): string {
  if (days <= 1) return '0-1';
  if (days <= 3) return '2-3';
  if (days <= 7) return '4-7';
  if (days <= 14) return '8-14';
  return '14+';
}

// ── Sanitizer ──

function containsPII(value: string): boolean {
  return EMAIL_REGEX.test(value) || PHONE_REGEX.test(value);
}

export function sanitizeEventData(data: Record<string, unknown>): Record<string, unknown> {
  const clean: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(data)) {
    // Skip blocked fields
    if (BLOCKED_FIELDS.has(key.toLowerCase())) continue;

    // Skip string values that look like PII
    if (typeof value === 'string' && containsPII(value)) continue;

    // Allow safe types
    if (
      typeof value === 'number' ||
      typeof value === 'boolean' ||
      value === null ||
      value === undefined
    ) {
      clean[key] = value;
    } else if (typeof value === 'string') {
      clean[key] = value;
    }
    // Skip objects/arrays to avoid leaking nested PII
  }

  return clean;
}

// ── Safe Push to dataLayer ──

interface SafePushOptions {
  consentAnalytics: boolean;
  isProd?: boolean;
}

export function safePush(
  eventName: string,
  data: Record<string, unknown>,
  options: SafePushOptions
): void {
  // Gate: consent must be granted
  if (!options.consentAnalytics) return;

  // Gate: only push in prod (unless explicitly overridden)
  if (options.isProd === false) return;

  const sanitized = sanitizeEventData(data);

  if (typeof window !== 'undefined') {
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({
      event: eventName,
      ...sanitized,
      event_timestamp: new Date().toISOString(),
    });
  }
}

// ── Environment helpers ──

export function getDeviceType(): 'desktop' | 'mobile' {
  return window.innerWidth < 768 ? 'mobile' : 'desktop';
}

export function getEnvironment(): 'prod' | 'staging' {
  const hostname = window.location.hostname;
  if (
    hostname.includes('lovable.app') ||
    hostname.includes('lovableproject.com') ||
    hostname === 'localhost'
  ) {
    return 'staging';
  }
  return 'prod';
}

export function isProdEnvironment(): boolean {
  return getEnvironment() === 'prod';
}
