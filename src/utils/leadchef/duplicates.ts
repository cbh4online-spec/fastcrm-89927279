/**
 * Deteção de duplicados LeadChef.
 */
import { cleanPhoneNumber } from "./contact";

export function normalizePhoneForMatch(phone?: string | null): string {
  if (!phone) return "";
  let p = cleanPhoneNumber(phone).replace(/^\+/, "");
  if (/^[239]\d{8}$/.test(p)) p = `351${p}`;
  return p;
}

export function normalizeEmailForMatch(email?: string | null): string {
  return (email ?? "").trim().toLowerCase();
}

export function isValidEmail(email: string): boolean {
  if (!email) return true;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

export interface ExistingLead {
  id: string;
  name?: string | null;
  phone?: string | null;
  email?: string | null;
}

export interface DuplicateMatch {
  lead: ExistingLead;
  reason: "phone" | "email" | "name";
}

export function findDuplicate(
  candidate: { name?: string; phone?: string; email?: string },
  existing: ExistingLead[],
): DuplicateMatch | null {
  const cPhone = normalizePhoneForMatch(candidate.phone);
  const cEmail = normalizeEmailForMatch(candidate.email);
  const cName = (candidate.name ?? "").trim().toLowerCase();

  for (const lead of existing) {
    if (cPhone && normalizePhoneForMatch(lead.phone) === cPhone) {
      return { lead, reason: "phone" };
    }
    if (cEmail && normalizeEmailForMatch(lead.email) === cEmail) {
      return { lead, reason: "email" };
    }
  }
  if (!cPhone && !cEmail && cName) {
    for (const lead of existing) {
      if ((lead.name ?? "").trim().toLowerCase() === cName) {
        return { lead, reason: "name" };
      }
    }
  }
  return null;
}
