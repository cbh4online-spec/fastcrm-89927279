import { createClient } from "@supabase/supabase-js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface CreateMemberRequest {
  email: string;
  role: string;
  commercial_profile?: string;
  workspaceId: string;
  fullName?: string;
  password?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Validate caller JWT
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Não autenticado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authErr } = await userClient.auth.getUser();
    if (authErr || !user) {
      return new Response(JSON.stringify({ error: "Sessão inválida" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = (await req.json()) as CreateMemberRequest;
    const { email, role, commercial_profile, workspaceId, fullName, password } = body;

    if (!email || !workspaceId || !role) {
      return new Response(JSON.stringify({ error: "Campos obrigatórios em falta" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false },
    });

    // Check caller is owner/admin in this workspace
    const { data: callerMembership } = await admin
      .from("workspace_members")
      .select("role")
      .eq("workspace_id", workspaceId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (!callerMembership || !["owner", "admin"].includes(callerMembership.role)) {
      return new Response(JSON.stringify({ error: "Sem permissão para adicionar membros" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const cleanEmail = email.trim().toLowerCase();

    // Try to find existing user by email
    let targetUserId: string | null = null;

    const { data: existingProfile } = await admin
      .from("profiles")
      .select("user_id")
      .eq("email", cleanEmail)
      .maybeSingle();

    if (existingProfile?.user_id) {
      targetUserId = existingProfile.user_id;
    } else {
      // Create the user with admin API
      const generatedPassword =
        password && password.length >= 8
          ? password
          : `${crypto.randomUUID().replace(/-/g, "")}Aa1!`;

      const { data: created, error: createErr } = await admin.auth.admin.createUser({
        email: cleanEmail,
        password: generatedPassword,
        email_confirm: true,
        user_metadata: { full_name: fullName || cleanEmail.split("@")[0] },
      });

      if (createErr || !created.user) {
        // If user already exists in auth but no profile, try to fetch
        if (createErr?.message?.toLowerCase().includes("already")) {
          const { data: list } = await admin.auth.admin.listUsers();
          const found = list?.users?.find((u) => u.email?.toLowerCase() === cleanEmail);
          if (found) {
            targetUserId = found.id;
          } else {
            return new Response(JSON.stringify({ error: createErr.message }), {
              status: 400,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          }
        } else {
          return new Response(
            JSON.stringify({ error: createErr?.message || "Erro ao criar utilizador" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      } else {
        targetUserId = created.user.id;
      }

      // Ensure profile row exists
      if (targetUserId) {
        await admin.from("profiles").upsert(
          {
            user_id: targetUserId,
            email: cleanEmail,
            full_name: fullName || cleanEmail.split("@")[0],
          },
          { onConflict: "user_id" }
        );
      }
    }

    if (!targetUserId) {
      return new Response(JSON.stringify({ error: "Não foi possível obter utilizador" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Insert workspace member
    const { error: memberErr } = await admin.from("workspace_members").insert({
      workspace_id: workspaceId,
      user_id: targetUserId,
      role,
      commercial_profile: commercial_profile || null,
    });

    if (memberErr) {
      if (memberErr.code === "23505") {
        return new Response(
          JSON.stringify({ error: "Este utilizador já é membro do workspace" }),
          { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      return new Response(JSON.stringify({ error: memberErr.message }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({ success: true, user_id: targetUserId, email: cleanEmail }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("[create-workspace-member] fatal error", err, (err as Error)?.stack);
    return new Response(
      JSON.stringify({ error: (err as Error).message || "Erro interno", stack: (err as Error)?.stack }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
};

Deno.serve(handler);
