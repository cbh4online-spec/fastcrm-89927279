import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Decrypt credential
async function decryptCredential(encrypted: string, key: string): Promise<string> {
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  
  // Decode base64
  const combined = Uint8Array.from(atob(encrypted), c => c.charCodeAt(0));
  
  // Extract IV and data
  const iv = combined.slice(0, 12);
  const data = combined.slice(12);
  
  // Create key
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    encoder.encode(key.padEnd(32, "0").slice(0, 32)),
    { name: "AES-GCM" },
    false,
    ["decrypt"]
  );
  
  // Decrypt
  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv },
    keyMaterial,
    data
  );
  
  return decoder.decode(decrypted);
}

// Parse email address from header
function parseEmailAddress(header: string): { name: string; email: string } {
  const match = header.match(/^(?:"?([^"]*)"?\s*)?<?([^>]+@[^>]+)>?$/);
  if (match) {
    return { name: match[1]?.trim() || match[2], email: match[2].toLowerCase() };
  }
  return { name: header, email: header.toLowerCase() };
}

// Generate Message-ID for threading
function generateMessageId(domain: string): string {
  const timestamp = Date.now();
  const random = crypto.randomUUID().replace(/-/g, "");
  return `<${timestamp}.${random}@${domain}>`;
}

interface FetchEmailsRequest {
  connectionId: string;
  workspaceId: string;
  limit?: number;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const encryptionKey = Deno.env.get("EMAIL_ENCRYPTION_KEY") || supabaseServiceKey.slice(0, 32);
    
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("Missing authorization header");
    }

    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey);
    
    // Verify user
    const { data: { user }, error: authError } = await createClient(
      supabaseUrl,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    ).auth.getUser();
    
    if (authError || !user) {
      throw new Error("Unauthorized");
    }

    const body: FetchEmailsRequest = await req.json();
    const { connectionId, workspaceId, limit = 50 } = body;

    // Get email connection
    const { data: connection, error: connError } = await supabaseClient
      .from("email_connections")
      .select("*")
      .eq("id", connectionId)
      .eq("workspace_id", workspaceId)
      .eq("is_active", true)
      .single();

    if (connError || !connection) {
      throw new Error("Email connection not found");
    }

    // Update sync status
    await supabaseClient
      .from("email_connections")
      .update({ sync_status: "syncing" })
      .eq("id", connectionId);

    // Note: In production, you would use an IMAP library here
    // For now, we'll simulate the fetch and create mock data
    // Real implementation would use: https://deno.land/x/imap
    
    // This is a placeholder - in production, implement actual IMAP connection
    console.log(`Would fetch from IMAP: ${connection.imap_host}:${connection.imap_port}`);
    
    // For demonstration, we'll update the sync status
    await supabaseClient
      .from("email_connections")
      .update({ 
        sync_status: "synced",
        last_sync_at: new Date().toISOString(),
        sync_error: null,
      })
      .eq("id", connectionId);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Email sync initiated",
        note: "IMAP fetch requires external service integration"
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Email fetch error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
