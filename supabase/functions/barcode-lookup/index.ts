import { createClient } from "@supabase/supabase-js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Validate JWT
    const token = authHeader.replace("Bearer ", "");
    const {
      data: { user },
      error: authError,
    } = await createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!
    ).auth.getUser(token);

    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { workspace_id, barcode } = await req.json();

    if (!workspace_id || !barcode) {
      return new Response(
        JSON.stringify({ error: "workspace_id and barcode are required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Verify workspace membership
    const { data: member } = await supabase
      .from("workspace_members")
      .select("id")
      .eq("workspace_id", workspace_id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (!member) {
      return new Response(JSON.stringify({ error: "Not a workspace member" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Lookup product by barcode
    const { data: product } = await supabase
      .from("products")
      .select(
        "id, name, sku, barcode, images, stock_quantity, base_price, status, category"
      )
      .eq("workspace_id", workspace_id)
      .eq("barcode", barcode.trim())
      .maybeSingle();

    if (product) {
      return new Response(
        JSON.stringify({
          found: true,
          product_id: product.id,
          name: product.name,
          sku: product.sku,
          barcode: product.barcode,
          images: product.images,
          stock_on_hand: product.stock_quantity,
          base_price: product.base_price,
          status: product.status,
          category: product.category,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    return new Response(JSON.stringify({ found: false, barcode }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
