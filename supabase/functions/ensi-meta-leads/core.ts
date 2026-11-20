import { z } from "npm:zod@3";

export const ENSI_CONFIG = {
  appId: "2582678412103949",
  pageId: "113692350807474",
  formId: "29967420322844561",
  workspaceId: "0662fc16-6286-4156-a908-08c7dfec0fb7",
  formName: "ENSI | Iniciação Porto e Lisboa | Janeiro 2027 | Nov 2026",
  graphVersion: "v26.0",
} as const;

const idSchema = z.string().regex(/^\d{1,64}$/);
const optionalIdSchema = idSchema.nullish();
const idKeys = new Set(["id", "form_id", "page_id", "leadgen_id", "campaign_id", "adset_id", "adgroup_id", "ad_id"]);

type JsonReviverContext = { source?: string };
type LosslessJsonParse = (
  text: string,
  reviver: (this: unknown, key: string, value: unknown, context?: JsonReviverContext) => unknown,
) => unknown;

/** Preserva IDs numéricos acima de Number.MAX_SAFE_INTEGER usando o texto original. */
export function parseMetaJson(text: string): unknown {
  return (JSON.parse as LosslessJsonParse)(text, (key, value, context) => {
    if (idKeys.has(key) && typeof value === "number") {
      if (!context?.source || !/^\d{1,64}$/.test(context.source)) {
        throw new Error("NUMERIC_ID_WITHOUT_SOURCE");
      }
      return context.source;
    }
    return value;
  });
}

// O envelope é validado antes, mas os valores leadgen só são validados depois
// de filtrar Página, campo e formulário. Um evento alheio não invalida a batelada.
const envelopeSchema = z.object({
  object: z.string(),
  entry: z.array(z.object({
    id: idSchema,
    changes: z.array(z.object({ field: z.string(), value: z.unknown() }).passthrough()).max(50),
  }).passthrough()).max(25),
}).passthrough();

const leadgenIdentitySchema = z.object({
  form_id: optionalIdSchema,
  page_id: optionalIdSchema,
}).passthrough();

const leadgenSchema = z.object({
  leadgen_id: idSchema,
  form_id: idSchema,
  page_id: idSchema,
  created_time: z.number().int().positive().optional(),
}).passthrough();

export type EnsiLeadReference = {
  leadId: string;
  formId: string;
  pageId: string;
  createdTime?: number;
};

export function selectEnsiLeadReferences(payload: unknown): {
  valid: boolean;
  references: EnsiLeadReference[];
  ignoredEvents: number;
  invalidEvents: number;
} {
  const parsed = envelopeSchema.safeParse(payload);
  if (!parsed.success) return { valid: false, references: [], ignoredEvents: 0, invalidEvents: 0 };

  const references: EnsiLeadReference[] = [];
  let ignoredEvents = 0;
  let invalidEvents = 0;
  if (parsed.data.object !== "page") {
    return { valid: true, references, ignoredEvents: parsed.data.entry.length, invalidEvents };
  }

  for (const entry of parsed.data.entry) {
    if (entry.id !== ENSI_CONFIG.pageId) {
      ignoredEvents += 1;
      continue;
    }
    for (const change of entry.changes) {
      if (change.field !== "leadgen") {
        ignoredEvents += 1;
        continue;
      }
      const identity = leadgenIdentitySchema.safeParse(change.value);
      if (identity.success) {
        if (identity.data.form_id && identity.data.form_id !== ENSI_CONFIG.formId) {
          ignoredEvents += 1;
          continue;
        }
        if (identity.data.page_id && identity.data.page_id !== ENSI_CONFIG.pageId) {
          ignoredEvents += 1;
          continue;
        }
      }
      const value = leadgenSchema.safeParse(change.value);
      if (!value.success) {
        invalidEvents += 1;
        continue;
      }
      if (value.data.page_id !== ENSI_CONFIG.pageId || value.data.form_id !== ENSI_CONFIG.formId) {
        ignoredEvents += 1;
        continue;
      }
      references.push({
        leadId: value.data.leadgen_id,
        formId: value.data.form_id,
        pageId: value.data.page_id,
        createdTime: value.data.created_time,
      });
    }
  }
  return { valid: true, references, ignoredEvents, invalidEvents };
}

const graphFieldSchema = z.object({
  name: z.string().min(1).max(200),
  values: z.array(z.string().max(4000)).max(20),
}).passthrough();

export const graphLeadSchema = z.object({
  id: idSchema,
  form_id: idSchema,
  created_time: z.string().max(60).nullish(),
  field_data: z.array(graphFieldSchema).max(100),
  campaign_id: optionalIdSchema,
  adset_id: optionalIdSchema,
  ad_id: optionalIdSchema,
}).passthrough();

export type EnsiGraphLead = z.infer<typeof graphLeadSchema>;

function clean(value: string | undefined, maxLength: number): string | null {
  const normalized = value?.trim().replace(/\u0000/g, "") || "";
  return normalized ? normalized.slice(0, maxLength) : null;
}

export function normalizeEnsiLead(lead: EnsiGraphLead) {
  const fields = new Map<string, string>();
  for (const field of lead.field_data) {
    const key = field.name.trim().toLowerCase();
    if (!fields.has(key)) fields.set(key, field.values.find((value) => value.trim()) ?? "");
  }

  const fullName = clean(fields.get("full_name"), 200);
  const emailCandidate = clean(fields.get("email"), 320)?.toLowerCase() ?? null;
  const email = emailCandidate && z.string().email().safeParse(emailCandidate).success ? emailCandidate : null;
  const phoneCandidate = clean(fields.get("phone_number"), 60);
  const phoneNormalized = phoneCandidate
    ? clean(phoneCandidate.replace(/(?!^)\+/g, "").replace(/[^\d+]/g, ""), 40)
    : null;
  const phoneDigits = phoneNormalized?.replace(/\D/g, "") ?? "";
  const phoneNumber = phoneDigits.length >= 7 && phoneDigits.length <= 15 ? phoneNormalized : null;
  const edicao = clean(fields.get("edicao"), 500);
  const presencial = clean(fields.get("presencial"), 500);
  const atividade = clean(fields.get("atividade"), 500);

  const normalized = {
    full_name: fullName,
    name: fullName,
    email,
    phone_number: phoneNumber,
    phone: phoneNumber,
    edicao,
    presencial,
    atividade,
    attribution: {
      app_id: ENSI_CONFIG.appId,
      page_id: ENSI_CONFIG.pageId,
      form_id: ENSI_CONFIG.formId,
      form_name: ENSI_CONFIG.formName,
      lead_id: lead.id,
      campaign_id: lead.campaign_id ?? null,
      adset_id: lead.adset_id ?? null,
      ad_id: lead.ad_id ?? null,
      created_time: lead.created_time ?? null,
      source: "graph_api",
    },
  };

  return {
    normalized,
    hasContactData: Boolean(email || phoneNumber),
    dedupeKey: [email, phoneDigits || null].filter(Boolean).join("|") || null,
  };
}

async function hmacSha256Hex(secret: string, value: string | Uint8Array): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const bytes = typeof value === "string" ? new TextEncoder().encode(value) : value;
  const buffer = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(buffer).set(bytes);
  const signature = await crypto.subtle.sign("HMAC", key, buffer);
  return Array.from(new Uint8Array(signature), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function safeEqual(left: string, right: string): boolean {
  let difference = left.length ^ right.length;
  const length = Math.max(left.length, right.length);
  for (let index = 0; index < length; index += 1) {
    difference |= (left.charCodeAt(index) || 0) ^ (right.charCodeAt(index) || 0);
  }
  return difference === 0;
}

export async function isValidMetaSignature(rawBody: Uint8Array, header: string | null, appSecret: string) {
  if (!header?.startsWith("sha256=")) return false;
  const expected = `sha256=${await hmacSha256Hex(appSecret, rawBody)}`;
  return safeEqual(header, expected);
}

export async function metaAppSecretProof(appSecret: string, pageAccessToken: string) {
  return hmacSha256Hex(appSecret, pageAccessToken);
}
