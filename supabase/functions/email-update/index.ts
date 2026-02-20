import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Simple encryption using Web Crypto API
async function encryptCredential(plaintext: string, key: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(plaintext);
  
  // Create a key from the secret
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    encoder.encode(key.padEnd(32, "0").slice(0, 32)),
    { name: "AES-GCM" },
    false,
    ["encrypt"]
  );
  
  // Generate IV
  const iv = crypto.getRandomValues(new Uint8Array(12));
  
  // Encrypt
  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    keyMaterial,
    data
  );
  
  // Combine IV and encrypted data
  const combined = new Uint8Array(iv.length + encrypted.byteLength);
  combined.set(iv);
  combined.set(new Uint8Array(encrypted), iv.length);
  
  // Return as base64
  return btoa(String.fromCharCode(...combined));
}

interface UpdateEmailRequest {
  connectionId: string;
  workspaceId: string;
  displayName?: string;
  newPassword?: string;
  isActive?: boolean;
  serverConfig?: {
    imapHost: string;
    imapPort: number;
    smtpHost: string;
    smtpPort: number;
  };
}

Deno.serve(async (req) => {
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

    const body: UpdateEmailRequest = await req.json();
    const { connectionId, workspaceId, displayName, newPassword, isActive, serverConfig } = body;

    // Verify user is admin/owner of workspace
    const { data: member } = await supabaseClient
      .from("workspace_members")
      .select("role")
      .eq("workspace_id", workspaceId)
      .eq("user_id", user.id)
      .single();
    
    if (!member || !["owner", "admin"].includes(member.role)) {
      throw new Error("Permission denied");
    }

    // Get existing connection
    const { data: connection, error: connError } = await supabaseClient
      .from("email_connections")
      .select("*")
      .eq("id", connectionId)
      .eq("workspace_id", workspaceId)
      .single();

    if (connError || !connection) {
      throw new Error("Email connection not found");
    }

    // Build update object
    const updates: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (displayName !== undefined) {
      updates.display_name = displayName;
    }

    if (isActive !== undefined) {
      updates.is_active = isActive;
      // Reset sync status when activating
      if (isActive && !connection.is_active) {
        updates.sync_status = "pending";
        updates.sync_error = null;
      }
    }

    if (newPassword) {
      // Encrypt the new password
      updates.encrypted_app_password = await encryptCredential(newPassword, encryptionKey);
      // Reset sync status to test new credentials
      updates.sync_status = "pending";
      updates.sync_error = null;
    }

    if (serverConfig && connection.provider === "custom") {
      updates.imap_host = serverConfig.imapHost;
      updates.imap_port = serverConfig.imapPort;
      updates.smtp_host = serverConfig.smtpHost;
      updates.smtp_port = serverConfig.smtpPort;
      // Reset sync status when changing server config
      updates.sync_status = "pending";
      updates.sync_error = null;
    }

    // Update the connection
    const { data: updatedConnection, error: updateError } = await supabaseClient
      .from("email_connections")
      .update(updates)
      .eq("id", connectionId)
      .select()
      .single();

    if (updateError) {
      console.error("Update error:", updateError);
      throw new Error("Failed to update email connection");
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        connection: {
          id: updatedConnection.id,
          email_address: updatedConnection.email_address,
          display_name: updatedConnection.display_name,
          provider: updatedConnection.provider,
          is_active: updatedConnection.is_active,
          sync_status: updatedConnection.sync_status,
        }
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Email update error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
