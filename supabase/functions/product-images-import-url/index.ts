// product-images-import-url
// Descarrega imagens de URLs públicos no servidor (sem restrições de CORS)
// e guarda-as no bucket `product-images` do workspace.
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-workspace-id, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const MAX_FILES = 6;
const MAX_SIZE_BYTES = 8_388_608; // 8MB
const FETCH_TIMEOUT_MS = 12_000;

const EXT_BY_TYPE: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/avif": "avif",
  "image/gif": "gif",
};

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function errorResponse(status: number, error: string, message: string) {
  return json(status, { success: false, error, message });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return errorResponse(401, "UNAUTHORIZED", "Missing or invalid Authorization header");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await userClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return errorResponse(401, "UNAUTHORIZED", "Invalid token");
    }
    const userId = claimsData.claims.sub as string;

    const workspaceId = req.headers.get("X-Workspace-Id");
    if (!workspaceId) {
      return errorResponse(400, "VALIDATION_ERROR", "X-Workspace-Id header required");
    }

    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    const { data: membership } = await adminClient
      .from("workspace_members")
      .select("id")
      .eq("workspace_id", workspaceId)
      .eq("user_id", userId)
      .maybeSingle();

    let allowed = !!membership;
    if (!allowed) {
      const { data: isSuper } = await adminClient.rpc("is_super_admin", { _user_id: userId });
      allowed = isSuper === true;
    }
    if (!allowed) {
      return errorResponse(403, "FORBIDDEN", "Not a member of this workspace");
    }

    const body = await req.json().catch(() => null);
    const items = Array.isArray(body?.items) ? body.items : [];
    if (items.length < 1 || items.length > MAX_FILES) {
      return errorResponse(
        400,
        "VALIDATION_ERROR",
        `items must be an array with 1 to ${MAX_FILES} elements`,
      );
    }

    const imported: { url: string; public_url: string }[] = [];
    const failed: { url: string; reason: string }[] = [];

    for (const raw of items) {
      const url: string = typeof raw === "string" ? raw : raw?.url;
      const referer: string | undefined = typeof raw === "object" ? raw?.source_url : undefined;

      if (!url || !/^https?:\/\//i.test(url)) {
        failed.push({ url: String(url ?? ""), reason: "URL inválido" });
        continue;
      }

      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
      try {
        const headers: Record<string, string> = {
          "User-Agent":
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
          Accept: "image/avif,image/webp,image/png,image/jpeg,*/*;q=0.8",
        };
        if (referer && /^https?:\/\//i.test(referer)) headers.Referer = referer;

        const res = await fetch(url, { headers, signal: controller.signal, redirect: "follow" });
        if (!res.ok) {
          failed.push({ url, reason: `A origem devolveu ${res.status}` });
          continue;
        }

        const contentType = (res.headers.get("content-type") || "").split(";")[0].trim().toLowerCase();
        if (!contentType.startsWith("image/")) {
          failed.push({ url, reason: "O ficheiro não é uma imagem" });
          continue;
        }

        const buffer = new Uint8Array(await res.arrayBuffer());
        if (buffer.byteLength === 0) {
          failed.push({ url, reason: "Ficheiro vazio" });
          continue;
        }
        if (buffer.byteLength > MAX_SIZE_BYTES) {
          failed.push({ url, reason: "Imagem demasiado grande (máx. 8 MB)" });
          continue;
        }

        const fileId = crypto.randomUUID();
        const ext = EXT_BY_TYPE[contentType] ?? "jpg";
        const storagePath = `workspaces/${workspaceId}/products/tmp/${fileId}.${ext}`;

        const { error: uploadError } = await adminClient.storage
          .from("product-images")
          .upload(storagePath, buffer, { contentType, upsert: false });

        if (uploadError) {
          console.error("upload failed", storagePath, uploadError.message);
          failed.push({ url, reason: "Falha ao guardar no storage" });
          continue;
        }

        try {
          await adminClient.from("storage_upload_intents").insert({
            id: fileId,
            workspace_id: workspaceId,
            user_id: userId,
            bucket: "product-images",
            storage_path_tmp: storagePath,
            content_type: contentType,
            size_bytes: buffer.byteLength,
            status: "uploaded",
            expires_at: new Date(Date.now() + 600_000).toISOString(),
          });
        } catch (intentErr) {
          console.warn("intent insert failed", (intentErr as Error).message);
        }

        imported.push({
          url,
          public_url: `${supabaseUrl}/storage/v1/object/public/product-images/${storagePath}`,
        });
      } catch (err) {
        const msg = (err as Error).name === "AbortError"
          ? "Tempo esgotado ao descarregar"
          : (err as Error).message;
        failed.push({ url, reason: msg });
      } finally {
        clearTimeout(timer);
      }
    }

    return json(200, { success: true, imported, failed });
  } catch (err) {
    console.error("product-images-import-url error:", err);
    return json(200, {
      success: false,
      internal_error: true,
      imported: [],
      failed: [],
      message: "Erro interno ao importar imagens",
    });
  }
});
