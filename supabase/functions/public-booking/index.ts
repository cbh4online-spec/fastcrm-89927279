import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { booking_page_id, date, start_time, guest_name, guest_email } = await req.json();

    if (!booking_page_id || !date || !start_time || !guest_name || !guest_email) {
      return new Response(JSON.stringify({ error: "Campos obrigatórios em falta" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(guest_email)) {
      return new Response(JSON.stringify({ error: "Email inválido" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validate name length
    if (guest_name.length > 100 || guest_email.length > 255) {
      return new Response(JSON.stringify({ error: "Dados demasiado longos" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

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
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build start and end times
    const [hours, minutes] = start_time.split(":").map(Number);
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
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create calendar event
    const { data: event, error: eventErr } = await supabase
      .from("calendar_events")
      .insert({
        calendar_id: page.calendar_id,
        workspace_id: page.workspace_id,
        title: `${page.title} — ${guest_name}`,
        description: `Agendamento público\nNome: ${guest_name}\nEmail: ${guest_email}`,
        start_time: startDate.toISOString(),
        end_time: endDate.toISOString(),
        event_type: "meeting",
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
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        event_id: event.id,
        date,
        start_time,
        duration_minutes: page.duration_minutes,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Public booking error:", err);
    return new Response(JSON.stringify({ error: "Erro interno" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
