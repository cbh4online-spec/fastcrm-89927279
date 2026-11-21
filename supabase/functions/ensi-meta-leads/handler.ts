import {
  ENSI_CONFIG,
  graphLeadSchema,
  isValidMetaSignature,
  metaAppSecretProof,
  normalizeEnsiLead,
  parseMetaJson,
  selectEnsiLeadReferences,
  type EnsiLeadReference,
} from "./core.ts";

export interface EnsiLeadStore {
  rpc(name: string, params: Record<string, unknown>): Promise<{
    data: unknown;
    error: { message: string } | null;
  }>;
}

interface HandlerDependencies {
  store: EnsiLeadStore;
  fetchImpl?: typeof fetch;
  config: {
    appSecret?: string;
    verifyToken?: string;
    pageAccessToken?: string;
  };
}

type LeadResult = {
  status: "accepted" | "duplicate" | "ignored";
  reason?: string;
  meta_lead_id?: string | null;
  contact_disposition?: string;
};

function json(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

function isPermanentStoreError(message: string) {
  return message.includes("ENSI_INVALID_") || message.includes("ENSI_NO_") || message.includes("ENSI_MISSING_");
}

// Diagnóstico sanitizado: só categorias fixas, inteiros e códigos bem formados.
// Nunca registar corpos, valores, URLs, IDs, tokens, cabeçalhos ou mensagens brutas.
const GRAPH_SCHEMA_FIELDS = new Set(["id", "form_id", "created_time", "field_data", "campaign_id", "adset_id", "ad_id"]);

function logFailure(category: string, details: Record<string, string | number | string[]> = {}) {
  try {
    console.warn(JSON.stringify({ event: "ensi_meta_leads_failure", category, ...details }));
  } catch {
    // o registo nunca altera a resposta
  }
}

function safeInteger(value: unknown): number | undefined {
  return typeof value === "number" && Number.isSafeInteger(value) ? value : undefined;
}

async function logGraphHttpFailure(response: Response) {
  const details: Record<string, number> = { http_status: response.status };
  try {
    const body = JSON.parse(await response.text()) as { error?: { code?: unknown; error_subcode?: unknown } };
    if (body && typeof body === "object" && body.error && typeof body.error === "object") {
      const code = safeInteger(body.error.code);
      const subcode = safeInteger(body.error.error_subcode);
      if (code !== undefined) details.meta_error_code = code;
      if (subcode !== undefined) details.meta_error_subcode = subcode;
    }
  } catch {
    // corpo ilegível: fica só o estado HTTP
  }
  logFailure("graph_http", details);
}

function logGraphSchemaFailure(issues: { path: (string | number)[] }[]) {
  const fields = [...new Set(issues
    .map((issue) => issue.path[0])
    .filter((key): key is string => typeof key === "string" && GRAPH_SCHEMA_FIELDS.has(key)))].sort();
  logFailure("graph_response_schema", fields.length ? { fields } : { issue_count: issues.length });
}

function logStoreFailure(error: unknown) {
  const code = (error as { code?: unknown } | null)?.code;
  const wellFormed = typeof code === "string" && /^(PGRST\d{3}|[0-9A-Z]{5})$/.test(code);
  logFailure("store_error", wellFormed ? { code } : {});
}

async function fetchGraphLead(
  reference: EnsiLeadReference,
  appSecret: string,
  pageAccessToken: string,
  fetchImpl: typeof fetch,
) {
  const proof = await metaAppSecretProof(appSecret, pageAccessToken);
  const url = new URL(`https://graph.facebook.com/${ENSI_CONFIG.graphVersion}/${reference.leadId}`);
  url.searchParams.set("fields", "id,form_id,created_time,field_data,campaign_id,adset_id,ad_id");
  url.searchParams.set("appsecret_proof", proof);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);
  try {
    const response = await fetchImpl(url, {
      headers: { Authorization: `Bearer ${pageAccessToken}`, Accept: "application/json" },
      signal: controller.signal,
    });
    if (!response.ok) {
      await logGraphHttpFailure(response);
      return { kind: "transient" as const };
    }
    let graphJson: unknown;
    try {
      graphJson = parseMetaJson(await response.text());
    } catch {
      logFailure(controller.signal.aborted ? "graph_fetch_timeout" : "graph_json");
      return { kind: "transient" as const };
    }
    const parsed = graphLeadSchema.safeParse(graphJson);
    if (!parsed.success) {
      logGraphSchemaFailure(parsed.error.issues);
      return { kind: "transient" as const };
    }
    if (parsed.data.id !== reference.leadId || parsed.data.form_id !== ENSI_CONFIG.formId) {
      return { kind: "ignored" as const, reason: "graph_identity_mismatch" };
    }
    return { kind: "success" as const, lead: parsed.data };
  } catch {
    logFailure(controller.signal.aborted ? "graph_fetch_timeout" : "graph_fetch_exception");
    return { kind: "transient" as const };
  } finally {
    clearTimeout(timeout);
  }
}

export function createEnsiMetaLeadsHandler(dependencies: HandlerDependencies) {
  const fetchImpl = dependencies.fetchImpl ?? fetch;

  return async (request: Request): Promise<Response> => {
    if (request.method === "GET") {
      const url = new URL(request.url);
      const mode = url.searchParams.get("hub.mode");
      const token = url.searchParams.get("hub.verify_token");
      const challenge = url.searchParams.get("hub.challenge");
      const verifyToken = dependencies.config.verifyToken;
      if (!verifyToken) return json(503, { error: "configuration_unavailable" });
      if (mode === "subscribe" && challenge && token === verifyToken) {
        return new Response(challenge, { status: 200, headers: { "Cache-Control": "no-store" } });
      }
      return json(403, { error: "verification_failed" });
    }

    if (request.method !== "POST") return json(405, { error: "method_not_allowed" });
    const appSecret = dependencies.config.appSecret;
    const pageAccessToken = dependencies.config.pageAccessToken;
    if (!appSecret || !pageAccessToken) return json(503, { error: "configuration_unavailable" });

    // HMAC sobre os bytes originais; só depois se descodifica e analisa o envelope.
    const rawBody = new Uint8Array(await request.arrayBuffer());
    if (!await isValidMetaSignature(rawBody, request.headers.get("x-hub-signature-256"), appSecret)) {
      return json(401, { error: "invalid_signature" });
    }
    if (rawBody.byteLength > 256_000) return json(413, { error: "payload_too_large" });

    let payload: unknown;
    try {
      payload = parseMetaJson(new TextDecoder("utf-8", { fatal: true }).decode(rawBody));
    } catch {
      return json(400, { error: "invalid_payload" });
    }
    const selection = selectEnsiLeadReferences(payload);
    if (!selection.valid) return json(400, { error: "invalid_payload" });
    if (!selection.references.length) {
      return json(200, {
        status: "ignored",
        reason: selection.invalidEvents ? "invalid_leadgen" : "no_matching_leadgen",
        ignored: selection.ignoredEvents + selection.invalidEvents,
      });
    }

    const results: LeadResult[] = [];
    for (const reference of selection.references) {
      const graphResult = await fetchGraphLead(reference, appSecret, pageAccessToken, fetchImpl);
      if (graphResult.kind === "transient") {
        return json(503, {
          status: "transient_error",
          reason: "graph_fetch_failed",
          retryable: true,
          completed: results.filter((result) => result.status !== "ignored").length,
        });
      }
      if (graphResult.kind === "ignored") {
        results.push({ status: "ignored", reason: graphResult.reason });
        continue;
      }

      const { normalized, hasContactData, dedupeKey } = normalizeEnsiLead(graphResult.lead);
      if (!hasContactData) {
        results.push({ status: "ignored", reason: "invalid_contact_data" });
        continue;
      }

      const graphCreatedAt = graphResult.lead.created_time ? Date.parse(graphResult.lead.created_time) : NaN;
      const receivedAt = Number.isFinite(graphCreatedAt) ? new Date(graphCreatedAt).toISOString() : new Date().toISOString();
      const { data, error } = await dependencies.store.rpc("ensi_ingest_meta_lead", {
        p_workspace_id: ENSI_CONFIG.workspaceId,
        p_page_id: reference.pageId,
        p_form_id: reference.formId,
        p_lead_id_external: reference.leadId,
        p_campaign_id: graphResult.lead.campaign_id ?? null,
        p_adset_id: graphResult.lead.adset_id ?? null,
        p_ad_id: graphResult.lead.ad_id ?? null,
        p_raw_payload: { ...graphResult.lead, dedupe_key: dedupeKey },
        p_normalized_payload: normalized,
        p_received_at: receivedAt,
      });
      if (error) {
        if (isPermanentStoreError(error.message)) {
          results.push({ status: "ignored", reason: "invalid_contact_data" });
          continue;
        }
        logStoreFailure(error);
        return json(503, {
          status: "transient_error",
          reason: "store_failed",
          retryable: true,
          completed: results.filter((result) => result.status !== "ignored").length,
        });
      }

      const result = (data ?? {}) as {
        status?: string;
        meta_lead_id?: string;
        contact_disposition?: string;
      };
      results.push({
        status: result.status === "duplicate" ? "duplicate" : "accepted",
        meta_lead_id: result.meta_lead_id ?? null,
        contact_disposition: result.contact_disposition ?? "unknown",
      });
    }

    const accepted = results.filter((result) => result.status === "accepted").length;
    const duplicates = results.filter((result) => result.status === "duplicate").length;
    const ignored = results.filter((result) => result.status === "ignored").length
      + selection.ignoredEvents + selection.invalidEvents;
    return json(200, {
      status: accepted ? "accepted" : duplicates ? "duplicate" : "ignored",
      accepted,
      duplicates,
      ignored,
      results,
    });
  };
}
