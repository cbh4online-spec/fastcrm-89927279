import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/** Normaliza telemóvel a E.164 simples (PT por defeito). */
function normalizePhone(raw?: string | null): string | null {
  if (!raw) return null;
  const digits = String(raw).replace(/[^\d+]/g, "");
  if (!digits) return null;
  if (digits.startsWith("+")) return digits;
  // 9 dígitos PT
  if (/^9\d{8}$/.test(digits)) return `+351${digits}`;
  if (/^00\d+/.test(digits)) return `+${digits.slice(2)}`;
  return digits.length >= 9 ? `+${digits}` : digits;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const body = await req.json();
    const {
      workspace_id, ebook_id, view_id, name, email, phone,
      consent_given, marketing_opt_in,
      utm_source, utm_medium, utm_campaign, slug,
    } = body;

    if (!workspace_id || !ebook_id || (!email?.trim() && !phone?.trim())) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing required fields (email or phone required)" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const trimmedEmail = email ? String(email).trim().toLowerCase() : null;
    const trimmedName = (name || "").trim();
    const normalizedPhone = normalizePhone(phone);

    // 1. Tentar reaproveitar Contact por email; se não houver, por telefone
    let existingContact: { id: string; tags: unknown } | null = null;
    if (trimmedEmail) {
      const { data } = await supabase
        .from("contacts")
        .select("id, tags")
        .eq("workspace_id", workspace_id)
        .eq("email", trimmedEmail)
        .is("deleted_at", null)
        .limit(1)
        .maybeSingle();
      existingContact = data || null;
    }
    if (!existingContact && normalizedPhone) {
      const { data } = await supabase
        .from("contacts")
        .select("id, tags")
        .eq("workspace_id", workspace_id)
        .eq("phone", normalizedPhone)
        .is("deleted_at", null)
        .limit(1)
        .maybeSingle();
      existingContact = data || null;
    }

    // 2. Tentar reaproveitar Lead (se não houver contacto)
    let existingLead: { id: string; tags: unknown } | null = null;
    if (!existingContact) {
      if (trimmedEmail) {
        const { data } = await supabase
          .from("leads")
          .select("id, tags")
          .eq("workspace_id", workspace_id)
          .eq("email", trimmedEmail)
          .limit(1)
          .maybeSingle();
        existingLead = data || null;
      }
      if (!existingLead && normalizedPhone) {
        const { data } = await supabase
          .from("leads")
          .select("id, tags")
          .eq("workspace_id", workspace_id)
          .eq("phone", normalizedPhone)
          .limit(1)
          .maybeSingle();
        existingLead = data || null;
      }
    }

    let contactId: string | null = null;
    let leadId: string | null = null;
    let isNew = false;
    let kind: "contact" | "lead" = "lead";

    const ebookTag = `ebook:${slug || ebook_id}`;
    const baseTags: string[] = [ebookTag];
    if (utm_campaign) baseTags.push(`campaign:${utm_campaign}`);
    if (marketing_opt_in) baseTags.push("marketing_opt_in");

    if (existingContact) {
      contactId = existingContact.id;
      kind = "contact";
      const currentTags: string[] = Array.isArray(existingContact.tags) ? (existingContact.tags as string[]) : [];
      const mergedTags = [...new Set([...currentTags, ...baseTags])];
      const update: Record<string, unknown> = {
        tags: mergedTags,
        updated_at: new Date().toISOString(),
      };
      // preencher dados em falta sem sobrepor
      if (normalizedPhone) update.phone = normalizedPhone;
      await supabase.from("contacts").update(update).eq("id", contactId);
    } else if (existingLead) {
      leadId = existingLead.id;
      kind = "lead";
      const currentTags: string[] = Array.isArray(existingLead.tags) ? (existingLead.tags as string[]) : [];
      const mergedTags = [...new Set([...currentTags, ...baseTags])];
      const update: Record<string, unknown> = {
        tags: mergedTags,
        updated_at: new Date().toISOString(),
      };
      if (normalizedPhone) update.phone = normalizedPhone;
      if (trimmedEmail) update.email = trimmedEmail;
      await supabase.from("leads").update(update).eq("id", leadId);
    } else {
      // Criar nova Lead (não Contact — Lead vai para o pipeline marketing)
      isNew = true;
      kind = "lead";
      const { data: newLead, error: createErr } = await supabase
        .from("leads")
        .insert({
          workspace_id,
          name: trimmedName || trimmedEmail || normalizedPhone || "Leitor de eBook",
          email: trimmedEmail,
          phone: normalizedPhone,
          source: "ebook",
          status: "new",
          tags: baseTags,
        })
        .select("id")
        .single();

      if (createErr) {
        console.error("Error creating lead:", createErr);
        return new Response(
          JSON.stringify({ success: false, error: createErr.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      leadId = newLead.id;
    }

    // 3. Atualizar ebook_view com identificador capturado
    if (view_id) {
      const viewUpdate: Record<string, unknown> = {
        lead_captured_at: new Date().toISOString(),
        reader_name: trimmedName || null,
        reader_email: trimmedEmail,
        reader_phone: normalizedPhone,
      };
      if (contactId) viewUpdate.contact_id = contactId;
      if (leadId) viewUpdate.lead_id = leadId;
      await supabase.from("ebook_views").update(viewUpdate).eq("id", view_id);
    }

    // 4. Eventos kernel (best-effort)
    const baseEvent = {
      workspace_id,
      actor_type: "system",
      actor_id: "ebook-lead-capture",
      source_module: "ebooks",
      schema_version: 1,
      occurred_at: new Date().toISOString(),
    };
    const events: Array<Record<string, unknown>> = [
      {
        ...baseEvent,
        type: "ebook.lead_captured",
        entity_kind: kind,
        entity_id: contactId || leadId,
        payload: {
          ebook_id, slug, email: trimmedEmail, phone: normalizedPhone,
          consent_given, marketing_opt_in,
          utm_source, utm_medium, utm_campaign,
          is_new: isNew,
          matched_kind: kind,
        },
      },
    ];

    if (isNew) {
      events.push({
        ...baseEvent,
        type: "ebook.lead_created",
        entity_kind: "lead",
        entity_id: leadId,
        payload: { ebook_id, slug, email: trimmedEmail, phone: normalizedPhone },
      });
    } else {
      events.push({
        ...baseEvent,
        type: kind === "contact" ? "ebook.contact_matched" : "ebook.lead_matched",
        entity_kind: kind,
        entity_id: contactId || leadId,
        payload: { ebook_id, slug, email: trimmedEmail, phone: normalizedPhone },
      });
    }

    if (marketing_opt_in) {
      events.push({
        ...baseEvent,
        type: "ebook.marketing_opt_in",
        entity_kind: kind,
        entity_id: contactId || leadId,
        payload: { ebook_id, slug, email: trimmedEmail },
      });
    }

    try {
      await supabase.from("kernel_events").insert(events);
    } catch {
      // ignore
    }

    return new Response(
      JSON.stringify({
        success: true,
        contact_id: contactId,
        lead_id: leadId,
        kind,
        is_new: isNew,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("ebook-lead-capture error:", err);
    return new Response(
      JSON.stringify({ success: false, error: (err as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
