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

// Parse email address from header
function parseEmailAddress(header: string): { name: string; email: string } {
  if (!header) return { name: "", email: "" };
  const match = header.match(/^(?:"?([^"]*)"?\s*)?<?([^>]+@[^>]+)>?$/);
  if (match) {
    return { name: match[1]?.trim() || match[2], email: match[2].toLowerCase() };
  }
  return { name: header, email: header.toLowerCase() };
}

// Parse IMAP envelope address format: ((name NIL local domain)) or (("Name" NIL "local" "domain"))
function parseEnvelopeAddress(addressBlock: string): { email: string; name: string } | null {
  if (!addressBlock || addressBlock === "NIL") return null;
  
  // Match pattern: (("name" NIL "local" "domain")) or ((NIL NIL "local" "domain"))
  // The structure is: ((personal-name NIL mailbox-name host-name))
  const match = addressBlock.match(/\(\((?:"([^"]*)"|NIL)\s+NIL\s+(?:"([^"]+)"|NIL)\s+(?:"([^"]+)"|NIL)\)\)/);
  
  if (match) {
    const name = match[1] || "";
    const local = match[2] || "";
    const domain = match[3] || "";
    
    if (local && domain) {
      const email = `${local}@${domain}`.toLowerCase();
      return { 
        email, 
        name: name ? decodeMimeWord(name) : email 
      };
    }
  }
  
  // Try simpler format without nested parens
  const simpleMatch = addressBlock.match(/\("([^"]*)"\s+NIL\s+"([^"]+)"\s+"([^"]+)"\)/);
  if (simpleMatch) {
    const name = simpleMatch[1] || "";
    const local = simpleMatch[2] || "";
    const domain = simpleMatch[3] || "";
    
    if (local && domain) {
      const email = `${local}@${domain}`.toLowerCase();
      return { 
        email, 
        name: name ? decodeMimeWord(name) : email 
      };
    }
  }
  
  return null;
}

// Decode MIME encoded words
function decodeMimeWord(str: string): string {
  if (!str) return "";
  return str.replace(/=\?([^?]+)\?([BQ])\?([^?]*)\?=/gi, (_, charset, encoding, text) => {
    try {
      if (encoding.toUpperCase() === "B") {
        return atob(text);
      } else if (encoding.toUpperCase() === "Q") {
        return text.replace(/_/g, " ").replace(/=([0-9A-F]{2})/gi, (match: string, hex: string) =>
          String.fromCharCode(parseInt(hex, 16))
        );
      }
    } catch {
      return text;
    }
    return text;
  });
}

// Safe date parsing - handles invalid dates gracefully
function parseDateSafe(dateStr: string | undefined | null): string {
  if (!dateStr || dateStr.trim() === "") {
    return new Date().toISOString();
  }
  
  try {
    // Try parsing directly
    const parsed = new Date(dateStr);
    
    // Check if it's a valid date
    if (isNaN(parsed.getTime())) {
      console.warn(`Invalid date format: "${dateStr}", using current date`);
      return new Date().toISOString();
    }
    
    // Check for reasonable date range (1990 to 10 years from now)
    const year = parsed.getFullYear();
    if (year < 1990 || year > new Date().getFullYear() + 10) {
      console.warn(`Date out of range: "${dateStr}", using current date`);
      return new Date().toISOString();
    }
    
    return parsed.toISOString();
  } catch (e) {
    console.warn(`Failed to parse date: "${dateStr}", using current date`);
    return new Date().toISOString();
  }
}

// Parse IMAP INTERNALDATE format: "15-Jan-2026 10:30:00 +0000"
function parseInternalDate(dateStr: string | undefined | null): string {
  if (!dateStr) return new Date().toISOString();
  
  try {
    // Remove quotes if present
    const cleaned = dateStr.replace(/^"|"$/g, "").trim();
    const parsed = new Date(cleaned);
    
    if (isNaN(parsed.getTime())) {
      return new Date().toISOString();
    }
    
    return parsed.toISOString();
  } catch {
    return new Date().toISOString();
  }
}

// IMAP command builder and parser
class SimpleIMAPClient {
  private conn: Deno.TlsConn | null = null;
  private encoder = new TextEncoder();
  private decoder = new TextDecoder();
  private tagCounter = 0;
  private buffer = "";

  async connect(host: string, port: number, user: string, password: string): Promise<void> {
    this.conn = await Deno.connectTls({ hostname: host, port });
    
    // Read greeting
    await this.readResponse("*");
    
    // Login
    const loginTag = this.getTag();
    await this.sendCommand(`${loginTag} LOGIN "${user}" "${password}"`);
    const loginResp = await this.readResponse(loginTag);
    if (!loginResp.includes("OK")) {
      throw new Error("Login failed: " + loginResp);
    }
  }

  async selectMailbox(name: string): Promise<{ exists: number }> {
    const tag = this.getTag();
    await this.sendCommand(`${tag} SELECT "${name}"`);
    const resp = await this.readResponse(tag);
    const existsMatch = resp.match(/\* (\d+) EXISTS/);
    return { exists: existsMatch ? parseInt(existsMatch[1]) : 0 };
  }

  async fetchMessages(range: string): Promise<Array<{
    uid: number;
    subject: string;
    from: string;
    to: string;
    date: string;
    messageId: string;
    inReplyTo: string | null;
    body: string;
  }>> {
    const messages: Array<{
      uid: number;
      subject: string;
      from: string;
      to: string;
      date: string;
      messageId: string;
      inReplyTo: string | null;
      body: string;
    }> = [];

    const tag = this.getTag();
    // Include INTERNALDATE for reliable date fallback
    await this.sendCommand(`${tag} FETCH ${range} (UID FLAGS INTERNALDATE ENVELOPE BODY.PEEK[TEXT])`);
    const resp = await this.readResponse(tag);

    // Parse responses - simplified parsing
    const fetchBlocks = resp.split(/\* \d+ FETCH/);
    
    for (const block of fetchBlocks) {
      if (!block.trim()) continue;
      
      const uidMatch = block.match(/UID (\d+)/);
      const uid = uidMatch ? parseInt(uidMatch[1]) : 0;
      if (!uid) continue;

      // Extract INTERNALDATE first (always reliable)
      const internalDateMatch = block.match(/INTERNALDATE "([^"]+)"/);
      const internalDate = internalDateMatch ? internalDateMatch[1] : null;

      // Extract envelope data - IMAP ENVELOPE format:
      // (date subject ((from)) ((sender)) ((reply-to)) ((to)) ((cc)) ((bcc)) in-reply-to message-id)
      const envelopeMatch = block.match(/ENVELOPE \((.+)\)/s);
      let subject = "";
      let from = "";
      let to = "";
      let date = "";
      let messageId = "";
      let inReplyTo: string | null = null;

      if (envelopeMatch) {
        const envelope = envelopeMatch[1];
        
        // Log envelope for debugging
        console.log("Parsing envelope:", envelope.substring(0, 200));
        
        // Extract date - first quoted string
        const dateMatch = envelope.match(/^"([^"]*)"/);
        if (dateMatch && dateMatch[1]) {
          date = dateMatch[1];
        }
        
        // Extract subject - second field (after date)
        const afterDate = envelope.replace(/^"[^"]*"\s*/, "");
        const subjectMatch = afterDate.match(/^(?:NIL|"([^"]*)")/);
        if (subjectMatch && subjectMatch[1]) {
          subject = decodeMimeWord(subjectMatch[1]);
        }
        
        // Extract FROM address - find first address block after subject
        // Pattern: ((name NIL local domain)) or (("name" NIL "local" "domain"))
        const fromMatch = envelope.match(/\(\((?:"[^"]*"|NIL)\s+NIL\s+(?:"[^"]+"|NIL)\s+(?:"[^"]+"|NIL)\)\)/);
        if (fromMatch) {
          const parsed = parseEnvelopeAddress(fromMatch[0]);
          if (parsed) {
            from = parsed.email;
            console.log("Parsed FROM:", from, "name:", parsed.name);
          }
        }
        
        // Extract TO address - find address blocks, TO comes after from/sender/reply-to
        // We'll look for all address blocks and use heuristics
        const addressBlocks = envelope.match(/\(\([^)]+\)\)/g);
        if (addressBlocks && addressBlocks.length > 0) {
          // First address block is FROM
          const fromParsed = parseEnvelopeAddress(addressBlocks[0]);
          if (fromParsed && !from) {
            from = fromParsed.email;
          }
          // Fourth address block (index 3) would be TO if sender and reply-to exist
          // But often they're NIL, so TO might be at index 1, 2, or 3
          for (let i = 1; i < Math.min(addressBlocks.length, 4); i++) {
            const toParsed = parseEnvelopeAddress(addressBlocks[i]);
            if (toParsed) {
              to = toParsed.email;
              break;
            }
          }
        }
        
        // Extract message-id - last quoted string that looks like a message ID
        const msgIdMatches = envelope.match(/<[^>]+@[^>]+>/g);
        if (msgIdMatches && msgIdMatches.length > 0) {
          messageId = msgIdMatches[msgIdMatches.length - 1];
          if (msgIdMatches.length > 1) {
            inReplyTo = msgIdMatches[0];
          }
        }
        
        // Alternative: extract message-id from the end
        const lastMsgIdMatch = envelope.match(/"(<[^>]+>)"[^"]*$/);
        if (lastMsgIdMatch) {
          messageId = lastMsgIdMatch[1];
        }
        
        // Extract in-reply-to
        const inReplyMatch = envelope.match(/"(<[^>]+>)"\s+"<[^>]+>"/);
        if (inReplyMatch) {
          inReplyTo = inReplyMatch[1];
        }
      }

      // Use INTERNALDATE as fallback if envelope date is missing/invalid
      const finalDate = date || internalDate || "";

      // Extract body
      const bodyMatch = block.match(/BODY\[TEXT\] \{(\d+)\}\r?\n([\s\S]*?)(?=\r?\n\)|\r?\n\* |\r?\nA\d+)/);
      const body = bodyMatch ? bodyMatch[2]?.substring(0, 5000) || "" : "";

      messages.push({
        uid,
        subject,
        from,
        to,
        date: finalDate,
        messageId,
        inReplyTo,
        body,
      });
    }

    return messages;
  }

  async logout(): Promise<void> {
    if (!this.conn) return;
    try {
      const tag = this.getTag();
      await this.sendCommand(`${tag} LOGOUT`);
      this.conn.close();
    } catch {
      // Ignore logout errors
    }
  }

  private getTag(): string {
    return `A${++this.tagCounter}`;
  }

  private async sendCommand(cmd: string): Promise<void> {
    if (!this.conn) throw new Error("Not connected");
    await this.conn.write(this.encoder.encode(cmd + "\r\n"));
  }

  private async readResponse(expectedTag: string): Promise<string> {
    if (!this.conn) throw new Error("Not connected");
    
    const buf = new Uint8Array(8192);
    let response = this.buffer;
    const timeout = 30000;
    const start = Date.now();

    while (Date.now() - start < timeout) {
      // Check if we have a complete response
      if (expectedTag === "*") {
        if (response.includes("\r\n")) {
          this.buffer = "";
          return response;
        }
      } else {
        const tagLine = response.split("\r\n").find(line => 
          line.startsWith(expectedTag + " ")
        );
        if (tagLine) {
          this.buffer = "";
          return response;
        }
      }

      const n = await this.conn.read(buf);
      if (n === null) break;
      response += this.decoder.decode(buf.subarray(0, n));
    }

    this.buffer = "";
    return response;
  }
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

    // Decrypt password
    let password: string;
    try {
      if (!connection.encrypted_app_password) {
        throw new Error("No password configured");
      }
      password = await decryptCredential(connection.encrypted_app_password, encryptionKey);
    } catch (decryptError) {
      console.error("Decryption error:", decryptError);
      await supabaseClient
        .from("email_connections")
        .update({ 
          sync_status: "error",
          sync_error: "Failed to decrypt credentials"
        })
        .eq("id", connectionId);
      throw new Error("Failed to decrypt credentials");
    }

    const client = new SimpleIMAPClient();
    let fetchedCount = 0;

    try {
      // Connect to IMAP server
      console.log(`Connecting to IMAP: ${connection.imap_host}:${connection.imap_port}`);
      
      await client.connect(
        connection.imap_host,
        connection.imap_port,
        connection.email_address,
        password
      );
      console.log("IMAP connected successfully");

      // Select INBOX
      const mailbox = await client.selectMailbox("INBOX");
      console.log(`Mailbox selected: ${mailbox.exists} messages`);

      if (mailbox.exists === 0) {
        await supabaseClient
          .from("email_connections")
          .update({ 
            sync_status: "synced",
            last_sync_at: new Date().toISOString(),
            sync_error: null,
          })
          .eq("id", connectionId);

        await client.logout();
        
        return new Response(
          JSON.stringify({ success: true, message: "No new emails", fetchedCount: 0 }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Determine range to fetch
      const lastUid = connection.last_sync_uid ? parseInt(connection.last_sync_uid) : 0;
      const startMsg = Math.max(1, mailbox.exists - limit + 1);
      const range = `${startMsg}:${mailbox.exists}`;
      
      // Fetch messages
      const messages = await client.fetchMessages(range);
      let maxUid = lastUid;

      for (const msg of messages) {
        if (msg.uid <= lastUid) continue;
        if (msg.uid > maxUid) maxUid = msg.uid;

        const senderEmail = msg.from || "unknown@email.com";
        const senderName = parseEmailAddress(msg.from).name || senderEmail;
        const isInbound = senderEmail.toLowerCase() !== connection.email_address.toLowerCase();

        // Find or create lead by email
        let leadId: string | null = null;
        if (isInbound && senderEmail) {
          const { data: existingLead } = await supabaseClient
            .from("leads")
            .select("id")
            .eq("workspace_id", workspaceId)
            .eq("external_email", senderEmail.toLowerCase())
            .maybeSingle();

          if (existingLead) {
            leadId = existingLead.id;
          } else {
            const { data: newLead } = await supabaseClient
              .from("leads")
              .insert({
                workspace_id: workspaceId,
                created_by: user.id,
                name: senderName,
                email: senderEmail.toLowerCase(),
                external_email: senderEmail.toLowerCase(),
                source: "email",
                status: "new",
              })
              .select("id")
              .single();
            
            if (newLead) leadId = newLead.id;
          }
        }

        // Find existing conversation or create new
        const cleanSubject = (msg.subject || "").replace(/^(Re:|Fwd:|Fw:)\s*/gi, "").trim() || `email-${Date.now()}`;
        
        let conversationId: string;
        const { data: existingConv } = await supabaseClient
          .from("conversations")
          .select("id")
          .eq("workspace_id", workspaceId)
          .eq("channel", "email")
          .eq("external_thread_id", cleanSubject)
          .maybeSingle();

        if (existingConv) {
          conversationId = existingConv.id;
          await supabaseClient
            .from("conversations")
            .update({
              last_message_at: new Date().toISOString(),
              lead_id: leadId || undefined,
              unread_count: isInbound ? 1 : 0,
            })
            .eq("id", conversationId);
        } else {
          const { data: newConv } = await supabaseClient
            .from("conversations")
            .insert({
              workspace_id: workspaceId,
              channel: "email",
              external_thread_id: cleanSubject,
              lead_id: leadId,
              status: "open",
              unread_count: isInbound ? 1 : 0,
              last_message_at: new Date().toISOString(),
              channel_metadata: {
                connection_id: connectionId,
                subject: msg.subject,
              },
            })
            .select("id")
            .single();
          
          if (!newConv) continue;
          conversationId = newConv.id;
        }

        // Insert message
        const { error: msgError } = await supabaseClient
          .from("messages")
          .insert({
            conversation_id: conversationId,
            workspace_id: workspaceId,
            direction: isInbound ? "inbound" : "outbound",
            content: msg.body || msg.subject || "(Sem conteúdo)",
            sent_at: parseDateSafe(msg.date),
            email_message_id: msg.messageId || `<${msg.uid}@${connection.imap_host}>`,
            email_in_reply_to: msg.inReplyTo || null,
            email_subject: msg.subject,
            sender_id: isInbound ? null : user.id,
          });

        if (!msgError) fetchedCount++;
      }

      // Update sync status
      await supabaseClient
        .from("email_connections")
        .update({ 
          sync_status: "synced",
          last_sync_at: new Date().toISOString(),
          last_sync_uid: maxUid.toString(),
          sync_error: null,
        })
        .eq("id", connectionId);

      await client.logout();

    } catch (imapError: unknown) {
      console.error("IMAP error:", imapError);
      const errorMessage = imapError instanceof Error ? imapError.message : "IMAP connection failed";
      
      await supabaseClient
        .from("email_connections")
        .update({ 
          sync_status: "error",
          sync_error: errorMessage,
        })
        .eq("id", connectionId);

      try { await client.logout(); } catch { /* ignore */ }

      throw new Error(`IMAP error: ${errorMessage}`);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Synced ${fetchedCount} new emails`,
        fetchedCount,
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
