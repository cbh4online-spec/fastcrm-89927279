import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
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

// Provider configurations
const PROVIDER_CONFIGS: Record<string, { imap: { host: string; port: number }; smtp: { host: string; port: number } }> = {
  gmail: {
    imap: { host: "imap.gmail.com", port: 993 },
    smtp: { host: "smtp.gmail.com", port: 587 },
  },
  outlook: {
    imap: { host: "outlook.office365.com", port: 993 },
    smtp: { host: "smtp.office365.com", port: 587 },
  },
  hostinger: {
    imap: { host: "imap.hostinger.com", port: 993 },
    smtp: { host: "smtp.hostinger.com", port: 587 },
  },
};

interface ConnectEmailRequest {
  workspaceId: string;
  emailAddress: string;
  displayName?: string;
  provider: "gmail" | "outlook" | "hostinger" | "custom";
  authType: "oauth" | "app_password";
  appPassword?: string;
  oauthCode?: string;
  customConfig?: {
    imapHost: string;
    imapPort: number;
    smtpHost: string;
    smtpPort: number;
  };
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

    const body: ConnectEmailRequest = await req.json();
    const { workspaceId, emailAddress, displayName, provider, authType, appPassword, customConfig } = body;

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

    // Get provider config
    let imapHost: string, imapPort: number, smtpHost: string, smtpPort: number;
    
    if (provider === "custom" && customConfig) {
      imapHost = customConfig.imapHost;
      imapPort = customConfig.imapPort;
      smtpHost = customConfig.smtpHost;
      smtpPort = customConfig.smtpPort;
    } else if (PROVIDER_CONFIGS[provider]) {
      const config = PROVIDER_CONFIGS[provider];
      imapHost = config.imap.host;
      imapPort = config.imap.port;
      smtpHost = config.smtp.host;
      smtpPort = config.smtp.port;
    } else {
      throw new Error("Invalid provider");
    }

    // Encrypt credentials
    let encryptedPassword: string | null = null;
    if (authType === "app_password" && appPassword) {
      encryptedPassword = await encryptCredential(appPassword, encryptionKey);
    }

    // Insert or update email connection
    const { data: connection, error: insertError } = await supabaseClient
      .from("email_connections")
      .upsert({
        workspace_id: workspaceId,
        connected_by: user.id,
        email_address: emailAddress,
        display_name: displayName || emailAddress.split("@")[0],
        provider,
        auth_type: authType,
        encrypted_app_password: encryptedPassword,
        imap_host: imapHost,
        imap_port: imapPort,
        imap_use_ssl: true,
        smtp_host: smtpHost,
        smtp_port: smtpPort,
        smtp_use_tls: true,
        is_active: true,
        sync_status: "pending",
      }, {
        onConflict: "workspace_id,email_address",
      })
      .select()
      .single();

    if (insertError) {
      console.error("Insert error:", insertError);
      throw new Error("Failed to save email connection");
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        connection: {
          id: connection.id,
          email_address: connection.email_address,
          provider: connection.provider,
          is_active: connection.is_active,
        }
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Email connect error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
