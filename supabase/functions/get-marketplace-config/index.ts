import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { slug } = await req.json();

    if (!slug) {
      return new Response(
        JSON.stringify({ error: "Slug is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Try c2c_marketplace_config first
    const { data: marketplace, error } = await supabase
      .from("c2c_marketplace_config")
      .select("*")
      .eq("slug", slug)
      .eq("status", "active")
      .maybeSingle();

    if (error) throw error;

    if (marketplace) {
      // Get stats
      const [{ count: listingsCount }, { count: sellersCount }] = await Promise.all([
        supabase
          .from("c2c_listings")
          .select("*", { count: "exact", head: true })
          .eq("workspace_id", marketplace.workspace_id)
          .eq("status", "active"),
        supabase
          .from("c2c_sellers")
          .select("*", { count: "exact", head: true })
          .eq("workspace_id", marketplace.workspace_id)
          .eq("status", "active"),
      ]);

      return new Response(
        JSON.stringify({
          marketplace: {
            ...marketplace,
            stats: {
              totalListings: listingsCount || 0,
              totalSellers: sellersCount || 0,
            },
          },
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fallback: try workspace slug
    const { data: workspace } = await supabase
      .from("workspaces")
      .select("id, name, slug")
      .eq("slug", slug)
      .maybeSingle();

    if (!workspace) {
      return new Response(
        JSON.stringify({ error: "Marketplace not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Return minimal config from workspace
    const [{ count: listingsCount2 }, { count: sellersCount2 }] = await Promise.all([
      supabase
        .from("c2c_listings")
        .select("*", { count: "exact", head: true })
        .eq("workspace_id", workspace.id)
        .eq("status", "active"),
      supabase
        .from("c2c_sellers")
        .select("*", { count: "exact", head: true })
        .eq("workspace_id", workspace.id)
        .eq("status", "active"),
    ]);

    return new Response(
      JSON.stringify({
        marketplace: {
          workspace_id: workspace.id,
          slug: workspace.slug,
          name: workspace.name,
          theme: {
            primaryColor: "#6366f1",
            secondaryColor: "#f59e0b",
            backgroundColor: "#ffffff",
            textColor: "#1f2937",
            fontFamily: "Inter",
          },
          settings: {
            allowGuestBrowsing: true,
            requireLoginToContact: true,
            enableOffers: true,
            enableBoost: true,
            categoriesEnabled: true,
            searchEnabled: true,
            filtersEnabled: true,
          },
          stats: {
            totalListings: listingsCount2 || 0,
            totalSellers: sellersCount2 || 0,
          },
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
