import { useState, useMemo, useCallback } from "react";
import { useAllFeatureFlags, ALL_FLAG_KEYS, FlagAdoption } from "@/hooks/useAllFeatureFlags";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Loader2, FlaskConical, Rocket, CheckCircle2, XCircle, MinusCircle } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const CANARY_PRESETS = [
  { label: "10%", value: 0.1 },
  { label: "25%", value: 0.25 },
  { label: "50%", value: 0.5 },
  { label: "100%", value: 1 },
];

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function RolloutDashboardSection() {
  const { allFlags, workspaces, adoptionByFlag, bulkToggle, isLoading, flagMeta } = useAllFeatureFlags();
  const [selectedFlag, setSelectedFlag] = useState<string>(ALL_FLAG_KEYS[0]);
  const [selectedWs, setSelectedWs] = useState<Set<string>>(new Set());
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    title: string;
    description: string;
    onConfirm: () => void;
  }>({ open: false, title: "", description: "", onConfirm: () => {} });

  const workspaceRows = useMemo(() => {
    return workspaces.map((ws) => {
      const flag = allFlags.find((f) => f.workspace_id === ws.id && f.flag_key === selectedFlag);
      return {
        id: ws.id,
        name: ws.name,
        plan: ws.subscription?.plan || "free",
        status: flag ? (flag.enabled ? "enabled" : "disabled") : "not_set",
        enabled: flag?.enabled ?? false,
      };
    });
  }, [workspaces, allFlags, selectedFlag]);

  const allSelected = workspaceRows.length > 0 && selectedWs.size === workspaceRows.length;

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedWs(new Set());
    } else {
      setSelectedWs(new Set(workspaceRows.map((r) => r.id)));
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedWs((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleBulkToggle = useCallback(
    (enabled: boolean) => {
      const ids = Array.from(selectedWs);
      if (!ids.length) return;
      setConfirmDialog({
        open: true,
        title: enabled ? "Ativar Feature Flag" : "Desativar Feature Flag",
        description: `${enabled ? "Ativar" : "Desativar"} "${flagMeta[selectedFlag]?.label || selectedFlag}" para ${ids.length} workspace(s)?`,
        onConfirm: () => {
          bulkToggle.mutate(
            { flagKey: selectedFlag, workspaceIds: ids, enabled },
            {
              onSuccess: () => {
                toast.success(`Flag ${enabled ? "ativada" : "desativada"} para ${ids.length} workspaces`);
                setSelectedWs(new Set());
              },
              onError: () => toast.error("Erro ao atualizar flags"),
            }
          );
          setConfirmDialog((p) => ({ ...p, open: false }));
        },
      });
    },
    [selectedWs, selectedFlag, bulkToggle, flagMeta]
  );

  const handleCanary = useCallback(
    (pct: number) => {
      const count = Math.ceil(workspaces.length * pct);
      const ids = shuffle(workspaces.map((w) => w.id)).slice(0, count);
      setConfirmDialog({
        open: true,
        title: "Canary Release",
        description: `Ativar "${flagMeta[selectedFlag]?.label || selectedFlag}" para ${count} de ${workspaces.length} workspaces (${Math.round(pct * 100)}%) selecionados aleatoriamente?`,
        onConfirm: () => {
          bulkToggle.mutate(
            { flagKey: selectedFlag, workspaceIds: ids, enabled: true },
            {
              onSuccess: () => toast.success(`Canary release: ${count} workspaces ativados`),
              onError: () => toast.error("Erro no canary release"),
            }
          );
          setConfirmDialog((p) => ({ ...p, open: false }));
        },
      });
    },
    [workspaces, selectedFlag, bulkToggle, flagMeta]
  );

  const handleSingleToggle = (wsId: string, enabled: boolean) => {
    bulkToggle.mutate(
      { flagKey: selectedFlag, workspaceIds: [wsId], enabled },
      {
        onSuccess: () => toast.success(`Flag ${enabled ? "ativada" : "desativada"}`),
        onError: () => toast.error("Erro ao atualizar flag"),
      }
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <FlaskConical className="h-6 w-6" />
          Rollout Dashboard
        </h1>
        <p className="text-muted-foreground">
          Gestão de feature flags por workspace com controlo de canary releases
        </p>
      </div>

      {/* Adoption Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {adoptionByFlag.map((flag: FlagAdoption) => (
          <Card
            key={flag.flagKey}
            className={cn(
              "cursor-pointer transition-all hover:shadow-md",
              selectedFlag === flag.flagKey && "ring-2 ring-primary"
            )}
            onClick={() => {
              setSelectedFlag(flag.flagKey);
              setSelectedWs(new Set());
            }}
          >
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">{flag.label}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="text-2xl font-bold">{flag.rate}%</div>
              <Progress value={flag.rate} className="h-2" />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3 text-green-500" /> {flag.enabled}
                </span>
                <span className="flex items-center gap-1">
                  <XCircle className="h-3 w-3 text-red-500" /> {flag.disabled}
                </span>
                <span className="flex items-center gap-1">
                  <MinusCircle className="h-3 w-3" /> {flag.noRecord}
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Canary Presets */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Rocket className="h-4 w-4" />
            Canary Release — {flagMeta[selectedFlag]?.label || selectedFlag}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {CANARY_PRESETS.map((preset) => (
              <Button
                key={preset.label}
                variant="outline"
                size="sm"
                onClick={() => handleCanary(preset.value)}
                disabled={bulkToggle.isPending}
              >
                Ativar para {preset.label}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Bulk Actions + Table */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium">
              Workspaces — {flagMeta[selectedFlag]?.label || selectedFlag}
            </CardTitle>
            {selectedWs.size > 0 && (
              <div className="flex items-center gap-2">
                <Badge variant="secondary">{selectedWs.size} selecionados</Badge>
                <Button size="sm" onClick={() => handleBulkToggle(true)} disabled={bulkToggle.isPending}>
                  Ativar
                </Button>
                <Button size="sm" variant="outline" onClick={() => handleBulkToggle(false)} disabled={bulkToggle.isPending}>
                  Desativar
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">
                  <Checkbox checked={allSelected} onCheckedChange={toggleSelectAll} />
                </TableHead>
                <TableHead>Workspace</TableHead>
                <TableHead>Plano</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="w-20 text-right">Toggle</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {workspaceRows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>
                    <Checkbox
                      checked={selectedWs.has(row.id)}
                      onCheckedChange={() => toggleSelect(row.id)}
                    />
                  </TableCell>
                  <TableCell className="font-medium">{row.name}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="capitalize">{row.plan}</Badge>
                  </TableCell>
                  <TableCell>
                    {row.status === "enabled" && (
                      <Badge className="bg-green-500/10 text-green-600 border-green-500/20">Ativo</Badge>
                    )}
                    {row.status === "disabled" && (
                      <Badge variant="secondary">Inativo</Badge>
                    )}
                    {row.status === "not_set" && (
                      <Badge variant="outline" className="text-muted-foreground">Não definido</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <Switch
                      checked={row.enabled}
                      onCheckedChange={(checked) => handleSingleToggle(row.id, checked)}
                      disabled={bulkToggle.isPending}
                    />
                  </TableCell>
                </TableRow>
              ))}
              {workspaceRows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                    Nenhum workspace encontrado
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Confirm Dialog */}
      <AlertDialog open={confirmDialog.open} onOpenChange={(o) => setConfirmDialog((p) => ({ ...p, open: o }))}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirmDialog.title}</AlertDialogTitle>
            <AlertDialogDescription>{confirmDialog.description}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDialog.onConfirm}>Confirmar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
