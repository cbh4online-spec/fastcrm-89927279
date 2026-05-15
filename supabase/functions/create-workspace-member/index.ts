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

const workspaceRoles = new Set(["owner", "admin", "agent", "viewer", "agency", "hr"]);
const commercialProfiles = new Set(["vendedor", "gestor", "diretor", "ceo"]);

const jsonResponse = (payload: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const safeCreateUserError = (message?: string) => {
  const raw = message || "Erro ao criar utilizador";
  const lower = raw.toLowerCase();
  if (lower.includes("password") || lower.includes("weak") || lower.includes("pwned") || lower.includes("breach")) {
    return "A palavra-passe foi rejeitada pela política de segurança. Deixa o campo vazio para gerar automaticamente ou escolhe uma palavra-passe mais forte e única.";
  }
  if (lower.includes("already") || lower.includes("registered")) {
    return "Este email já existe no sistema, mas não foi possível associá-lo automaticamente. Tenta novamente ou usa o fluxo de convite.";
  }
  return raw;
};

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
      return jsonResponse({ success: false, error: "Não autenticado", code: "missing_auth" });
    }

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authErr } = await userClient.auth.getUser();
    if (authErr || !user) {
      return jsonResponse({ success: false, error: "Sessão inválida", code: "invalid_session" });
    }

    const body = (await req.json()) as CreateMemberRequest;
    const { email, role, commercial_profile, workspaceId, fullName, password } = body;

    if (!email || !workspaceId || !role) {
      return jsonResponse({ success: false, error: "Campos obrigatórios em falta", code: "missing_fields" });
    }

    const cleanEmail = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      return jsonResponse({ success: false, error: "Email inválido", code: "invalid_email" });
    }

    if (!workspaceRoles.has(role)) {
      return jsonResponse({ success: false, error: "Cargo inválido", code: "invalid_role" });
    }

    if (commercial_profile && !commercialProfiles.has(commercial_profile)) {
      return jsonResponse({ success: false, error: "Perfil comercial inválido", code: "invalid_commercial_profile" });
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

    if (!callerMembership || !["owner", "admin", "agency"].includes(callerMembership.role)) {
      return jsonResponse({ success: false, error: "Sem permissão para adicionar membros", code: "permission_denied" });
    }

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

      console.log("[create-workspace-member] creating auth user", cleanEmail);
      const { data: created, error: createErr } = await admin.auth.admin.createUser({
        email: cleanEmail,
        password: generatedPassword,
        email_confirm: true,
        user_metadata: { full_name: fullName || cleanEmail.split("@")[0] },
      });

      if (createErr || !created.user) {
        console.error("[create-workspace-member] createUser error", createErr);
        // If user already exists in auth but no profile, try to fetch via paginated listUsers
        if (createErr?.message?.toLowerCase().includes("already") || createErr?.message?.toLowerCase().includes("registered")) {
          let page = 1;
          while (page <= 20 && !targetUserId) {
            const { data: list } = await admin.auth.admin.listUsers({ page, perPage: 200 });
            const found = list?.users?.find((u) => u.email?.toLowerCase() === cleanEmail);
            if (found) { targetUserId = found.id; break; }
            if (!list?.users?.length || list.users.length < 200) break;
            page++;
          }
          if (!targetUserId) {
            return new Response(JSON.stringify({ error: createErr.message || "Utilizador já existe mas não foi encontrado" }), {
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
