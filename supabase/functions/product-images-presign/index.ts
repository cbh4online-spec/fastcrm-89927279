import { createClient } from "@supabase/supabase-js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-workspace-id, x-idempotency-key, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // 1. Validate JWT
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
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
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = claimsData.claims.sub as string;

    // 2. Get workspace ID from header
    const workspaceId = req.headers.get("X-Workspace-Id");
    if (!workspaceId) {
      return new Response(
        JSON.stringify({ error: "X-Workspace-Id header required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
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
      return new Response(
        JSON.stringify({ error: "Not a member of this workspace" }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // 4. Parse body
    const { count } = await req.json();
    if (!count || count < 1 || count > 6) {
      return new Response(
        JSON.stringify({ error: "count must be between 1 and 6" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // 5. Generate signed upload URLs
    const timestamp = Date.now();
    const uploads: { path: string; signedUrl: string; token: string }[] = [];

    for (let i = 0; i < count; i++) {
      const path = `products/${workspaceId}/${timestamp}-${i}.jpg`;
      const { data, error } = await adminClient.storage
        .from("product-images")
        .createSignedUploadUrl(path);

      if (error || !data) {
        console.error(`Failed to create signed URL for ${path}:`, error);
        return new Response(
          JSON.stringify({
            error: "Failed to generate upload URL",
            detail: error?.message,
          }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      uploads.push({
        path,
        signedUrl: data.signedUrl,
        token: data.token,
      });
    }

    return new Response(JSON.stringify({ uploads }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("product-images-presign error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
