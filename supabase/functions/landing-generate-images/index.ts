import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "@supabase/supabase-js";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const IMAGE_PROMPTS: Record<string, string> = {
  hero: "Generate a futuristic CRM dashboard UI screenshot with dark theme (deep navy blue #0a0f1e background), showing revenue charts, deal pipeline, contact cards and KPI widgets. Modern glassmorphism style with blue and purple accent colors. Clean professional SaaS interface. No text, pure UI mockup. 16:9 aspect ratio.",
  "solution-pipeline": "Generate a CRM pipeline board interface screenshot, dark theme (#0a0f1e), showing kanban columns with deal cards in different stages (Lead, Qualified, Proposal, Won). Each card has contact avatar, deal value and status badge. Blue/purple accents. Clean modern UI. No text labels. 16:9.",
  "solution-analytics": "Generate an analytics dashboard screenshot, dark theme (#0a0f1e), with line charts, bar graphs, health score gauges, and metric cards showing growth percentages. Blue and purple gradient accents. Modern glassmorphism cards. No text. 16:9.",
  "solution-automation": "Generate a workflow automation builder interface screenshot, dark theme (#0a0f1e), showing connected nodes with arrows forming an automation flow. Trigger nodes, condition branches, action nodes. Blue/purple neon connections. Modern UI. No text. 16:9.",
  "solution-marketplace": "Generate a marketplace/extensions grid interface screenshot, dark theme (#0a0f1e), showing app cards with icons in a grid layout. Each card has an icon, install button style. Like a plugin store. Blue/purple accents. Modern UI. No text. 16:9.",
  "positioning-founders": "Generate a photorealistic image of a solo entrepreneur working on a laptop in a modern minimal office. Warm ambient lighting. The laptop screen shows a CRM dashboard with blue tones. Professional but relaxed atmosphere. High quality photo style.",
  "positioning-teams": "Generate a photorealistic image of a small collaborative team (3-4 people) in a modern office meeting room looking at a large screen showing analytics dashboards. Diverse team. Blue ambient lighting. Professional setting. High quality photo style.",
  "positioning-leaders": "Generate a photorealistic image of a business leader/executive analyzing growth metrics on a large monitor in a corner office. City skyline visible through windows. Blue/purple ambient tones. Confident and focused. High quality photo style.",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { imageIds } = await req.json();
    const ids = imageIds || Object.keys(IMAGE_PROMPTS);

    const results: Record<string, string> = {};
    const errors: Record<string, string> = {};

    for (const id of ids) {
      const prompt = IMAGE_PROMPTS[id];
      if (!prompt) {
        errors[id] = "Unknown image ID";
        continue;
      }

      try {
        console.log(`Generating image: ${id}`);
        const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash-image",
            messages: [{ role: "user", content: prompt }],
            modalities: ["image", "text"],
          }),
        });

        if (!aiResponse.ok) {
          const errText = await aiResponse.text();
          console.error(`AI error for ${id}:`, aiResponse.status, errText);
          errors[id] = `AI error: ${aiResponse.status}`;
          continue;
        }

        const aiData = await aiResponse.json();
        const imageUrl = aiData.choices?.[0]?.message?.images?.[0]?.image_url?.url;

        if (!imageUrl) {
          errors[id] = "No image returned from AI";
          continue;
        }

        // Extract base64 data
        const base64Data = imageUrl.replace(/^data:image\/\w+;base64,/, "");
        const binaryData = Uint8Array.from(atob(base64Data), (c) => c.charCodeAt(0));

        // Upload to storage
        const filePath = `${id}.png`;
        const { error: uploadError } = await supabase.storage
          .from("landing-assets")
          .upload(filePath, binaryData, {
            contentType: "image/png",
            upsert: true,
          });

        if (uploadError) {
          console.error(`Upload error for ${id}:`, uploadError);
          errors[id] = `Upload failed: ${uploadError.message}`;
          continue;
        }

        const { data: publicUrlData } = supabase.storage
          .from("landing-assets")
          .getPublicUrl(filePath);

        results[id] = publicUrlData.publicUrl;
        console.log(`✅ ${id} -> ${publicUrlData.publicUrl}`);
      } catch (e) {
        console.error(`Error generating ${id}:`, e);
        errors[id] = e instanceof Error ? e.message : "Unknown error";
      }
    }

    return new Response(JSON.stringify({ results, errors }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Function error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
