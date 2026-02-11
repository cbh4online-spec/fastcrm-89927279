import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface ActivateRequest {
  token: string;
  password: string;
  phone?: string;
  iban?: string;
  bank_name?: string;
  account_holder?: string;
  nif?: string;
  bio?: string;
  location?: string;
}

function errorResponse(message: string, status = 400): Response {
  return new Response(
    JSON.stringify({ success: false, error: message }),
    { status, headers: { "Content-Type": "application/json", ...corsHeaders } }
  );
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body: ActivateRequest = await req.json();
    const { token, password, phone, iban, bank_name, account_holder, nif, bio, location } = body;

    if (!token) return errorResponse("Token é obrigatório");
    if (!password || password.length < 8) return errorResponse("Palavra-passe deve ter pelo menos 8 caracteres");

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // 1. Fetch invite by token
    const { data: invite, error: inviteError } = await supabaseAdmin
      .from("c2c_seller_invites")
      .select("*")
      .eq("invite_token", token)
      .maybeSingle();

    if (inviteError) {
      console.error("Error fetching invite:", inviteError);
      return errorResponse("Erro ao validar token");
    }
    if (!invite) return errorResponse("Token de convite inválido ou expirado");
    if (invite.status !== "pending") return errorResponse("Este convite já foi utilizado");
    if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
      return errorResponse("O convite expirou. Contacte o administrador para obter um novo convite.");
    }

    // 2. Create or find auth user
    let authUserId: string;

    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find((u) => u.email === invite.email);

    if (existingUser) {
      const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
        existingUser.id,
        {
          password,
          user_metadata: { full_name: invite.name },
        }
      );
      if (updateError) {
        console.error("Error updating user:", updateError);
        return errorResponse("Erro ao configurar conta");
      }
      authUserId = existingUser.id;
    } else {
      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: invite.email,
        password,
        email_confirm: true,
        user_metadata: { full_name: invite.name },
      });
      if (createError) {
        console.error("Error creating user:", createError);
        return errorResponse("Erro ao criar conta: " + createError.message);
      }
      authUserId = newUser.user.id;
    }

    // 3. Create seller record with approved status
    const { error: sellerError } = await supabaseAdmin
      .from("c2c_sellers")
      .insert({
        user_id: authUserId,
        workspace_id: invite.workspace_id,
        display_name: invite.name,
        phone: phone || null,
        iban: iban || null,
        bank_name: bank_name || null,
        account_holder: account_holder || null,
        nif: nif || null,
        bio: bio || null,
        location: location || null,
        status: "approved",
        approved_at: new Date().toISOString(),
        approved_by: invite.invited_by,
      });

    if (sellerError) {
      // If duplicate, that's fine - seller already exists
      if (!sellerError.message?.includes("duplicate")) {
        console.error("Error creating seller:", sellerError);
      }
    }

    // 4. Mark invite as accepted
    await supabaseAdmin
      .from("c2c_seller_invites")
      .update({
        status: "accepted",
        accepted_at: new Date().toISOString(),
      })
      .eq("id", invite.id);

    console.log("Seller invite activated:", { inviteId: invite.id, authUserId, email: invite.email });

    return new Response(
      JSON.stringify({ success: true, data: { authUserId } }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: unknown) {
    console.error("Error in activate-c2c-seller-invite:", error);
    const message = error instanceof Error ? error.message : "Erro desconhecido";
    return new Response(
      JSON.stringify({ success: false, error: message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
