import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useReferralSettings, useUpsertReferralSettings, useTopReferrers } from "@/hooks/useStoreReferrals";
import { Users, Gift, Save, Loader2, Trophy } from "lucide-react";
import { toast } from "sonner";

export function StoreReferralManager() {
  const { currentWorkspace } = useWorkspace();
  const wsId = currentWorkspace?.id;
  const { data: settings, isLoading } = useReferralSettings(wsId);
  const upsert = useUpsertReferralSettings();
  const { data: topReferrers = [] } = useTopReferrers(wsId);

  const [form, setForm] = useState({
    is_active: false,
    referrer_reward_points: 50,
    referee_discount_percent: "",
    referee_discount_amount: "",
    min_order_value: "0",
  });

  useEffect(() => {
    if (settings) {
      setForm({
        is_active: settings.is_active,
        referrer_reward_points: settings.referrer_reward_points,
        referee_discount_percent: settings.referee_discount_percent?.toString() || "",
        referee_discount_amount: settings.referee_discount_amount?.toString() || "",
        min_order_value: settings.min_order_value?.toString() || "0",
      });
    }
  }, [settings]);

  const handleSave = async () => {
    if (!wsId) return;
    try {
      await upsert.mutateAsync({
        workspace_id: wsId,
        is_active: form.is_active,
        referrer_reward_points: form.referrer_reward_points,
        referee_discount_percent: form.referee_discount_percent ? parseFloat(form.referee_discount_percent) : null,
        referee_discount_amount: form.referee_discount_amount ? parseFloat(form.referee_discount_amount) : null,
        min_order_value: parseFloat(form.min_order_value) || 0,
      });
      toast.success("Configurações de referrals guardadas!");
    } catch {
      toast.error("Erro ao guardar configurações");
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Programa de Referrals
          </CardTitle>
          <CardDescription>
            Clientes partilham um link e ganham pontos por cada amigo que compra
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <Label>Ativar Programa</Label>
              <p className="text-xs text-muted-foreground">Permitir que clientes partilhem códigos de referral</p>
            </div>
            <Switch
              checked={form.is_active}
              onCheckedChange={(v) => setForm((p) => ({ ...p, is_active: v }))}
            />
          </div>

          <Separator />

          <div className="space-y-4">
            <h4 className="font-medium flex items-center gap-2">
              <Gift className="h-4 w-4" />
              Recompensas
            </h4>

            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Pontos para quem refere</Label>
                <Input
                  type="number"
                  min={0}
                  value={form.referrer_reward_points}
                  onChange={(e) => setForm((p) => ({ ...p, referrer_reward_points: parseInt(e.target.value) || 0 }))}
                />
                <p className="text-xs text-muted-foreground">Pontos de fidelidade creditados ao referrer</p>
              </div>

              <div className="space-y-2">
                <Label>Desconto para o amigo (%)</Label>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  placeholder="Ex: 10"
                  value={form.referee_discount_percent}
                  onChange={(e) => setForm((p) => ({ ...p, referee_discount_percent: e.target.value }))}
                />
                <p className="text-xs text-muted-foreground">Desconto % na primeira compra do amigo (opcional)</p>
              </div>

              <div className="space-y-2">
                <Label>Desconto fixo para o amigo (€)</Label>
                <Input
                  type="number"
                  min={0}
                  step="0.01"
                  placeholder="Ex: 5.00"
                  value={form.referee_discount_amount}
                  onChange={(e) => setForm((p) => ({ ...p, referee_discount_amount: e.target.value }))}
                />
                <p className="text-xs text-muted-foreground">Alternativa: valor fixo de desconto (opcional)</p>
              </div>

              <div className="space-y-2">
                <Label>Valor mínimo de encomenda (€)</Label>
                <Input
                  type="number"
                  min={0}
                  step="0.01"
                  value={form.min_order_value}
                  onChange={(e) => setForm((p) => ({ ...p, min_order_value: e.target.value }))}
                />
                <p className="text-xs text-muted-foreground">Valor mínimo para aplicar o desconto de referral</p>
              </div>
            </div>
          </div>

          <Button onClick={handleSave} disabled={upsert.isPending} className="gap-2">
            {upsert.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Guardar
          </Button>
        </CardContent>
      </Card>

      {/* Top Referrers */}
      {topReferrers.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Trophy className="h-5 w-5 text-yellow-500" />
              Top Referrers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>Código</TableHead>
                  <TableHead className="text-right">Referências</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {topReferrers.map((r, i) => (
                  <TableRow key={r.code}>
                    <TableCell>
                      {i < 3 ? (
                        <Badge variant={i === 0 ? "default" : "secondary"} className="text-xs">
                          {i + 1}º
                        </Badge>
                      ) : (
                        <span className="text-sm text-muted-foreground">{i + 1}º</span>
                      )}
                    </TableCell>
                    <TableCell className="font-mono text-sm">{r.code}</TableCell>
                    <TableCell className="text-right font-medium">{r.uses_count}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
