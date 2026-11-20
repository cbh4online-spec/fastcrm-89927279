import { z } from "npm:zod@3";

export const ENSI_CONFIG = {
  appId: "2582678412103949",
  pageId: "113692350807474",
  formId: "29967420322844561",
  workspaceId: "0662fc16-6286-4156-a908-08c7dfec0fb7",
  formName: "ENSI | Iniciação Porto e Lisboa | Janeiro 2027 | Nov 2026",
  graphVersion: "v21.0",
} as const;

const idSchema = z.string().regex(/^\d{1,64}$/);
const optionalIdSchema = z.string().regex(/^\d{1,64}$/).nullish();

export const webhookSchema = z.object({
  object: z.literal("page"),
  entry: z.array(z.object({
    id: idSchema,
    changes: z.array(z.object({
      field: z.string(),
      value: z.object({
        leadgen_id: idSchema,
        form_id: idSchema,
        page_id: idSchema,
        created_time: z.number().int().positive().optional(),
      }).passthrough(),
    }).passthrough()).max(50),
  }).passthrough()).max(25),
}).passthrough();

export type EnsiWebhook = z.infer<typeof webhookSchema>;
export type EnsiLeadReference = {
  leadId: string;
  formId: string;
  pageId: string;
  createdTime?: number;
};

export function selectEnsiLeadReferences(payload: unknown): {
  valid: boolean;
  references: EnsiLeadReference[];
} {
  const parsed = webhookSchema.safeParse(payload);
  if (!parsed.success) return { valid: false, references: [] };

  const references: EnsiLeadReference[] = [];
  for (const entry of parsed.data.entry) {
    if (entry.id !== ENSI_CONFIG.pageId) continue;
    for (const change of entry.changes) {
      if (change.field !== "leadgen") continue;
      const value = change.value;
      if (value.page_id !== ENSI_CONFIG.pageId || value.form_id !== ENSI_CONFIG.formId) continue;
      references.push({
        leadId: value.leadgen_id,
        formId: value.form_id,
        pageId: value.page_id,
        createdTime: value.created_time,
      });
    }
  }
  return { valid: true, references };
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
  const email = emailCandidate && z.string().email().safeParse(emailCandidate).success
    ? emailCandidate
    : null;
  const phoneCandidate = clean(fields.get("phone_number"), 60);
  const phoneNormalized = phoneCandidate
    ? clean(phoneCandidate.replace(/(?!^)\+/g, "").replace(/[^\d+]/g, ""), 40)
    : null;
  const phoneNumber = phoneNormalized?.replace(/\D/g, "") ? phoneNormalized : null;
  const edicao = clean(fields.get("edicao"), 500);
  const presencial = clean(fields.get("presencial"), 500);
  const atividade = clean(fields.get("atividade"), 500);

  const normalized = {
    full_name: fullName,
    email,
    phone_number: phoneNumber,
    // Compatibilidade com a listagem Meta já existente.
    name: fullName,
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
    hasUsefulData: Boolean(fullName || email || phoneNumber),
    dedupeKey: [email, phoneNumber].filter(Boolean).join("|") || null,
  };
}

async function hmacSha256Hex(secret: string, value: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(value));
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

export async function isValidMetaSignature(rawBody: string, header: string | null, appSecret: string) {
  if (!header?.startsWith("sha256=")) return false;
  const expected = `sha256=${await hmacSha256Hex(appSecret, rawBody)}`;
  return safeEqual(header, expected);
}

export async function metaAppSecretProof(appSecret: string, pageAccessToken: string) {
  return hmacSha256Hex(appSecret, pageAccessToken);
}
