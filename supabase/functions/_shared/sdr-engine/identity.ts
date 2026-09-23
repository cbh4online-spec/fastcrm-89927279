/**
 * Identidade estável de um destinatário SDR.
 * ESPELHO EXACTO de public.sdr_identity_key / public.sdr_normalize_phone
 * (supabase/pending-migrations/20260923180000_sdr_prospecting_phase1.sql).
 * Qualquer alteração tem de ser feita nos dois lados (há teste SQL que compara).
 */

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export function normalizeEmail(email: string | null | undefined): string | null {
  const e = (email ?? "").trim().toLowerCase();
  return EMAIL_RE.test(e) ? e : null;
}

export function normalizePhone(phone: string | null | undefined): string | null {
  const d = (phone ?? "").replace(/\D/g, "");
  if (!d) return null;
  if (d.startsWith("00")) return d.slice(2);
  if (d.length === 9 && ["2", "3", "9"].includes(d[0])) return "351" + d;
  return d;
}

export interface IdentityInput {
  email?: string | null;
  phone?: string | null;
  contactId?: string | null;
  leadId?: string | null;
  prospectId?: string | null;
}

export function identityKey(i: IdentityInput): string | null {
  const email = normalizeEmail(i.email);
  if (email) return `email:${email}`;
  const phone = normalizePhone(i.phone);
  if (phone && phone.length >= 9) return `phone:${phone}`;
  if (i.contactId) return `contact:${i.contactId}`;
  if (i.leadId) return `lead:${i.leadId}`;
  if (i.prospectId) return `prospect:${i.prospectId}`;
  return null;
}
