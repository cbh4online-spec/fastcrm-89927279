import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface CreateClientAuthUserRequest {
  email: string;
  name: string;
  workspaceId: string;
  clientUserId: string;
}

function generateTemporaryPassword(): string {
  // Characters without ambiguous ones (0, O, l, 1, I)
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  let password = '';
  for (let i = 0; i < 12; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, name, workspaceId, clientUserId }: CreateClientAuthUserRequest = await req.json();

    // Validate required fields
    if (!email || !name || !workspaceId || !clientUserId) {
      throw new Error("Campos obrigatórios em falta: email, name, workspaceId, clientUserId");
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

    // Generate temporary password
    const temporaryPassword = generateTemporaryPassword();

    // Check if user already exists
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find((u) => u.email === email);

    let authUserId: string;

    if (existingUser) {
      // User exists - update their password and metadata
      const { data: updatedUser, error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
        existingUser.id,
        {
          password: temporaryPassword,
          user_metadata: {
            full_name: name,
            requires_password_change: true,
            client_workspace_id: workspaceId,
          },
        }
      );

      if (updateError) {
        console.error("Error updating existing user:", updateError);
        throw new Error(`Erro ao actualizar utilizador: ${updateError.message}`);
      }

      authUserId = existingUser.id;
      console.log("Updated existing auth user:", authUserId);
    } else {
      // Create new auth user with temporary password
      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password: temporaryPassword,
        email_confirm: true, // Auto-confirm email since it's an invitation
        user_metadata: {
          full_name: name,
          requires_password_change: true,
          client_workspace_id: workspaceId,
        },
      });

      if (createError) {
        console.error("Error creating auth user:", createError);
        throw new Error(`Erro ao criar utilizador: ${createError.message}`);
      }

      authUserId = newUser.user.id;
      console.log("Created new auth user:", authUserId);
    }

    // Update client_users record with auth_user_id
    const { error: updateClientError } = await supabaseAdmin
      .from("client_users")
      .update({
        auth_user_id: authUserId,
        status: "pending", // Keep as pending until first login
      })
      .eq("id", clientUserId);

    if (updateClientError) {
      console.error("Error updating client_users:", updateClientError);
      // Don't throw - auth user was created, this is non-fatal
    }

    console.log("Client auth user created successfully:", { authUserId, email });

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          authUserId,
          temporaryPassword,
        },
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      }
    );
  } catch (error: any) {
    console.error("Error in create-client-auth-user function:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
