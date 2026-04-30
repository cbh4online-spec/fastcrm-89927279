import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Settings2, Loader2, Globe, Building2 } from "lucide-react";

const SALES_FUNCTIONS = [
  { value: "vendedor", label: "Vendedor" },
  { value: "gestor", label: "Gestor" },
  { value: "diretor", label: "Diretor" },
  { value: "ceo", label: "CEO" },
];

interface Props {
  pageKeys: string[]; // páginas existentes
}

export function FieldDefaultsDialog({ pageKeys }: Props) {
  const queryClient = useQueryClient();
  const { currentWorkspace, isSuperAdmin } = useWorkspace();
  const [open, setOpen] = useState(false);
  const [pageKey, setPageKey] = useState<string>(pageKeys[0] ?? "");
  const [scope, setScope] = useState<"current" | "all">("current");
  const [perProfile, setPerProfile] = useState<Record<string, boolean>>({
    vendedor: true, gestor: true, diretor: true, ceo: true,
  });
  const [submitting, setSubmitting] = useState(false);

  // Pré-visualizar quantos campos serão afectados
  const { data: fieldCount } = useQuery({
    queryKey: ["field-defaults-preview", pageKey, scope, currentWorkspace?.id],
    queryFn: async () => {
      if (!pageKey) return 0;
      let q = supabase
        .from("profile_field_permissions")
        .select("field_key", { count: "exact", head: false })
        .eq("page_key", pageKey);
      if (scope === "current" && currentWorkspace?.id) {
        q = q.eq("workspace_id", currentWorkspace.id);
      }
      const { data, error } = await q;
      if (error) return 0;
      return new Set((data ?? []).map((r: any) => r.field_key)).size;
    },
    enabled: open && !!pageKey,
  });

  const apply = async () => {
    if (!pageKey) return toast.error("Escolha uma página");
    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke("apply-field-permission-defaults", {
        body: {
          scope,
          workspaceId: currentWorkspace?.id,
          pageKey,
          perProfile,
        },
      });
      if (error) throw error;
      if ((data as any)?.fallback) {
        const reason = (data as any).error || "desconhecido";
        const map: Record<string, string> = {
          unauthenticated: "Sessão expirada. Faça login novamente.",
          forbidden_super_admin: "Apenas super-admin pode aplicar a todos os workspaces.",
          forbidden_role: "Sem permissões para gerir permissões neste workspace.",
          missing_workspace: "Workspace não identificado.",
        };
        throw new Error(map[reason] ?? reason);
      }
      toast.success(
        `Aplicado em ${data.workspaces} workspace(s) · ${data.fields} campo(s) · ${data.profiles} perfil(is)`
      );
      await queryClient.invalidateQueries({ queryKey: ["profile-field-permissions"] });
      await queryClient.invalidateQueries({ queryKey: ["profile-permission-audit"] });
      setOpen(false);
    } catch (e: any) {
      toast.error(`Erro: ${e?.message ?? "desconhecido"}`);
    } finally {
      setSubmitting(false);
    }
  };

  const allOn = Object.values(perProfile).every(Boolean);
  const allOff = Object.values(perProfile).every((v) => !v);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <Settings2 className="h-4 w-4 mr-1" /> Defaults por Página
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Aplicar defaults de visibilidade</DialogTitle>
          <DialogDescription>
            Define o estado dos campos de uma página para cada perfil comercial e aplica em massa.
            As alterações ficam registadas no histórico de auditoria.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Página */}
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Página</Label>
            <Select value={pageKey} onValueChange={setPageKey}>
              <SelectTrigger><SelectValue placeholder="Escolha uma página" /></SelectTrigger>
              <SelectContent>
                {pageKeys.map((k) => (
                  <SelectItem key={k} value={k}><code className="text-xs">{k}</code></SelectItem>
                ))}
              </SelectContent>
            </Select>
            {fieldCount !== undefined && (
              <p className="text-[11px] text-muted-foreground">
                {fieldCount} campo(s) serão afectados.
              </p>
            )}
          </div>

          {/* Âmbito */}
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Âmbito</Label>
            <RadioGroup value={scope} onValueChange={(v) => setScope(v as any)}>
              <div className="flex items-center gap-2 rounded-md border p-2.5">
                <RadioGroupItem value="current" id="scope-current" />
                <Label htmlFor="scope-current" className="flex items-center gap-2 cursor-pointer flex-1 text-sm font-normal">
                  <Building2 className="h-3.5 w-3.5" />
                  Workspace atual
                  <Badge variant="secondary" className="ml-auto text-[10px]">{currentWorkspace?.name ?? "—"}</Badge>
                </Label>
              </div>
              <div className={`flex items-center gap-2 rounded-md border p-2.5 ${!isSuperAdmin ? "opacity-50" : ""}`}>
                <RadioGroupItem value="all" id="scope-all" disabled={!isSuperAdmin} />
                <Label htmlFor="scope-all" className="flex items-center gap-2 cursor-pointer flex-1 text-sm font-normal">
                  <Globe className="h-3.5 w-3.5" />
                  Todos os workspaces
                  {!isSuperAdmin && <Badge variant="outline" className="ml-auto text-[10px]">só super-admin</Badge>}
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Defaults por perfil */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-xs text-muted-foreground">Visibilidade por perfil</Label>
              <div className="flex gap-1">
                <Button
                  size="sm" variant="ghost" className="h-6 text-[11px]"
                  onClick={() => setPerProfile(Object.fromEntries(SALES_FUNCTIONS.map((f) => [f.value, true])))}
                  disabled={allOn}
                >
                  Todos visíveis
                </Button>
                <Button
                  size="sm" variant="ghost" className="h-6 text-[11px]"
                  onClick={() => setPerProfile(Object.fromEntries(SALES_FUNCTIONS.map((f) => [f.value, false])))}
                  disabled={allOff}
                >
                  Todos ocultos
                </Button>
              </div>
            </div>
            <div className="rounded-md border divide-y">
              {SALES_FUNCTIONS.map((fn) => (
                <div key={fn.value} className="flex items-center justify-between px-3 py-2">
                  <span className="text-sm">{fn.label}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">
                      {perProfile[fn.value] ? "Visível" : "Oculto"}
                    </span>
                    <Switch
                      checked={!!perProfile[fn.value]}
                      onCheckedChange={(v) => setPerProfile((p) => ({ ...p, [fn.value]: v }))}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={submitting}>
            Cancelar
          </Button>
          <Button onClick={apply} disabled={submitting || !pageKey}>
            {submitting && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
            Aplicar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
