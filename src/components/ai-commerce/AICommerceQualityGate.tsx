/**
 * Gate de qualidade AI Commerce.
 *
 * Mostra as regras do porteiro, os produtos bloqueados com o motivo concreto e
 * permite correções em massa apenas de campos deriváveis de dados reais.
 */
import { useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, EyeOff, Loader2, RefreshCw, ShieldCheck, Wrench } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useQualityGate } from "@/hooks/useAICommerceGate";
import { gateBlockerSummary } from "@/lib/ai-commerce/qualityGate";
import { GATE_FIX_LABELS, type GateFixCode } from "@/lib/ai-commerce/gateFixes";

const FIX_CODES = Object.keys(GATE_FIX_LABELS) as GateFixCode[];

export function AICommerceQualityGate() {
  const {
    config,
    saveConfig,
    blockedRows,
    reasons,
    stats,
    isLoading,
    recompute,
    applyFixes,
    unpublishBlocked,
  } = useQualityGate();

  const [minScore, setMinScore] = useState<string>(String(config.minScore));
  const [selectedFixes, setSelectedFixes] = useState<GateFixCode[]>([]);

  const busy = recompute.isPending || applyFixes.isPending || unpublishBlocked.isPending;
  const visibleBlocked = useMemo(() => blockedRows.slice(0, 50), [blockedRows]);

  const toggleFix = (code: GateFixCode, checked: boolean) =>
    setSelectedFixes((prev) => (checked ? [...prev, code] : prev.filter((c) => c !== code)));

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-28 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Produtos avaliados", value: stats.total, icon: ShieldCheck },
          { label: "Aprovados", value: stats.passed, icon: CheckCircle2 },
          { label: "Bloqueados", value: stats.blocked, icon: AlertTriangle },
          { label: "Bloqueados mas publicados", value: stats.blockedPublished, icon: EyeOff },
        ].map((kpi) => (
          <Card key={kpi.label}>
            <CardContent className="flex items-center justify-between p-4">
              <div>
                <p className="text-sm text-muted-foreground">{kpi.label}</p>
                <p className="text-2xl font-semibold">{kpi.value}</p>
              </div>
              <kpi.icon className="h-5 w-5 text-muted-foreground" aria-hidden />
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Regras do gate</CardTitle>
          <CardDescription>
            Produtos incompletos deixam de aparecer na loja pública e nos feeds externos. A decisão é sempre
            recalculada no servidor.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-6">
            <div className="flex items-center gap-2">
              <Switch
                id="gate-enabled"
                checked={config.enabled}
                onCheckedChange={(v) => saveConfig.mutate({ enabled: v })}
              />
              <Label htmlFor="gate-enabled">Gate ativo</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                id="gate-store"
                checked={config.blockStore}
                onCheckedChange={(v) => saveConfig.mutate({ blockStore: v })}
              />
              <Label htmlFor="gate-store">Bloquear na loja</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                id="gate-feeds"
                checked={config.blockFeeds}
                onCheckedChange={(v) => saveConfig.mutate({ blockFeeds: v })}
              />
              <Label htmlFor="gate-feeds">Bloquear nos feeds</Label>
            </div>
            <div className="flex items-end gap-2">
              <div className="space-y-1">
                <Label htmlFor="gate-min-score">Readiness mínimo</Label>
                <Input
                  id="gate-min-score"
                  type="number"
                  min={0}
                  max={100}
                  value={minScore}
                  onChange={(e) => setMinScore(e.target.value)}
                  className="w-24"
                />
              </div>
              <Button
                variant="secondary"
                onClick={() => saveConfig.mutate({ minScore: Number(minScore) || 0 })}
                disabled={saveConfig.isPending}
              >
                Guardar
              </Button>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button onClick={() => recompute.mutate()} disabled={busy}>
              {recompute.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
              ) : (
                <RefreshCw className="mr-2 h-4 w-4" aria-hidden />
              )}
              Reavaliar catálogo
            </Button>
            <Button
              variant="outline"
              onClick={() => unpublishBlocked.mutate()}
              disabled={busy || stats.blockedPublished === 0}
            >
              <EyeOff className="mr-2 h-4 w-4" aria-hidden />
              Retirar bloqueados da loja ({stats.blockedPublished})
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Correções em massa</CardTitle>
          <CardDescription>
            Só campos deriváveis dos dados existentes. Preços, stock, GTIN/MPN, marca e conteúdo comercial nunca
            são alterados automaticamente.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            {FIX_CODES.map((code) => (
              <label key={code} className="flex items-start gap-2 text-sm">
                <Checkbox
                  checked={selectedFixes.includes(code)}
                  onCheckedChange={(v) => toggleFix(code, v === true)}
                  aria-label={GATE_FIX_LABELS[code]}
                />
                <span>{GATE_FIX_LABELS[code]}</span>
              </label>
            ))}
          </div>
          <Button
            onClick={() => applyFixes.mutate({ fixes: selectedFixes })}
            disabled={busy || selectedFixes.length === 0}
          >
            {applyFixes.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
            ) : (
              <Wrench className="mr-2 h-4 w-4" aria-hidden />
            )}
            Aplicar ao catálogo
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Motivos de bloqueio</CardTitle>
          <CardDescription>Agrupados por critério, do mais frequente para o menos frequente.</CardDescription>
        </CardHeader>
        <CardContent>
          {reasons.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum produto bloqueado. Catálogo pronto para IA.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {reasons.map((reason) => (
                <Badge key={reason.code} variant="secondary" className="gap-1">
                  {reason.label}
                  <span className="text-muted-foreground">({reason.productIds.length})</span>
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {visibleBlocked.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Produtos bloqueados</CardTitle>
            <CardDescription>
              A mostrar {visibleBlocked.length} de {stats.blocked}.
            </CardDescription>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Produto</TableHead>
                  <TableHead className="w-24">Readiness</TableHead>
                  <TableHead>Motivos</TableHead>
                  <TableHead className="w-28">Na loja</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visibleBlocked.map((row) => (
                  <TableRow key={row.product.id}>
                    <TableCell className="font-medium">
                      {row.product.name || "Sem nome"}
                      {row.product.sku ? (
                        <span className="ml-2 text-xs text-muted-foreground">{row.product.sku}</span>
                      ) : null}
                    </TableCell>
                    <TableCell>{row.readiness.score}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {gateBlockerSummary(row.gate.blockers, 4)}
                    </TableCell>
                    <TableCell>
                      {row.product.store_published ? (
                        <Badge variant="destructive">Publicado</Badge>
                      ) : (
                        <Badge variant="outline">Fora da loja</Badge>
                      )}
                    </TableCell>
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
