import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ContactInsights {
  summary: string[];
  engagementLevel: "cold" | "warm" | "hot";
  bestChannel: string | null;
  suggestedActions: Array<{
    type: "send_message" | "create_opportunity" | "schedule_followup" | "add_tags";
    label: string;
    priority: "high" | "medium" | "low";
    reason: string;
  }>;
  riskFlags: Array<{
    type: "no_reply" | "missing_channel" | "duplicate" | "stale" | "incomplete";
    message: string;
    severity: "warning" | "error";
  }>;
  buyingIntent: "none" | "low" | "medium" | "high";
  personalizedMessage?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const anonClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await anonClient.auth.getUser(token);

    if (userError || !userData?.user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { contactId } = await req.json();

    if (!contactId) {
      return new Response(
        JSON.stringify({ success: false, error: "contactId is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch contact data
    const { data: contact, error: contactError } = await supabase
      .from("contacts")
      .select("*")
      .eq("id", contactId)
      .single();

    if (contactError || !contact) {
      return new Response(
        JSON.stringify({ success: false, error: "Contact not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch related data in parallel
    const [
      { data: leads },
      { data: opportunities },
      { data: activities },
      { data: conversations },
    ] = await Promise.all([
      // Find leads that might be related (by email or phone)
      supabase
        .from("leads")
        .select("id, name, status, email, phone, last_contact_at")
        .eq("workspace_id", contact.workspace_id)
        .or(`email.eq.${contact.email},phone.eq.${contact.phone}`)
        .limit(5),
      // Find opportunities through leads
      supabase
        .from("opportunities")
        .select("id, title, value, status, stage_id, expected_close_date")
        .eq("workspace_id", contact.workspace_id)
        .limit(5),
      // Get recent activities
      supabase
        .from("crm_activities")
        .select("id, activity_type, title, created_at")
        .eq("entity_id", contactId)
        .eq("entity_type", "contact")
        .order("created_at", { ascending: false })
        .limit(10),
      // Get conversations
      supabase
        .from("conversations")
        .select(`
          id,
          channel,
          status,
          last_message_at,
          messages (id, direction, content, sent_at)
        `)
        .eq("workspace_id", contact.workspace_id)
        .order("last_message_at", { ascending: false })
        .limit(5),
    ]);

    // Build insights object
    const insights: ContactInsights = {
      summary: [],
      engagementLevel: "cold",
      bestChannel: null,
      suggestedActions: [],
      riskFlags: [],
      buyingIntent: "none",
    };

    // Calculate engagement level
    const now = new Date();
    const lastActivity = activities?.[0];
    const daysSinceActivity = lastActivity 
      ? Math.floor((now.getTime() - new Date(lastActivity.created_at).getTime()) / (1000 * 60 * 60 * 24))
      : 999;

    const conversationCount = conversations?.length || 0;
    const messageCount = conversations?.reduce((acc, c) => acc + (c.messages?.length || 0), 0) || 0;

    if (messageCount > 10 || (daysSinceActivity < 3 && conversationCount > 2)) {
      insights.engagementLevel = "hot";
    } else if (messageCount > 3 || daysSinceActivity < 14) {
      insights.engagementLevel = "warm";
    } else {
      insights.engagementLevel = "cold";
    }

    // Determine best channel
    if (conversations && conversations.length > 0) {
      const channelCounts: Record<string, number> = {};
      for (const conv of conversations) {
        channelCounts[conv.channel] = (channelCounts[conv.channel] || 0) + (conv.messages?.length || 0);
      }
      const topChannel = Object.entries(channelCounts).sort((a, b) => b[1] - a[1])[0];
      if (topChannel) {
        insights.bestChannel = topChannel[0] === "email" ? "Email" : topChannel[0] === "whatsapp" ? "WhatsApp" : "Instagram";
      }
    } else if (contact.phone) {
      insights.bestChannel = "WhatsApp";
    } else if (contact.email) {
      insights.bestChannel = "Email";
    }

    // Risk flags
    if (!contact.email && !contact.phone) {
      insights.riskFlags.push({
        type: "missing_channel",
        message: "Sem canal de contacto (email ou telefone)",
        severity: "error",
      });
    }

    if (daysSinceActivity > 30) {
      insights.riskFlags.push({
        type: "stale",
        message: `Sem interação há ${daysSinceActivity} dias`,
        severity: "warning",
      });
    }

    if (!contact.company && !contact.job_title) {
      insights.riskFlags.push({
        type: "incomplete",
        message: "Dados de empresa/cargo em falta",
        severity: "warning",
      });
    }

    // Check for potential duplicates
    const { data: potentialDuplicates } = await supabase
      .from("contacts")
      .select("id, name")
      .eq("workspace_id", contact.workspace_id)
      .neq("id", contactId)
      .or(`email.eq.${contact.email},phone.eq.${contact.phone}`)
      .limit(1);

    if (potentialDuplicates && potentialDuplicates.length > 0) {
      insights.riskFlags.push({
        type: "duplicate",
        message: `Possível duplicado: ${potentialDuplicates[0].name}`,
        severity: "warning",
      });
    }

    // Suggested actions
    if (insights.engagementLevel === "cold" && (contact.email || contact.phone)) {
      insights.suggestedActions.push({
        type: "send_message",
        label: "Enviar mensagem de reativação",
        priority: "high",
        reason: "Contacto frio há muito tempo",
      });
    }

    if (insights.engagementLevel === "hot" && (!opportunities || opportunities.length === 0)) {
      insights.suggestedActions.push({
        type: "create_opportunity",
        label: "Criar oportunidade",
        priority: "high",
        reason: "Contacto muito ativo sem oportunidade associada",
      });
    }

    if (daysSinceActivity > 7 && daysSinceActivity < 30) {
      insights.suggestedActions.push({
        type: "schedule_followup",
        label: "Agendar follow-up",
        priority: "medium",
        reason: `Última interação há ${daysSinceActivity} dias`,
      });
    }

    // Use AI for summary and buying intent
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (LOVABLE_API_KEY) {
      try {
        const recentMessages = conversations
          ?.flatMap(c => c.messages || [])
          .slice(0, 10)
          .map(m => `[${m.direction}] ${m.content?.slice(0, 200)}`)
          .join("\n") || "";

        const prompt = `Analyze this contact for a CRM:

Contact: ${contact.name}
Company: ${contact.company || "Unknown"}
Job Title: ${contact.job_title || "Unknown"}
Tags: ${contact.tags?.join(", ") || "None"}
Notes: ${contact.notes || "None"}
Engagement Level: ${insights.engagementLevel}
Days since activity: ${daysSinceActivity}

Recent messages:
${recentMessages || "No messages"}

Related leads: ${leads?.map(l => `${l.name} (${l.status})`).join(", ") || "None"}
Opportunities: ${opportunities?.map(o => `${o.title} - €${o.value || 0}`).join(", ") || "None"}

Provide:
1. A 2-3 bullet summary of this contact (in Portuguese)
2. Buying intent assessment (none/low/medium/high)
3. A personalized first message suggestion if we need to reach out (in Portuguese)

Return ONLY a JSON object (no markdown):
{
  "summary": ["bullet1", "bullet2", "bullet3"],
  "buyingIntent": "none" | "low" | "medium" | "high",
  "personalizedMessage": "Suggested message in Portuguese"
}`;

        const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash",
            messages: [
              { role: "system", content: "You are a CRM analyst. Analyze contacts and provide actionable insights. Always respond in Portuguese." },
              { role: "user", content: prompt },
            ],
            temperature: 0.4,
          }),
        });

        if (aiResponse.ok) {
          const aiData = await aiResponse.json();
          const content = aiData.choices?.[0]?.message?.content;
          if (content) {
            try {
              const cleanContent = content.replace(/```json\n?|\n?```/g, "").trim();
              const parsed = JSON.parse(cleanContent);
              if (parsed.summary) insights.summary = parsed.summary;
              if (parsed.buyingIntent) insights.buyingIntent = parsed.buyingIntent;
              if (parsed.personalizedMessage) insights.personalizedMessage = parsed.personalizedMessage;
            } catch (e) {
              console.log("Failed to parse AI response:", e);
              // Fallback summary
              insights.summary = [
                `Contacto ${insights.engagementLevel === "hot" ? "muito ativo" : insights.engagementLevel === "warm" ? "moderadamente ativo" : "pouco ativo"}`,
                contact.company ? `Trabalha na ${contact.company}` : "Empresa desconhecida",
                `${messageCount} mensagens trocadas`,
              ];
            }
          }
        }
      } catch (e) {
        console.error("AI insights failed:", e);
        // Fallback summary
        insights.summary = [
          `Contacto ${insights.engagementLevel === "hot" ? "muito ativo" : insights.engagementLevel === "warm" ? "moderadamente ativo" : "pouco ativo"}`,
          contact.company ? `Trabalha na ${contact.company}` : "Empresa desconhecida",
        ];
      }
    } else {
      // No AI key - basic summary
      insights.summary = [
        `Contacto ${insights.engagementLevel === "hot" ? "muito ativo" : insights.engagementLevel === "warm" ? "moderadamente ativo" : "pouco ativo"}`,
        contact.company ? `Trabalha na ${contact.company}` : "Empresa desconhecida",
        `${conversationCount} conversas, ${messageCount} mensagens`,
      ];
    }

    return new Response(
      JSON.stringify({ success: true, data: insights }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Contact insights error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
