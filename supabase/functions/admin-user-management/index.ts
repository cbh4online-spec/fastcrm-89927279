
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    // Create admin client with service role
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Get user from auth header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("Missing authorization header");
    }

    // Verify the calling user is a super admin
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(
      authHeader.replace("Bearer ", "")
    );

    if (authError || !user) {
      throw new Error("Invalid authentication");
    }

    // Check if user is super admin
    const { data: roleData } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "super_admin")
      .single();

    if (!roleData) {
      throw new Error("Unauthorized: Only super admins can perform this action");
    }

    const { action, userId, password, email, fullName, workspaceName, workspaceSlug, plan, requiresOnboarding } = await req.json();

    let result;

    switch (action) {
      case "create_user": {
        if (!email || !password || !fullName) {
          throw new Error("email, password and fullName are required");
        }

        // Verificar se email já existe
        const { data: existingUsers } = await supabaseAdmin
          .from("profiles")
          .select("id")
          .eq("email", email)
          .limit(1);

        if (existingUsers && existingUsers.length > 0) {
          throw new Error("Email já está em uso");
        }

        // Criar utilizador no Auth
        const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
          user_metadata: { full_name: fullName }
        });

        if (createError) throw createError;

        // Criar perfil
        const { error: profileError } = await supabaseAdmin.from("profiles").upsert({
          id: newUser.user.id,
          user_id: newUser.user.id,
          email,
          full_name: fullName,
          status: "active"
        });

        if (profileError) {
          console.error("Profile creation error:", profileError);
        }

        let workspaceId = null;

        // Criar workspace se solicitado
        if (workspaceName && workspaceSlug) {
          // Verificar se slug já existe
          const { data: existingWs } = await supabaseAdmin
            .from("workspaces")
            .select("id")
            .eq("slug", workspaceSlug)
            .single();

          if (existingWs) {
            throw new Error(`Workspace com slug "${workspaceSlug}" já existe`);
          }

          // Criar workspace diretamente (bypass da função que verifica auth.uid())
          const { data: wsData, error: wsError } = await supabaseAdmin
            .from("workspaces")
            .insert({
              name: workspaceName,
              slug: workspaceSlug,
              owner_id: newUser.user.id // utilizador como owner
            })
            .select("id")
            .single();

          if (wsError) {
            console.error("Workspace creation error:", wsError);
            throw new Error("Erro ao criar workspace: " + wsError.message);
          }
          
          workspaceId = wsData.id;

          // Adicionar utilizador como owner
          const { error: memberError } = await supabaseAdmin
            .from("workspace_members")
            .insert({
              workspace_id: workspaceId,
              user_id: newUser.user.id,
              role: "owner"
            });

          if (memberError) {
            console.error("Member add error:", memberError);
          }

          // Criar subscription
          const { error: subError } = await supabaseAdmin
            .from("workspace_subscriptions")
            .insert({
              workspace_id: workspaceId,
              plan: plan || "free",
              status: "active"
            });

          if (subError) {
            console.error("Subscription creation error:", subError);
          }

          // Marcar workspace para requerer onboarding se solicitado
          if (requiresOnboarding && workspaceId) {
            await supabaseAdmin.from("workspace_onboarding").upsert({
              workspace_id: workspaceId,
              requires_onboarding: true,
              skipped: false,
              created_by_admin: user.id
            }, { onConflict: "workspace_id" });
          }
        }

        // Log da ação
        await supabaseAdmin.from("admin_audit_logs").insert({
          admin_user_id: user.id,
          action_type: "create_user",
          target_type: "user",
          target_id: newUser.user.id,
          details: { 
            email, 
            full_name: fullName, 
            created_by_admin: true,
            workspace_id: workspaceId,
            requires_onboarding: requiresOnboarding
          }
        });

        result = { 
          success: true, 
          userId: newUser.user.id,
          workspaceId 
        };
        break;
      }

      case "set_password": {
        if (!userId || !password) {
          throw new Error("userId and password are required");
        }

        const { data, error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
          password: password,
        });

        if (error) throw error;

        // Log the action
        await supabaseAdmin.from("admin_audit_logs").insert({
          admin_user_id: user.id,
          action_type: "set_user_password",
          target_type: "user",
          target_id: userId,
          details: { method: "admin_set" },
        });

        result = { success: true, message: "Password updated successfully" };
        break;
      }

      case "send_password_reset": {
        if (!email) {
          throw new Error("email is required");
        }

        const { error } = await supabaseAdmin.auth.resetPasswordForEmail(email, {
          redirectTo: `${req.headers.get("origin")}/dashboard/profile`,
        });

        if (error) throw error;

        // Log the action
        await supabaseAdmin.from("admin_audit_logs").insert({
          admin_user_id: user.id,
          action_type: "send_password_reset",
          target_type: "user",
          target_id: userId || email,
          details: { email },
        });

        result = { success: true, message: "Password reset email sent" };
        break;
      }

      case "confirm_email": {
        if (!userId) {
          throw new Error("userId is required");
        }

        const { data, error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
          email_confirm: true,
        });

        if (error) throw error;

        result = { success: true, message: "Email confirmed" };
        break;
      }

      case "get_user_details": {
        if (!userId) {
          throw new Error("userId is required");
        }

        const { data, error } = await supabaseAdmin.auth.admin.getUserById(userId);

        if (error) throw error;

        result = {
          success: true,
          user: {
            id: data.user.id,
            email: data.user.email,
            email_confirmed_at: data.user.email_confirmed_at,
            created_at: data.user.created_at,
            last_sign_in_at: data.user.last_sign_in_at,
            app_metadata: data.user.app_metadata,
            user_metadata: data.user.user_metadata,
          },
        };
        break;
      }

      default:
        throw new Error(`Unknown action: ${action}`);
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error: any) {
    console.error("Admin user management error:", error);
    return new Response(
      JSON.stringify({ error: error?.message || "Unknown error" }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      }
    );
  }
});
