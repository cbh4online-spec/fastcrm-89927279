import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { z } from "npm:zod@3";

const Body = z.object({
  workspaceId: z.string().uuid(),
  userId: z.string().uuid(),
  action: z.enum(["set_password", "send_reset"]),
  password: z.string().min(8).max(72).optional(),
});

const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const token = (req.headers.get("Authorization") || "").replace("Bearer ", "");
    const { data: { user } } = await admin.auth.getUser(token);
    if (!user) return json({ error: "Sessão inválida" }, 401);

    const parsed = Body.safeParse(await req.json());
    if (!parsed.success) return json({ error: "Dados inválidos (palavra-passe com 8 a 72 caracteres)" }, 400);
    const { workspaceId, userId, action, password } = parsed.data;
    if (userId === user.id) return json({ error: "Use o seu perfil para alterar a sua palavra-passe" }, 400);

    const { data: members } = await admin
      .from("workspace_members").select("user_id, role")
      .eq("workspace_id", workspaceId).in("user_id", [user.id, userId]);
    const me = members?.find((m) => m.user_id === user.id);
    const target = members?.find((m) => m.user_id === userId);
    const { data: isSuper } = await admin.rpc("is_super_admin", { _user_id: user.id });
    const canManage = isSuper || ["owner", "admin", "agency"].includes(me?.role ?? "");
    if (!canManage) return json({ error: "Sem permissão" }, 403);
    if (!target) return json({ error: "Utilizador não pertence a este workspace" }, 404);
    if (target.role === "owner" && !isSuper) return json({ error: "Não pode alterar o dono do workspace" }, 403);

    if (action === "set_password") {
      if (!password) return json({ error: "Palavra-passe obrigatória" }, 400);
      const { error } = await admin.auth.admin.updateUserById(userId, { password });
      if (error) return json({ error: error.message }, 400);
    } else {
      const { data: t } = await admin.auth.admin.getUserById(userId);
      const email = t?.user?.email;
      if (!email) return json({ error: "Utilizador sem email" }, 400);
      const { error } = await admin.auth.resetPasswordForEmail(email, {
        redirectTo: `${req.headers.get("origin") ?? ""}/reset-password`,
      });
      if (error) return json({ error: error.message }, 400);
    }

    await admin.from("admin_audit_logs").insert({
      admin_user_id: user.id,
      action_type: action === "set_password" ? "workspace_set_member_password" : "workspace_send_member_reset",
      target_type: "user", target_id: userId,
      details: { workspace_id: workspaceId },
    });
    return json({ success: true });
  } catch (e) {
    console.error("workspace-member-password", (e as Error).message);
    return json({ error: "Erro interno" }, 500);
  }
});
