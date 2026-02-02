import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface ActivateInviteRequest {
  token: string;
  password: string;
}

function errorResponse(message: string, status = 400): Response {
  return new Response(
    JSON.stringify({ success: false, error: message }),
    {
      status,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    }
  );
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { token, password }: ActivateInviteRequest = await req.json();

    // Validate required fields
    if (!token) {
      return errorResponse("Token é obrigatório");
    }
    if (!password || password.length < 8) {
      return errorResponse("Palavra-passe deve ter pelo menos 8 caracteres");
    }

    // Create Supabase admin client with service role key
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // 1. Fetch client by invite token
    const { data: client, error: clientError } = await supabaseAdmin
      .from("client_users")
      .select("id, email, name, status, auth_user_id, invite_expires_at, workspace_id")
      .eq("invite_token", token)
      .maybeSingle();

    if (clientError) {
      console.error("Error fetching client:", clientError);
      return errorResponse("Erro ao validar token");
    }

    if (!client) {
      return errorResponse("Token de convite inválido ou expirado");
    }

    if (client.status !== "pending") {
      return errorResponse("Este convite já foi utilizado");
    }

    if (client.invite_expires_at && new Date(client.invite_expires_at) < new Date()) {
      return errorResponse("O convite expirou. Contacte o administrador para obter um novo convite.");
    }

    // 2. Create or update auth user
    let authUserId = client.auth_user_id;

    if (!authUserId) {
      // Check if user already exists with this email
      const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
      const existingUser = existingUsers?.users?.find((u) => u.email === client.email);

      if (existingUser) {
        // Update existing user's password
        const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
          existingUser.id,
          {
            password,
            user_metadata: {
              full_name: client.name,
              requires_password_change: false,
              client_workspace_id: client.workspace_id,
            },
          }
        );

        if (updateError) {
          console.error("Error updating existing user:", updateError);
          return errorResponse("Erro ao configurar conta");
        }

        authUserId = existingUser.id;
      } else {
        // Create new auth user
        const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
          email: client.email,
          password,
          email_confirm: true,
          user_metadata: {
            full_name: client.name,
            requires_password_change: false,
            client_workspace_id: client.workspace_id,
          },
        });

        if (createError) {
          console.error("Error creating auth user:", createError);
          return errorResponse("Erro ao criar conta: " + createError.message);
        }

        authUserId = newUser.user.id;
      }
    } else {
      // Update existing auth user's password
      const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
        authUserId,
        {
          password,
          user_metadata: {
            requires_password_change: false,
          },
        }
      );

      if (updateError) {
        console.error("Error updating auth user:", updateError);
        return errorResponse("Erro ao actualizar palavra-passe");
      }
    }

    // 3. Activate client - update status and clear invite token
    const { error: updateClientError } = await supabaseAdmin
      .from("client_users")
      .update({
        auth_user_id: authUserId,
        status: "active",
        invite_token: null, // Invalidate token
        invite_expires_at: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", client.id);

    if (updateClientError) {
      console.error("Error activating client:", updateClientError);
      // Don't fail - auth user was created successfully
    }

    console.log("Client account activated successfully:", {
      clientId: client.id,
      authUserId,
      email: client.email,
    });

    return new Response(
      JSON.stringify({
        success: true,
        data: { authUserId },
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: unknown) {
    console.error("Error in activate-client-invite function:", error);
    const message = error instanceof Error ? error.message : "Erro desconhecido";
    return new Response(
      JSON.stringify({ success: false, error: message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
