// CloudTalk conversation-intelligence helpers: normalise CloudTalk AI payloads and validate FastCRM AI summaries.
import { z } from "npm:zod@3.23.8";

export type TranscriptSegment = { speaker: "agent" | "customer" | "unknown"; text: string };
export const MAX_TRANSCRIPT_CHARS = 30_000;
export const DAILY_AI_LIMIT = 50;

const SENTIMENTS: Record<string, "positive" | "neutral" | "negative"> = {
  very_positive: "positive", positive: "positive", neutral: "neutral", negative: "negative", very_negative: "negative",
};

export function normalizeSentiment(v: unknown): "positive" | "neutral" | "negative" | null {
  if (v === null || v === undefined) return null;
  const k = String(typeof v === "object" ? (v as any).label ?? (v as any).value ?? "" : v).toLowerCase().trim().replace(/[\s-]+/g, "_");
  return SENTIMENTS[k] ?? null;
}

function speakerOf(v: unknown): TranscriptSegment["speaker"] {
  const s = String(v ?? "").toLowerCase();
  if (/agent|operator|user|rep/.test(s)) return "agent";
  if (/customer|client|contact|caller|callee|external/.test(s)) return "customer";
  return "unknown";
}

export function normalizeTranscript(v: unknown): TranscriptSegment[] | null {
  if (!v) return null;
  if (typeof v === "string") return v.trim() ? [{ speaker: "unknown", text: v.trim().slice(0, MAX_TRANSCRIPT_CHARS) }] : null;
  const arr = Array.isArray(v) ? v : Array.isArray((v as any).segments) ? (v as any).segments : Array.isArray((v as any).utterances) ? (v as any).utterances : null;
  if (!arr) return typeof (v as any).text === "string" ? normalizeTranscript((v as any).text) : null;
  let total = 0;
  const out: TranscriptSegment[] = [];
  for (const s of arr) {
    const text = String(s?.text ?? s?.transcript ?? s?.content ?? "").trim();
    if (!text) continue;
    total += text.length;
    if (total > MAX_TRANSCRIPT_CHARS) break;
    out.push({ speaker: speakerOf(s?.speaker ?? s?.role ?? s?.channel ?? s?.participant), text });
  }
  return out.length ? out : null;
}

/** Extracts AI fields from a CloudTalk webhook payload (Conversation Intelligence). All optional. */
export function extractCloudtalkAi(payload: Record<string, unknown>) {
  const p = (payload?.data && typeof payload.data === "object" ? payload.data : payload) as Record<string, any>;
  const transcript = normalizeTranscript(p.transcription ?? p.transcript ?? p.call_transcription);
  const rawSummary = p.ai_summary ?? p.summary ?? p.call_summary;
  const summary = typeof rawSummary === "string" ? rawSummary.trim().slice(0, 2000) || null
    : typeof rawSummary?.text === "string" ? rawSummary.text.trim().slice(0, 2000) || null : null;
  const sentiment = normalizeSentiment(p.sentiment ?? p.customer_sentiment ?? p.overall_sentiment);
  const rawItems = p.action_items ?? p.smart_notes?.action_items ?? p.next_steps;
  const action_items = Array.isArray(rawItems)
    ? rawItems.map((i: any) => String(typeof i === "string" ? i : i?.text ?? i?.title ?? "").trim().slice(0, 200)).filter(Boolean).slice(0, 10)
    : null;
  return { transcript, summary, sentiment, action_items };
}

export const aiSummarySchema = z.object({
  summary: z.string().trim().min(10).max(1200),
  sentiment: z.enum(["positive", "neutral", "negative"]),
  action_items: z.array(z.string().trim().min(3).max(200)).max(8),
});
export type AiSummary = z.infer<typeof aiSummarySchema>;

export function parseAiSummary(raw: unknown): AiSummary | null {
  const r = aiSummarySchema.safeParse(raw);
  return r.success ? r.data : null;
}

export function transcriptToText(t: TranscriptSegment[]): string {
  const label = { agent: "Agente", customer: "Cliente", unknown: "Interlocutor" } as const;
  return t.map((s) => `${label[s.speaker]}: ${s.text}`).join("\n").slice(0, MAX_TRANSCRIPT_CHARS);
}
