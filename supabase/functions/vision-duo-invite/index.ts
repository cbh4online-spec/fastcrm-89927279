import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const log = (step: string, details?: unknown) => {
  console.log(`[VISION-DUO-INVITE] ${step}${details ? ` - ${JSON.stringify(details)}` : ""}`);
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    log("Function started");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { action, ...payload } = await req.json();

    if (action === "accept") {
      return await handleAccept(supabase, payload);
    }

    // Default: send invite (requires auth)
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) throw new Error("Unauthorized");

    if (action === "send_invite") {
      return await handleSendInvite(supabase, user, payload);
    }

    if (action === "notify_duo") {
      return await handleNotifyDuo(supabase, user, payload);
    }

    throw new Error(`Unknown action: ${action}`);
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    log("ERROR", { message: msg });
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

async function handleSendInvite(supabase: any, user: any, payload: any) {
  const { visionId, inviteeEmail, workspaceId } = payload;
  if (!visionId || !inviteeEmail || !workspaceId) throw new Error("Missing required fields");

  log("Sending invite", { visionId, inviteeEmail });

  // Get vision details
  const { data: vision } = await supabase
    .from("vision_profiles")
    .select("title, objective")
    .eq("id", visionId)
    .single();

  if (!vision) throw new Error("Vision not found");

  // Get inviter profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, email")
    .eq("id", user.id)
    .single();

  const inviterName = profile?.full_name || profile?.email || user.email || "Alguém";

  // Create duo link
  const { data: duoLink, error: insertError } = await supabase
    .from("vision_duo_links")
    .insert({
      vision_id: visionId,
      invitee_email: inviteeEmail,
      inviter_id: user.id,
      workspace_id: workspaceId,
      status: "pending",
    })
    .select()
    .single();

  if (insertError) throw insertError;

  log("Duo link created", { id: duoLink.id, token: duoLink.invite_token });

  // Send invite email via Lovable AI Gateway (generates email content)
  const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
  if (lovableApiKey) {
    try {
      // Use Resend if available, otherwise log the invite
      const resendKey = Deno.env.get("RESEND_API_KEY");
      if (resendKey) {
        const siteUrl = Deno.env.get("SITE_URL") || `${Deno.env.get("SUPABASE_URL")?.replace('.supabase.co', '')}`;
        const acceptUrl = `https://fastcrm.lovable.app/vision/duo/accept/${duoLink.invite_token}`;

        const emailHtml = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; padding: 40px;">
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #0F172A; font-size: 24px; margin: 0;">Convite Vision Duo 🤝</h1>
            </div>
            <p style="color: #334155; font-size: 16px; line-height: 1.6;">
              Olá!
            </p>
            <p style="color: #334155; font-size: 16px; line-height: 1.6;">
              <strong>${inviterName}</strong> convidou-te para ser parceiro(a) de accountability na visão:
            </p>
            <div style="background: #F8FAFC; border-left: 4px solid #8B5CF6; padding: 16px 20px; margin: 20px 0; border-radius: 0 8px 8px 0;">
              <p style="color: #0F172A; font-size: 18px; font-weight: bold; margin: 0;">${vision.title}</p>
              ${vision.objective ? `<p style="color: #64748B; font-size: 14px; margin: 8px 0 0 0;">${vision.objective}</p>` : ''}
            </div>
            <p style="color: #334155; font-size: 16px; line-height: 1.6;">
              Como parceiro(a) Duo, poderás acompanhar o progresso, celebrar vitórias e manter a motivação mútua.
            </p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${acceptUrl}" style="display: inline-block; background: #8B5CF6; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-size: 16px; font-weight: bold;">
                Aceitar Convite
              </a>
            </div>
            <p style="color: #94A3B8; font-size: 12px; text-align: center; margin-top: 30px;">
              Este convite foi enviado via FastCRM - Método Vision
            </p>
          </div>
        `;

        const emailRes = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            from: "FastCRM <notify@fastcrm.metodopare.ai>",
            to: [inviteeEmail],
            subject: `${inviterName} convidou-te para Vision Duo 🤝`,
            html: emailHtml,
          }),
        });

        const emailResult = await emailRes.json();
        log("Email sent", { status: emailRes.status, result: emailResult });
      } else {
        log("No RESEND_API_KEY, email not sent. Invite token available for manual sharing.");
      }
    } catch (emailErr) {
      log("Email send error (non-fatal)", { error: String(emailErr) });
    }
  }

  return new Response(JSON.stringify({ 
    success: true, 
    duoLink,
    inviteUrl: `https://fastcrm.lovable.app/vision/duo/accept/${duoLink.invite_token}`,
  }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function handleAccept(supabase: any, payload: any) {
  const { token, userId } = payload;
  if (!token) throw new Error("Missing invite token");

  log("Accepting invite", { token });

  // Find the duo link
  const { data: duoLink, error: findError } = await supabase
    .from("vision_duo_links")
    .select("*, vision_profiles(title, user_id)")
    .eq("invite_token", token)
    .eq("status", "pending")
    .single();

  if (findError || !duoLink) {
    return new Response(JSON.stringify({ error: "Convite não encontrado ou já aceite." }), {
      status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Update the duo link
  const { error: updateError } = await supabase
    .from("vision_duo_links")
    .update({
      status: "accepted",
      invitee_id: userId,
      accepted_at: new Date().toISOString(),
    })
    .eq("id", duoLink.id);

  if (updateError) throw updateError;

  // Create notification for the inviter
  await supabase.from("vision_duo_notifications").insert({
    duo_link_id: duoLink.id,
    vision_id: duoLink.vision_id,
    workspace_id: duoLink.workspace_id,
    recipient_id: duoLink.inviter_id,
    sender_id: userId,
    type: "invite_accepted",
    title: "Convite Duo aceite! 🎉",
    message: `O teu parceiro de accountability aceitou o convite para a visão "${duoLink.vision_profiles?.title}".`,
  });

  log("Invite accepted", { duoLinkId: duoLink.id });

  return new Response(JSON.stringify({ 
    success: true, 
    visionTitle: duoLink.vision_profiles?.title,
    visionId: duoLink.vision_id,
  }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function handleNotifyDuo(supabase: any, user: any, payload: any) {
  const { visionId, type, title, message, metadata } = payload;
  if (!visionId || !type || !title) throw new Error("Missing required notification fields");

  log("Creating duo notification", { visionId, type });

  // Find accepted duo links for this vision
  const { data: duoLinks } = await supabase
    .from("vision_duo_links")
    .select("*")
    .eq("vision_id", visionId)
    .eq("status", "accepted");

  if (!duoLinks?.length) {
    return new Response(JSON.stringify({ success: true, notified: 0 }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Create notifications for all duo partners
  const notifications = duoLinks.map((link: any) => {
    // Determine recipient: if sender is inviter, notify invitee, and vice versa
    const recipientId = link.inviter_id === user.id ? link.invitee_id : link.inviter_id;
    if (!recipientId) return null;

    return {
      duo_link_id: link.id,
      vision_id: visionId,
      workspace_id: link.workspace_id,
      recipient_id: recipientId,
      sender_id: user.id,
      type,
      title,
      message: message || null,
      metadata: metadata || {},
    };
  }).filter(Boolean);

  if (notifications.length > 0) {
    await supabase.from("vision_duo_notifications").insert(notifications);
  }

  log("Duo notifications created", { count: notifications.length });

  return new Response(JSON.stringify({ success: true, notified: notifications.length }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
