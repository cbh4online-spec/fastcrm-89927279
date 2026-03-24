import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { ModuleGuard } from "@/components/guards/ModuleGuard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAccountBriefAccount } from "@/hooks/useAccountBriefAccount";
import { useAccountBriefNotes } from "@/hooks/useAccountBriefNotes";
import { useAccountBriefAccounts } from "@/hooks/useAccountBriefAccounts";
import { useAccountBriefAnalysisRuns } from "@/hooks/useAccountBriefAnalysisRuns";
import { ArrowLeft, Star, StarOff, RefreshCw, Copy, Globe, Loader2, StickyNote, Plus, Trash2, Clock, AlertCircle, CheckCircle2, FileText } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

const STATUS_LABELS: Record<string, string> = {
  new: "Nova",
  researching: "Em pesquisa",
  outreach_ready: "Pronta p/ outreach",
  contacted: "Contactada",
  follow_up: "Follow-up",
};

const RUN_STATUS_LABELS: Record<string, { label: string; color: string; icon: typeof CheckCircle2 }> = {
  queued: { label: "Em fila", color: "bg-muted text-muted-foreground", icon: Clock },
  processing: { label: "A processar", color: "bg-blue-500/20 text-blue-500", icon: RefreshCw },
  completed: { label: "Concluída", color: "bg-emerald-500/20 text-emerald-500", icon: CheckCircle2 },
  partial: { label: "Parcial", color: "bg-amber-500/20 text-amber-500", icon: AlertCircle },
  failed: { label: "Falhou", color: "bg-destructive/20 text-destructive", icon: AlertCircle },
};

export default function AccountBriefAccountDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: account, isLoading } = useAccountBriefAccount(id);
  const { notes, addNote, deleteNote } = useAccountBriefNotes(id);
  const { updateAccount, toggleFavorite } = useAccountBriefAccounts();
  const { runs, triggerAnalysis } = useAccountBriefAnalysisRuns(id);
  const [newNote, setNewNote] = useState("");

  if (isLoading) {
    return <DashboardLayout><div className="flex items-center justify-center min-h-[50vh]"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div></DashboardLayout>;
  }

  if (!account) {
    return <DashboardLayout><div className="text-center py-16 text-muted-foreground">Conta não encontrada</div></DashboardLayout>;
  }

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copiado!`);
  };

  const handleAnalyze = async () => {
    toast.info("A iniciar análise...");
    await triggerAnalysis.mutateAsync(account.id);
  };

  const handleAddNote = async () => {
    if (!newNote.trim()) return;
    await addNote.mutateAsync(newNote);
    setNewNote("");
  };

  return (
    <ModuleGuard moduleSlug="account-brief" moduleName="Account Brief">
      <DashboardLayout>
        <div className="space-y-6">
          {/* Back */}
          <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard/account-brief/accounts")} className="gap-2">
            <ArrowLeft className="w-4 h-4" /> Voltar às contas
          </Button>

          {/* Header */}
          <Card className="border-0 shadow-xl bg-gradient-to-br from-indigo-500/5 via-card to-card">
            <CardContent className="pt-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-xl bg-indigo-500/15 flex items-center justify-center text-indigo-500 font-bold text-lg">
                    {account.name?.substring(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <h1 className="text-xl font-bold">{account.name}</h1>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Globe className="w-4 h-4" />
                      <a href={`https://${account.domain}`} target="_blank" rel="noopener noreferrer" className="hover:underline">{account.domain}</a>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  {account.total_score > 0 && (
                    <Badge className="text-sm px-3 py-1 bg-indigo-500/20 text-indigo-500">
                      Score: {account.total_score}
                    </Badge>
                  )}
                  <Select
                    value={account.commercial_status}
                    onValueChange={(v) => updateAccount.mutate({ id: account.id, commercial_status: v })}
                  >
                    <SelectTrigger className="w-[170px] h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(STATUS_LABELS).map(([k, v]) => (
                        <SelectItem key={k} value={k}>{v}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Button variant="ghost" size="icon" onClick={() => toggleFavorite.mutate({ id: account.id, favorite: !account.favorite })}>
                    {account.favorite ? <Star className="w-5 h-5 text-amber-500 fill-amber-500" /> : <StarOff className="w-5 h-5 text-muted-foreground" />}
                  </Button>

                  <Button variant="outline" size="sm" onClick={handleAnalyze} className="gap-2">
                    <RefreshCw className="w-4 h-4" /> Analisar
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main content */}
            <div className="lg:col-span-2 space-y-6">
              {/* Executive Summary */}
              {account.executive_summary ? (
                <Card className="border-0 shadow-lg">
                  <CardHeader className="flex-row items-center justify-between">
                    <CardTitle className="text-base flex items-center gap-2">
                      <FileText className="w-4 h-4 text-indigo-500" /> Resumo Executivo
                    </CardTitle>
                    <Button variant="ghost" size="sm" onClick={() => handleCopy(account.executive_summary!, "Resumo")} className="gap-1">
                      <Copy className="w-3 h-3" /> Copiar
                    </Button>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm leading-relaxed">{account.executive_summary}</p>
                  </CardContent>
                </Card>
              ) : (
                <Card className="border-0 shadow-lg">
                  <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                    <FileText className="w-10 h-10 text-muted-foreground/30 mb-3" />
                    <p className="text-sm text-muted-foreground">Sem briefing disponível. Lance uma análise para gerar.</p>
                    <Button variant="outline" size="sm" className="mt-4 gap-2" onClick={handleAnalyze}>
                      <RefreshCw className="w-4 h-4" /> Lançar Análise
                    </Button>
                  </CardContent>
                </Card>
              )}

              {/* Análises Recentes */}
              <Card className="border-0 shadow-lg">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Clock className="w-4 h-4 text-indigo-500" /> Histórico de Análises
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {runs.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">Sem análises realizadas</p>
                  ) : (
                    <div className="space-y-2">
                      {runs.slice(0, 10).map((run) => {
                        const s = RUN_STATUS_LABELS[run.status] || RUN_STATUS_LABELS.queued;
                        const Icon = s.icon;
                        return (
                          <div key={run.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                            <div className="flex items-center gap-3">
                              <Icon className={cn("w-4 h-4", s.color.includes("text-") ? s.color.split(" ").find(c => c.startsWith("text-")) : "")} />
                              <div>
                                <Badge className={cn("text-xs", s.color)}>{s.label}</Badge>
                                <p className="text-xs text-muted-foreground mt-1">
                                  {run.pages_discovered} descobertas · {run.pages_processed} processadas
                                  {run.pages_failed > 0 && ` · ${run.pages_failed} falharam`}
                                </p>
                              </div>
                            </div>
                            <span className="text-xs text-muted-foreground">
                              {run.created_at ? format(new Date(run.created_at), "dd/MM HH:mm") : "—"}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Info */}
              <Card className="border-0 shadow-lg">
                <CardHeader>
                  <CardTitle className="text-base">Informações</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Setor</span>
                    <span>{account.probable_sector || "—"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Geografia</span>
                    <span>{account.probable_geography || "—"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Tagline</span>
                    <span className="text-right max-w-[60%]">{account.tagline || "—"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Última análise</span>
                    <span>{account.last_analysis_at ? format(new Date(account.last_analysis_at), "dd/MM/yyyy HH:mm") : "Nunca"}</span>
                  </div>
                </CardContent>
              </Card>

              {/* Notes */}
              <Card className="border-0 shadow-lg">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <StickyNote className="w-4 h-4 text-amber-500" /> Notas
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex gap-2">
                    <Textarea value={newNote} onChange={(e) => setNewNote(e.target.value)} placeholder="Adicionar nota..." rows={2} className="text-sm" />
                  </div>
                  <Button size="sm" onClick={handleAddNote} disabled={!newNote.trim() || addNote.isPending} className="gap-1 w-full">
                    <Plus className="w-3 h-3" /> Adicionar
                  </Button>
                  <div className="space-y-2 mt-2">
                    {notes.map((note) => (
                      <div key={note.id} className="p-3 rounded-lg bg-muted/30 text-sm">
                        <div className="flex justify-between items-start">
                          <p className="leading-relaxed">{note.note_text}</p>
                          <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={() => deleteNote.mutate(note.id)}>
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">{format(new Date(note.created_at), "dd/MM HH:mm")}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </DashboardLayout>
    </ModuleGuard>
  );
}
