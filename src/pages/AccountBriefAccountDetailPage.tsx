import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { ModuleGuard } from "@/components/guards/ModuleGuard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { useAccountBriefAccount } from "@/hooks/useAccountBriefAccount";
import { useAccountBriefNotes } from "@/hooks/useAccountBriefNotes";
import { useAccountBriefAccounts } from "@/hooks/useAccountBriefAccounts";
import { useAccountBriefAnalysisRuns } from "@/hooks/useAccountBriefAnalysisRuns";
import { useAccountBriefBrief } from "@/hooks/useAccountBriefBrief";
import { useAccountBriefScore } from "@/hooks/useAccountBriefScore";
import { useAccountBriefCRMLink } from "@/hooks/useAccountBriefCRMLink";
import { useAccountBriefWatchlist } from "@/hooks/useAccountBriefWatchlist";
import { useAccountBriefChangeAlerts } from "@/hooks/useAccountBriefChangeAlerts";
import {
  ArrowLeft, Star, StarOff, RefreshCw, Copy, Globe, Loader2, StickyNote,
  Plus, Trash2, Clock, AlertCircle, CheckCircle2, FileText, Target,
  TrendingUp, Briefcase, MessageSquare, Users, Zap, ShieldCheck, BarChart3,
  Building2, Link, ExternalLink, GitCompareArrows, Eye, EyeOff, Bell,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

const STATUS_LABELS: Record<string, string> = {
  new: "Nova", researching: "Em pesquisa", outreach_ready: "Pronta p/ outreach",
  contacted: "Contactada", follow_up: "Follow-up",
};

const RUN_STATUS_LABELS: Record<string, { label: string; color: string }> = {
  queued: { label: "Em fila", color: "bg-muted text-muted-foreground" },
  processing: { label: "A processar", color: "bg-blue-500/20 text-blue-500" },
  completed: { label: "Concluída", color: "bg-emerald-500/20 text-emerald-500" },
  partial: { label: "Parcial", color: "bg-amber-500/20 text-amber-500" },
  failed: { label: "Falhou", color: "bg-destructive/20 text-destructive" },
};

function copyToClipboard(text: string, label: string) {
  navigator.clipboard.writeText(text);
  toast.success(`${label} copiado!`);
}

function BriefSection({ icon: Icon, title, children, copyText }: {
  icon: any; title: string; children: React.ReactNode; copyText?: string;
}) {
  return (
    <Card className="border-0 shadow-lg">
      <CardHeader className="flex-row items-center justify-between pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Icon className="w-4 h-4 text-indigo-500" /> {title}
        </CardTitle>
        {copyText && (
          <Button variant="ghost" size="sm" onClick={() => copyToClipboard(copyText, title)} className="gap-1 text-xs">
            <Copy className="w-3 h-3" /> Copiar
          </Button>
        )}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function ListItems({ items, emptyText = "Sem dados" }: { items?: string[] | null; emptyText?: string }) {
  if (!items?.length) return <p className="text-sm text-muted-foreground">{emptyText}</p>;
  return (
    <ul className="space-y-1.5">
      {items.map((item, i) => (
        <li key={i} className="text-sm flex items-start gap-2">
          <span className="text-indigo-500 mt-1">•</span>
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

function ScoreBadge({ score, label }: { score: number; label: string }) {
  const color = score >= 80 ? "bg-emerald-500" : score >= 60 ? "bg-blue-500" : score >= 40 ? "bg-amber-500" : "bg-destructive";
  return (
    <div className="flex items-center gap-3">
      <div className={cn("text-white font-bold text-lg px-3 py-1 rounded-lg", color)}>{score}</div>
      <span className="text-sm font-medium">{label}</span>
    </div>
  );
}

export default function AccountBriefAccountDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: account, isLoading } = useAccountBriefAccount(id);
  const { notes, addNote, deleteNote } = useAccountBriefNotes(id);
  const { updateAccount, toggleFavorite } = useAccountBriefAccounts();
  const { runs, triggerAnalysis } = useAccountBriefAnalysisRuns(id);
  const { data: brief, isLoading: briefLoading } = useAccountBriefBrief(id);
  const { score, factors, isLoading: scoreLoading } = useAccountBriefScore(id);
  const { companies, leads, linkCompany, linkLead, unlinkLead, diffs } = useAccountBriefCRMLink(id);
  const { isWatched, addToWatchlist } = useAccountBriefWatchlist();
  const { alerts: changeAlerts } = useAccountBriefChangeAlerts(id);
  const [newNote, setNewNote] = useState("");
  const [showCRMLink, setShowCRMLink] = useState(false);

  if (isLoading) {
    return <DashboardLayout><div className="flex items-center justify-center min-h-[50vh]"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div></DashboardLayout>;
  }
  if (!account) {
    return <DashboardLayout><div className="text-center py-16 text-muted-foreground">Conta não encontrada</div></DashboardLayout>;
  }

  const handleAnalyze = async () => {
    toast.info("A iniciar análise completa...");
    await triggerAnalysis.mutateAsync(account.id);
  };

  const handleAddNote = async () => {
    if (!newNote.trim()) return;
    await addNote.mutateAsync(newNote);
    setNewNote("");
  };

  const identityJson = brief?.identity_json as any;
  const offerJson = brief?.offer_json as any;
  const signalsJson = brief?.signals_json as any;
  const persJson = brief?.personalization_json as any;
  const outreachJson = brief?.outreach_json as any;

  const allOutreachAngles = outreachJson?.outreach_angles || persJson?.outreach_angles || [];
  const allObjections = outreachJson?.objections_attention || persJson?.objections_attention || [];

  const briefText = [
    brief?.executive_summary && `RESUMO: ${brief.executive_summary}`,
    identityJson?.what_they_do && `O QUE FAZEM: ${identityJson.what_they_do}`,
    allOutreachAngles.length && `ÂNGULOS: ${allOutreachAngles.join(" | ")}`,
    persJson?.personalization_insights?.length && `PERSONALIZAÇÃO: ${persJson.personalization_insights.join(" | ")}`,
  ].filter(Boolean).join("\n\n");

  const positiveFactors = factors.filter((f: any) => f.polarity === "positive");
  const negativeFactors = factors.filter((f: any) => f.polarity === "negative");

  return (
    <ModuleGuard moduleSlug="account-brief" moduleName="Account Brief">
      <DashboardLayout>
        <div className="space-y-6 max-w-6xl">
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
                      {account.company_id && (
                        <Badge variant="outline" className="gap-1 text-xs ml-2">
                          <Building2 className="w-3 h-3" /> CRM Linked
                        </Badge>
                      )}
                    </div>
                    {account.description_short && (
                      <p className="text-sm text-muted-foreground mt-1 max-w-lg">{account.description_short}</p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  {(account.total_score ?? 0) > 0 && (
                    <ScoreBadge score={account.total_score ?? 0} label={account.score_label || ""} />
                  )}
                  <Select
                    value={account.commercial_status || "new"}
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
                  <Button variant="outline" size="sm" onClick={handleAnalyze} disabled={triggerAnalysis.isPending} className="gap-2">
                    <RefreshCw className={cn("w-4 h-4", triggerAnalysis.isPending && "animate-spin")} /> Analisar
                  </Button>
                  {!isWatched(account.id) ? (
                    <Button variant="outline" size="sm" className="gap-2" onClick={() => addToWatchlist.mutate({ accountId: account.id, reason: "strategic", frequency: "weekly" })}>
                      <Eye className="w-4 h-4" /> Watchlist
                    </Button>
                  ) : (
                    <Badge variant="secondary" className="gap-1 h-9 px-3">
                      <Eye className="w-3 h-3" /> Na Watchlist
                    </Badge>
                  )}
                  {briefText && (
                    <Button variant="outline" size="sm" onClick={() => copyToClipboard(briefText, "Briefing completo")} className="gap-2">
                      <Copy className="w-4 h-4" /> Copiar Briefing
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-6">
              {/* Executive Summary */}
              {brief?.executive_summary ? (
                <BriefSection icon={FileText} title="Resumo Executivo" copyText={brief.executive_summary}>
                  <p className="text-sm leading-relaxed">{brief.executive_summary}</p>
                </BriefSection>
              ) : (
                <Card className="border-0 shadow-lg">
                  <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                    <FileText className="w-10 h-10 text-muted-foreground/30 mb-3" />
                    <p className="text-sm text-muted-foreground">Sem briefing disponível. Lance uma análise para gerar.</p>
                    <Button variant="outline" size="sm" className="mt-4 gap-2" onClick={handleAnalyze} disabled={triggerAnalysis.isPending}>
                      <RefreshCw className="w-4 h-4" /> Lançar Análise
                    </Button>
                  </CardContent>
                </Card>
              )}

              {identityJson?.what_they_do && (
                <BriefSection icon={Briefcase} title="O que a empresa faz">
                  <p className="text-sm leading-relaxed">{identityJson.what_they_do}</p>
                  {identityJson.who_they_sell_to && (
                    <p className="text-sm leading-relaxed mt-3 text-muted-foreground">
                      <strong>Para quem vende:</strong> {identityJson.who_they_sell_to}
                    </p>
                  )}
                </BriefSection>
              )}

              {offerJson?.main_products?.length > 0 && (
                <BriefSection icon={Target} title="Produtos & Serviços Principais">
                  <ListItems items={offerJson.main_products} />
                  {offerJson.commercial_signals && (
                    <p className="text-sm text-muted-foreground mt-3">{offerJson.commercial_signals}</p>
                  )}
                </BriefSection>
              )}

              {signalsJson?.growth_signals?.length > 0 && (
                <BriefSection icon={TrendingUp} title="Sinais de Crescimento" copyText={signalsJson.growth_signals.join("\n")}>
                  <ListItems items={signalsJson.growth_signals} />
                </BriefSection>
              )}

              {identityJson?.market_geography && (
                <BriefSection icon={Globe} title="Mercados e Geografias">
                  <p className="text-sm leading-relaxed">{identityJson.market_geography}</p>
                </BriefSection>
              )}

              {persJson?.personalization_insights?.length > 0 && (
                <BriefSection icon={Zap} title="Insights de Personalização" copyText={persJson.personalization_insights.join("\n")}>
                  <ListItems items={persJson.personalization_insights} />
                </BriefSection>
              )}

              {allOutreachAngles.length > 0 && (
                <BriefSection icon={MessageSquare} title="Ângulos de Outreach" copyText={allOutreachAngles.join("\n")}>
                  <ListItems items={allOutreachAngles} />
                </BriefSection>
              )}

              {allObjections.length > 0 && (
                <BriefSection icon={ShieldCheck} title="Objeções & Pontos de Atenção">
                  <ListItems items={allObjections} />
                </BriefSection>
              )}

              {/* Diffs Section */}
              {diffs.length > 0 && (
                <Card className="border-0 shadow-lg">
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <GitCompareArrows className="w-4 h-4 text-indigo-500" /> Alterações entre Análises
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {diffs.map((diff: any) => (
                        <div key={diff.id} className="flex items-start gap-3 p-3 rounded-lg bg-muted/30">
                          <div className="w-2 h-2 rounded-full bg-indigo-500 mt-1.5 shrink-0" />
                          <div>
                            <p className="text-sm font-medium">{diff.diff_label}</p>
                            <p className="text-xs text-muted-foreground">
                              {diff.created_at ? format(new Date(diff.created_at), "dd/MM/yyyy HH:mm") : ""}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Score Card */}
              {score && (
                <Card className="border-0 shadow-lg">
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <BarChart3 className="w-4 h-4 text-indigo-500" /> Score de Relevância
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <ScoreBadge score={score.total_score ?? 0} label={score.score_label || ""} />
                    <div className="space-y-3">
                      {[
                        { label: "ICP Fit", value: score.icp_fit_score, max: 25 },
                        { label: "Crescimento", value: score.growth_score, max: 25 },
                        { label: "Maturidade", value: score.maturity_score, max: 25 },
                        { label: "Personalização", value: score.personalization_score, max: 25 },
                      ].map((sub) => (
                        <div key={sub.label} className="space-y-1">
                          <div className="flex justify-between text-xs">
                            <span className="text-muted-foreground">{sub.label}</span>
                            <span className="font-medium">{sub.value ?? 0}/{sub.max}</span>
                          </div>
                          <Progress value={((sub.value ?? 0) / sub.max) * 100} className="h-1.5" />
                        </div>
                      ))}
                    </div>
                    {score.reasoning_short && (
                      <p className="text-xs text-muted-foreground leading-relaxed">{score.reasoning_short}</p>
                    )}
                    {positiveFactors.length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-emerald-600 mb-1">Pontos Fortes</p>
                        {positiveFactors.slice(0, 5).map((f: any, i: number) => (
                          <p key={i} className="text-xs text-muted-foreground">+ {f.factor_label}</p>
                        ))}
                      </div>
                    )}
                    {negativeFactors.length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-destructive mb-1">Atenção</p>
                        {negativeFactors.map((f: any, i: number) => (
                          <p key={i} className="text-xs text-muted-foreground">− {f.factor_label}</p>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* CRM Link */}
              <Card className="border-0 shadow-lg">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-indigo-500" /> CRM
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Company link */}
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Empresa</p>
                    {account.company_id ? (
                      <div className="space-y-2">
                        <Badge variant="outline" className="gap-1">
                          <CheckCircle2 className="w-3 h-3 text-emerald-500" /> Associada ao CRM
                        </Badge>
                        <Button variant="outline" size="sm" className="w-full gap-2" onClick={() => navigate(`/objects/companies/${account.company_id}`)}>
                          <ExternalLink className="w-3 h-3" /> Abrir Empresa no CRM
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <p className="text-xs text-muted-foreground">Sem empresa associada.</p>
                        {!showCRMLink ? (
                          <Button variant="outline" size="sm" className="w-full gap-2" onClick={() => setShowCRMLink(true)}>
                            <Link className="w-3 h-3" /> Associar Empresa
                          </Button>
                        ) : (
                          <div className="space-y-2">
                            <Button
                              variant="default" size="sm" className="w-full gap-2"
                              onClick={() => linkCompany.mutate({ createNew: true })}
                              disabled={linkCompany.isPending}
                            >
                              {linkCompany.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
                              Criar Empresa no CRM
                            </Button>
                            <Select onValueChange={(companyId) => linkCompany.mutate({ companyId })}>
                              <SelectTrigger className="h-8 text-xs">
                                <SelectValue placeholder="Ou associar existente..." />
                              </SelectTrigger>
                              <SelectContent>
                                {companies.map((c) => (
                                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <Button variant="ghost" size="sm" className="w-full text-xs" onClick={() => setShowCRMLink(false)}>Cancelar</Button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Lead link */}
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Lead</p>
                    {(account as any).lead_id ? (
                      <div className="space-y-2">
                        <Badge variant="outline" className="gap-1">
                          <CheckCircle2 className="w-3 h-3 text-emerald-500" /> Lead associada
                        </Badge>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" className="flex-1 gap-2" onClick={() => navigate(`/dashboard/leads/${(account as any).lead_id}`)}>
                            <ExternalLink className="w-3 h-3" /> Abrir Lead
                          </Button>
                          <Button variant="ghost" size="sm" className="gap-1" onClick={() => unlinkLead.mutate()} disabled={unlinkLead.isPending}>
                            <Trash2 className="w-3 h-3" /> Desvincular
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <p className="text-xs text-muted-foreground">Sem lead associada.</p>
                        <Select onValueChange={(leadId) => linkLead.mutate({ leadId })}>
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue placeholder="Associar lead existente..." />
                          </SelectTrigger>
                          <SelectContent>
                            {leads.map((l) => (
                              <SelectItem key={l.id} value={l.id}>
                                {l.name} {l.email ? `(${l.email})` : ''}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Info */}
              <Card className="border-0 shadow-lg">
                <CardHeader><CardTitle className="text-base">Informações</CardTitle></CardHeader>
                <CardContent className="space-y-3 text-sm">
                  {[
                    ["Setor", account.probable_sector],
                    ["Geografia", account.probable_geography],
                    ["Tagline", account.tagline],
                    ["Última análise", account.last_analysis_at ? format(new Date(account.last_analysis_at), "dd/MM/yyyy HH:mm") : "Nunca"],
                  ].map(([label, value]) => (
                    <div key={label as string} className="flex justify-between">
                      <span className="text-muted-foreground">{label}</span>
                      <span className="text-right max-w-[60%]">{(value as string) || "—"}</span>
                    </div>
                  ))}
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
                  <Textarea value={newNote} onChange={(e) => setNewNote(e.target.value)} placeholder="Adicionar nota..." rows={2} className="text-sm" />
                  <Button size="sm" onClick={handleAddNote} disabled={!newNote.trim() || addNote.isPending} className="gap-1 w-full">
                    <Plus className="w-3 h-3" /> Adicionar
                  </Button>
                  <div className="space-y-2 mt-2">
                    {notes.map((note: any) => (
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

              {/* Analysis History */}
              <Card className="border-0 shadow-lg">
                <CardHeader><CardTitle className="text-base flex items-center gap-2"><Clock className="w-4 h-4 text-indigo-500" /> Histórico</CardTitle></CardHeader>
                <CardContent>
                  {runs.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">Sem análises</p>
                  ) : (
                    <div className="space-y-2">
                      {runs.slice(0, 5).map((run: any) => {
                        const s = RUN_STATUS_LABELS[run.status] || RUN_STATUS_LABELS.queued;
                        return (
                          <div key={run.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/30">
                            <Badge className={cn("text-xs", s.color)}>{s.label}</Badge>
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
          </div>
        </div>
      </DashboardLayout>
    </ModuleGuard>
  );
}
