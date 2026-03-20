import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Invalid token" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { workspace_id, inactive_days_threshold = 60 } = await req.json();
    if (!workspace_id) {
      return new Response(JSON.stringify({ error: "workspace_id required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");

    // Verify membership
    const { data: member } = await supabase.from("workspace_members").select("id").eq("workspace_id", workspace_id).eq("user_id", claimsData.claims.sub).maybeSingle();
    if (!member) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const cutoff = new Date(Date.now() - inactive_days_threshold * 24 * 60 * 60 * 1000).toISOString();

    // Get contacts who haven't opened recently
    const { data: activeEvents } = await supabase
      .from("marketing_events")
      .select("email")
      .eq("workspace_id", workspace_id)
      .eq("event_type", "opened")
      .gte("occurred_at", cutoff);

    const activeEmails = new Set((activeEvents || []).map(e => e.email?.toLowerCase()).filter(Boolean));

    const { data: allContacts } = await supabase
      .from("contacts")
      .select("id, name, email")
      .eq("workspace_id", workspace_id)
      .not("email", "is", null)
      .limit(500);

    const inactiveContacts = (allContacts || []).filter(c => c.email && !activeEmails.has(c.email.toLowerCase()));

    if (inactiveContacts.length === 0) {
      return new Response(JSON.stringify({ contacts_found: 0, message: "No inactive contacts found" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Generate AI subjects for sample contacts (max 5)
    const sampleContacts = inactiveContacts.slice(0, 5);
    const previewSubjects: Array<{ contact_name: string; subject: string; preview_text: string }> = [];

    const canUseAI = LOVABLE_API_KEY || ANTHROPIC_API_KEY;

    if (canUseAI) {
      for (const contact of sampleContacts) {
        try {
          const prompt = `Contacto: ${contact.name || "Cliente"}. Gera um assunto de email de re-engajamento curto (máx 60 chars) em português de Portugal. Responde apenas com JSON: { "subject": "string", "preview_text": "string" }`;

          let aiResponse: any;

          if (LOVABLE_API_KEY) {
            const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
              method: "POST",
              headers: {
                Authorization: `Bearer ${LOVABLE_API_KEY}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                model: "google/gemini-3-flash-preview",
                messages: [
                  { role: "system", content: "És especialista em email marketing em português de Portugal. Gera assuntos de email de re-engajamento personalizados, curtos (máx 60 chars), que criam curiosidade sem ser clickbait. Responde apenas com JSON." },
                  { role: "user", content: prompt },
                ],
              }),
            });
            const data = await resp.json();
            const content = data.choices?.[0]?.message?.content || "";
            const jsonMatch = content.match(/\{[\s\S]*\}/);
            if (jsonMatch) aiResponse = JSON.parse(jsonMatch[0]);
          } else if (ANTHROPIC_API_KEY) {
            const resp = await fetch("https://api.anthropic.com/v1/messages", {
              method: "POST",
              headers: {
                "x-api-key": ANTHROPIC_API_KEY,
                "content-type": "application/json",
                "anthropic-version": "2023-06-01",
              },
              body: JSON.stringify({
                model: "claude-sonnet-4-20250514",
                max_tokens: 200,
                system: "És especialista em email marketing em português de Portugal. Responde apenas com JSON: { \"subject\": \"string\", \"preview_text\": \"string\" }",
                messages: [{ role: "user", content: prompt }],
              }),
            });
            const data = await resp.json();
            const content = data.content?.[0]?.text || "";
            const jsonMatch = content.match(/\{[\s\S]*\}/);
            if (jsonMatch) aiResponse = JSON.parse(jsonMatch[0]);
          }

          if (aiResponse) {
            previewSubjects.push({
              contact_name: contact.name || contact.email!,
              subject: aiResponse.subject || "Sentimos a sua falta",
              preview_text: aiResponse.preview_text || "",
            });
          }
        } catch (err) {
          console.error("AI generation error for contact:", err);
          previewSubjects.push({
            contact_name: contact.name || contact.email!,
            subject: "Sentimos a sua falta — temos novidades para si",
            preview_text: "Veja o que mudou desde a sua última visita",
          });
        }
      }
    } else {
      // Fallback without AI
      for (const contact of sampleContacts) {
        previewSubjects.push({
          contact_name: contact.name || contact.email!,
          subject: "Sentimos a sua falta — temos novidades para si",
          preview_text: "Veja o que mudou desde a sua última visita",
        });
      }
    }

    return new Response(JSON.stringify({
      contacts_found: inactiveContacts.length,
      inactive_days: inactive_days_threshold,
      preview_subjects: previewSubjects,
      contact_ids: inactiveContacts.map(c => c.id),
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (error) {
    console.error("Reengagement AI error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Internal error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
