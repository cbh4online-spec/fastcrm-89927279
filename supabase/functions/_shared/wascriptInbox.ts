// Gravação de mensagens WAScript na Caixa de Entrada (servidor).
// deno-lint-ignore-file no-explicit-any
type Admin = any;

export async function findOrCreateWascriptConversation(admin: Admin, p: {
  workspaceId: string; phone: string; name?: string | null; preview: string; direction: "inbound" | "outbound";
  at: string; contactId?: string | null; leadId?: string | null; conversationId?: string | null;
}): Promise<string | null> {
  const threadKey = `+${p.phone}`;
  let convId = p.conversationId ?? null;
  let unread = 0;
  if (!convId) {
    const { data } = await admin.from("conversations").select("id, unread_count")
      .eq("workspace_id", p.workspaceId).eq("channel", "whatsapp").in("external_thread_id", [threadKey, p.phone])
      .order("last_message_at", { ascending: false }).limit(1);
    convId = data?.[0]?.id ?? null; unread = data?.[0]?.unread_count ?? 0;
  }
  const preview = p.preview.slice(0, 100);
  if (convId) {
    const upd: Record<string, unknown> = { last_message_at: p.at, last_message_preview: preview, last_message_direction: p.direction, updated_at: new Date().toISOString() };
    if (p.direction === "inbound") { upd.unread_count = unread + 1; upd.status = "open"; }
    await admin.from("conversations").update(upd).eq("id", convId).eq("workspace_id", p.workspaceId);
    return convId;
  }
  const { data: created, error } = await admin.from("conversations").insert({
    workspace_id: p.workspaceId, channel: "whatsapp", external_thread_id: threadKey, status: "open",
    unread_count: p.direction === "inbound" ? 1 : 0, last_message_at: p.at, last_message_preview: preview,
    last_message_direction: p.direction, contact_id: p.contactId ?? null, lead_id: p.leadId ?? null,
    channel_metadata: { source: "wascript", phone: threadKey, push_name: p.name ?? null },
  }).select("id").single();
  if (error) { console.error("[wascript] conv_create_failed", error.message); return null; }
  return created.id;
}
