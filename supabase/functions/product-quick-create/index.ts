import { createClient } from "@supabase/supabase-js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-workspace-id, x-idempotency-key, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function errorResponse(status: number, error: string, message: string) {
  return new Response(
    JSON.stringify({ success: false, error, message }),
    { status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // 1. Validate JWT
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
    const { data: claimsData, error: claimsError } =
      await userClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return errorResponse(401, "UNAUTHORIZED", "Invalid token");
    }

    const userId = claimsData.claims.sub as string;

    // 2. Get workspace ID and idempotency key from headers
    const workspaceId = req.headers.get("X-Workspace-Id");
    if (!workspaceId) {
      return errorResponse(400, "VALIDATION_ERROR", "X-Workspace-Id header required");
    }

    const idempotencyKey = req.headers.get("X-Idempotency-Key");

    // 3. Validate workspace membership
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);
    const { data: membership, error: memberError } = await adminClient
      .from("workspace_members")
      .select("id, role")
      .eq("workspace_id", workspaceId)
      .eq("user_id", userId)
      .maybeSingle();

    if (memberError || !membership) {
      return errorResponse(403, "FORBIDDEN", "Not a member of this workspace");
    }

    const allowedRoles = ["owner", "admin", "agent"];
    if (!allowedRoles.includes(membership.role)) {
      return errorResponse(403, "FORBIDDEN", "Insufficient role for product creation");
    }

    // 4. Check idempotency
    if (idempotencyKey) {
      const { data: existing } = await adminClient
        .from("product_creation_idempotency")
        .select("response_payload")
        .eq("idempotency_key", idempotencyKey)
        .eq("workspace_id", workspaceId)
        .maybeSingle();

      if (existing?.response_payload) {
        return new Response(
          JSON.stringify(existing.response_payload),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // 5. Parse and validate body
    const body = await req.json();
    const { product, images = [], inventory = {}, options = {}, client: clientInfo = {} } = body;

    if (!product || typeof product !== "object") {
      return errorResponse(400, "VALIDATION_ERROR", "product object is required");
    }

    const name = product.name?.trim();
    if (!name || name.length < 2 || name.length > 120) {
      return errorResponse(400, "VALIDATION_ERROR", "product.name must be 2-120 characters");
    }

    const priceAmount = product.price?.amount;
    if (typeof priceAmount !== "number" || priceAmount <= 0) {
      return errorResponse(400, "VALIDATION_ERROR", "product.price.amount must be > 0");
    }

    const categoryId = product.category_id;
    if (!categoryId) {
      return errorResponse(400, "VALIDATION_ERROR", "product.category_id is required");
    }

    if (!Array.isArray(images) || images.length > 6) {
      return errorResponse(400, "VALIDATION_ERROR", "images must be an array with 0-6 elements");
    }

    let status = product.status || "draft";
    if (!["draft", "active"].includes(status)) {
      return errorResponse(400, "VALIDATION_ERROR", "product.status must be draft or active");
    }

    // 6. Resolve category name
    const { data: categoryData } = await adminClient
      .from("product_categories")
      .select("name")
      .eq("id", categoryId)
      .maybeSingle();

    const categoryName = categoryData?.name || "";

    // 7. Apply options
    if (options.publish_now) {
      status = "active";
    }

    const baseSlug = options.generate_slug !== false ? slugify(name) : null;

    // 7b. Resolve slug conflicts
    let finalSlug = baseSlug;
    if (baseSlug) {
      const { data: existing } = await adminClient
        .from("products")
        .select("id")
        .eq("workspace_id", workspaceId)
        .eq("sheet_slug", baseSlug)
        .maybeSingle();

      if (existing) {
        const { count } = await adminClient
          .from("products")
          .select("id", { count: "exact", head: true })
          .eq("workspace_id", workspaceId)
          .like("sheet_slug", `${baseSlug}%`);

        finalSlug = `${baseSlug}-${(count || 1) + 1}`;
      }
    }

    // 8. Insert product
    const currency = product.price?.currency || "EUR";
    const requestId = crypto.randomUUID();

    const { data: newProduct, error: insertError } = await adminClient
      .from("products")
      .insert({
        workspace_id: workspaceId,
        name,
        base_price: priceAmount,
        currency,
        category: categoryName,
        store_category_id: categoryId,
        status,
        short_description: product.short_description || null,
        commercial_description: product.description || null,
        sku: product.sku || null,
        sheet_slug: finalSlug,
        tax_included: product.price?.tax_included ?? true,
        tags: product.tags || [],
        barcode: product.barcode || null,
        is_quick_created: options.is_quick_created ?? true,
        created_channel: options.channel || "mobile_quick",
        store_published: status === "active",
        stock_quantity: inventory.quantity || null,
        stock_status: inventory.track_stock ? "in_stock" : null,
        track_stock: inventory.track_stock ?? false,
        created_by: userId,
      })
      .select("*")
      .single();

    if (insertError || !newProduct) {
      console.error("Product insert error:", insertError);
      return errorResponse(500, "INTERNAL_ERROR", "Failed to create product");
    }

    const productId = newProduct.id;

    // 9. Promote images from tmp to final path
    const promotedImages: {
      id: string;
      product_id: string;
      storage_path: string;
      public_url: string;
      position: number;
      alt: string | null;
    }[] = [];

    const publicUrls: string[] = [];

    for (const img of images) {
      const fileId = img.file_id;
      const oldPath = `workspaces/${workspaceId}/products/tmp/${fileId}.jpg`;
      const newPath = `workspaces/${workspaceId}/products/${productId}/${fileId}.jpg`;

      // Move from tmp to final
      const { error: moveError } = await adminClient.storage
        .from("product-images")
        .move(oldPath, newPath);

      if (moveError) {
        console.error(`Failed to move image ${fileId}:`, moveError);
        // Mark intent as expired (eligible for cleanup)
        adminClient
          .from("storage_upload_intents")
          .update({ status: "expired", updated_at: new Date().toISOString() })
          .eq("id", fileId)
          .then(() => {});
        continue;
      }

      const publicUrl = `${supabaseUrl}/storage/v1/object/public/product-images/${newPath}`;
      publicUrls.push(publicUrl);

      // Mark intent as promoted (fire-and-forget)
      adminClient
        .from("storage_upload_intents")
        .update({ status: "promoted", updated_at: new Date().toISOString() })
        .eq("id", fileId)
        .then(() => {});

      // Insert product_images record
      const { data: imgRecord, error: imgError } = await adminClient
        .from("product_images")
        .insert({
          workspace_id: workspaceId,
          product_id: productId,
          url: publicUrl,
          storage_path: newPath,
          alt_text: img.alt || null,
          position: img.position ?? promotedImages.length,
        })
        .select("id")
        .single();

      if (!imgError && imgRecord) {
        promotedImages.push({
          id: imgRecord.id,
          product_id: productId,
          storage_path: newPath,
          public_url: publicUrl,
          position: img.position ?? promotedImages.length,
          alt: img.alt || null,
        });
      }
    }

    // 10. Update product images array
    if (publicUrls.length > 0) {
      await adminClient
        .from("products")
        .update({ images: publicUrls })
        .eq("id", productId);
    }

    // 11. Create audit log if requested
    let auditLog: { log_id: string; event: string } | null = null;

    if (options.create_audit_log) {
      const { data: logData } = await adminClient
        .from("crm_activities")
        .insert({
          workspace_id: workspaceId,
          entity_type: "product",
          entity_id: productId,
          activity_type: "product_created",
          title: `Produto criado: ${name}`,
          description: `Produto criado via ${options.channel || "mobile_quick"}`,
          performed_by: userId,
          metadata: {
            channel: options.channel,
            is_quick_created: options.is_quick_created,
            images_count: promotedImages.length,
            device: clientInfo.device,
          },
        })
        .select("id")
        .single();

      if (logData) {
        auditLog = { log_id: logData.id, event: "product_created" };
      }
    }

    // 12. Build response
    const responsePayload = {
      success: true,
      data: {
        product: {
          id: productId,
          workspace_id: workspaceId,
          name: newProduct.name,
          slug: newProduct.sheet_slug,
          status: newProduct.status,
          price_amount: newProduct.base_price,
          currency: newProduct.currency,
          category_id: categoryId,
          short_description: newProduct.short_description,
          description: newProduct.commercial_description,
          tax_included: newProduct.tax_included,
          tags: newProduct.tags || [],
          sku: newProduct.sku,
          barcode: newProduct.barcode || null,
          is_quick_created: newProduct.is_quick_created,
          created_channel: newProduct.created_channel,
          created_at: newProduct.created_at,
          updated_at: newProduct.updated_at,
        },
        images: promotedImages,
        inventory: {
          track_stock: inventory.track_stock ?? false,
          quantity: inventory.quantity ?? null,
          in_stock: inventory.in_stock ?? true,
        },
        audit: auditLog,
      },
      meta: {
        request_id: requestId,
        workspace_id: workspaceId,
        timestamp: new Date().toISOString(),
      },
    };

    // 13. Save idempotency record
    if (idempotencyKey) {
      await adminClient
        .from("product_creation_idempotency")
        .insert({
          idempotency_key: idempotencyKey,
          workspace_id: workspaceId,
          product_id: productId,
          response_payload: responsePayload,
        });
    }

    return new Response(
      JSON.stringify(responsePayload),
      { status: 201, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("product-quick-create error:", err);
    return errorResponse(500, "INTERNAL_ERROR", "Internal server error");
  }
});
