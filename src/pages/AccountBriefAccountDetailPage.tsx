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
  Linkedin, Instagram, Facebook, Twitter, Youtube, Phone, Mail, UserCircle, Pencil,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { useAccountBriefContacts } from "@/hooks/useAccountBriefContacts";
import { AccountBriefEditDialog } from "@/components/account-brief/AccountBriefEditDialog";

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
  const [leadSearchTerm, setLeadSearchTerm] = useState("");
  const { companies, leads, isSearchingLeads, linkCompany, linkLead, unlinkLead, diffs } = useAccountBriefCRMLink(id, leadSearchTerm);
  const { isWatched, addToWatchlist } = useAccountBriefWatchlist();
  const { alerts: changeAlerts } = useAccountBriefChangeAlerts(id);
  const { data: contacts = [] } = useAccountBriefContacts(id);
  const [newNote, setNewNote] = useState("");
  const [showCRMLink, setShowCRMLink] = useState(false);
  const [showEdit, setShowEdit] = useState(false);

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
                  <Button variant="outline" size="sm" onClick={() => setShowEdit(true)} className="gap-2">
                    <Pencil className="w-4 h-4" /> Editar
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

              {/* Pessoas-Chave */}
              {contacts.length > 0 && (
                <BriefSection icon={UserCircle} title="Pessoas-Chave">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {contacts.map((contact) => (
                      <div key={contact.id} className="flex items-start gap-3 p-3 rounded-lg bg-muted/30">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-sm shrink-0">
                          {contact.contact_name?.substring(0, 2).toUpperCase() || "?"}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium truncate">{contact.contact_name}</p>
                          {contact.role_title && <p className="text-xs text-muted-foreground truncate">{contact.role_title}</p>}
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            {contact.seniority_level && contact.seniority_level !== "Other" && (
                              <Badge variant="secondary" className="text-[10px] h-5">{contact.seniority_level}</Badge>
                            )}
                            {contact.department && (
                              <Badge variant="outline" className="text-[10px] h-5">{contact.department}</Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-2">
                            {contact.linkedin_url && (
                              <a href={contact.linkedin_url} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground">
                                <Linkedin className="w-3.5 h-3.5" />
                              </a>
                            )}
                            {contact.twitter_url && (
                              <a href={contact.twitter_url} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground">
                                <Twitter className="w-3.5 h-3.5" />
                              </a>
                            )}
                            {contact.email && (
                              <a href={`mailto:${contact.email}`} className="text-muted-foreground hover:text-foreground">
                                <Mail className="w-3.5 h-3.5" />
                              </a>
                            )}
                            {contact.phone && (
                              <a href={`tel:${contact.phone}`} className="text-muted-foreground hover:text-foreground">
                                <Phone className="w-3.5 h-3.5" />
                              </a>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
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
                        <input
                          value={leadSearchTerm}
                          onChange={(e) => setLeadSearchTerm(e.target.value)}
                          placeholder="Pesquisar lead por nome ou email..."
                          className="h-8 w-full rounded-md border border-input bg-background px-3 text-xs text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                        />
                        <div className="max-h-40 overflow-y-auto rounded-md border border-border bg-background">
                          {isSearchingLeads ? (
                            <div className="flex items-center gap-2 px-3 py-2 text-xs text-muted-foreground">
                              <Loader2 className="h-3 w-3 animate-spin" /> A pesquisar leads...
                            </div>
                          ) : leads.length === 0 ? (
                            <p className="px-3 py-2 text-xs text-muted-foreground">Sem resultados para a pesquisa.</p>
                          ) : (
                            leads.map((l) => (
                              <button
                                key={l.id}
                                type="button"
                                className="flex w-full items-center justify-between px-3 py-2 text-left text-xs hover:bg-muted/50"
                                onClick={() => linkLead.mutate({ leadId: l.id })}
                                disabled={linkLead.isPending}
                              >
                                <span className="truncate">{l.name}</span>
                                {l.email ? <span className="ml-2 truncate text-muted-foreground">{l.email}</span> : null}
                              </button>
                            ))
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Governance */}
              <Card className="border-0 shadow-lg">
                <CardHeader><CardTitle className="text-base flex items-center gap-2"><Users className="w-4 h-4 text-indigo-500" /> Equipa</CardTitle></CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Owner</p>
                    <p className="text-sm">{(account as any).owner_user_id ? "Atribuído" : "Sem owner"}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Atribuído a</p>
                    <p className="text-sm">{(account as any).assigned_user_id ? "Atribuído" : "Não atribuído"}</p>
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

              {/* Social Media */}
              {((account as any).linkedin_url || (account as any).instagram_url || (account as any).facebook_url || (account as any).twitter_url || (account as any).youtube_url || (account as any).tiktok_url || (account as any).email_main || (account as any).phone_main) && (
                <Card className="border-0 shadow-lg">
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Globe className="w-4 h-4 text-indigo-500" /> Redes Sociais
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex flex-wrap gap-2">
                      {(account as any).linkedin_url && (
                        <a href={(account as any).linkedin_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-muted/50 hover:bg-muted transition text-sm">
                          <Linkedin className="w-4 h-4 text-blue-600" /> LinkedIn
                        </a>
                      )}
                      {(account as any).instagram_url && (
                        <a href={(account as any).instagram_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-muted/50 hover:bg-muted transition text-sm">
                          <Instagram className="w-4 h-4 text-pink-500" /> Instagram
                        </a>
                      )}
                      {(account as any).facebook_url && (
                        <a href={(account as any).facebook_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-muted/50 hover:bg-muted transition text-sm">
                          <Facebook className="w-4 h-4 text-blue-500" /> Facebook
                        </a>
                      )}
                      {(account as any).twitter_url && (
                        <a href={(account as any).twitter_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-muted/50 hover:bg-muted transition text-sm">
                          <Twitter className="w-4 h-4" /> X
                        </a>
                      )}
                      {(account as any).youtube_url && (
                        <a href={(account as any).youtube_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-muted/50 hover:bg-muted transition text-sm">
                          <Youtube className="w-4 h-4 text-red-500" /> YouTube
                        </a>
                      )}
                      {(account as any).tiktok_url && (
                        <a href={(account as any).tiktok_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-muted/50 hover:bg-muted transition text-sm">
                          <Globe className="w-4 h-4" /> TikTok
                        </a>
                      )}
                    </div>
                    {((account as any).email_main || (account as any).phone_main) && (
                      <div className="space-y-2 pt-2 border-t border-border">
                        {(account as any).email_main && (
                          <div className="flex items-center gap-2 text-sm">
                            <Mail className="w-4 h-4 text-muted-foreground" />
                            <a href={`mailto:${(account as any).email_main}`} className="hover:underline">{(account as any).email_main}</a>
                          </div>
                        )}
                        {(account as any).phone_main && (
                          <div className="flex items-center gap-2 text-sm">
                            <Phone className="w-4 h-4 text-muted-foreground" />
                            <a href={`tel:${(account as any).phone_main}`} className="hover:underline">{(account as any).phone_main}</a>
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Notes */}
              <Card className="border-0 shadow-lg">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <StickyNote className="w-4 h-4 text-amber-500" /> Notas
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Textarea value={newNote} onChange={(e) => setNewNote(e.target.value)} placeholder="Adicionar nota..." rows={2} className="text-sm" />
                  <div className="flex gap-2">
                    <Select defaultValue="team" onValueChange={() => {}}>
                      <SelectTrigger className="w-[120px] h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="team">Equipa</SelectItem>
                        <SelectItem value="private">Privada</SelectItem>
                        <SelectItem value="admin_only">Admin</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button size="sm" onClick={handleAddNote} disabled={!newNote.trim() || addNote.isPending} className="gap-1 flex-1">
                      <Plus className="w-3 h-3" /> Adicionar
                    </Button>
                  </div>
                  <div className="space-y-2 mt-2">
                    {notes.map((note: any) => (
                      <div key={note.id} className="p-3 rounded-lg bg-muted/30 text-sm">
                        <div className="flex justify-between items-start gap-2">
                          <div className="flex-1">
                            <p className="leading-relaxed">{note.note_text}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <p className="text-xs text-muted-foreground">{format(new Date(note.created_at), "dd/MM HH:mm")}</p>
                              {(note as any).visibility_type && (note as any).visibility_type !== "team" && (
                                <Badge variant="outline" className="text-[10px]">
                                  {(note as any).visibility_type === "private" ? "Privada" : "Admin"}
                                </Badge>
                              )}
                            </div>
                          </div>
                          <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={() => deleteNote.mutate(note.id)}>
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
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
