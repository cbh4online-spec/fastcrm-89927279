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

function decodeBytes(bytes: Uint8Array, charset = "utf-8"): string {
  const normalized = charset.toLowerCase().replace(/["']/g, "");
  const label = normalized.includes("iso-8859-1") || normalized.includes("latin1")
    ? "iso-8859-1"
    : normalized.includes("windows-1252")
      ? "windows-1252"
      : "utf-8";
  try { return new TextDecoder(label).decode(bytes); }
  catch { return new TextDecoder("utf-8").decode(bytes); }
}

function decodeMimeWord(str: string): string {
  if (!str) return "";
  return str.replace(/=\?([^?]+)\?([BQ])\?([^?]*)\?=/gi, (_m, charset, encoding, text) => {
    try {
      if (encoding.toUpperCase() === "B") {
        const bytes = Uint8Array.from(atob(text), (c) => c.charCodeAt(0));
        return decodeBytes(bytes, charset);
      }
      const qp = text.replace(/_/g, " ");
      const bytes: number[] = [];
      for (let i = 0; i < qp.length; i++) {
        if (qp[i] === "=" && /^[0-9A-Fa-f]{2}$/.test(qp.slice(i + 1, i + 3))) {
          bytes.push(parseInt(qp.slice(i + 1, i + 3), 16));
          i += 2;
        } else {
          bytes.push(qp.charCodeAt(i));
        }
      }
      return decodeBytes(new Uint8Array(bytes), charset);
    } catch { return text; }
  });
}

function splitRawMessage(raw: string): { headers: string; body: string } {
  const idx = raw.search(/\r?\n\r?\n/);
  if (idx < 0) return { headers: raw, body: "" };
  const match = raw.slice(idx).match(/^\r?\n\r?\n/);
  return { headers: raw.slice(0, idx), body: raw.slice(idx + (match?.[0].length ?? 2)) };
}

function getHeader(headers: string, name: string): string | null {
  const unfolded = headers.replace(/\r?\n[ \t]+/g, " ");
  const re = new RegExp(`^${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}:\\s*(.+)$`, "im");
  return unfolded.match(re)?.[1]?.trim() ?? null;
}

function getHeaderParam(header: string | null, param: string): string | null {
  if (!header) return null;
  const re = new RegExp(`${param}=\\"?([^\\";]+)\\"?`, "i");
  return header.match(re)?.[1]?.trim() ?? null;
}

function parseAddress(value: string | null): { email: string; name: string } {
  const decoded = decodeMimeWord(value || "").replace(/\r?\n/g, " ").trim();
  const email = decoded.match(/<([^>]+)>/)?.[1] || decoded.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0] || "";
  const name = decoded.replace(/<[^>]+>/g, "").replace(/["']/g, "").trim() || email;
  return { email: email.toLowerCase(), name };
}

function decodeTransfer(body: string, encoding: string | null, charset: string | null): string {
  const enc = (encoding || "7bit").toLowerCase();
  if (enc === "base64") {
    const bytes = Uint8Array.from(atob(body.replace(/\s/g, "")), (c) => c.charCodeAt(0));
    return decodeBytes(bytes, charset || "utf-8");
  }
  if (enc === "quoted-printable") {
    const soft = body.replace(/=\r?\n/g, "");
    const bytes: number[] = [];
    for (let i = 0; i < soft.length; i++) {
      if (soft[i] === "=" && /^[0-9A-Fa-f]{2}$/.test(soft.slice(i + 1, i + 3))) {
        bytes.push(parseInt(soft.slice(i + 1, i + 3), 16));
        i += 2;
      } else {
        bytes.push(soft.charCodeAt(i));
      }
    }
    return decodeBytes(new Uint8Array(bytes), charset || "utf-8");
  }
  return body.trim();
}

function parseEmailPart(raw: string, depth = 0): { text: string; html: string } {
  if (depth > 8) return { text: "", html: "" };
  const { headers, body } = splitRawMessage(raw);
  const contentType = getHeader(headers, "content-type") || "text/plain; charset=utf-8";
  const boundary = getHeaderParam(contentType, "boundary");
  if (/multipart\//i.test(contentType) && boundary) {
    const parsed = { text: "", html: "" };
    const segments = body.split(`--${boundary}`).slice(1);
    for (const segment of segments) {
      if (segment.trim().startsWith("--")) break;
      const part = parseEmailPart(segment.replace(/^\r?\n/, "").replace(/\r?\n$/, ""), depth + 1);
      if (!parsed.text && part.text) parsed.text = part.text;
      if (!parsed.html && part.html) parsed.html = part.html;
    }
    return parsed;
  }

  const charset = getHeaderParam(contentType, "charset");
  const decoded = decodeTransfer(body, getHeader(headers, "content-transfer-encoding"), charset);
  if (/text\/html/i.test(contentType)) return { text: "", html: decoded.trim() };
  if (/text\/plain/i.test(contentType) || !contentType) return { text: decoded.trim(), html: "" };
  return { text: "", html: "" };
}

function extractRawFromFetchBlock(block: string): string {
  const marker = block.match(/(?:BODY\[\]|RFC822) \{\d+\}\r?\n/i);
  if (!marker || marker.index === undefined) return "";
  return block.slice(marker.index + marker[0].length).replace(/\r?\n\)\s*$/, "");
}

function parseRawEmail(raw: string) {
  const { headers } = splitRawMessage(raw);
  const from = parseAddress(getHeader(headers, "from"));
  const to = parseAddress(getHeader(headers, "to"));
  const cc = getHeader(headers, "cc");
  const parsed = parseEmailPart(raw);
  return {
    subject: decodeMimeWord(getHeader(headers, "subject") || ""),
    fromEmail: from.email,
    fromName: from.name,
    toEmail: to.email,
    ccEmail: cc ? decodeMimeWord(cc) : "",
    date: getHeader(headers, "date") || "",
    messageId: getHeader(headers, "message-id") || "",
    inReplyTo: getHeader(headers, "in-reply-to"),
    references: getHeader(headers, "references"),
    textContent: parsed.text,
    htmlContent: parsed.html,
  };
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
        email_subject: msg.subject, sender_id: isInbound ? null : actingUserId,
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
