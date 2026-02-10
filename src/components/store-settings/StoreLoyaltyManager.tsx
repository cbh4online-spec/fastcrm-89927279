import { useEffect, useState } from "react";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useLoyaltySettings, useUpsertLoyaltySettings, useLoyaltyTopCustomers } from "@/hooks/useStoreLoyalty";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Save, Loader2, Trophy, Star, Gift } from "lucide-react";

export function StoreLoyaltyManager() {
  const { currentWorkspace } = useWorkspace();
  const wsId = currentWorkspace?.id;
  const { data: settings, isLoading } = useLoyaltySettings(wsId);
  const upsert = useUpsertLoyaltySettings();
  const { data: topCustomers = [] } = useLoyaltyTopCustomers(wsId);

  const [form, setForm] = useState({
    is_active: false,
    points_per_euro: 1,
    points_value_cents: 1,
    min_redeem_points: 100,
  });

  useEffect(() => {
    if (settings) {
      setForm({
        is_active: settings.is_active,
        points_per_euro: settings.points_per_euro,
        points_value_cents: settings.points_value_cents,
        min_redeem_points: settings.min_redeem_points,
      });
    }
  }, [settings]);

  const handleSave = () => {
    if (!wsId) return;
    upsert.mutate({ workspace_id: wsId, ...form });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Example calculations for preview
  const examplePurchase = 50; // 50€
  const earnedPoints = Math.floor(examplePurchase * form.points_per_euro);
  const redeemValue = (form.min_redeem_points * form.points_value_cents / 100).toFixed(2);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Star className="h-5 w-5 text-yellow-500" />
            Programa de Fidelidade
          </CardTitle>
          <CardDescription>
            Configure o sistema de pontos para recompensar clientes fiéis
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Toggle */}
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-base">Ativar Programa</Label>
              <p className="text-xs text-muted-foreground">
                Clientes acumulam pontos por compras e podem trocá-los por descontos
              </p>
            </div>
            <Switch
              checked={form.is_active}
              onCheckedChange={(v) => setForm((p) => ({ ...p, is_active: v }))}
            />
          </div>

          <Separator />

          {/* Points per Euro */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Pontos por EUR gasto</Label>
              <Input
                type="number"
                min={0.1}
                step={0.1}
                value={form.points_per_euro}
                onChange={(e) => setForm((p) => ({ ...p, points_per_euro: parseFloat(e.target.value) || 1 }))}
              />
              <p className="text-xs text-muted-foreground">
                Ex: 1 = cada 1€ gasto = 1 ponto
              </p>
            </div>

            <div className="space-y-2">
              <Label>Valor de cada ponto (cêntimos)</Label>
              <Input
                type="number"
                min={0.1}
                step={0.1}
                value={form.points_value_cents}
                onChange={(e) => setForm((p) => ({ ...p, points_value_cents: parseFloat(e.target.value) || 1 }))}
              />
              <p className="text-xs text-muted-foreground">
                Ex: 1 = cada ponto vale 0,01€
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Mínimo de pontos para resgate</Label>
            <Input
              type="number"
              min={1}
              value={form.min_redeem_points}
              onChange={(e) => setForm((p) => ({ ...p, min_redeem_points: parseInt(e.target.value) || 100 }))}
            />
            <p className="text-xs text-muted-foreground">
              Número mínimo de pontos para trocar por cupão de desconto
            </p>
          </div>

          <Separator />

          {/* Preview */}
          <div className="rounded-lg border bg-muted/30 p-4 space-y-2">
            <h4 className="font-medium flex items-center gap-2">
              <Gift className="h-4 w-4 text-primary" />
              Pré-visualização
            </h4>
            <div className="text-sm text-muted-foreground space-y-1">
              <p>• Compra de <strong>{examplePurchase}€</strong> → ganha <strong>{earnedPoints} pontos</strong></p>
              <p>• Resgate mínimo: <strong>{form.min_redeem_points} pontos</strong> = <strong>{redeemValue}€</strong> de desconto</p>
              <p>• Para acumular {form.min_redeem_points} pontos, precisa gastar <strong>{(form.min_redeem_points / form.points_per_euro).toFixed(0)}€</strong></p>
            </div>
          </div>

          <Button onClick={handleSave} disabled={upsert.isPending} className="gap-2">
            {upsert.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Guardar Configuração
          </Button>
        </CardContent>
      </Card>

      {/* Top Customers */}
      {topCustomers.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-yellow-500" />
              Top Clientes por Pontos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>Utilizador</TableHead>
                  <TableHead className="text-right">Pontos</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {topCustomers.map((c, i) => (
                  <TableRow key={c.user_id}>
                    <TableCell>
                      <Badge variant={i < 3 ? "default" : "secondary"} className="w-7 justify-center">
                        {i + 1}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono text-xs">{c.user_id.slice(0, 8)}...</TableCell>
                    <TableCell className="text-right font-semibold">{c.total_points}</TableCell>
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
