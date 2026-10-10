import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  BadgeCheck,
  Download,
  ExternalLink,
  Instagram,
  Loader2,
  Pause,
  Play,
  Search,
  StopCircle,
  UserPlus,
} from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { exportToExcel } from "@/utils/excelUtils";
import {
  type ExtractedProfile,
  type ExtractionSource,
  useInstagramExtractionImport,
  useInstagramExtractionJobs,
  useInstagramExtractionResults,
  useRelationshipsCapability,
} from "@/hooks/useInstagramExtraction";
import { useProspectingCadenceLauncher } from "@/hooks/useProspectingCadenceLauncher";
import { useBioContactEnrich } from "@/hooks/useBioContactEnrich";
import { BulkOutreachDialog } from "@/components/professional-prospecting/BulkOutreachDialog";
import { PendingOutreachPanel } from "@/components/professional-prospecting/PendingOutreachPanel";
import { ProspectingEffectivenessCard } from "@/components/professional-prospecting/ProspectingEffectivenessCard";
import { useAuth } from "@/contexts/AuthContext";
import { useQueryClient } from "@tanstack/react-query";
import { useProspectingIdentityBatch, PROSPECTING_IDENTITY_QUERY_KEY } from "@/hooks/useProspectingIdentityBatch";
import { ProspectingIdentityBadge } from "@/components/prospecting/ProspectingIdentityBadge";
import { formatDistanceToNow } from "date-fns";
import { pt } from "date-fns/locale";
import {
  isUnsupportedSource,
  resolveJobDisplay,
} from "@/lib/prospecting/extractionJobState";

const SOURCE_LABELS: Record<ExtractionSource, string> = {
  followers: "Seguidores de um perfil",
  following: "Quem um perfil segue",
  hashtag: "Hashtag",
  location: "Localização (ID)",
  list: "Lista de @perfis",
  web_search: "Pesquisa na web",
};

const SOURCE_PLACEHOLDER: Record<ExtractionSource, string> = {
  followers: "@perfil",
  following: "@perfil",
  hashtag: "terapiacapilar",
  location: "ID da localização do Instagram",
  list: "@perfil1, @perfil2, @perfil3",
  web_search: "tricologia Lisboa",
};

const SOURCE_HINT: Partial<Record<ExtractionSource, string>> = {
  web_search: "Encontra perfis públicos por pesquisa na web. Não lê listas de seguidores.",
};

type ContactFilter = "all" | "email" | "phone" | "any";

export default function ProspectingInstagramExtractor() {
  const navigate = useNavigate();
  const location = useLocation();
  const followupsRef = useRef<HTMLElement>(null);
  useEffect(() => {
    if (location.hash === "#followups") followupsRef.current?.scrollIntoView({ block: "start" });
  }, [location.hash]);
  const { jobs, isLoading: jobsLoading, activeJob, startJob, controlJob } = useInstagramExtractionJobs();

  const [source, setSource] = useState<ExtractionSource>("list");
  const [target, setTarget] = useState("");
  const [limit, setLimit] = useState("200");
  const [scope, setScope] = useState<"current" | "all">("current");
  const [search, setSearch] = useState("");
  const [contactFilter, setContactFilter] = useState<ContactFilter>("all");
  const [minFollowers, setMinFollowers] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const bioEnrich = useBioContactEnrich();
  const relationships = useRelationshipsCapability();
  const sourceDisabled = (v: string) => isUnsupportedSource(v) && !relationships.configured;
  useEffect(() => {
    if (sourceDisabled(source)) setSource("list");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [relationships.configured]);

  const selectedJob = activeJob ?? jobs[0] ?? null;
  const jobIdForResults = scope === "current" ? selectedJob?.id ?? null : null;
  const jobDisplay = selectedJob ? resolveJobDisplay(selectedJob) : null;
  const isJobRunning = jobDisplay?.isActive ?? false;

  const { data: profiles = [], isLoading: resultsLoading } = useInstagramExtractionResults(
    jobIdForResults,
    isJobRunning,
  );
  const importLeads = useInstagramExtractionImport();
  const cadence = useProspectingCadenceLauncher();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    const min = Number(minFollowers) || 0;
    return profiles.filter((p) => {
      if (term) {
        const haystack = [p.instagram_username, p.profile_name, p.profile_bio, p.instagram_category, p.inferred_location]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(term)) return false;
      }
      if (min > 0 && (p.instagram_followers_count ?? 0) < min) return false;
      if (contactFilter === "email" && !p.extracted_email) return false;
      if (contactFilter === "phone" && !p.extracted_phone) return false;
      if (contactFilter === "any" && !p.extracted_email && !p.extracted_phone) return false;
      return true;
    });
  }, [profiles, search, minFollowers, contactFilter]);

  const IDENTITY_PAGE_SIZE = 50;
  const [resultsPage, setResultsPage] = useState(0);
  useEffect(() => setResultsPage(0), [search, minFollowers, contactFilter, jobIdForResults]);
  const pageCount = Math.max(1, Math.ceil(filtered.length / IDENTITY_PAGE_SIZE));
  const safePage = Math.min(resultsPage, pageCount - 1);
  const visibleProfiles = useMemo(
    () => filtered.slice(safePage * IDENTITY_PAGE_SIZE, (safePage + 1) * IDENTITY_PAGE_SIZE),
    [filtered, safePage],
  );
  // One batched RPC per visible page, scoped to the current workspace.
  const identityItems = useMemo(
    () =>
      visibleProfiles.map((p) => ({
        key: p.id,
        profile_id: p.id,
        name: p.profile_name || p.instagram_username || "",
        email: p.extracted_email,
        phone: p.extracted_phone,
        instagram_url: p.profile_url,
        website: p.instagram_external_url,
      })),
    [visibleProfiles],
  );
  const identity = useProspectingIdentityBatch(identityItems);

  const withEmail = profiles.filter((p) => p.extracted_email).length;
  const withPhone = profiles.filter((p) => p.extracted_phone).length;

  const progress = selectedJob
    ? Math.min(
        100,
        selectedJob.queued_count > 0
          ? Math.round((selectedJob.processed_count / selectedJob.queued_count) * 100)
          : 0,
      )
    : 0;

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    setSelected((prev) =>
      prev.size === filtered.length ? new Set() : new Set(filtered.map((p) => p.id)),
    );
  };

  const handleStart = () => {
    const parsedLimit = Number(limit);
    if (!target.trim()) return;
    startJob.mutate(
      {
        source,
        target: target.trim(),
        limit: Number.isFinite(parsedLimit) ? parsedLimit : 200,
        relationshipsConfigured: relationships.configured,
        usernames:
          source === "list"
            ? target.split(/[\s,;]+/).map((t) => t.trim()).filter(Boolean)
            : undefined,
      },
      { onSuccess: () => setSelected(new Set()) },
    );
  };

  const handleExport = (rows: ExtractedProfile[], onlyContacts: boolean) => {
    const data = (onlyContacts ? rows.filter((r) => r.extracted_email || r.extracted_phone) : rows).map(
      (p) => ({
        Utilizador: p.instagram_username ? `@${p.instagram_username}` : "",
        Nome: p.profile_name ?? "",
        Seguidores: p.instagram_followers_count ?? "",
        "A seguir": p.instagram_following_count ?? "",
        Publicações: p.instagram_posts_count ?? "",
        Email: p.extracted_email ?? "",
        Telefone: p.extracted_phone ?? "",
        Cidade: p.inferred_location ?? "",
        Categoria: p.instagram_category ?? "",
        Verificado: p.instagram_is_verified ? "Sim" : "Não",
        Empresa: p.instagram_is_business ? "Sim" : "Não",
        Privado: p.is_private ? "Sim" : "Não",
        Biografia: p.profile_bio ?? "",
        Site: p.instagram_external_url ?? "",
        Perfil: p.profile_url,
      }),
    );
    if (data.length === 0) return;
    exportToExcel(data, "Perfis Instagram", onlyContacts ? "instagram-contactos" : "instagram-perfis");
  };

  const selectedProfiles = filtered.filter((p) => selected.has(p.id));

  return (
    <DashboardLayout>
    <div className="container mx-auto max-w-7xl space-y-6 p-4 md:p-6">
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard/prospecting")}>
          <ArrowLeft className="mr-1.5 h-4 w-4" /> Prospeção
        </Button>
        <div className="flex items-center gap-2">
          <Instagram className="h-5 w-5 text-pink-600" aria-hidden />
          <h1 className="text-xl font-semibold">Extrator de perfis de Instagram</h1>
        </div>
      </div>

      <ProspectingEffectivenessCard />

      <section id="followups" ref={followupsRef} aria-label="Cadências e seguimentos" className="scroll-mt-4 space-y-3">
        <h2 className="text-base font-semibold">Cadências e seguimentos</h2>
        <PendingOutreachPanel />
      </section>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Nova recolha</CardTitle>
          <CardDescription>
            Recolhe apenas informação pública dos perfis. Emails e telefones só são guardados
            quando o próprio perfil os publica na biografia.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-4">
            <div className="space-y-1.5">
              <Label htmlFor="ig-source">Origem</Label>
              <Select
                value={source}
                onValueChange={(v) => {
                  if (!sourceDisabled(v)) setSource(v as ExtractionSource);
                }}
              >
                <SelectTrigger id="ig-source" aria-describedby="ig-source-note">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(SOURCE_LABELS).map(([value, label]) => {
                    const unsupported = sourceDisabled(value);
                    return (
                      <SelectItem key={value} value={value} disabled={unsupported}>
                        {label}
                        {unsupported ? " — configuração necessária" : ""}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
              <p id="ig-source-note" className="text-xs text-muted-foreground">
                {relationships.isLoading
                  ? "A verificar a configuração de seguidores e perfis seguidos…"
                  : relationships.configured
                  ? `Seguidores e perfis seguidos via ${relationships.provider === "apify" ? "Apify" : "ProfileQuery"}: só perfis públicos, até 500 por recolha. A lista pode não ficar completa.`
                  : "Configuração necessária: seguidores e perfis seguidos precisam da ligação Apify no servidor."}
              </p>
            </div>

            <div className="space-y-1.5 md:col-span-2">
              <Label htmlFor="ig-target">
                {source === "list" ? "Perfis (separados por vírgula)" : "Alvo"}
              </Label>
              {source === "list" ? (
                <Textarea
                  id="ig-target"
                  value={target}
                  onChange={(e) => setTarget(e.target.value)}
                  placeholder={SOURCE_PLACEHOLDER[source]}
                  rows={3}
                />
              ) : (
                <Input
                  id="ig-target"
                  value={target}
                  onChange={(e) => setTarget(e.target.value)}
                  placeholder={SOURCE_PLACEHOLDER[source]}
                />
              )}
              {isUnsupportedSource(source) && relationships.maxUsdPerProfile !== null && (
                <p className="text-xs text-muted-foreground" aria-live="polite">
                  Custo máximo na Apify: até{" "}
                  {(Math.min(Math.max(1, Number(limit) || 1), 500) * relationships.maxUsdPerProfile).toLocaleString("pt-PT", {
                    style: "currency",
                    currency: "USD",
                    maximumFractionDigits: 3,
                  })}{" "}
                  para {Math.min(Math.max(1, Number(limit) || 1), 500)} perfis (teto enviado à Apify; cobrado só o que for recolhido).
                </p>
              )}
              {SOURCE_HINT[source] && (
                <p className="text-xs text-muted-foreground">{SOURCE_HINT[source]}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="ig-limit">Máximo de perfis</Label>
              <Input
                id="ig-limit"
                type="number"
                min={1}
                max={20000}
                value={limit}
                onChange={(e) => setLimit(e.target.value)}
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button onClick={handleStart} disabled={!target.trim() || startJob.isPending || isJobRunning}>
              {startJob.isPending ? (
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
              ) : (
                <Play className="mr-1.5 h-4 w-4" />
              )}
              Iniciar recolha
            </Button>
            {isJobRunning && (
              <span className="self-center text-xs text-muted-foreground">
                Já existe uma recolha em curso. Termine ou pause antes de iniciar outra.
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      {jobsLoading ? (
        <Skeleton className="h-24 w-full" />
      ) : selectedJob ? (
        <Card>
          <CardContent className="space-y-3 pt-6">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="space-y-0.5">
                <p className="text-sm font-medium">
                  {SOURCE_LABELS[selectedJob.source]} — {selectedJob.target}
                </p>
                <p className="text-xs text-muted-foreground">
                  {selectedJob.processed_count} de {selectedJob.queued_count || selectedJob.limit_count} perfis
                  processados · {selectedJob.found_count} recolhidos
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={jobDisplay?.isError ? "destructive" : "secondary"}>
                  {jobDisplay?.label}
                </Badge>
                {jobDisplay?.isActive && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => controlJob.mutate({ jobId: selectedJob.id, action: "pause" })}
                  >
                    <Pause className="mr-1.5 h-3.5 w-3.5" /> Pausar
                  </Button>
                )}
                {jobDisplay?.kind === "paused" && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => controlJob.mutate({ jobId: selectedJob.id, action: "resume" })}
                  >
                    <Play className="mr-1.5 h-3.5 w-3.5" /> Retomar
                  </Button>
                )}
                {["running", "pending", "paused"].includes(selectedJob.status) &&
                  jobDisplay?.kind !== "failed" && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => controlJob.mutate({ jobId: selectedJob.id, action: "cancel" })}
                  >
                    <StopCircle className="mr-1.5 h-3.5 w-3.5" /> Cancelar
                  </Button>
                )}
              </div>
            </div>
            {!jobDisplay?.isError && (
              <Progress value={progress} aria-label={`Progresso: ${progress}%`} />
            )}
            {jobDisplay?.isActive && (
              <p className="text-xs text-muted-foreground">
                Última atualização{" "}
                {formatDistanceToNow(new Date(selectedJob.updated_at), { addSuffix: true, locale: pt })}
              </p>
            )}
            {jobDisplay?.message && (
              <p
                role={jobDisplay.isError ? "alert" : undefined}
                className={jobDisplay.isError ? "text-sm text-destructive" : "text-sm text-muted-foreground"}
              >
                {jobDisplay.message}
              </p>
            )}
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle className="text-base">Perfis recolhidos</CardTitle>
              <CardDescription>
                {profiles.length} perfis · {withEmail} com email · {withPhone} com telefone
              </CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" onClick={() => handleExport(filtered, false)} disabled={filtered.length === 0}>
                <Download className="mr-1.5 h-3.5 w-3.5" /> Exportar perfis
              </Button>
              <Button size="sm" variant="outline" onClick={() => handleExport(filtered, true)} disabled={withEmail + withPhone === 0}>
                <Download className="mr-1.5 h-3.5 w-3.5" /> Exportar contactos
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => bioEnrich.mutate(selectedProfiles.map((p) => p.id))}
                disabled={selectedProfiles.length === 0 || bioEnrich.isPending}
                title="Lê o link da bio (Linktree, site) e preenche telefone/email em falta. Até 25 perfis."
              >
                <Search className="mr-1.5 h-3.5 w-3.5" />
                {bioEnrich.isPending ? "A procurar…" : "Procurar contacto na bio"}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => cadence.start(selectedProfiles)}
                disabled={selectedProfiles.length === 0 || cadence.isGenerating}
                title="Mensagem no Instagram hoje, WhatsApp ao dia 3 (se houver telefone) e Instagram ao dia 7"
              >
                <Play className="mr-1.5 h-3.5 w-3.5" />
                Iniciar cadência {selectedProfiles.length > 0 ? `(${selectedProfiles.length})` : ""}
              </Button>
              <Button
                size="sm"
                onClick={() => importLeads.mutate(selectedProfiles, { onSuccess: () => setSelected(new Set()) })}
                disabled={selectedProfiles.length === 0 || importLeads.isPending}
              >
                {importLeads.isPending ? (
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                ) : (
                  <UserPlus className="mr-1.5 h-3.5 w-3.5" />
                )}
                Importar {selectedProfiles.length > 0 ? `(${selectedProfiles.length})` : ""} como Leads
              </Button>
            </div>
          </div>

          <div className="flex flex-wrap items-end gap-3">
            <Tabs value={scope} onValueChange={(v) => setScope(v as "current" | "all")}>
              <TabsList>
                <TabsTrigger value="current">Esta recolha</TabsTrigger>
                <TabsTrigger value="all">Todos</TabsTrigger>
              </TabsList>
            </Tabs>
            <div className="relative min-w-[220px] flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" aria-hidden />
              <Input
                className="pl-8"
                placeholder="Pesquisar por perfil, nome, bio ou cidade"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                aria-label="Pesquisar perfis"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ig-contact-filter" className="text-xs">Contactos</Label>
              <Select value={contactFilter} onValueChange={(v) => setContactFilter(v as ContactFilter)}>
                <SelectTrigger id="ig-contact-filter" className="w-[170px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="any">Com email ou telefone</SelectItem>
                  <SelectItem value="email">Só com email</SelectItem>
                  <SelectItem value="phone">Só com telefone</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ig-min-followers" className="text-xs">Seguidores mínimos</Label>
              <Input
                id="ig-min-followers"
                className="w-[150px]"
                type="number"
                min={0}
                value={minFollowers}
                onChange={(e) => setMinFollowers(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {resultsLoading ? (
            <div className="space-y-2">
              {[0, 1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-10 text-center text-sm text-muted-foreground">
              {profiles.length === 0
                ? "Ainda não há perfis recolhidos. Inicie uma recolha acima."
                : "Nenhum perfil corresponde aos filtros aplicados."}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">
                      <Checkbox
                        checked={selected.size > 0 && selected.size === filtered.length}
                        onCheckedChange={toggleAll}
                        aria-label="Selecionar todos"
                      />
                    </TableHead>
                    <TableHead>Perfil</TableHead>
                    <TableHead className="text-right">Seguidores</TableHead>
                    <TableHead className="text-right">A seguir</TableHead>
                    <TableHead className="text-right">Publicações</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Telefone</TableHead>
                    <TableHead>Cidade</TableHead>
                    <TableHead>Categoria</TableHead>
                    <TableHead className="w-10" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visibleProfiles.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell>
                        <Checkbox
                          checked={selected.has(p.id)}
                          onCheckedChange={() => toggle(p.id)}
                          aria-label={`Selecionar @${p.instagram_username}`}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={p.profile_image_url ?? undefined} alt="" />
                            <AvatarFallback>
                              {(p.instagram_username ?? "?").slice(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1">
                              <span className="truncate text-sm font-medium">@{p.instagram_username}</span>
                              {p.instagram_is_verified && (
                                <BadgeCheck className="h-3.5 w-3.5 text-sky-500" aria-label="Verificado" />
                              )}
                              <ProspectingIdentityBadge
                                check={identity.data?.[p.id] ?? (identity.isError ? { status: "unavailable", matches: [] } : undefined)}
                                loading={identity.isFetching}
                              />
                            </div>
                            <p className="truncate text-xs text-muted-foreground">
                              {p.profile_name ?? "—"}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-right text-sm">
                        {p.instagram_followers_count?.toLocaleString("pt-PT") ?? "—"}
                      </TableCell>
                      <TableCell className="text-right text-sm">
                        {p.instagram_following_count?.toLocaleString("pt-PT") ?? "—"}
                      </TableCell>
                      <TableCell className="text-right text-sm">
                        {p.instagram_posts_count?.toLocaleString("pt-PT") ?? "—"}
                      </TableCell>
                      <TableCell className="text-sm">{p.extracted_email ?? "—"}</TableCell>
                      <TableCell className="text-sm">{p.extracted_phone ?? "—"}</TableCell>
                      <TableCell className="text-sm">{p.inferred_location ?? "—"}</TableCell>
                      <TableCell className="text-sm">{p.instagram_category ?? "—"}</TableCell>
                      <TableCell>
                        <Button asChild size="icon" variant="ghost" aria-label="Abrir perfil no Instagram">
                          <a href={p.profile_url} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {pageCount > 1 && (
                <div className="flex items-center justify-between gap-2 pt-3 text-xs text-muted-foreground">
                  <span>
                    Página {safePage + 1} de {pageCount} · {filtered.length} perfis
                  </span>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" disabled={safePage === 0} onClick={() => setResultsPage(safePage - 1)}>
                      Anterior
                    </Button>
                    <Button size="sm" variant="outline" disabled={safePage >= pageCount - 1} onClick={() => setResultsPage(safePage + 1)}>
                      Seguinte
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <BulkOutreachDialog
        open={cadence.open}
        onOpenChange={cadence.setOpen}
        profiles={cadence.profiles}
        generatedMessages={cadence.messages}
        isGenerating={cadence.isGenerating}
        generationProgress={cadence.progress}
        onComplete={() => {
          setSelected(new Set());
          queryClient.invalidateQueries({ queryKey: ["instagram-extraction-results"] });
          queryClient.invalidateQueries({ queryKey: [PROSPECTING_IDENTITY_QUERY_KEY] });
        }}
        userId={user?.id}
      />
    </div>
    </DashboardLayout>
  );
}
