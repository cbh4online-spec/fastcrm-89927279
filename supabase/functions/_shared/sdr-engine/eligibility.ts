/**
 * Elegibilidade de candidatos para inscrição SDR (B01).
 * Fontes reais: professional_prospecting_profiles e leads (Maps importa para leads).
 */
import { identityKey, normalizeEmail, normalizePhone } from "./identity.ts";

export type CandidateSource = "professional_profiles" | "leads";

export interface Candidate {
  source: CandidateSource;
  id: string;
  workspaceId: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  score: number | null;
  location: string | null;
  profession: string | null;
  category: string | null;
  status: string | null;
  leadSource: string | null;
  blocked: boolean;
  leadId: string | null;
  prospectId: string | null;
}

export interface TargetFilters {
  sources: CandidateSource[];
  min_score: number;
  statuses?: string[];
  lead_sources?: string[];
  locations?: string[];
  professions?: string[];
  categories?: string[];
}

const ALL_SOURCES: CandidateSource[] = ["professional_profiles", "leads"];
const strList = (v: unknown) => (Array.isArray(v) ? v.filter((x) => typeof x === "string" && x.trim()).map((x) => (x as string).trim().toLowerCase()) : undefined);

export function parseTargetFilters(raw: unknown, fallbackMinScore: number | null | undefined): TargetFilters {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const sources = (strList(r.sources) ?? []).filter((s): s is CandidateSource => (ALL_SOURCES as string[]).includes(s));
  const min = typeof r.min_score === "number" ? r.min_score : fallbackMinScore ?? 70;
  return {
    sources: sources.length ? sources : ALL_SOURCES,
    min_score: Math.max(0, Math.min(100, min)),
    statuses: strList(r.statuses),
    lead_sources: strList(r.lead_sources),
    locations: strList(r.locations),
    professions: strList(r.professions),
    categories: strList(r.categories),
  };
}

const EXCLUDED_PROFILE_STATUSES = new Set(["rejected", "discarded", "blocked", "do_not_contact"]);

export interface EligibilityResult { eligible: boolean; reasons: string[]; identityKey: string | null }

export function evaluateCandidate(
  c: Candidate,
  f: TargetFilters,
  channel: "email" | "whatsapp",
  suppressed: { emails: Set<string>; phones: Set<string> },
): EligibilityResult {
  const reasons: string[] = [];
  const email = normalizeEmail(c.email);
  const phone = normalizePhone(c.phone);
  if (!f.sources.includes(c.source)) reasons.push("source_not_targeted");
  if (c.blocked) reasons.push("blocked");
  if (c.status && EXCLUDED_PROFILE_STATUSES.has(c.status.toLowerCase())) reasons.push("excluded_status");
  if (c.score === null || c.score < f.min_score) reasons.push("score_below_min");
  if (f.statuses?.length && !(c.status && f.statuses.includes(c.status.toLowerCase()))) reasons.push("status_not_targeted");
  if (f.lead_sources?.length && !(c.leadSource && f.lead_sources.includes(c.leadSource.toLowerCase()))) reasons.push("lead_source_not_targeted");
  const contains = (hay: string | null, list?: string[]) => !list?.length || (!!hay && list.some((n) => hay.toLowerCase().includes(n)));
  if (!contains(c.location, f.locations)) reasons.push("location_not_targeted");
  if (!contains(c.profession, f.professions)) reasons.push("profession_not_targeted");
  if (!contains(c.category, f.categories)) reasons.push("category_not_targeted");
  if (channel === "email" && !email) reasons.push("no_valid_email");
  if (channel === "whatsapp" && !(phone && phone.length >= 9)) reasons.push("no_valid_phone");
  if (email && suppressed.emails.has(email)) reasons.push("email_suppressed");
  if (phone && suppressed.phones.has(phone)) reasons.push("phone_opted_out");
  return {
    eligible: reasons.length === 0,
    reasons,
    identityKey: identityKey({ email: c.email, phone: c.phone, leadId: c.leadId, prospectId: c.prospectId }),
  };
}

// deno-lint-ignore no-explicit-any
export function candidateFromProfile(p: any): Candidate {
  return {
    source: "professional_profiles", id: p.id, workspaceId: p.workspace_id, name: p.profile_name ?? null,
    email: p.extracted_email ?? null, phone: p.extracted_phone ?? null,
    score: typeof p.lead_score === "number" ? p.lead_score : null, location: p.inferred_location ?? null,
    profession: p.inferred_profession ?? null, category: p.inferred_type ?? null, status: p.status ?? null,
    leadSource: p.platform ?? null, blocked: false, leadId: p.converted_lead_id ?? null, prospectId: p.id,
  };
}

// deno-lint-ignore no-explicit-any
export function candidateFromLead(l: any): Candidate {
  const score = typeof l.icp_fit_score === "number" ? l.icp_fit_score : typeof l.lead_score === "number" ? l.lead_score : null;
  return {
    source: "leads", id: l.id, workspaceId: l.workspace_id, name: l.name ?? l.company_name ?? null,
    email: l.email ?? null, phone: l.phone ?? null, score, location: l.city ?? l.county ?? l.region ?? null,
    profession: l.inferred_profession ?? l.industry ?? null, category: l.business_category ?? null,
    status: l.status ?? null, leadSource: l.source ?? null, blocked: !!l.is_blocked || !!l.archived_at,
    leadId: l.id, prospectId: l.prospecting_profile_id ?? null,
  };
}
