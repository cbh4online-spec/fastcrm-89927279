import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MoreHorizontal, Search, ArrowRight, XCircle, CheckCircle2, ChevronDown, Pause, Play, Clock, Eye, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { pt } from "date-fns/locale";
import type { SDREnrollment } from "@/hooks/useSDRCampaigns";
import type { SDRPipelineStage } from "@/hooks/useSDRPipelineStages";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { usePauseResumeSequence } from "@/hooks/useSDRSequenceExecution";
import { EnrollmentTimeline } from "@/components/sequences/EnrollmentTimeline";

interface SDRProspectActionsProps {
  enrollments: SDREnrollment[];
  stages: SDRPipelineStage[];
  stageFilter: string | null;
  onClearFilter: () => void;
  campaignId: string;
}

const statusBadgeConfig: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
  enrolled: { label: "Enrolled", variant: "outline" },
  enriching: { label: "Enriquecendo", variant: "secondary" },
  sequenced: { label: "Em Sequência", variant: "default" },
  paused: { label: "Pausado", variant: "secondary" },
  replied: { label: "Respondeu", variant: "secondary" },
  positive_reply: { label: "Reply +", variant: "default" },
  meeting_set: { label: "Reunião", variant: "default" },
  converted: { label: "Convertido", variant: "default" },
  completed: { label: "Concluído", variant: "secondary" },
  opted_out: { label: "Opt-out", variant: "destructive" },
  failed: { label: "Falhou", variant: "destructive" },
};

export function SDRProspectActions({
  enrollments,
  stages,
  stageFilter,
  onClearFilter,
  campaignId,
}: SDRProspectActionsProps) {
  const queryClient = useQueryClient();
  const { pauseSequence, resumeSequence } = usePauseResumeSequence();
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkMoving, setBulkMoving] = useState(false);
  const [previewEnrollment, setPreviewEnrollment] = useState<SDREnrollment | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewResult, setPreviewResult] = useState<{ subject: string; body: string; ai_used: boolean } | null>(null);

  const filtered = useMemo(() => {
    let list = stageFilter
      ? enrollments.filter((e) => e.status === stageFilter)
      : enrollments;
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (e) =>
          (e.prospect_name || "").toLowerCase().includes(q) ||
          (e.prospect_email || "").toLowerCase().includes(q)
      );
    }
    return list;
  }, [enrollments, stageFilter, search]);

  const allSelected = filtered.length > 0 && filtered.every((e) => selectedIds.has(e.id));

  const toggleAll = () => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map((e) => e.id)));
    }
  };

  const toggleOne = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const moveToStage = async (ids: string[], newStatus: string) => {
    setBulkMoving(true);
    try {
      const updates = ids.map((id) =>
        supabase
          .from("sdr_enrollments")
          .update({ status: newStatus })
          .eq("id", id)
      );
      await Promise.all(updates);
      toast.success(`${ids.length} prospect(s) movido(s)`);
      setSelectedIds(new Set());
      queryClient.invalidateQueries({ queryKey: ["sdr-enrollments", campaignId] });
      queryClient.invalidateQueries({ queryKey: ["sdr-aggregated-stats"] });
    } catch (err: any) {
      toast.error(err.message || "Erro ao mover prospects");
    } finally {
      setBulkMoving(false);
    }
  };

  const activeStages = stages.filter((s) => !s.is_negative);

  // Inline status badge with click-to-change dropdown
  const statusBadgeWithAction = (enrollment: SDREnrollment) => {
    const status = enrollment.status;
    const cfg = statusBadgeConfig[status] || { label: status, variant: "outline" as const };
    const stageInfo = stages.find((s) => s.key === status);
    const label = stageInfo?.label || cfg.label;

    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="cursor-pointer hover:opacity-80 transition-opacity">
            <Badge variant={cfg.variant} className="cursor-pointer">
              {label}
            </Badge>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="min-w-[160px]">
          <DropdownMenuLabel className="text-[10px] text-muted-foreground">Mover para</DropdownMenuLabel>
          {activeStages
            .filter((s) => s.key !== status)
            .map((s) => (
              <DropdownMenuItem key={s.key} onClick={() => moveToStage([enrollment.id], s.key)}>
                <ArrowRight className="h-3 w-3 mr-2" />
                {s.label}
              </DropdownMenuItem>
            ))}
          <DropdownMenuSeparator />
          {status !== "converted" && (
            <DropdownMenuItem onClick={() => moveToStage([enrollment.id], "converted")}>
              <CheckCircle2 className="h-3 w-3 mr-2 text-emerald-600" />
              Convertido
            </DropdownMenuItem>
          )}
          {status !== "opted_out" && (
            <DropdownMenuItem className="text-destructive" onClick={() => moveToStage([enrollment.id], "opted_out")}>
              <XCircle className="h-3 w-3 mr-2" />
              Opt-out
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  };

  const handlePreviewMessage = async (enrollment: SDREnrollment) => {
    setPreviewEnrollment(enrollment);
    setPreviewLoading(true);
    setPreviewResult(null);
    try {
      const { data, error } = await supabase.functions.invoke("sdr-message-generator", {
        body: {
          enrollment_id: enrollment.id,
          workspace_id: (enrollment as any).workspace_id || campaignId,
          channel: enrollment.channel || "email",
          template_subject: "Follow-up: {{prospect_name}}",
          template_body: "Olá {{prospect_name}}, queria falar consigo sobre {{company}}.",
          preview: true,
        },
      });
      if (error) throw error;
      setPreviewResult(data);
    } catch (err: any) {
      toast.error("Erro ao gerar preview: " + (err.message || "erro desconhecido"));
    } finally {
      setPreviewLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="text-sm">
            Prospects ({filtered.length}{stageFilter ? ` de ${enrollments.length}` : ""})
          </CardTitle>
          <div className="flex items-center gap-2">
            {stageFilter && (
              <Badge variant="secondary" className="text-xs gap-1">
                {stages.find((s) => s.key === stageFilter)?.label || stageFilter}
                <button onClick={onClearFilter} className="ml-1 hover:text-foreground">×</button>
              </Badge>
            )}
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Pesquisar..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 h-8 w-48 text-sm"
              />
            </div>
          </div>
        </div>
        {/* Bulk actions bar */}
        {selectedIds.size > 0 && (
          <div className="flex items-center gap-2 mt-2 p-2 bg-muted/50 rounded-lg">
            <span className="text-xs font-medium">{selectedIds.size} seleccionado(s)</span>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-7 text-xs" disabled={bulkMoving}>
                  <ArrowRight className="h-3 w-3 mr-1" />
                  Mover para
                  <ChevronDown className="h-3 w-3 ml-1" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                {activeStages.map((s) => (
                  <DropdownMenuItem
                    key={s.key}
                    onClick={() => moveToStage([...selectedIds], s.key)}
                  >
                    {s.label}
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-destructive"
                  onClick={() => moveToStage([...selectedIds], "opted_out")}
                >
                  <XCircle className="h-3.5 w-3.5 mr-2" />
                  Opt-out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              onClick={() => setSelectedIds(new Set())}
            >
              Limpar
            </Button>
          </div>
        )}
      </CardHeader>
      <CardContent>
        {filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            {stageFilter ? "Nenhum prospect nesta fase." : search ? "Nenhum resultado." : "Nenhum prospect enrolled nesta campanha."}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">
                    <Checkbox
                      checked={allSelected}
                      onCheckedChange={toggleAll}
                    />
                  </TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Canal</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Step</TableHead>
                  <TableHead>Variante</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((e) => (
                  <TableRow key={e.id} className={selectedIds.has(e.id) ? "bg-muted/30" : ""}>
                    <TableCell>
                      <Checkbox
                        checked={selectedIds.has(e.id)}
                        onCheckedChange={() => toggleOne(e.id)}
                      />
                    </TableCell>
                    <TableCell className="font-medium">{e.prospect_name || "—"}</TableCell>
                    <TableCell className="text-sm">{e.prospect_email || "—"}</TableCell>
                    <TableCell className="text-sm capitalize">{e.channel || "—"}</TableCell>
                    <TableCell>{statusBadgeWithAction(e)}</TableCell>
                    <TableCell>
                      {(e.status === "sequenced" || e.status === "paused") ? (
                        <div className="flex items-center gap-1">
                          <Badge variant="outline" className="text-[10px]">
                            Step {((e as any).current_step || 0) + 1}
                          </Badge>
                          {(e as any).next_send_at && (
                            <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                              <Clock className="h-2.5 w-2.5" />
                              {format(new Date((e as any).next_send_at), "dd/MM HH:mm")}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">{e.message_variant || "—"}</Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {format(new Date(e.created_at), "dd MMM", { locale: pt })}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-7 w-7">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {activeStages
                            .filter((s) => s.key !== e.status)
                            .map((s) => (
                              <DropdownMenuItem
                                key={s.key}
                                onClick={() => moveToStage([e.id], s.key)}
                              >
                                <ArrowRight className="h-3.5 w-3.5 mr-2" />
                                {s.label}
                              </DropdownMenuItem>
                            ))}
                          <DropdownMenuItem onClick={() => handlePreviewMessage(e)}>
                            <Eye className="h-3.5 w-3.5 mr-2" />
                            Pré-visualizar mensagem
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          {e.status === "sequenced" && (
                            <DropdownMenuItem onClick={() => pauseSequence(e.id)}>
                              <Pause className="h-3.5 w-3.5 mr-2" />
                              Pausar sequência
                            </DropdownMenuItem>
                          )}
                          {e.status === "paused" && (
                            <DropdownMenuItem onClick={() => resumeSequence(e.id)}>
                              <Play className="h-3.5 w-3.5 mr-2" />
                              Retomar sequência
                            </DropdownMenuItem>
                          )}
                          {e.status !== "converted" && (
                            <DropdownMenuItem onClick={() => moveToStage([e.id], "converted")}>
                              <CheckCircle2 className="h-3.5 w-3.5 mr-2 text-emerald-600" />
                              Marcar convertido
                            </DropdownMenuItem>
                          )}
                          {e.status !== "opted_out" && (
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => moveToStage([e.id], "opted_out")}
                            >
                              <XCircle className="h-3.5 w-3.5 mr-2" />
                              Opt-out
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
      {/* Preview message dialog */}
      <Dialog open={!!previewEnrollment} onOpenChange={(o) => !o && setPreviewEnrollment(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Pré-visualização de Mensagem</DialogTitle>
          </DialogHeader>
          {previewLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              <span className="ml-2 text-sm text-muted-foreground">A gerar mensagem personalizada...</span>
            </div>
          ) : previewResult ? (
            <div className="space-y-4">
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">Assunto</p>
                <p className="text-sm font-medium p-2 rounded bg-muted/50">{previewResult.subject}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">Corpo</p>
                <div className="text-sm p-3 rounded bg-muted/50 whitespace-pre-wrap">{previewResult.body}</div>
              </div>
              {previewResult.ai_used && (
                <Badge variant="outline" className="text-[10px]">
                  <Eye className="h-2.5 w-2.5 mr-1" />
                  Personalizado por IA
                </Badge>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">Sem dados de preview</p>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}
