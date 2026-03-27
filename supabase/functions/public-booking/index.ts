import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { action } = body;

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Rate limiting by IP
    const clientIP = req.headers.get("x-forwarded-for") || "unknown";

    if (action === "save_lead") {
      return await handleSaveLead(supabase, body, corsHeaders);
    } else if (action === "confirm_booking") {
      return await handleConfirmBooking(supabase, body, corsHeaders);
    } else {
      // Legacy: support old format without action field
      return await handleConfirmBooking(supabase, body, corsHeaders);
    }
  } catch (err) {
    console.error("Public booking error:", err);
    return new Response(JSON.stringify({ error: "Erro interno" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

async function handleSaveLead(supabase: any, body: any, headers: Record<string, string>) {
  const { booking_page_id, guest_name, guest_email, guest_phone, guest_message, custom_field_values } = body;

  if (!booking_page_id || !guest_name || !guest_email) {
    return new Response(JSON.stringify({ error: "Nome e email são obrigatórios" }), {
      status: 400,
      headers: { ...headers, "Content-Type": "application/json" },
    });
  }

  // Validate
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(guest_email)) {
    return new Response(JSON.stringify({ error: "Email inválido" }), {
      status: 400,
      headers: { ...headers, "Content-Type": "application/json" },
    });
  }
  if (guest_name.length > 100 || guest_email.length > 255) {
    return new Response(JSON.stringify({ error: "Dados demasiado longos" }), {
      status: 400,
      headers: { ...headers, "Content-Type": "application/json" },
    });
  }

  // Get booking page to find workspace_id
  const { data: page, error: pageErr } = await supabase
    .from("booking_pages")
    .select("id, workspace_id, is_active")
    .eq("id", booking_page_id)
    .eq("is_active", true)
    .single();

  if (pageErr || !page) {
    return new Response(JSON.stringify({ error: "Link de agendamento não encontrado" }), {
      status: 404,
      headers: { ...headers, "Content-Type": "application/json" },
    });
  }

  // Create booking lead
  const { data: lead, error: leadErr } = await supabase
    .from("booking_leads")
    .insert({
      booking_page_id,
      workspace_id: page.workspace_id,
      guest_name: guest_name.trim().slice(0, 100),
      guest_email: guest_email.trim().slice(0, 255),
      guest_phone: guest_phone?.trim().slice(0, 30) || null,
      guest_message: guest_message?.trim().slice(0, 1000) || null,
      custom_field_values: custom_field_values || null,
      status: "partial",
    })
    .select("id")
    .single();

  if (leadErr) {
    console.error("Lead creation failed:", leadErr);
    return new Response(JSON.stringify({ error: "Erro ao guardar dados" }), {
      status: 500,
      headers: { ...headers, "Content-Type": "application/json" },
    });
  }

  // Check if email already exists in leads or contacts tables
  const trimmedEmail = guest_email.trim().toLowerCase();
  let existingMatch: { type: string; name: string; id: string } | null = null;

  // Check leads table first
  const { data: existingLead } = await supabase
    .from("leads")
    .select("id, name")
    .eq("workspace_id", page.workspace_id)
    .ilike("email", trimmedEmail)
    .limit(1)
    .maybeSingle();

  if (existingLead) {
    existingMatch = { type: "lead", name: existingLead.name, id: existingLead.id };
  } else {
    // Check contacts table
    const { data: existingContact } = await supabase
      .from("contacts")
      .select("id, name")
      .eq("workspace_id", page.workspace_id)
      .is("deleted_at", null)
      .ilike("email", trimmedEmail)
      .limit(1)
      .maybeSingle();

    if (existingContact) {
      existingMatch = { type: "contact", name: existingContact.name, id: existingContact.id };
    }
  }

  // If no existing match, create a new lead in the CRM
  if (!existingMatch) {
    // Get a workspace member to use as created_by
    const { data: member } = await supabase
      .from("workspace_members")
      .select("user_id")
      .eq("workspace_id", page.workspace_id)
      .limit(1)
      .single();

    const { data: newLead, error: newLeadErr } = await supabase
      .from("leads")
      .insert({
        workspace_id: page.workspace_id,
        name: guest_name.trim().slice(0, 100),
        email: trimmedEmail,
        phone: guest_phone?.trim().slice(0, 30) || null,
        source: "public_booking",
        status: "new",
        created_by: member?.user_id || null,
        notes: guest_message?.trim().slice(0, 1000) || null,
        tags: ["booking"],
      })
      .select("id, name")
      .single();

    if (newLeadErr) {
      // Handle duplicate email — fetch existing lead instead
      if (newLeadErr.code === "23505" || newLeadErr.message?.includes("unique")) {
        const { data: dupLead } = await supabase
          .from("leads")
          .select("id, name")
          .eq("workspace_id", page.workspace_id)
          .ilike("email", trimmedEmail)
          .limit(1)
          .maybeSingle();
        if (dupLead) {
          existingMatch = { type: "lead", name: dupLead.name, id: dupLead.id };
          console.log(`[BOOKING] Linked to existing CRM lead (dup): ${dupLead.id}`);
        }
      } else {
        console.error("CRM lead creation failed (non-blocking):", newLeadErr);
      }
    } else if (newLead) {
      existingMatch = { type: "lead", name: newLead.name, id: newLead.id };
      console.log(`[BOOKING] New CRM lead created: ${newLead.id}`);
    }
  }

  // Store CRM reference in booking_lead metadata
  if (existingMatch) {
    await supabase
      .from("booking_leads")
      .update({
        metadata: {
          crm_record_type: existingMatch.type,
          crm_record_id: existingMatch.id,
          crm_record_name: existingMatch.name,
        },
      })
      .eq("id", lead.id);
  }

  return new Response(
    JSON.stringify({
      success: true,
      lead_id: lead.id,
      existing_match: existingMatch,
    }),
    { status: 200, headers: { ...headers, "Content-Type": "application/json" } }
  );
}

async function handleConfirmBooking(supabase: any, body: any, headers: Record<string, string>) {
  const { booking_page_id, lead_id, date, start_time, guest_name, guest_email } = body;

  if (!booking_page_id || !date || !start_time || !guest_name || !guest_email) {
    return new Response(JSON.stringify({ error: "Campos obrigatórios em falta" }), {
      status: 400,
      headers: { ...headers, "Content-Type": "application/json" },
    });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(guest_email)) {
    return new Response(JSON.stringify({ error: "Email inválido" }), {
      status: 400,
      headers: { ...headers, "Content-Type": "application/json" },
    });
  }

  if (guest_name.length > 100 || guest_email.length > 255) {
    return new Response(JSON.stringify({ error: "Dados demasiado longos" }), {
      status: 400,
      headers: { ...headers, "Content-Type": "application/json" },
    });
  }

  // Get booking page
  const { data: page, error: pageErr } = await supabase
    .from("booking_pages")
    .select("*")
    .eq("id", booking_page_id)
    .eq("is_active", true)
    .single();

  if (pageErr || !page) {
    return new Response(JSON.stringify({ error: "Link de agendamento inativo ou não encontrado" }), {
      status: 404,
      headers: { ...headers, "Content-Type": "application/json" },
    });
  }

  // Build start and end times
  const startDate = new Date(`${date}T${start_time}:00`);
  const endDate = new Date(startDate.getTime() + page.duration_minutes * 60 * 1000);

  // Verify no conflicts
  const { data: conflicts } = await supabase
    .from("calendar_events")
    .select("id")
    .eq("calendar_id", page.calendar_id)
    .lt("start_time", endDate.toISOString())
    .gt("end_time", startDate.toISOString());

  if (conflicts && conflicts.length > 0) {
    return new Response(JSON.stringify({ error: "Este horário já não está disponível" }), {
      status: 409,
      headers: { ...headers, "Content-Type": "application/json" },
    });
  }

  // Get a workspace member to use as created_by
  const { data: member } = await supabase
    .from("workspace_members")
    .select("user_id")
    .eq("workspace_id", page.workspace_id)
    .limit(1)
    .single();

  // Create calendar event
  const { data: event, error: eventErr } = await supabase
    .from("calendar_events")
    .insert({
      calendar_id: page.calendar_id,
      workspace_id: page.workspace_id,
      created_by: member?.user_id || "00000000-0000-0000-0000-000000000000",
      title: `${page.title} — ${guest_name}`,
      description: `Agendamento público\nNome: ${guest_name}\nEmail: ${guest_email}`,
      start_time: startDate.toISOString(),
      end_time: endDate.toISOString(),
      status: "confirmed",
      metadata: {
        booking_page_id: page.id,
        guest_name,
        guest_email,
        source: "public_booking",
      },
    })
    .select()
    .single();

  if (eventErr) {
    console.error("Event creation failed:", eventErr);
    return new Response(JSON.stringify({ error: "Erro ao criar agendamento" }), {
      status: 500,
      headers: { ...headers, "Content-Type": "application/json" },
    });
  }

  // Update lead status if lead_id provided
  if (lead_id) {
    await supabase
      .from("booking_leads")
      .update({ status: "booked", event_id: event.id })
      .eq("id", lead_id);
  }

  return new Response(
    JSON.stringify({
      success: true,
      event_id: event.id,
      date,
      start_time,
      duration_minutes: page.duration_minutes,
    }),
    { status: 200, headers: { ...headers, "Content-Type": "application/json" } }
  );
}
