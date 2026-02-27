/**
 * Extract contact data from message content.
 * Called after message insertion to auto-fill lead fields from message text.
 * Supports: email, phone, Instagram, LinkedIn, Facebook, Twitter/X, generic websites.
 * Only fills empty fields — never overwrites existing data.
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Extraction regexes
const EMAIL_REGEX = /[\w.-]+@[\w.-]+\.\w{2,}/g;
const PHONE_REGEX = /(?:\+?\d{1,3}[-.\s]?)?\(?\d{2,4}\)?[-.\s]?\d{3,4}[-.\s]?\d{3,4}/g;
const INSTAGRAM_REGEX = /(?:instagram\.com|instagr\.am)\/([a-zA-Z0-9_.]+)/gi;
const LINKEDIN_REGEX = /linkedin\.com\/in\/([a-zA-Z0-9_-]+)/gi;
const FACEBOOK_REGEX = /facebook\.com\/([a-zA-Z0-9_.]+)/gi;
const TWITTER_REGEX = /(?:twitter\.com|x\.com)\/([a-zA-Z0-9_]+)/gi;
const WEBSITE_REGEX = /https?:\/\/(?!(?:instagram|facebook|linkedin|twitter|x)\.com)[^\s<>"']+/gi;

interface ExtractedData {
  email?: string;
  phone?: string;
  instagram_url?: string;
  linkedin_url?: string;
  facebook_url?: string;
  website?: string;
}

function extractFromText(text: string): ExtractedData {
  const result: ExtractedData = {};

  // Extract email
  const emails = text.match(EMAIL_REGEX);
  if (emails?.length) result.email = emails[0].toLowerCase();

  // Extract phone
  const phones = text.match(PHONE_REGEX);
  if (phones?.length) {
    // Filter out short matches that are likely not phones
    const validPhones = phones.filter(p => p.replace(/\D/g, "").length >= 7);
    if (validPhones.length) result.phone = validPhones[0].trim();
  }

  // Extract Instagram
  const igMatches = [...text.matchAll(INSTAGRAM_REGEX)];
  if (igMatches.length) {
    const username = igMatches[0][1];
    if (!["p", "reel", "stories", "explore"].includes(username)) {
      result.instagram_url = `https://instagram.com/${username}`;
    }
  }

  // Extract LinkedIn
  const liMatches = [...text.matchAll(LINKEDIN_REGEX)];
  if (liMatches.length) {
    result.linkedin_url = `https://linkedin.com/in/${liMatches[0][1]}`;
  }

  // Extract Facebook
  const fbMatches = [...text.matchAll(FACEBOOK_REGEX)];
  if (fbMatches.length) {
    const username = fbMatches[0][1];
    if (!["share", "sharer", "dialog", "photo"].includes(username)) {
      result.facebook_url = `https://facebook.com/${username}`;
    }
  }

  // Extract website (not social media)
  const websites = text.match(WEBSITE_REGEX);
  if (websites?.length) result.website = websites[0];

  return result;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceKey);

  try {
    const body = await req.json();

    // Support two modes:
    // 1. Single message: { message_id, conversation_id, content, workspace_id }
    // 2. Batch: { workspace_id, batch: true } — processes recent unprocessed messages

    if (body.batch && body.workspace_id) {
      return await handleBatch(supabase, body.workspace_id);
    }

    const { message_id, conversation_id, content, workspace_id } = body;

    if (!content || !conversation_id || !workspace_id) {
      return new Response(JSON.stringify({ skipped: true, reason: "missing fields" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const extracted = extractFromText(content);
    if (Object.keys(extracted).length === 0) {
      return new Response(JSON.stringify({ skipped: true, reason: "no data extracted" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get lead_id from conversation
    const { data: conv } = await supabase
      .from("conversations")
      .select("lead_id")
      .eq("id", conversation_id)
      .single();

    if (!conv?.lead_id) {
      return new Response(JSON.stringify({ skipped: true, reason: "no lead found" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get current lead data to check which fields are empty
    const { data: lead } = await supabase
      .from("leads")
      .select("email, phone, instagram_url, linkedin_url, facebook_url, website")
      .eq("id", conv.lead_id)
      .single();

    if (!lead) {
      return new Response(JSON.stringify({ skipped: true, reason: "lead not found" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Only update empty fields
    const updates: Record<string, string> = {};
    if (!lead.email && extracted.email) updates.email = extracted.email;
    if (!lead.phone && extracted.phone) updates.phone = extracted.phone;
    if (!lead.instagram_url && extracted.instagram_url) updates.instagram_url = extracted.instagram_url;
    if (!lead.linkedin_url && extracted.linkedin_url) updates.linkedin_url = extracted.linkedin_url;
    if (!lead.facebook_url && extracted.facebook_url) updates.facebook_url = extracted.facebook_url;
    if (!lead.website && extracted.website) updates.website = extracted.website;

    if (Object.keys(updates).length === 0) {
      return new Response(JSON.stringify({ skipped: true, reason: "all fields already filled" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { error: updateError } = await supabase
      .from("leads")
      .update(updates)
      .eq("id", conv.lead_id);

    if (updateError) {
      console.error("[Extract] Error updating lead:", updateError);
      return new Response(JSON.stringify({ error: updateError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`[Extract] Updated lead ${conv.lead_id} with fields: ${Object.keys(updates).join(", ")}`);

    return new Response(JSON.stringify({ updated: true, lead_id: conv.lead_id, fields: Object.keys(updates) }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[Extract] Error:", err);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

async function handleBatch(supabase: ReturnType<typeof createClient>, workspaceId: string) {
  // Process last 24h of inbound messages
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const { data: messages } = await supabase
    .from("messages")
    .select("id, content, conversation_id")
    .eq("workspace_id", workspaceId)
    .eq("direction", "inbound")
    .gte("sent_at", since)
    .not("content", "is", null)
    .order("sent_at", { ascending: false })
    .limit(500);

  if (!messages?.length) {
    return new Response(JSON.stringify({ processed: 0 }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Group by conversation to avoid redundant lead lookups
  const byConv = new Map<string, string[]>();
  for (const msg of messages) {
    if (!msg.content || !msg.conversation_id) continue;
    const existing = byConv.get(msg.conversation_id) || [];
    existing.push(msg.content);
    byConv.set(msg.conversation_id, existing);
  }

  let updatedCount = 0;

  for (const [convId, contents] of byConv) {
    const combined = contents.join("\n");
    const extracted = extractFromText(combined);
    if (Object.keys(extracted).length === 0) continue;

    const { data: conv } = await supabase
      .from("conversations")
      .select("lead_id")
      .eq("id", convId)
      .single();

    if (!conv?.lead_id) continue;

    const { data: lead } = await supabase
      .from("leads")
      .select("email, phone, instagram_url, linkedin_url, facebook_url, website")
      .eq("id", conv.lead_id)
      .single();

    if (!lead) continue;

    const updates: Record<string, string> = {};
    if (!lead.email && extracted.email) updates.email = extracted.email;
    if (!lead.phone && extracted.phone) updates.phone = extracted.phone;
    if (!lead.instagram_url && extracted.instagram_url) updates.instagram_url = extracted.instagram_url;
    if (!lead.linkedin_url && extracted.linkedin_url) updates.linkedin_url = extracted.linkedin_url;
    if (!lead.facebook_url && extracted.facebook_url) updates.facebook_url = extracted.facebook_url;
    if (!lead.website && extracted.website) updates.website = extracted.website;

    if (Object.keys(updates).length > 0) {
      await supabase.from("leads").update(updates).eq("id", conv.lead_id);
      updatedCount++;
      console.log(`[Extract Batch] Updated lead ${conv.lead_id}: ${Object.keys(updates).join(", ")}`);
    }
  }

  return new Response(JSON.stringify({ processed: messages.length, conversations: byConv.size, leads_updated: updatedCount }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
