import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useEmailSequences } from "@/hooks/useEmailSequences";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Loader2, Settings2, Wand2 } from "lucide-react";
import { toast } from "sonner";
import { useState, useEffect } from "react";
import { useCreateRecoverySequence } from "@/hooks/useCreateRecoverySequence";

const sb = supabase as any;

interface RecoverySettings {
  id?: string;
  is_enabled: boolean;
  default_sequence_id: string | null;
  auto_enroll_enabled: boolean;
  min_cart_value: number;
  require_email: boolean;
  require_phone: boolean;
  abandonment_delay_minutes: number;
}

const defaults: RecoverySettings = {
  is_enabled: false,
  default_sequence_id: null,
  auto_enroll_enabled: false,
  min_cart_value: 0,
  require_email: true,
  require_phone: false,
  abandonment_delay_minutes: 30,
};

export function StoreRecoverySettings() {
  const { currentWorkspace } = useWorkspace();
  const wid = currentWorkspace?.id;
  const queryClient = useQueryClient();
  const sequences = useEmailSequences();
  const createRecovery = useCreateRecoverySequence();

  const { data: settings, isLoading } = useQuery({
    queryKey: ["store-recovery-settings", wid],
    queryFn: async () => {
      const { data, error } = await sb
        .from("store_recovery_settings")
        .select("*")
        .eq("workspace_id", wid)
        .maybeSingle();
      if (error) throw error;
      return data as (RecoverySettings & { id: string }) | null;
    },
    enabled: !!wid,
  });

  const [form, setForm] = useState<RecoverySettings>(defaults);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (settings) {
      setForm({
        id: settings.id,
        is_enabled: settings.is_enabled,
        default_sequence_id: settings.default_sequence_id,
        auto_enroll_enabled: settings.auto_enroll_enabled,
        min_cart_value: settings.min_cart_value ?? 0,
        require_email: settings.require_email,
        require_phone: settings.require_phone,
        abandonment_delay_minutes: settings.abandonment_delay_minutes ?? 30,
      });
      setDirty(false);
    }
  }, [settings]);

  const update = (patch: Partial<RecoverySettings>) => {
    setForm((prev) => ({ ...prev, ...patch }));
    setDirty(true);
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!wid) throw new Error("No workspace");
      const { error } = await sb.from("store_recovery_settings").upsert(
        {
          workspace_id: wid,
          is_enabled: form.is_enabled,
          default_sequence_id: form.default_sequence_id || null,
          auto_enroll_enabled: form.auto_enroll_enabled,
          min_cart_value: form.min_cart_value,
          require_email: form.require_email,
          require_phone: form.require_phone,
          abandonment_delay_minutes: form.abandonment_delay_minutes,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "workspace_id" },
      );
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["store-recovery-settings"] });
      setDirty(false);
      toast.success("Configurações de recuperação guardadas");
    },
    onError: (e: any) => toast.error("Erro: " + e.message),
  });

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  const activeSequences = (sequences.data || []).filter((s) => s.isActive);

  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="text-base flex items-center gap-2">
          <Settings2 className="h-4 w-4" />
          Recuperação Automática
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Enable */}
        <div className="flex items-center justify-between">
          <Label htmlFor="rec-enabled" className="text-sm">Ativar recuperação</Label>
          <Switch id="rec-enabled" checked={form.is_enabled} onCheckedChange={(v) => update({ is_enabled: v })} />
        </div>

        {form.is_enabled && (
          <>
            {/* Sequence selector */}
            <div className="space-y-1.5">
              <Label className="text-sm">Sequência de recuperação</Label>
              <Select
                value={form.default_sequence_id || ""}
                onValueChange={(v) => update({ default_sequence_id: v || null })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar sequência..." />
                </SelectTrigger>
                <SelectContent>
                  {activeSequences.length === 0 ? (
                    <SelectItem value="__none" disabled>Nenhuma sequência ativa</SelectItem>
                  ) : (
                    activeSequences.map((s) => (
                      <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                size="sm"
                className="w-full mt-2"
                disabled={createRecovery.isPending}
                onClick={async () => {
                  const seqId = await createRecovery.mutateAsync();
                  update({ default_sequence_id: seqId });
                }}
              >
                {createRecovery.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Wand2 className="h-4 w-4 mr-2" />
                )}
                Criar Sequência de Recuperação (3 steps)
              </Button>
            </div>

            {/* Auto enroll */}
            <div className="flex items-center justify-between">
              <Label htmlFor="rec-auto" className="text-sm">Inscrição automática</Label>
              <Switch id="rec-auto" checked={form.auto_enroll_enabled} onCheckedChange={(v) => update({ auto_enroll_enabled: v })} />
            </div>

            {/* Min value */}
            <div className="space-y-1.5">
              <Label className="text-sm">Valor mínimo do carrinho (€)</Label>
              <Input
                type="number"
                min={0}
                step={0.01}
                value={form.min_cart_value}
                onChange={(e) => update({ min_cart_value: parseFloat(e.target.value) || 0 })}
              />
            </div>

            {/* Delay */}
            <div className="space-y-1.5">
              <Label className="text-sm">Minutos de inatividade</Label>
              <Input
                type="number"
                min={5}
                value={form.abandonment_delay_minutes}
                onChange={(e) => update({ abandonment_delay_minutes: parseInt(e.target.value) || 30 })}
              />
            </div>

            {/* Requirements */}
            <div className="flex items-center justify-between">
              <Label htmlFor="rec-email" className="text-sm">Exigir email</Label>
              <Switch id="rec-email" checked={form.require_email} onCheckedChange={(v) => update({ require_email: v })} />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="rec-phone" className="text-sm">Exigir telefone</Label>
              <Switch id="rec-phone" checked={form.require_phone} onCheckedChange={(v) => update({ require_phone: v })} />
            </div>
          </>
        )}

        {dirty && (
          <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending} className="w-full">
            {saveMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Guardar
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
