import { createClient } from "@supabase/supabase-js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-workspace-id, x-idempotency-key, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const MAX_FILES = 6;
const MAX_SIZE_BYTES = 8_388_608; // 8MB

function errorResponse(status: number, error: string, message: string) {
  return new Response(
    JSON.stringify({ success: false, error, message }),
    { status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
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

    // 2. Get workspace ID from header
    const workspaceId = req.headers.get("X-Workspace-Id");
    if (!workspaceId) {
      return errorResponse(400, "VALIDATION_ERROR", "X-Workspace-Id header required");
    }

    // 3. Validate workspace membership
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);
    const { data: membership, error: memberError } = await adminClient
      .from("workspace_members")
      .select("id")
      .eq("workspace_id", workspaceId)
      .eq("user_id", userId)
      .maybeSingle();

    if (memberError || !membership) {
      return errorResponse(403, "FORBIDDEN", "Not a member of this workspace");
    }

    // 4. Parse and validate body
    const body = await req.json();
    const { files } = body;

    if (!Array.isArray(files) || files.length < 1 || files.length > MAX_FILES) {
      return errorResponse(400, "VALIDATION_ERROR", `files must be an array with 1 to ${MAX_FILES} elements`);
    }

    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      if (!f.filename || typeof f.filename !== "string" || !f.filename.trim()) {
        return errorResponse(400, "VALIDATION_ERROR", `files[${i}].filename is required`);
      }
      if (!f.content_type || typeof f.content_type !== "string" || !f.content_type.startsWith("image/")) {
        return errorResponse(400, "VALIDATION_ERROR", `files[${i}].content_type must start with image/`);
      }
      if (typeof f.size_bytes !== "number" || f.size_bytes <= 0 || f.size_bytes > MAX_SIZE_BYTES) {
        return errorResponse(400, "VALIDATION_ERROR", `files[${i}].size_bytes must be between 1 and ${MAX_SIZE_BYTES}`);
      }
    }

    // 5. Generate signed upload URLs
    const requestId = crypto.randomUUID();
    const uploads: {
      file_id: string;
      storage_path: string;
      signed_upload_url: string;
      public_url: string;
      expires_in_seconds: number;
    }[] = [];

    for (let i = 0; i < files.length; i++) {
      const fileId = crypto.randomUUID();
      const storagePath = `workspaces/${workspaceId}/products/tmp/${fileId}.jpg`;

      const { data, error } = await adminClient.storage
        .from("product-images")
        .createSignedUploadUrl(storagePath);

      if (error || !data) {
        console.error(`Failed to create signed URL for ${storagePath}:`, error);
        return errorResponse(500, "INTERNAL_ERROR", "Failed to generate upload URL");
      }

      // Register upload intent (non-blocking)
      try {
        await adminClient
          .from("storage_upload_intents")
          .insert({
            id: fileId,
            workspace_id: workspaceId,
            user_id: userId,
            bucket: "product-images",
            storage_path_tmp: storagePath,
            content_type: files[i].content_type,
            size_bytes: files[i].size_bytes,
            status: "issued",
            expires_at: new Date(Date.now() + 600_000).toISOString(),
          });
      } catch (intentErr) {
        console.warn(`Failed to register upload intent for ${fileId}:`, intentErr);
      }

      uploads.push({
        file_id: fileId,
        storage_path: storagePath,
        signed_upload_url: data.signedUrl,
        public_url: `${supabaseUrl}/storage/v1/object/public/product-images/${storagePath}`,
        expires_in_seconds: 600,
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          bucket: "product-images",
          uploads,
        },
        meta: {
          request_id: requestId,
          workspace_id: workspaceId,
          timestamp: new Date().toISOString(),
        },
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("product-images-presign error:", err);
    return errorResponse(500, "INTERNAL_ERROR", "Internal server error");
  }
});
