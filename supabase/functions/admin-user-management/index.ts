import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
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

    const { action, userId, password, email } = await req.json();

    let result;

    switch (action) {
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
