import { createClient } from "@supabase/supabase-js";

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
    "raw", encoder.encode(key.padEnd(32, "0").slice(0, 32)),
    { name: "AES-GCM" }, false, ["decrypt"]
  );
  const decrypted = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, keyMaterial, data);
  return decoder.decode(decrypted);
}

// Decode MIME encoded words (minimal)
function decodeMimeWord(str: string): string {
  if (!str) return "";
  return str.replace(/=\?([^?]+)\?([BQ])\?([^?]*)\?=/gi, (_, _cs, encoding, text) => {
    try {
      if (encoding.toUpperCase() === "B") return atob(text);
      if (encoding.toUpperCase() === "Q") return text.replace(/_/g, " ").replace(/=([0-9A-F]{2})/gi, (_m: string, hex: string) => String.fromCharCode(parseInt(hex, 16)));
    } catch { /* ignore */ }
    return text;
  });
}

function parseDateSafe(dateStr: string | null | undefined): string {
  if (!dateStr) return new Date().toISOString();
  try {
    const cleaned = dateStr.replace(/^"|"$/g, "").trim();
    const parsed = new Date(cleaned);
    if (isNaN(parsed.getTime())) return new Date().toISOString();
    const year = parsed.getFullYear();
    if (year < 1990 || year > new Date().getFullYear() + 10) return new Date().toISOString();
    return parsed.toISOString();
  } catch { return new Date().toISOString(); }
}

// Minimal IMAP — just get UIDs, subjects, from, date via ENVELOPE
// Disconnects ASAP to free CPU for DB work
interface RawMsg {
  uid: number;
  subject: string;
  fromEmail: string;
  fromName: string;
  date: string;
  messageId: string;
  inReplyTo: string | null;
}

async function fetchImapMessages(
  host: string, port: number, user: string, pass: string, limit: number
): Promise<RawMsg[]> {
  const enc = new TextEncoder();
  const dec = new TextDecoder();
  let tagN = 0;
  const tag = () => `A${++tagN}`;

  const conn = await Deno.connectTls({ hostname: host, port });

  async function send(cmd: string) {
    await conn.write(enc.encode(cmd + "\r\n"));
  }

  async function readUntilTag(t: string): Promise<string> {
    const buf = new Uint8Array(8192);
    let resp = "";
    const deadline = Date.now() + 8000;
    while (Date.now() < deadline) {
      if (t === "*" && resp.includes("\r\n")) return resp;
      if (t !== "*" && resp.split("\r\n").some(l => l.startsWith(t + " "))) return resp;
      const n = await conn.read(buf);
      if (n === null) break;
      resp += dec.decode(buf.subarray(0, n));
    }
    return resp;
  }

  // Greeting
  await readUntilTag("*");

  // Login
  const lt = tag();
  await send(`${lt} LOGIN "${user}" "${pass}"`);
  const lr = await readUntilTag(lt);
  if (!lr.includes("OK")) { conn.close(); throw new Error("Login failed"); }

  // Select INBOX
  const st = tag();
  await send(`${st} SELECT INBOX`);
  const sr = await readUntilTag(st);
  const existsMatch = sr.match(/\* (\d+) EXISTS/);
  const exists = existsMatch ? parseInt(existsMatch[1]) : 0;

  if (exists === 0) { 
    const lot = tag(); await send(`${lot} LOGOUT`); conn.close();
    return []; 
  }

  // Fetch last N messages — ENVELOPE only
  const start = Math.max(1, exists - limit + 1);
  const ft = tag();
  await send(`${ft} FETCH ${start}:${exists} (UID INTERNALDATE ENVELOPE)`);
  const fr = await readUntilTag(ft);

  // Logout immediately — free TLS resources before parsing
  try { const lot = tag(); await send(`${lot} LOGOUT`); conn.close(); } catch { /* ok */ }

  // Parse offline — no more TLS CPU usage
  const messages: RawMsg[] = [];
  const blocks = fr.split(/\* \d+ FETCH/);

  for (const block of blocks) {
    if (!block.trim()) continue;
    const uidM = block.match(/UID (\d+)/);
    if (!uidM) continue;
    const uid = parseInt(uidM[1]);

    const idM = block.match(/INTERNALDATE "([^"]+)"/);
    const date = idM ? idM[1] : "";

    // Extract envelope
    const envM = block.match(/ENVELOPE \((.+)\)/s);
    let subject = "", fromEmail = "", fromName = "", messageId = "", inReplyTo: string | null = null;

    if (envM) {
      const env = envM[1];
      // Subject is second quoted field
      const parts = env.match(/"([^"]*)"/g);
      if (parts && parts.length >= 2) {
        subject = decodeMimeWord(parts[1].replace(/^"|"$/g, ""));
      }
      // From: find pattern ("name" NIL "local" "domain")
      const fromM = env.match(/\(\((?:"([^"]*)"|NIL)\s+NIL\s+"([^"]+)"\s+"([^"]+)"\)\)/);
      if (fromM) {
        fromEmail = `${fromM[2]}@${fromM[3]}`.toLowerCase();
        fromName = fromM[1] ? decodeMimeWord(fromM[1]) : fromEmail;
      }
      // Message-ID: last angle-bracket ID
      const msgIds = env.match(/<[^>]+@[^>]+>/g);
      if (msgIds) {
        messageId = msgIds[msgIds.length - 1];
        if (msgIds.length > 1) inReplyTo = msgIds[0];
      }
    }

    messages.push({ uid, subject, fromEmail, fromName: fromName || fromEmail, date, messageId, inReplyTo });
  }

  return messages;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const encryptionKey = Deno.env.get("EMAIL_ENCRYPTION_KEY") || supabaseServiceKey.slice(0, 32);

    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey);

    const body = await req.json();
    const { connectionId, workspaceId, limit = 3, forceResync = false, source } = body;

    // Cron mode: validate shared secret instead of JWT
    const cronSecretHeader = req.headers.get("x-cron-secret");
    let actingUserId: string | null = null;
    let isCron = false;

    if (source === "cron" && cronSecretHeader) {
      const { data: cfg } = await supabaseClient
        .from("_cron_config").select("value").eq("key", "email_fetch_cron_secret").maybeSingle();
      if (!cfg?.value || cfg.value !== cronSecretHeader) {
        throw new Error("Invalid cron secret");
      }
      isCron = true;
    } else {
      const authHeader = req.headers.get("Authorization");
      if (!authHeader) throw new Error("Missing authorization header");
      const { data: { user }, error: authError } = await createClient(
        supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!,
        { global: { headers: { Authorization: authHeader } } }
      ).auth.getUser();
      if (authError || !user) throw new Error("Unauthorized");
      actingUserId = user.id;
    }

    // Get connection
    const { data: connection, error: connError } = await supabaseClient
      .from("email_connections").select("*")
      .eq("id", connectionId).eq("workspace_id", workspaceId).eq("is_active", true).single();
    if (connError || !connection) throw new Error("Email connection not found");

    if (isCron) actingUserId = connection.connected_by;

    // Reentrancy guard: skip if another sync is already running and started recently
    if (connection.sync_status === "syncing" && connection.last_sync_at) {
      const startedAgoMs = Date.now() - new Date(connection.last_sync_at).getTime();
      if (startedAgoMs < 2 * 60 * 1000) {
        return new Response(JSON.stringify({ skipped: "in_progress" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
    }

    await supabaseClient.from("email_connections").update({ sync_status: "syncing" }).eq("id", connectionId);

    // Decrypt
    if (!connection.encrypted_app_password) throw new Error("No password configured");
    let password: string;
    try {
      password = await decryptCredential(connection.encrypted_app_password, encryptionKey);
    } catch {
      await supabaseClient.from("email_connections")
        .update({ sync_status: "error", sync_error: "Failed to decrypt credentials" }).eq("id", connectionId);
      throw new Error("Failed to decrypt credentials");
    }

    // === PHASE 1: IMAP fetch (CPU-intensive) — then disconnect ===
    console.log(`Connecting to IMAP: ${connection.imap_host}:${connection.imap_port}, limit=${limit}`);
    let rawMessages: RawMsg[];
    try {
      rawMessages = await fetchImapMessages(
        connection.imap_host, connection.imap_port,
        connection.email_address, password, limit
      );
    } catch (imapErr: unknown) {
      const msg = imapErr instanceof Error ? imapErr.message : "IMAP connection failed";
      await supabaseClient.from("email_connections")
        .update({ sync_status: "error", sync_error: msg }).eq("id", connectionId);
      throw new Error(`IMAP error: ${msg}`);
    }

    console.log(`IMAP done, got ${rawMessages.length} raw messages`);

    if (rawMessages.length === 0) {
      await supabaseClient.from("email_connections")
        .update({ sync_status: "synced", last_sync_at: new Date().toISOString(), sync_error: null })
        .eq("id", connectionId);
      return new Response(JSON.stringify({ success: true, message: "No new emails", fetchedCount: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // === PHASE 2: DB work (no more TLS overhead) ===
    const lastUid = forceResync ? 0 : (connection.last_sync_uid ? parseInt(connection.last_sync_uid) : 0);
    const newMessages = rawMessages.filter(m => m.uid > lastUid);

    if (newMessages.length === 0) {
      await supabaseClient.from("email_connections")
        .update({ sync_status: "synced", last_sync_at: new Date().toISOString(), sync_error: null })
        .eq("id", connectionId);
      return new Response(JSON.stringify({ success: true, message: "No new emails", fetchedCount: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Collect unique keys
    const senderEmails = new Set<string>();
    const emailMsgIds: string[] = [];
    const threadKeys = new Set<string>();

    for (const msg of newMessages) {
      const email = (msg.fromEmail || "unknown@email.com").toLowerCase();
      if (email !== connection.email_address.toLowerCase()) senderEmails.add(email);
      emailMsgIds.push(msg.messageId || `<${msg.uid}@${connection.imap_host}>`);
      threadKeys.add((msg.subject || "").replace(/^(Re:|Fwd:|Fw:)\s*/gi, "").trim() || `email-${msg.uid}`);
    }

    // 3 batch queries
    const [dedupRes, leadsRes, convsRes] = await Promise.all([
      supabaseClient.from("messages").select("email_message_id")
        .eq("workspace_id", workspaceId).in("email_message_id", emailMsgIds),
      senderEmails.size > 0
        ? supabaseClient.from("leads").select("id, external_email")
            .eq("workspace_id", workspaceId).in("external_email", Array.from(senderEmails))
        : Promise.resolve({ data: [] }),
      threadKeys.size > 0
        ? supabaseClient.from("conversations").select("id, external_thread_id")
            .eq("workspace_id", workspaceId).eq("channel", "email").in("external_thread_id", Array.from(threadKeys))
        : Promise.resolve({ data: [] }),
    ]);

    const existingIds = new Set((dedupRes.data || []).map((m: { email_message_id: string }) => m.email_message_id));
    const leadMap = new Map<string, string>();
    for (const l of (leadsRes.data || []) as Array<{ id: string; external_email: string | null }>) {
      if (l.external_email) leadMap.set(l.external_email.toLowerCase(), l.id);
    }
    const convMap = new Map<string, string>();
    for (const c of (convsRes.data || []) as Array<{ id: string; external_thread_id: string | null }>) {
      if (c.external_thread_id) convMap.set(c.external_thread_id, c.id);
    }

    let fetchedCount = 0;
    let maxUid = lastUid;

    for (const msg of newMessages) {
      if (msg.uid > maxUid) maxUid = msg.uid;
      const emailMsgId = msg.messageId || `<${msg.uid}@${connection.imap_host}>`;
      if (existingIds.has(emailMsgId)) continue;

      const senderEmail = (msg.fromEmail || "unknown@email.com").toLowerCase();
      const isInbound = senderEmail !== connection.email_address.toLowerCase();

      // Lead
      let leadId: string | null = null;
      if (isInbound && senderEmail) {
        leadId = leadMap.get(senderEmail) || null;
        if (!leadId) {
          const { data: nl } = await supabaseClient.from("leads")
            .insert({ workspace_id: workspaceId, created_by: actingUserId, name: msg.fromName || senderEmail, email: senderEmail, external_email: senderEmail, source: "email", status: "new" })
            .select("id").single();
          if (nl) { leadId = nl.id; leadMap.set(senderEmail, leadId); }
        }
      }

      // Conversation
      const threadKey = (msg.subject || "").replace(/^(Re:|Fwd:|Fw:)\s*/gi, "").trim() || `email-${msg.uid}`;
      let conversationId = convMap.get(threadKey) || null;

      if (conversationId) {
        await supabaseClient.from("conversations").update({
          last_message_at: new Date().toISOString(),
          last_message_preview: (msg.subject || "").substring(0, 100),
          lead_id: leadId || undefined,
          unread_count: isInbound ? 1 : 0,
        }).eq("id", conversationId);
      } else {
        const { data: nc } = await supabaseClient.from("conversations")
          .insert({
            workspace_id: workspaceId, channel: "email", external_thread_id: threadKey,
            lead_id: leadId, status: "open", unread_count: isInbound ? 1 : 0,
            last_message_at: new Date().toISOString(),
            last_message_preview: (msg.subject || "").substring(0, 100),
            channel_metadata: { connection_id: connectionId, subject: msg.subject },
          }).select("id").single();
        if (!nc) continue;
        conversationId = nc.id;
        convMap.set(threadKey, conversationId);
      }

      // Message
      const { error: msgErr } = await supabaseClient.from("messages").insert({
        conversation_id: conversationId, workspace_id: workspaceId,
        direction: isInbound ? "inbound" : "outbound",
        content: msg.subject || "(Sem conteúdo)",
        sent_at: parseDateSafe(msg.date),
        email_message_id: emailMsgId, email_in_reply_to: msg.inReplyTo || null,
        email_subject: msg.subject, sender_id: isInbound ? null : user.id,
      });
      if (!msgErr) { fetchedCount++; existingIds.add(emailMsgId); }
    }

    await supabaseClient.from("email_connections").update({
      sync_status: "synced", last_sync_at: new Date().toISOString(),
      last_sync_uid: maxUid.toString(), sync_error: null,
    }).eq("id", connectionId);

    return new Response(JSON.stringify({ success: true, message: `Synced ${fetchedCount} new emails`, fetchedCount }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (error: unknown) {
    console.error("Email fetch error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
