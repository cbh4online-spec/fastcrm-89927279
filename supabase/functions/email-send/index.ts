
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Decrypt credential
async function decryptCredential(encrypted: string, key: string): Promise<string> {
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  
  const combined = Uint8Array.from(atob(encrypted), c => c.charCodeAt(0));
  const iv = combined.slice(0, 12);
  const data = combined.slice(12);
  
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    encoder.encode(key.padEnd(32, "0").slice(0, 32)),
    { name: "AES-GCM" },
    false,
    ["decrypt"]
  );
  
  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv },
    keyMaterial,
    data
  );
  
  return decoder.decode(decrypted);
}

// Generate Message-ID
function generateMessageId(domain: string): string {
  const timestamp = Date.now();
  const random = crypto.randomUUID().replace(/-/g, "");
  return `<${timestamp}.${random}@${domain}>`;
}

// Generate MIME boundary
function generateBoundary(): string {
  return `----=_Part_${Date.now()}_${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}`;
}

// Sanitize HTML - remove dangerous scripts while preserving structure
function sanitizeHtml(html: string): string {
  // Remove script tags and their content
  let sanitized = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "");
  // Remove on* event handlers
  sanitized = sanitized.replace(/\s*on\w+\s*=\s*"[^"]*"/gi, "");
  sanitized = sanitized.replace(/\s*on\w+\s*=\s*'[^']*'/gi, "");
  // Remove javascript: URLs
  sanitized = sanitized.replace(/href\s*=\s*"javascript:[^"]*"/gi, 'href="#"');
  sanitized = sanitized.replace(/href\s*=\s*'javascript:[^']*'/gi, "href='#'");
  return sanitized;
}

// Convert plain text to basic HTML
function textToHtml(text: string): string {
  // Escape HTML entities first
  let html = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  
  // Convert URLs to links
  html = html.replace(
    /(https?:\/\/[^\s]+)/g,
    '<a href="$1" style="color: #0066cc;">$1</a>'
  );
  
  // Convert line breaks to <br> and paragraphs
  const paragraphs = html.split(/\n\n+/);
  html = paragraphs.map(p => `<p style="margin: 0 0 1em 0;">${p.replace(/\n/g, "<br>")}</p>`).join("");
  
  return html;
}

// Strip HTML to plain text for the fallback version
function htmlToPlainText(html: string): string {
  // Remove HTML tags but keep content
  let text = html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<\/div>/gi, "\n")
    .replace(/<\/li>/gi, "\n")
    .replace(/<li>/gi, "• ")
    .replace(/<[^>]+>/g, "");
  
  // Decode HTML entities
  text = text
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"');
  
  // Clean up excessive newlines
  text = text.replace(/\n{3,}/g, "\n\n").trim();
  
  return text;
}

// Encode for MIME quoted-printable (handles non-ASCII chars)
function encodeQuotedPrintable(str: string): string {
  const encoder = new TextEncoder();
  const bytes = encoder.encode(str);
  let result = "";
  let lineLength = 0;
  
  for (let i = 0; i < bytes.length; i++) {
    const byte = bytes[i];
    let encoded: string;
    
    // Printable ASCII except = (which needs encoding)
    if ((byte >= 33 && byte <= 60) || (byte >= 62 && byte <= 126)) {
      encoded = String.fromCharCode(byte);
    } else if (byte === 32 || byte === 9) {
      encoded = String.fromCharCode(byte);
    } else if (byte === 13 || byte === 10) {
      result += "\r\n";
      lineLength = 0;
      continue;
    } else {
      encoded = "=" + byte.toString(16).toUpperCase().padStart(2, "0");
    }
    
    // Soft line break if line is too long
    if (lineLength + encoded.length > 76) {
      result += "=\r\n";
      lineLength = 0;
    }
    
    result += encoded;
    lineLength += encoded.length;
  }
  
  return result;
}

// Simple SMTP client using Deno's native TLS
class SimpleSMTPClient {
  private conn: Deno.Conn | null = null;
  private tlsConn: Deno.TlsConn | null = null;
  private encoder = new TextEncoder();
  private decoder = new TextDecoder();

  async connect(host: string, port: number, user: string, password: string): Promise<void> {
    // Connect with plain TCP first for STARTTLS
    const tcpConn = await Deno.connect({ hostname: host, port }) as Deno.TcpConn;
    
    // Store for initial commands
    this.conn = tcpConn;
    
    // Read greeting
    await this.readResponse();
    
    // Send EHLO
    await this.sendCommand(`EHLO ${host}`);
    await this.readResponse();
    
    // STARTTLS
    await this.sendCommand("STARTTLS");
    const starttlsResp = await this.readResponse();
    if (!starttlsResp.startsWith("220")) {
      throw new Error("STARTTLS failed: " + starttlsResp);
    }

    // Upgrade to TLS
    this.tlsConn = await Deno.startTls(tcpConn, { hostname: host });
    this.conn = null; // Original connection is now invalid
    
    // Re-send EHLO after TLS
    await this.sendCommand(`EHLO ${host}`, true);
    await this.readResponse(true);
    
    // AUTH LOGIN
    await this.sendCommand("AUTH LOGIN", true);
    const authResp = await this.readResponse(true);
    if (!authResp.startsWith("334")) {
      throw new Error("AUTH LOGIN not supported: " + authResp);
    }
    
    // Send username (base64)
    await this.sendCommand(btoa(user), true);
    await this.readResponse(true);
    
    // Send password (base64)
    await this.sendCommand(btoa(password), true);
    const loginResp = await this.readResponse(true);
    if (!loginResp.startsWith("235")) {
      throw new Error("Authentication failed: " + loginResp);
    }
  }

  async sendMail(
    from: string,
    to: string,
    subject: string,
    textBody: string,
    htmlBody: string,
    headers: Record<string, string>
  ): Promise<void> {
    // MAIL FROM
    await this.sendCommand(`MAIL FROM:<${from}>`, true);
    const mailResp = await this.readResponse(true);
    if (!mailResp.startsWith("250")) {
      throw new Error("MAIL FROM failed: " + mailResp);
    }
    
    // RCPT TO
    await this.sendCommand(`RCPT TO:<${to}>`, true);
    const rcptResp = await this.readResponse(true);
    if (!rcptResp.startsWith("250")) {
      throw new Error("RCPT TO failed: " + rcptResp);
    }
    
    // DATA
    await this.sendCommand("DATA", true);
    const dataResp = await this.readResponse(true);
    if (!dataResp.startsWith("354")) {
      throw new Error("DATA command failed: " + dataResp);
    }
    
    // Generate boundary for multipart
    const boundary = generateBoundary();
    
    // Build email content with multipart/alternative
    let emailContent = "";
    emailContent += `From: ${headers["From"] || from}\r\n`;
    emailContent += `To: ${to}\r\n`;
    emailContent += `Subject: =?UTF-8?B?${btoa(unescape(encodeURIComponent(subject)))}?=\r\n`;
    emailContent += `Date: ${new Date().toUTCString()}\r\n`;
    emailContent += `MIME-Version: 1.0\r\n`;
    emailContent += `Content-Type: multipart/alternative; boundary="${boundary}"\r\n`;
    
    // Add custom headers
    for (const [key, value] of Object.entries(headers)) {
      if (!["From", "To", "Subject", "Date", "MIME-Version", "Content-Type"].includes(key)) {
        emailContent += `${key}: ${value}\r\n`;
      }
    }
    
    emailContent += `\r\n`;
    
    // Plain text part
    emailContent += `--${boundary}\r\n`;
    emailContent += `Content-Type: text/plain; charset=UTF-8\r\n`;
    emailContent += `Content-Transfer-Encoding: quoted-printable\r\n`;
    emailContent += `\r\n`;
    emailContent += encodeQuotedPrintable(textBody);
    emailContent += `\r\n\r\n`;
    
    // HTML part
    emailContent += `--${boundary}\r\n`;
    emailContent += `Content-Type: text/html; charset=UTF-8\r\n`;
    emailContent += `Content-Transfer-Encoding: quoted-printable\r\n`;
    emailContent += `\r\n`;
    
    // Wrap HTML in basic email template if not already wrapped
    let fullHtml = htmlBody;
    if (!htmlBody.toLowerCase().includes("<!doctype") && !htmlBody.toLowerCase().includes("<html")) {
      fullHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; }
    p { margin: 0 0 1em 0; }
    a { color: #0066cc; }
  </style>
</head>
<body style="margin: 0; padding: 20px;">
${htmlBody}
</body>
</html>`;
    }
    
    emailContent += encodeQuotedPrintable(fullHtml);
    emailContent += `\r\n\r\n`;
    
    // Close boundary
    emailContent += `--${boundary}--\r\n`;
    emailContent += `.\r\n`;
    
    // Send email content
    await this.sendCommand(emailContent, true);
    const sendResp = await this.readResponse(true);
    if (!sendResp.startsWith("250")) {
      throw new Error("Send failed: " + sendResp);
    }
  }

  async quit(): Promise<void> {
    try {
      await this.sendCommand("QUIT", true);
      await this.readResponse(true);
    } catch {
      // Ignore quit errors
    }
    
    if (this.tlsConn) {
      this.tlsConn.close();
    }
    if (this.conn) {
      this.conn.close();
    }
  }

  private async sendCommand(cmd: string, useTls = false): Promise<void> {
    const conn = useTls ? this.tlsConn : this.conn;
    if (!conn) throw new Error("Not connected");
    await conn.write(this.encoder.encode(cmd + "\r\n"));
  }

  private async readResponse(useTls = false): Promise<string> {
    const conn = useTls ? this.tlsConn : this.conn;
    if (!conn) throw new Error("Not connected");
    
    const buf = new Uint8Array(4096);
    const n = await conn.read(buf);
    if (n === null) return "";
    return this.decoder.decode(buf.subarray(0, n));
  }
}

interface SendEmailRequest {
  connectionId: string;
  workspaceId: string;
  conversationId: string;
  to: string;
  subject: string;
  body: string;
  isHtml?: boolean;
  inReplyTo?: string;
  references?: string[];
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

    const reqBody: SendEmailRequest = await req.json();
    const { 
      connectionId, 
      workspaceId, 
      conversationId, 
      to, 
      subject, 
      body: emailBodyRaw, 
      isHtml = false,
      inReplyTo, 
      references 
    } = reqBody;

    // Verify workspace membership
    const { data: member } = await supabaseClient
      .from("workspace_members")
      .select("role")
      .eq("workspace_id", workspaceId)
      .eq("user_id", user.id)
      .single();
    
    if (!member) {
      throw new Error("Permission denied");
    }

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

    // Decrypt password
    let password: string;
    try {
      if (!connection.encrypted_app_password) {
        throw new Error("No password configured");
      }
      password = await decryptCredential(connection.encrypted_app_password, encryptionKey);
    } catch (decryptError) {
      console.error("Decryption error:", decryptError);
      throw new Error("Failed to decrypt credentials");
    }

    // Generate message ID
    const domain = connection.email_address.split("@")[1];
    const messageId = generateMessageId(domain);

    // Build references header for threading
    const allReferences = references ? [...references] : [];
    if (inReplyTo && !allReferences.includes(inReplyTo)) {
      allReferences.push(inReplyTo);
    }

    // Determine display name with fallback
    let fromName = connection.display_name;
    if (!fromName) {
      // Try to get workspace name as fallback
      const { data: workspace } = await supabaseClient
        .from("workspaces")
        .select("name")
        .eq("id", workspaceId)
        .single();
      
      fromName = workspace?.name || connection.email_address.split("@")[0];
    }

    // Build headers
    const emailHeaders: Record<string, string> = {
      "From": `"${fromName.replace(/"/g, '\\"')}" <${connection.email_address}>`,
      "Message-ID": messageId,
    };

    if (inReplyTo) {
      emailHeaders["In-Reply-To"] = inReplyTo;
    }

    if (allReferences.length > 0) {
      emailHeaders["References"] = allReferences.join(" ");
    }

    // Process email body
    let htmlBody: string;
    let textBody: string;

    if (isHtml) {
      // Body is already HTML, sanitize it
      htmlBody = sanitizeHtml(emailBodyRaw);
      textBody = htmlToPlainText(emailBodyRaw);
    } else {
      // Body is plain text, convert to HTML
      textBody = emailBodyRaw;
      htmlBody = textToHtml(emailBodyRaw);
    }

    // Connect and send via SMTP
    console.log(`Connecting to SMTP: ${connection.smtp_host}:${connection.smtp_port}`);

    const smtpClient = new SimpleSMTPClient();
    
    try {
      await smtpClient.connect(
        connection.smtp_host,
        connection.smtp_port,
        connection.email_address,
        password
      );

      await smtpClient.sendMail(
        connection.email_address,
        to,
        subject,
        textBody,
        htmlBody,
        emailHeaders
      );

      await smtpClient.quit();
      console.log("Email sent successfully via SMTP");
    } catch (smtpError: unknown) {
      console.error("SMTP error:", smtpError);
      await smtpClient.quit();
      throw new Error(`SMTP error: ${smtpError instanceof Error ? smtpError.message : "Unknown error"}`);
    }

    // Save the sent message (store HTML version for display)
    const { data: message, error: msgError } = await supabaseClient
      .from("messages")
      .insert({
        conversation_id: conversationId,
        workspace_id: workspaceId,
        direction: "outbound",
        content: isHtml ? htmlBody : emailBodyRaw, // Store the formatted content
        sender_id: user.id,
        sent_at: new Date().toISOString(),
        delivered_at: new Date().toISOString(),
        email_message_id: messageId,
        email_in_reply_to: inReplyTo || null,
        email_references: allReferences.length > 0 ? allReferences : null,
        email_subject: subject,
      })
      .select()
      .single();

    if (msgError) {
      console.error("Message save error:", msgError);
      throw new Error("Email sent but failed to save message");
    }

    // Update conversation
    await supabaseClient
      .from("conversations")
      .update({ 
        last_message_at: new Date().toISOString(),
        unread_count: 0,
        last_message_preview: textBody.substring(0, 100),
      })
      .eq("id", conversationId);

    // Log activity with full details
    await supabaseClient
      .from("crm_activities")
      .insert({
        workspace_id: workspaceId,
        entity_type: "conversation",
        entity_id: conversationId,
        conversation_id: conversationId,
        activity_type: "email_sent",
        title: `Email enviado: ${subject}`,
        description: `Email enviado para ${to}`,
        metadata: {
          message_id: messageId,
          to,
          subject,
          connection_id: connectionId,
          from_name: fromName,
          from_email: connection.email_address,
          is_html: isHtml,
          html_body: htmlBody.substring(0, 5000), // Store for debugging/audit
        },
        performed_by: user.id,
      });

    return new Response(
      JSON.stringify({ 
        success: true, 
        messageId: message.id,
        emailMessageId: messageId,
        fromName,
        fromEmail: connection.email_address,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Email send error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
