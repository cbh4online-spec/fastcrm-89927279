import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { ModuleGuard } from "@/components/guards/ModuleGuard";
import { PageHeader } from "@/components/common/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AdvancedFilterBuilder } from "@/components/objects/AdvancedFilterBuilder";
import { FilterCondition, FilterableField } from "@/hooks/useFilterEngine";
import { useAccountBriefSegments } from "@/hooks/useAccountBriefSegments";
import { useAccountBriefAccounts, AccountBriefAccount } from "@/hooks/useAccountBriefAccounts";
import { Plus, Layers, Trash2, Users, Filter, Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";

const SEGMENT_FIELDS: FilterableField[] = [
  { slug: "total_score", name: "Score Total", field_type: "number" },
  { slug: "score_label", name: "Nível de Score", field_type: "select", options: { options: ["Muito Alto", "Alto", "Médio", "Baixo", "Muito Baixo"] } },
  { slug: "probable_sector", name: "Setor", field_type: "text" },
  { slug: "probable_geography", name: "Geografia", field_type: "text" },
  { slug: "commercial_status", name: "Estado Comercial", field_type: "select", options: { options: ["new", "prospecting", "qualifying", "engaged", "won", "lost", "churned"] } },
  { slug: "favorite", name: "Favorita", field_type: "boolean" },
  { slug: "name", name: "Nome", field_type: "text" },
  { slug: "domain", name: "Domínio", field_type: "text" },
];

function applyFiltersToAccounts(accounts: AccountBriefAccount[], conditions: FilterCondition[]): AccountBriefAccount[] {
  if (conditions.length === 0) return accounts;
  return accounts.filter(account => {
    return conditions.every(condition => {
      const val = (account as any)[condition.field];
      const target = condition.value;
      switch (condition.operator) {
        case "eq": return String(val) === String(target);
        case "neq": return String(val) !== String(target);
        case "contains": return String(val || "").toLowerCase().includes(String(target || "").toLowerCase());
        case "not_contains": return !String(val || "").toLowerCase().includes(String(target || "").toLowerCase());
        case "gt": return Number(val) > Number(target);
        case "gte": return Number(val) >= Number(target);
        case "lt": return Number(val) < Number(target);
        case "lte": return Number(val) <= Number(target);
        case "is_empty": return !val || val === "";
        case "is_not_empty": return !!val && val !== "";
        default: return true;
      }
    });
  });
}

export default function AccountBriefSegmentsPage() {
  const { segments, isLoading, createSegment, deleteSegment, computeMembers } = useAccountBriefSegments();
  const { accounts } = useAccountBriefAccounts();
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [isDynamic, setIsDynamic] = useState(true);
  const [conditions, setConditions] = useState<FilterCondition[]>([]);
  const [previewAccounts, setPreviewAccounts] = useState<AccountBriefAccount[] | null>(null);

  const handlePreview = () => {
    const matched = applyFiltersToAccounts(accounts, conditions);
    setPreviewAccounts(matched);
  };

  const handleCreate = async () => {
    if (!newName.trim()) { toast.error("Nome obrigatório"); return; }
    const filterJson = { conditions, logic: "AND" };
    const result = await createSegment.mutateAsync({ name: newName, filterJson, isDynamic });
    if (result && isDynamic) {
      const matched = applyFiltersToAccounts(accounts, conditions);
      await computeMembers.mutateAsync({ segmentId: result.id, accountIds: matched.map(a => a.id) });
    }
    setShowCreate(false);
    setNewName("");
    setConditions([]);
    setPreviewAccounts(null);
  };

  const handleRefresh = async (segment: any) => {
    const filterJson = segment.filter_json as any;
    const segConditions = filterJson?.conditions || [];
    const matched = applyFiltersToAccounts(accounts, segConditions);
    await computeMembers.mutateAsync({ segmentId: segment.id, accountIds: matched.map(a => a.id) });
    toast.success(`${matched.length} contas no segmento`);
  };

  return (
    <ModuleGuard moduleSlug="account-brief" moduleName="Account Brief">
      <DashboardLayout>
        <div className="space-y-6">
          <PageHeader
            title="Segmentos"
            description="Agrupe contas por critérios para ações em lote"
            actions={[
              { label: "Novo Segmento", icon: <Plus className="w-4 h-4" />, onClick: () => setShowCreate(true) },
            ]}
          />

          {isLoading ? (
            <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
          ) : segments.length === 0 ? (
            <Card className="border-0 shadow-lg">
              <CardContent className="py-16 text-center">
                <Layers className="w-12or h-12 mx-auto mb-4 text-muted-foreground/30" />
                <p className="text-lg font-medium mb-2">Sem(h segmentos</p>
                <p className="text-sm text-muted-foreground mb-6">Crie segmentos para agrupar contas por critérios e executar ações em lote.</-p>
                <Button onClick={() => setShowCreate(true)} className="gap-2">
                  <Plus className="w-4 h-4" /> Criar primeiro segmento
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {segments.map(segment => (
                <Card key={segment.id} className="border-0 shadow-lg hover:shadow-xl transition-shadow">
                  <CardContent className="p-5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-500">
                          <Layers className="w-5 h-5" />
                        </div>
                        <div>
                          <h3 className="font-semibold">{segment.name}</h3>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="outline" className="text-xs">
                              {segment.is_dynamic ? "Dinâmico" : "Estático"}
                            </Badge>
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <Users className="w-3 h-3" /> {segment.member_count} contas
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {segment.is_dynamic && (
                          <Button variant="ghost" size="sm" onClick={() => handleRefresh(segment)} className="gap-1">
                            <RefreshCw className="w-3.5 h-3.5" /> Atualizar
                          </Button>
                        )}
                        <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive" onClick={() => deleteSegment.mutate(segment.id)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        <Dialog open={showCreate} onOpenChange={setShowCreate}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Novo Segmento</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Nome do segmento</Label>
                <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Ex: Contas estratégicas" />
              </div>
              <div className="flex items-center gap-3">
                <Switch checked={isDynamic} onCheckedChange={setIsDynamic} />
                <Label>Segmento dinâmico (atualiza automaticamente)</Label>
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-1.5"><Filter className="w-3.5 h-3.5" /> Filtros</Label>
                <AdvancedFilterBuilder fields={SEGMENT_FIELDS} conditions={conditions} onChange={setConditions} />
              </div>
              {conditions.length > 0 && (
                <Button variant="outline" size="sm" onClick={handlePreview} className="gap-1.5">
                  Pré-visualizar ({previewAccounts?.length ?? "?"} contas)
                </Button>
              )}
              {previewAccounts && previewAccounts.length > 0 && (
                <div className="max-h-32 overflow-y-auto border rounded-lg p-2 space-y-1">
                  {previewAccounts.slice(0, 10).map(a => (
                    <div key={a.id} className="text-xs flex justify-between">
                      <span className="font-medium">{a.name}</span>
                      <span className="text-muted-foreground">{a.total_score}</span>
                    </div>
                  ))}
                  {previewAccounts.length > 10 && <p className="text-xs text-muted-foreground">+{previewAccounts.length - 10} mais...</p>}
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCreate(false)}>Cancelar</Button>
              <Button onClick={handleCreate} disabled={createSegment.isPending}>
                {createSegment.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Criar Segmento
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </DashboardLayout>
    </ModuleGuard>
  );
}
