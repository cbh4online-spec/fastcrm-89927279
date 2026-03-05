import { createClient } from "@supabase/supabase-js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-workspace-id, x-idempotency-key, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function errorResponse(status: number, code: string, message: string, requestId?: string) {
  return new Response(
    JSON.stringify({
      success: false,
      error: { code, message },
      meta: { request_id: requestId ?? crypto.randomUUID(), timestamp: new Date().toISOString() },
    }),
    { status, headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const requestId = crypto.randomUUID();

  try {
    // 1. Validate JWT
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return errorResponse(401, "UNAUTHORIZED", "Missing or invalid Authorization header", requestId);
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
      return errorResponse(401, "UNAUTHORIZED", "Invalid token", requestId);
    }

    const userId = claimsData.claims.sub as string;

    // 2. Get workspace ID
    const workspaceId = req.headers.get("X-Workspace-Id");
    if (!workspaceId) {
      return errorResponse(400, "VALIDATION_ERROR", "X-Workspace-Id header required", requestId);
    }

    // 3. Validate workspace membership
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);
    const { data: membership, error: memberError } = await adminClient
      .from("workspace_members")
      .select("role")
      .eq("workspace_id", workspaceId)
      .eq("user_id", userId)
      .in("role", ["owner", "admin", "agent"])
      .maybeSingle();

    if (memberError || !membership) {
      return errorResponse(403, "FORBIDDEN", "Not a member of this workspace", requestId);
    }

    // 4. Parse and validate body
    const body = await req.json();
    const { product_id, status, options } = body;

    if (!product_id || typeof product_id !== "string") {
      return errorResponse(400, "VALIDATION_ERROR", "product_id is required", requestId);
    }

    if (status !== "active" && status !== "draft") {
      return errorResponse(400, "VALIDATION_ERROR", 'status must be "active" or "draft"', requestId);
    }

    const opts = {
      require_min_images: options?.require_min_images ?? false,
      create_audit_log: options?.create_audit_log ?? true,
      channel: options?.channel ?? null,
    };

    // 5. Fetch product
    const { data: product, error: productError } = await adminClient
      .from("products")
      .select("id, status, images, store_published")
      .eq("id", product_id)
      .eq("workspace_id", workspaceId)
      .maybeSingle();

    if (productError || !product) {
      return errorResponse(403, "FORBIDDEN", "Product not found in this workspace", requestId);
    }

    // 6. Image validation (optional)
    if (opts.require_min_images && status === "active") {
      const imagesArray = Array.isArray(product.images) ? product.images : [];
      if (imagesArray.length === 0) {
        // Fallback: check product_images table
        const { count } = await adminClient
          .from("product_images")
          .select("id", { count: "exact", head: true })
          .eq("product_id", product_id);

        if (!count || count === 0) {
          return errorResponse(400, "VALIDATION_ERROR", "Product must have at least one image to publish", requestId);
        }
      }
    }

    // 7. Update product
    console.log(`[PRODUCTS] Publish: product=${product_id}, status=${status}`);
    const now = new Date().toISOString();
    const { error: updateError } = await adminClient
      .from("products")
      .update({
        status,
        store_published: status === "active",
        updated_at: now,
      })
      .eq("id", product_id);

    if (updateError) {
      console.error("[PRODUCTS] product-publish update error:", updateError);
      return errorResponse(500, "INTERNAL_ERROR", "Failed to update product", requestId);
    }

    console.log(`[PRODUCTS] Published: product=${product_id}`);

    // 8. Audit log (optional)
    let audit: { log_id: string; event: string } | null = null;

    if (opts.create_audit_log) {
      const event = status === "active" ? "product_published" : "product_unpublished";
      const { data: logData, error: logError } = await adminClient
        .from("crm_activities")
        .insert({
          workspace_id: workspaceId,
          user_id: userId,
          activity_type: event,
          title: status === "active" ? "Produto publicado" : "Produto despublicado",
          description: `Status alterado para ${status}`,
          entity_type: "product",
          entity_id: product_id,
          metadata: { channel: opts.channel, previous_status: product.status },
        })
        .select("id")
        .single();

      if (!logError && logData) {
        audit = { log_id: logData.id, event };
      }
    }

    // 9. Return response
    return new Response(
      JSON.stringify({
        success: true,
        data: {
          product_id,
          status,
          published_at: status === "active" ? now : null,
          audit,
        },
        meta: {
          request_id: requestId,
          workspace_id: workspaceId,
          timestamp: now,
        },
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("[PRODUCTS] product-publish error:", err);
    return errorResponse(500, "INTERNAL_ERROR", "Internal server error", requestId);
  }
});
