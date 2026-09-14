import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
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
} from "@/hooks/useInstagramExtraction";

const SOURCE_LABELS: Record<ExtractionSource, string> = {
  followers: "Seguidores de um perfil",
  following: "Quem um perfil segue",
  hashtag: "Hashtag",
  location: "Localização (ID)",
  list: "Lista de @perfis",
};

const SOURCE_PLACEHOLDER: Record<ExtractionSource, string> = {
  followers: "@perfil",
  following: "@perfil",
  hashtag: "terapiacapilar",
  location: "ID da localização do Instagram",
  list: "@perfil1, @perfil2, @perfil3",
};

const STATUS_LABEL: Record<string, string> = {
  pending: "Na fila",
  running: "A recolher",
  paused: "Em pausa",
  completed: "Concluído",
  failed: "Falhou",
  cancelled: "Cancelado",
};

type ContactFilter = "all" | "email" | "phone" | "any";

export default function ProspectingInstagramExtractor() {
  const navigate = useNavigate();
  const { jobs, isLoading: jobsLoading, activeJob, startJob, controlJob } = useInstagramExtractionJobs();

  const [source, setSource] = useState<ExtractionSource>("followers");
  const [target, setTarget] = useState("");
  const [limit, setLimit] = useState("200");
  const [scope, setScope] = useState<"current" | "all">("current");
  const [search, setSearch] = useState("");
  const [contactFilter, setContactFilter] = useState<ContactFilter>("all");
  const [minFollowers, setMinFollowers] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const selectedJob = activeJob ?? jobs[0] ?? null;
  const jobIdForResults = scope === "current" ? selectedJob?.id ?? null : null;
  const isJobRunning = selectedJob?.status === "running" || selectedJob?.status === "pending";

  const { data: profiles = [], isLoading: resultsLoading } = useInstagramExtractionResults(
    jobIdForResults,
    isJobRunning,
  );
  const importLeads = useInstagramExtractionImport();

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
              <Select value={source} onValueChange={(v) => setSource(v as ExtractionSource)}>
                <SelectTrigger id="ig-source">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(SOURCE_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
                <Badge variant={selectedJob.status === "failed" ? "destructive" : "secondary"}>
                  {STATUS_LABEL[selectedJob.status] ?? selectedJob.status}
                </Badge>
                {(selectedJob.status === "running" || selectedJob.status === "pending") && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => controlJob.mutate({ jobId: selectedJob.id, action: "pause" })}
                  >
                    <Pause className="mr-1.5 h-3.5 w-3.5" /> Pausar
                  </Button>
                )}
                {selectedJob.status === "paused" && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => controlJob.mutate({ jobId: selectedJob.id, action: "resume" })}
                  >
                    <Play className="mr-1.5 h-3.5 w-3.5" /> Retomar
                  </Button>
                )}
                {["running", "pending", "paused"].includes(selectedJob.status) && (
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
            <Progress value={progress} aria-label={`Progresso: ${progress}%`} />
            {selectedJob.error && (
              <p className="text-xs text-destructive">{selectedJob.error}</p>
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
                  {filtered.map((p) => (
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
                              {p.converted_lead_id && (
                                <Badge variant="secondary" className="text-[10px]">Lead</Badge>
                              )}
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
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
