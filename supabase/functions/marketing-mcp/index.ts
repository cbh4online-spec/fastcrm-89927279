import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function log(event: string, extra: Record<string, unknown> = {}) {
  console.log(JSON.stringify({ event, ts: new Date().toISOString(), ...extra }));
}

async function verifyWorkspaceMember(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  workspaceId: string,
  isSuperAdmin: boolean
): Promise<boolean> {
  if (isSuperAdmin) return true;
  const { data } = await supabase
    .from("workspace_members")
    .select("id")
    .eq("workspace_id", workspaceId)
    .eq("user_id", userId)
    .maybeSingle();
  return !!data;
}

function redactProvider(p: Record<string, unknown>) {
  const { encrypted_credentials_json: _, ...safe } = p;
  return { ...safe, has_credentials: !!_ && JSON.stringify(_) !== "{}" };
}

// ========================
// FIGMA MCP ADAPTER
// ========================

const IMPORT_TYPE_TO_TOOL: Record<string, string> = {
  design_system: "get_file",
  page_frame: "get_file_nodes",
  section: "get_file_nodes",
  component: "get_file_nodes",
  tokens: "get_file_styles",
};

const VALID_IMPORT_TYPES = Object.keys(IMPORT_TYPE_TO_TOOL);

function classifySectionType(name: string): string {
  const lower = name.toLowerCase();
  if (/hero|banner|header-hero|main-banner/.test(lower)) return "hero";
  if (/cta|call.?to.?action|button.?section|action/.test(lower)) return "cta";
  if (/faq|questions|accordion/.test(lower)) return "faq";
  if (/pricing|price|plans|tiers/.test(lower)) return "pricing";
  if (/testimonial|proof|review|social.?proof|depoimento/.test(lower)) return "social_proof";
  if (/footer|rodape/.test(lower)) return "footer";
  if (/nav|navbar|navigation|menu/.test(lower)) return "navigation";
  if (/form|opt.?in|signup|regist|newsletter/.test(lower)) return "form";
  if (/benefit|feature|vantag/.test(lower)) return "benefits";
  if (/thank.?you|obrigad/.test(lower)) return "thank_you";
  if (/upsell|downsell|bump/.test(lower)) return "upsell";
  if (/webinar|evento|event/.test(lower)) return "webinar";
  return "content";
}

interface FigmaNode {
  id?: string;
  name?: string;
  type?: string;
  children?: FigmaNode[];
  absoluteBoundingBox?: { x: number; y: number; width: number; height: number };
  layoutMode?: string;
  primaryAxisAlignItems?: string;
  counterAxisAlignItems?: string;
  fills?: Array<{ type: string; color?: { r: number; g: number; b: number; a: number } }>;
  style?: Record<string, unknown>;
  styles?: Record<string, string>;
  characters?: string;
}

function extractSections(nodes: FigmaNode[], depth = 0): Array<Record<string, unknown>> {
  const sections: Array<Record<string, unknown>> = [];

  for (const node of nodes) {
    // Top-level frames and components are treated as sections
    if (depth <= 1 && (node.type === "FRAME" || node.type === "COMPONENT" || node.type === "COMPONENT_SET")) {
      const sectionType = classifySectionType(node.name || "");
      const contentPlaceholders: string[] = [];
      const mediaSlots: string[] = [];
      const ctaSlots: string[] = [];
      const formSlots: string[] = [];

      // Scan children for slot detection
      scanSlots(node.children || [], contentPlaceholders, mediaSlots, ctaSlots, formSlots);

      sections.push({
        section_type: sectionType,
        section_name: node.name || "Unnamed",
        node_id: node.id,
        order: sections.length,
        layout: {
          direction: node.layoutMode === "HORIZONTAL" ? "horizontal" : "vertical",
          alignment: node.primaryAxisAlignItems || "center",
          width: node.absoluteBoundingBox?.width,
          height: node.absoluteBoundingBox?.height,
        },
        content_placeholders: contentPlaceholders,
        media_slots: mediaSlots,
        cta_slots: ctaSlots,
        form_slots: formSlots,
        responsive_hints: {
          mobile_stack: node.layoutMode === "HORIZONTAL",
        },
        token_references: extractTokenRefs(node),
      });
    }

    // Recurse one level deeper
    if (node.children && depth < 1) {
      sections.push(...extractSections(node.children, depth + 1));
    }
  }

  return sections;
}

function scanSlots(
  nodes: FigmaNode[],
  content: string[],
  media: string[],
  cta: string[],
  form: string[]
) {
  for (const n of nodes) {
    const lower = (n.name || "").toLowerCase();
    if (n.type === "TEXT" || /heading|title|subtitle|text|headline|paragraph/.test(lower)) {
      content.push(n.name || "text");
    }
    if (n.type === "RECTANGLE" || n.type === "ELLIPSE" || /image|photo|media|video|illustration/.test(lower)) {
      media.push(n.name || "media");
    }
    if (/button|cta|btn|action/.test(lower)) {
      cta.push(n.name || "cta");
    }
    if (/input|field|form|email/.test(lower)) {
      form.push(n.name || "form_field");
    }
    if (n.children) {
      scanSlots(n.children, content, media, cta, form);
    }
  }
}

function extractTokenRefs(node: FigmaNode): Record<string, string> {
  const tokens: Record<string, string> = {};
  if (node.fills && Array.isArray(node.fills)) {
    for (const fill of node.fills) {
      if (fill.type === "SOLID" && fill.color) {
        const { r, g, b } = fill.color;
        tokens.bg_color = `rgba(${Math.round(r * 255)},${Math.round(g * 255)},${Math.round(b * 255)},1)`;
        break;
      }
    }
  }
  if (node.styles) {
    if (node.styles.fill) tokens.fill_style_id = node.styles.fill;
    if (node.styles.text) tokens.text_style_id = node.styles.text;
  }
  return tokens;
}

function extractTokens(nodes: FigmaNode[]): Record<string, unknown> {
  const colors: Record<string, string> = {};
  const typography: Record<string, unknown> = {};

  function walk(ns: FigmaNode[]) {
    for (const n of ns) {
      if (n.fills && Array.isArray(n.fills)) {
        for (const fill of n.fills) {
          if (fill.type === "SOLID" && fill.color) {
            const { r, g, b } = fill.color;
            const hex = `#${[r, g, b].map(v => Math.round(v * 255).toString(16).padStart(2, "0")).join("")}`;
            colors[n.name || hex] = hex;
          }
        }
      }
      if (n.type === "TEXT" && n.style) {
        typography[n.name || "text"] = {
          fontSize: n.style.fontSize,
          fontFamily: n.style.fontFamily,
          fontWeight: n.style.fontWeight,
          lineHeight: n.style.lineHeightPx,
          letterSpacing: n.style.letterSpacing,
        };
      }
      if (n.children) walk(n.children);
    }
  }
  walk(nodes);
  return { colors, typography };
}

function extractComponents(nodes: FigmaNode[]): Array<Record<string, unknown>> {
  const comps: Array<Record<string, unknown>> = [];
  function walk(ns: FigmaNode[]) {
    for (const n of ns) {
      if (n.type === "COMPONENT" || n.type === "COMPONENT_SET") {
        const variants = n.type === "COMPONENT_SET" && n.children
          ? n.children.filter(c => c.type === "COMPONENT").map(c => c.name)
          : [];
        comps.push({ name: n.name, node_id: n.id, variants });
      }
      if (n.children) walk(n.children);
    }
  }
  walk(nodes);
  return comps;
}

function countNodes(nodes: FigmaNode[]): number {
  let count = 0;
  for (const n of nodes) {
    count++;
    if (n.children) count += countNodes(n.children);
  }
  return count;
}

function normalizePayload(
  rawPayload: Record<string, unknown>,
  providerKey: string,
  externalRef: string,
  importType: string
): Record<string, unknown> {
  // Extract document nodes from typical Figma MCP responses
  let rootNodes: FigmaNode[] = [];

  // tools/call response wraps in content array
  const content = rawPayload.content as Array<{ type: string; text?: string }> | undefined;
  if (content && Array.isArray(content)) {
    for (const c of content) {
      if (c.type === "text" && c.text) {
        try {
          const parsed = JSON.parse(c.text);
          if (parsed.document?.children) {
            rootNodes = parsed.document.children;
          } else if (parsed.nodes) {
            // get_file_nodes returns { nodes: { "id": { document: {...} } } }
            rootNodes = Object.values(parsed.nodes).map((n: unknown) => {
              const node = n as { document?: FigmaNode };
              return node.document || n;
            }) as FigmaNode[];
          } else if (Array.isArray(parsed)) {
            rootNodes = parsed;
          } else if (parsed.children) {
            rootNodes = parsed.children;
          }
        } catch {
          // not JSON text, skip
        }
      }
    }
  }

  // Direct document response
  if (rootNodes.length === 0) {
    const doc = rawPayload as { document?: { children?: FigmaNode[] }; nodes?: Record<string, { document?: FigmaNode }> };
    if (doc.document?.children) {
      rootNodes = doc.document.children;
    } else if (doc.nodes) {
      rootNodes = Object.values(doc.nodes).map(n => n.document || n) as FigmaNode[];
    }
  }

  const sections = extractSections(rootNodes);
  const tokens = extractTokens(rootNodes);
  const components = extractComponents(rootNodes);
  const totalNodes = countNodes(rootNodes);

  return {
    source: { provider_key: providerKey, reference: externalRef, import_type: importType },
    sections,
    tokens,
    components,
    metadata: {
      section_count: sections.length,
      component_count: components.length,
      total_nodes: totalNodes,
      color_count: Object.keys(tokens.colors as Record<string, string>).length,
      typography_count: Object.keys(tokens.typography as Record<string, unknown>).length,
    },
  };
}

async function callMcpServer(
  serverUrl: string,
  creds: Record<string, string> | null,
  authType: string,
  toolName: string,
  toolArgs: Record<string, unknown>
): Promise<Record<string, unknown>> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json, text/event-stream",
  };

  if (creds?.token && authType === "bearer") {
    headers["Authorization"] = `Bearer ${creds.token}`;
  } else if (creds?.token && authType === "api_key") {
    headers["X-API-Key"] = creds.token;
  }

  const mcpPayload = {
    jsonrpc: "2.0",
    method: "tools/call",
    params: { name: toolName, arguments: toolArgs },
    id: Date.now(),
  };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);

  const resp = await fetch(serverUrl, {
    method: "POST",
    headers,
    body: JSON.stringify(mcpPayload),
    signal: controller.signal,
  });

  clearTimeout(timeout);

  if (!resp.ok) {
    const errText = await resp.text().catch(() => "Unknown error");
    throw new Error(`MCP server returned HTTP ${resp.status}: ${errText.substring(0, 500)}`);
  }

  const result = await resp.json();
  if (result.error) {
    throw new Error(`MCP error: ${JSON.stringify(result.error).substring(0, 500)}`);
  }

  return result.result || result;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Unauthorized" }, 401);

    const token = authHeader.replace("Bearer ", "");
    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) return json({ error: "Unauthorized" }, 401);

    const isSuperAdmin =
      user.app_metadata?.is_super_admin === true ||
      user.user_metadata?.is_super_admin === true;

    const body = await req.json();
    const { action, workspace_id } = body;

    if (!action) return json({ error: "Missing action" }, 400);
    if (!workspace_id && action !== "health_check_internal") {
      return json({ error: "Missing workspace_id" }, 400);
    }

    if (workspace_id) {
      const hasAccess = await verifyWorkspaceMember(supabase, user.id, workspace_id, isSuperAdmin);
      if (!hasAccess) return json({ error: "Forbidden" }, 403);
    }

    // ========================
    // PROVIDER CRUD
    // ========================

    if (action === "list_providers") {
      const { data, error } = await supabase
        .from("marketing_mcp_providers")
        .select("*")
        .eq("workspace_id", workspace_id)
        .order("created_at", { ascending: false });
      if (error) return json({ error: error.message }, 500);
      return json({ providers: (data || []).map(redactProvider) });
    }

    if (action === "create_provider") {
      const { provider_key, provider_name, provider_type, server_url, auth_type, credentials, metadata_json } = body;
      if (!provider_key || !provider_name || !server_url) {
        return json({ error: "Missing required fields: provider_key, provider_name, server_url" }, 400);
      }
      if (provider_key.length > 50 || provider_name.length > 200 || server_url.length > 2000) {
        return json({ error: "Field length exceeded" }, 400);
      }

      const { data, error } = await supabase
        .from("marketing_mcp_providers")
        .insert({
          workspace_id,
          provider_key,
          provider_name,
          provider_type: provider_type || "mcp",
          server_url,
          auth_type: auth_type || "bearer",
          encrypted_credentials_json: credentials ? { token: credentials } : {},
          metadata_json: metadata_json || {},
        })
        .select()
        .single();

      if (error) {
        if (error.code === "23505") return json({ error: "Provider key already exists in this workspace" }, 409);
        return json({ error: error.message }, 500);
      }

      log("marketing_mcp_provider_created", { workspace_id, provider_id: data.id, provider_key });
      return json({ provider: redactProvider(data) }, 201);
    }

    if (action === "update_provider") {
      const { provider_id, provider_name, server_url, auth_type, credentials, is_default_for_pages, is_default_for_funnels, metadata_json } = body;
      if (!provider_id) return json({ error: "Missing provider_id" }, 400);

      const updates: Record<string, unknown> = {};
      if (provider_name !== undefined) updates.provider_name = provider_name;
      if (server_url !== undefined) updates.server_url = server_url;
      if (auth_type !== undefined) updates.auth_type = auth_type;
      if (credentials !== undefined) updates.encrypted_credentials_json = { token: credentials };
      if (is_default_for_pages !== undefined) updates.is_default_for_pages = is_default_for_pages;
      if (is_default_for_funnels !== undefined) updates.is_default_for_funnels = is_default_for_funnels;
      if (metadata_json !== undefined) updates.metadata_json = metadata_json;

      const { data, error } = await supabase
        .from("marketing_mcp_providers")
        .update(updates)
        .eq("id", provider_id)
        .eq("workspace_id", workspace_id)
        .select()
        .single();

      if (error) return json({ error: error.message }, 500);
      log("marketing_mcp_provider_updated", { workspace_id, provider_id });
      return json({ provider: redactProvider(data) });
    }

    if (action === "delete_provider") {
      const { provider_id } = body;
      if (!provider_id) return json({ error: "Missing provider_id" }, 400);

      const { error } = await supabase
        .from("marketing_mcp_providers")
        .delete()
        .eq("id", provider_id)
        .eq("workspace_id", workspace_id);

      if (error) return json({ error: error.message }, 500);
      log("marketing_mcp_provider_deleted", { workspace_id, provider_id });
      return json({ success: true });
    }

    if (action === "enable_provider" || action === "disable_provider") {
      const { provider_id } = body;
      if (!provider_id) return json({ error: "Missing provider_id" }, 400);
      const enabled = action === "enable_provider";

      const { data, error } = await supabase
        .from("marketing_mcp_providers")
        .update({ is_enabled: enabled })
        .eq("id", provider_id)
        .eq("workspace_id", workspace_id)
        .select()
        .single();

      if (error) return json({ error: error.message }, 500);
      log(enabled ? "marketing_mcp_provider_enabled" : "marketing_mcp_provider_disabled", { workspace_id, provider_id });
      return json({ provider: redactProvider(data) });
    }

    // ========================
    // CONNECTION TEST
    // ========================

    if (action === "test_connection") {
      const { provider_id } = body;
      if (!provider_id) return json({ error: "Missing provider_id" }, 400);

      log("marketing_mcp_provider_test_started", { workspace_id, provider_id });

      const { data: provider, error: fetchErr } = await supabase
        .from("marketing_mcp_providers")
        .select("*")
        .eq("id", provider_id)
        .eq("workspace_id", workspace_id)
        .single();

      if (fetchErr || !provider) return json({ error: "Provider not found" }, 404);

      try {
        const headers: Record<string, string> = {
          "Content-Type": "application/json",
          Accept: "application/json, text/event-stream",
        };

        const creds = provider.encrypted_credentials_json as Record<string, string> | null;
        if (creds?.token && provider.auth_type === "bearer") {
          headers["Authorization"] = `Bearer ${creds.token}`;
        } else if (creds?.token && provider.auth_type === "api_key") {
          headers["X-API-Key"] = creds.token;
        }

        const mcpPayload = {
          jsonrpc: "2.0",
          method: "initialize",
          params: {
            protocolVersion: "2025-03-26",
            capabilities: {},
            clientInfo: { name: "FastCRM", version: "1.0.0" },
          },
          id: 1,
        };

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 15000);

        const resp = await fetch(provider.server_url, {
          method: "POST",
          headers,
          body: JSON.stringify(mcpPayload),
          signal: controller.signal,
        });

        clearTimeout(timeout);

        if (!resp.ok) {
          const errText = await resp.text().catch(() => "Unknown error");
          throw new Error(`HTTP ${resp.status}: ${errText.substring(0, 500)}`);
        }

        const result = await resp.json();
        log("marketing_mcp_provider_test_succeeded", { workspace_id, provider_id });

        return json({
          success: true,
          server_info: result?.result?.serverInfo || null,
          protocol_version: result?.result?.protocolVersion || null,
        });
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : String(err);
        log("marketing_mcp_provider_test_failed", { workspace_id, provider_id, error: errMsg });
        return json({ success: false, error: errMsg });
      }
    }

    // ========================
    // HEALTH CHECK
    // ========================

    if (action === "health_check") {
      const { provider_id } = body;
      if (!provider_id) return json({ error: "Missing provider_id" }, 400);

      log("marketing_mcp_health_check_started", { workspace_id, provider_id });

      const { data: provider, error: fetchErr } = await supabase
        .from("marketing_mcp_providers")
        .select("*")
        .eq("id", provider_id)
        .eq("workspace_id", workspace_id)
        .single();

      if (fetchErr || !provider) return json({ error: "Provider not found" }, 404);

      let status = "error";
      let lastError: string | null = null;

      try {
        const headers: Record<string, string> = {
          "Content-Type": "application/json",
          Accept: "application/json, text/event-stream",
        };

        const creds = provider.encrypted_credentials_json as Record<string, string> | null;
        if (creds?.token && provider.auth_type === "bearer") {
          headers["Authorization"] = `Bearer ${creds.token}`;
        } else if (creds?.token && provider.auth_type === "api_key") {
          headers["X-API-Key"] = creds.token;
        }

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 15000);

        const resp = await fetch(provider.server_url, {
          method: "POST",
          headers,
          body: JSON.stringify({
            jsonrpc: "2.0",
            method: "initialize",
            params: {
              protocolVersion: "2025-03-26",
              capabilities: {},
              clientInfo: { name: "FastCRM", version: "1.0.0" },
            },
            id: 1,
          }),
          signal: controller.signal,
        });

        clearTimeout(timeout);

        if (resp.ok) {
          status = "connected";
          log("marketing_mcp_health_check_succeeded", { workspace_id, provider_id });
        } else {
          lastError = `HTTP ${resp.status}`;
          log("marketing_mcp_health_check_failed", { workspace_id, provider_id, error: lastError });
        }
      } catch (err) {
        lastError = err instanceof Error ? err.message : String(err);
        log("marketing_mcp_health_check_failed", { workspace_id, provider_id, error: lastError });
      }

      await supabase
        .from("marketing_mcp_providers")
        .update({
          connection_status: status,
          last_health_check_at: new Date().toISOString(),
          last_error: lastError,
        })
        .eq("id", provider_id)
        .eq("workspace_id", workspace_id);

      return json({ status, last_error: lastError });
    }

    // ========================
    // WORKFLOW BINDINGS
    // ========================

    if (action === "list_bindings") {
      const { data, error } = await supabase
        .from("marketing_mcp_workflow_bindings")
        .select("*, provider:marketing_mcp_providers(id, provider_name, provider_key, is_enabled)")
        .eq("workspace_id", workspace_id);
      if (error) return json({ error: error.message }, 500);
      return json({ bindings: data || [] });
    }

    if (action === "upsert_binding") {
      const { workflow_type, provider_id } = body;
      if (!workflow_type || !provider_id) {
        return json({ error: "Missing workflow_type or provider_id" }, 400);
      }
      const validTypes = ["landing_page", "funnel", "website", "campaign", "section_library"];
      if (!validTypes.includes(workflow_type)) {
        return json({ error: `Invalid workflow_type. Must be one of: ${validTypes.join(", ")}` }, 400);
      }

      const { data, error } = await supabase
        .from("marketing_mcp_workflow_bindings")
        .upsert(
          { workspace_id, workflow_type, provider_id },
          { onConflict: "workspace_id,workflow_type" }
        )
        .select("*, provider:marketing_mcp_providers(id, provider_name, provider_key, is_enabled)")
        .single();

      if (error) return json({ error: error.message }, 500);
      log("marketing_mcp_workflow_binding_updated", { workspace_id, workflow_type, provider_id });
      return json({ binding: data });
    }

    if (action === "delete_binding") {
      const { binding_id } = body;
      if (!binding_id) return json({ error: "Missing binding_id" }, 400);

      const { error } = await supabase
        .from("marketing_mcp_workflow_bindings")
        .delete()
        .eq("id", binding_id)
        .eq("workspace_id", workspace_id);

      if (error) return json({ error: error.message }, 500);
      return json({ success: true });
    }

    // ========================
    // MCP IMPORT
    // ========================

    if (action === "import_context") {
      const { provider_id, import_type, external_reference } = body;
      if (!provider_id) return json({ error: "Missing provider_id" }, 400);
      if (!import_type || !VALID_IMPORT_TYPES.includes(import_type)) {
        return json({ error: `Invalid import_type. Must be one of: ${VALID_IMPORT_TYPES.join(", ")}` }, 400);
      }
      if (!external_reference || typeof external_reference !== "string" || external_reference.length > 500) {
        return json({ error: "Missing or invalid external_reference (max 500 chars)" }, 400);
      }

      log("marketing_mcp_import_started", { workspace_id, provider_id, import_type, external_reference });

      // Fetch provider
      const { data: provider, error: pErr } = await supabase
        .from("marketing_mcp_providers")
        .select("*")
        .eq("id", provider_id)
        .eq("workspace_id", workspace_id)
        .single();

      if (pErr || !provider) return json({ error: "Provider not found" }, 404);
      if (!provider.is_enabled) return json({ error: "Provider is disabled" }, 400);

      // Create import record
      const { data: importRecord, error: iErr } = await supabase
        .from("marketing_mcp_imports")
        .insert({
          workspace_id,
          provider_id,
          import_type,
          external_reference_id: external_reference,
          external_reference_name: external_reference,
          status: "processing",
        })
        .select()
        .single();

      if (iErr || !importRecord) return json({ error: "Failed to create import record" }, 500);

      try {
        // Build tool arguments based on import type
        const toolName = IMPORT_TYPE_TO_TOOL[import_type];
        const toolArgs: Record<string, unknown> = {};

        // Parse external_reference: could be a Figma URL or a file key
        let fileKey = external_reference;
        let nodeId: string | undefined;

        // Extract file key from Figma URL
        const figmaUrlMatch = external_reference.match(/figma\.com\/(?:file|design)\/([a-zA-Z0-9]+)/);
        if (figmaUrlMatch) {
          fileKey = figmaUrlMatch[1];
        }

        // Extract node-id from URL params
        const nodeMatch = external_reference.match(/node-id=([^&]+)/);
        if (nodeMatch) {
          nodeId = decodeURIComponent(nodeMatch[1]);
        }

        if (import_type === "design_system" || import_type === "tokens") {
          toolArgs.fileKey = fileKey;
        } else {
          toolArgs.fileKey = fileKey;
          if (nodeId) {
            toolArgs.ids = [nodeId];
          }
        }

        const creds = provider.encrypted_credentials_json as Record<string, string> | null;
        const rawResult = await callMcpServer(
          provider.server_url,
          creds,
          provider.auth_type,
          toolName,
          toolArgs
        );

        log("marketing_mcp_normalization_started", { workspace_id, import_id: importRecord.id });

        const normalized = normalizePayload(
          rawResult as Record<string, unknown>,
          provider.provider_key,
          external_reference,
          import_type
        );

        log("marketing_mcp_normalization_succeeded", {
          workspace_id,
          import_id: importRecord.id,
          section_count: (normalized.metadata as Record<string, unknown>)?.section_count,
        });

        // Update import record with results
        await supabase
          .from("marketing_mcp_imports")
          .update({
            status: "completed",
            imported_payload_json: rawResult,
            normalized_payload_json: normalized,
            external_reference_name: fileKey,
          })
          .eq("id", importRecord.id);

        log("marketing_mcp_import_succeeded", { workspace_id, provider_id, import_id: importRecord.id });

        return json({
          import_id: importRecord.id,
          status: "completed",
          normalized,
        });
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : String(err);
        log("marketing_mcp_import_failed", { workspace_id, provider_id, import_id: importRecord.id, error: errMsg });

        await supabase
          .from("marketing_mcp_imports")
          .update({ status: "failed", error_message: errMsg })
          .eq("id", importRecord.id);

        return json({
          import_id: importRecord.id,
          status: "failed",
          error: errMsg,
        });
      }
    }

    if (action === "list_imports") {
      const { data, error } = await supabase
        .from("marketing_mcp_imports")
        .select("id, workspace_id, provider_id, import_type, external_reference_id, external_reference_name, status, error_message, created_at, updated_at, normalized_payload_json")
        .eq("workspace_id", workspace_id)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) return json({ error: error.message }, 500);
      return json({ imports: data || [] });
    }

    if (action === "get_import") {
      const { import_id } = body;
      if (!import_id) return json({ error: "Missing import_id" }, 400);

      const { data, error } = await supabase
        .from("marketing_mcp_imports")
        .select("*")
        .eq("id", import_id)
        .eq("workspace_id", workspace_id)
        .single();

      if (error) return json({ error: error.message }, 500);
      if (!data) return json({ error: "Import not found" }, 404);
      return json({ import: data });
    }

    // ========================
    // GENERATE PAGE FROM MCP
    // ========================

    if (action === "generate_page") {
      const { import_id, title, slug } = body;
      if (!import_id) return json({ error: "Missing import_id" }, 400);

      log("marketing_mcp_generation_started", { workspace_id, import_id, target_type: "landing_page" });

      const { data: imp, error: impErr } = await supabase
        .from("marketing_mcp_imports")
        .select("*")
        .eq("id", import_id)
        .eq("workspace_id", workspace_id)
        .single();

      if (impErr || !imp) return json({ error: "Import not found" }, 404);
      if (imp.status !== "completed") return json({ error: "Import is not completed" }, 400);

      try {
        const normalized = imp.normalized_payload_json as Record<string, unknown>;
        const sections = (normalized.sections || []) as Array<Record<string, unknown>>;
        const tokens = (normalized.tokens || {}) as Record<string, Record<string, string>>;

        // Map sections to landing page fields
        let headline = "";
        let subheadline = "";
        let ctaText = "";
        let heroImageUrl = "";
        const features: Array<Record<string, string>> = [];
        const testimonials: Array<Record<string, string>> = [];
        let formEnabled = false;
        let formFields: string[] = [];

        for (const sec of sections) {
          const sType = sec.section_type as string;
          const placeholders = (sec.content_placeholders || []) as string[];
          const ctaSlots = (sec.cta_slots || []) as string[];
          const mediaSlots = (sec.media_slots || []) as string[];
          const formSlots = (sec.form_slots || []) as string[];

          switch (sType) {
            case "hero":
              headline = placeholders[0] || headline;
              subheadline = placeholders[1] || subheadline;
              ctaText = ctaSlots[0] || ctaText;
              heroImageUrl = mediaSlots[0] || heroImageUrl;
              break;
            case "benefits":
            case "content":
            case "faq":
            case "pricing":
              features.push({
                title: (sec.section_name as string) || sType,
                description: placeholders.join(", "),
                type: sType,
              });
              break;
            case "social_proof":
              testimonials.push({
                name: (sec.section_name as string) || "Testimonial",
                content: placeholders.join(", "),
              });
              break;
            case "form":
              formEnabled = true;
              formFields = formSlots.length > 0 ? formSlots : ["email"];
              break;
            case "cta":
              if (!ctaText) ctaText = ctaSlots[0] || placeholders[0] || "";
              break;
          }
        }

        // Generate CSS from tokens
        const colors = tokens.colors || {};
        const typography = tokens.typography || {};
        let customCss = "";
        const colorEntries = Object.entries(colors);
        if (colorEntries.length > 0) {
          customCss += `:root {\n`;
          colorEntries.forEach(([name, hex], i) => {
            customCss += `  --mcp-color-${i}: ${hex}; /* ${name} */\n`;
          });
          customCss += `}\n`;
        }
        const typoEntries = Object.entries(typography);
        if (typoEntries.length > 0) {
          typoEntries.forEach(([name, val]) => {
            const t = val as Record<string, unknown>;
            if (t.fontFamily) {
              customCss += `/* ${name}: font-family: ${t.fontFamily}; font-size: ${t.fontSize || "inherit"}; */\n`;
            }
          });
        }

        const pageSlug = slug || `mcp-page-${Date.now()}`;
        const pageTitle = title || headline || `Página MCP ${new Date().toLocaleDateString("pt-PT")}`;

        const { data: page, error: pgErr } = await supabase
          .from("landing_pages")
          .insert({
            workspace_id,
            title: pageTitle,
            slug: pageSlug,
            headline: headline || null,
            subheadline: subheadline || null,
            cta_text: ctaText || null,
            hero_image_url: heroImageUrl || null,
            features: features.length > 0 ? features : null,
            testimonials: testimonials.length > 0 ? testimonials : null,
            form_enabled: formEnabled,
            form_fields: formFields.length > 0 ? formFields : null,
            custom_css: customCss || null,
            is_published: false,
          })
          .select("id")
          .single();

        if (pgErr || !page) {
          throw new Error(pgErr?.message || "Failed to create landing page");
        }

        log("marketing_mcp_page_generated", { workspace_id, import_id, asset_id: page.id });
        return json({ success: true, page_id: page.id, slug: pageSlug });
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : String(err);
        log("marketing_mcp_generation_failed", { workspace_id, import_id, target_type: "landing_page", error: errMsg });
        return json({ error: errMsg }, 500);
      }
    }

    // ========================
    // GENERATE FUNNEL FROM MCP
    // ========================

    if (action === "generate_funnel") {
      const { import_id, name, slug } = body;
      if (!import_id) return json({ error: "Missing import_id" }, 400);

      log("marketing_mcp_generation_started", { workspace_id, import_id, target_type: "funnel" });

      const { data: imp, error: impErr } = await supabase
        .from("marketing_mcp_imports")
        .select("*")
        .eq("id", import_id)
        .eq("workspace_id", workspace_id)
        .single();

      if (impErr || !imp) return json({ error: "Import not found" }, 404);
      if (imp.status !== "completed") return json({ error: "Import is not completed" }, 400);

      try {
        const normalized = imp.normalized_payload_json as Record<string, unknown>;
        const sections = (normalized.sections || []) as Array<Record<string, unknown>>;

        const sectionToStepType: Record<string, string> = {
          hero: "page",
          benefits: "page",
          content: "page",
          cta: "page",
          faq: "page",
          pricing: "page",
          social_proof: "page",
          form: "optin",
          thank_you: "thankyou",
          upsell: "upsell",
          navigation: "page",
          footer: "page",
          webinar: "page",
        };

        const funnelSlug = slug || `mcp-funnel-${Date.now()}`;
        const funnelName = name || `Funil MCP ${new Date().toLocaleDateString("pt-PT")}`;

        const { data: funnel, error: fErr } = await supabase
          .from("funnels")
          .insert({
            workspace_id,
            name: funnelName,
            slug: funnelSlug,
            is_published: false,
          })
          .select("id")
          .single();

        if (fErr || !funnel) {
          throw new Error(fErr?.message || "Failed to create funnel");
        }

        // Map sections to funnel steps
        const steps = sections
          .filter(s => !["navigation", "footer"].includes(s.section_type as string))
          .map((sec, i) => ({
            funnel_id: funnel.id,
            workspace_id,
            name: (sec.section_name as string) || `Step ${i + 1}`,
            step_type: sectionToStepType[sec.section_type as string] || "page",
            sort_order: i,
            content: {
              section_type: sec.section_type,
              content_placeholders: sec.content_placeholders,
              media_slots: sec.media_slots,
              cta_slots: sec.cta_slots,
              form_slots: sec.form_slots,
              token_references: sec.token_references,
              layout: sec.layout,
              responsive_hints: sec.responsive_hints,
            },
          }));

        if (steps.length > 0) {
          const { error: stErr } = await supabase
            .from("funnel_steps")
            .insert(steps);
          if (stErr) {
            throw new Error(stErr.message);
          }
        }

        log("marketing_mcp_funnel_generated", { workspace_id, import_id, asset_id: funnel.id, steps_count: steps.length });
        return json({ success: true, funnel_id: funnel.id, slug: funnelSlug, steps_count: steps.length });
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : String(err);
        log("marketing_mcp_generation_failed", { workspace_id, import_id, target_type: "funnel", error: errMsg });
        return json({ error: errMsg }, 500);
      }
    }

    return json({ error: `Unknown action: ${action}` }, 400);
  } catch (err) {
    console.error("marketing-mcp error:", err);
    return json({ error: "Internal server error" }, 500);
  }
});
