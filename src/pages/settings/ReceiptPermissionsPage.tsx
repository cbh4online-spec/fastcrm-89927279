import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { CapabilityGuard } from "@/components/guards/CapabilityGuard";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { roleHasCapability } from "@/lib/permissions/capabilities";

const ROLE_LABEL: Record<string, string> = {
  owner: "Dono", admin: "Admin", agency: "Agência", hr: "RH", agent: "Agente", viewer: "Leitura",
};

function useReceiptPermissionMembers(workspaceId?: string) {
  return useQuery({
    queryKey: ["receipt-permission-members", workspaceId],
    enabled: !!workspaceId,
    queryFn: async () => {
      const { data: members, error } = await supabase
        .from("workspace_members").select("user_id, role").eq("workspace_id", workspaceId!);
      if (error) throw error;
      const ids = (members ?? []).map((m: any) => m.user_id);
      const [{ data: profs }, { data: grants, error: gErr }] = await Promise.all([
        supabase.from("profiles").select("id, full_name, email").in("id", ids.length ? ids : ["00000000-0000-0000-0000-000000000000"]),
        supabase.from("workspace_member_capability_grants").select("user_id")
          .eq("workspace_id", workspaceId!).eq("capability", "finance.manage"),
      ]);
      if (gErr) throw gErr;
      const granted = new Set((grants ?? []).map((g) => g.user_id));
      const byId = Object.fromEntries((profs ?? []).map((p: any) => [p.id, p]));
      return (members ?? []).map((m: any) => ({
        user_id: m.user_id as string,
        role: String(m.role),
        name: byId[m.user_id]?.full_name || byId[m.user_id]?.email || "Utilizador",
        email: byId[m.user_id]?.email || "",
        byRole: roleHasCapability(m.role, "finance.manage"),
        granted: granted.has(m.user_id),
      })).sort((a, b) => a.name.localeCompare(b.name, "pt"));
    },
  });
}

function ReceiptPermissionsContent() {
  const { currentWorkspace } = useWorkspace();
  const wsId = currentWorkspace?.id;
  const qc = useQueryClient();
  const { data, isLoading, error } = useReceiptPermissionMembers(wsId);

  const toggle = useMutation({
    mutationFn: async ({ userId, on }: { userId: string; on: boolean }) => {
      if (on) {
        const { data: auth } = await supabase.auth.getUser();
        const { error } = await supabase.from("workspace_member_capability_grants").insert({
          workspace_id: wsId!, user_id: userId, capability: "finance.manage", granted_by: auth.user?.id,
        });
        if (error) throw error;
      } else {
        const { error } = await supabase.from("workspace_member_capability_grants").delete()
          .eq("workspace_id", wsId!).eq("user_id", userId).eq("capability", "finance.manage");
        if (error) throw error;
      }
    },
    onSuccess: (_, v) => {
      qc.invalidateQueries({ queryKey: ["receipt-permission-members", wsId] });
      qc.invalidateQueries({ queryKey: ["capability-grants", wsId] });
      toast.success(v.on ? "Permissão concedida" : "Permissão retirada");
    },
    onError: () => toast.error("Não foi possível alterar a permissão"),
  });

  return (
    <div className="container max-w-3xl py-6 space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Permissões de recibos</h1>
        <p className="text-sm text-muted-foreground">
          Escolha quem pode corrigir ou anular recibos. O papel e as restantes permissões de cada pessoa não mudam.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Membros</CardTitle>
          <CardDescription>Donos e admins têm sempre este acesso.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? <p className="text-sm text-muted-foreground">A carregar…</p>
            : error ? <p className="text-sm text-destructive">Não foi possível carregar os membros.</p>
            : !data?.length ? <p className="text-sm text-muted-foreground">Sem membros.</p>
            : (
              <ul className="divide-y">
                {data.map((m) => {
                  const checked = m.byRole || m.granted;
                  return (
                    <li key={m.user_id} className="flex items-center justify-between gap-3 py-3">
                      <div className="min-w-0">
                        <p className="font-medium truncate">{m.name}</p>
                        <p className="text-xs text-muted-foreground truncate">{m.email}</p>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <Badge variant="outline">{ROLE_LABEL[m.role] ?? m.role}</Badge>
                        <Switch
                          aria-label={`Pode corrigir/anular recibos: ${m.name}`}
                          checked={checked}
                          disabled={m.byRole || toggle.isPending}
                          onCheckedChange={(on) => toggle.mutate({ userId: m.user_id, on })}
                        />
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function ReceiptPermissionsPage() {
  return (
    <CapabilityGuard need="workspace.manage" fallback={<div className="container py-10 text-sm text-muted-foreground">Acesso restrito a donos e admins.</div>}>
      <ReceiptPermissionsContent />
    </CapabilityGuard>
  );
}
