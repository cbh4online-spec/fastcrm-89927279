import { useState, useMemo } from "react";
import { Helmet } from "react-helmet-async";
import { useNavigate } from "react-router-dom";
import { Plus, Users, Edit2, Trash2, Send, Loader2, Filter, Search, RefreshCw, Target, Sparkles } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

import {
  useWhatsAppSegments,
  useSegmentPreview,
  useAvailableTags,
  useSaveSegment,
  useDeleteSegment,
  type WhatsAppSegment,
  type SegmentFilters,
} from "@/hooks/useWhatsAppSegments";
import { formatPhone } from "@/utils/phone";
import { formatDistanceToNow } from "date-fns";
import { pt } from "date-fns/locale";

const TEMP_OPTIONS = [
  { value: "cold", label: "Frio" },
  { value: "warm", label: "Morno" },
  { value: "hot", label: "Quente" },
] as const;

const STATUS_OPTIONS = ["ativo", "inativo", "potencial", "perdido"];

const EMPTY_FILTERS: SegmentFilters = {
  tags_any: [], tags_all: [], tags_none: [],
  temperature: [], client_status: [],
  score_min: null, score_max: null,
  has_email: null, has_phone: null,
  country: null, city: null, source: null,
  last_contact_days: null, inactive_days: null, created_within_days: null,
  search: null,
};

export default function WhatsAppSegmentsPage() {
  const navigate = useNavigate();
  const { data: segments = [], isLoading } = useWhatsAppSegments();
  const deleteSeg = useDeleteSegment();
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<WhatsAppSegment | null>(null);

  const totalContacts = useMemo(() => segments.reduce((s, x) => s + (x.cached_count ?? 0), 0), [segments]);

  const openNew = () => { setEditing(null); setEditorOpen(true); };
  const openEdit = (seg: WhatsAppSegment) => { setEditing(seg); setEditorOpen(true); };

  return (
    <>
      <Helmet>
        <title>Segmentos WhatsApp · FastCRM</title>
        <meta name="description" content="Crie segmentos dinâmicos de contactos baseados em tags, score e atividade para usar em campanhas WhatsApp." />
      </Helmet>

      <div className="container py-6 space-y-6 max-w-7xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              <Target className="h-7 w-7 text-primary" />
              Segmentos WhatsApp
            </h1>
            <p className="text-muted-foreground mt-1">
              Audiências dinâmicas reutilizáveis em campanhas, sequências e disparos.
            </p>
          </div>
          <Button onClick={openNew}>
            <Plus className="h-4 w-4 mr-2" /> Novo segmento
          </Button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <KpiCard label="Segmentos ativos" value={segments.length} icon={<Filter className="h-4 w-4" />} />
          <KpiCard label="Contactos cobertos" value={totalContacts} icon={<Users className="h-4 w-4" />} />
          <KpiCard label="Maior segmento" value={Math.max(0, ...segments.map((s) => s.cached_count))} icon={<Sparkles className="h-4 w-4" />} />
          <KpiCard label="Atualizado hoje" value={segments.filter((s) => s.cached_at && Date.now() - new Date(s.cached_at).getTime() < 86400000).length} icon={<RefreshCw className="h-4 w-4" />} />
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Os teus segmentos</CardTitle>
            <CardDescription>Clica num segmento para editar os filtros ou enviar uma campanha.</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
            ) : segments.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Target className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p>Ainda não tens segmentos criados.</p>
                <Button onClick={openNew} className="mt-4">Criar o primeiro</Button>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Filtros</TableHead>
                    <TableHead className="text-right">Contactos</TableHead>
                    <TableHead>Atualizado</TableHead>
                    <TableHead className="w-[180px] text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {segments.map((seg) => (
                    <TableRow key={seg.id}>
                      <TableCell>
                        <div className="font-medium">{seg.name}</div>
                        {seg.description && <div className="text-xs text-muted-foreground">{seg.description}</div>}
                      </TableCell>
                      <TableCell>
                        <FilterChips filters={seg.filters} />
                      </TableCell>
                      <TableCell className="text-right font-semibold">{seg.cached_count}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {seg.cached_at ? formatDistanceToNow(new Date(seg.cached_at), { addSuffix: true, locale: pt }) : "—"}
                      </TableCell>
                      <TableCell className="text-right space-x-1">
                        <Button size="sm" variant="ghost" onClick={() => navigate(`/dashboard/whatsapp-pro/campaigns?segment=${seg.id}`)}>
                          <Send className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => openEdit(seg)}>
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button size="sm" variant="ghost"><Trash2 className="h-4 w-4 text-destructive" /></Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Remover segmento?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Esta ação arquiva o segmento "{seg.name}". Os contactos não são afetados.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction onClick={() => deleteSeg.mutate(seg.id)}>Remover</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      <SegmentEditorDialog
        open={editorOpen}
        onOpenChange={setEditorOpen}
        segment={editing}
      />
    </>
  );
}

function KpiCard({ label, value, icon }: { label: string; value: number; icon: React.ReactNode }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">{label}</span>{icon}
        </div>
        <div className="text-2xl font-bold mt-1">{value}</div>
      </CardContent>
    </Card>
  );
}

function FilterChips({ filters }: { filters: SegmentFilters }) {
  const chips: string[] = [];
  if (filters.tags_any?.length) chips.push(`tags: ${filters.tags_any.join(", ")}`);
  if (filters.tags_all?.length) chips.push(`todas: ${filters.tags_all.join(", ")}`);
  if (filters.tags_none?.length) chips.push(`exceto: ${filters.tags_none.join(", ")}`);
  if (filters.temperature?.length) chips.push(`temp: ${filters.temperature.join("/")}`);
  if (filters.client_status?.length) chips.push(`status: ${filters.client_status.join("/")}`);
  if (typeof filters.score_min === "number") chips.push(`score ≥ ${filters.score_min}`);
  if (typeof filters.score_max === "number") chips.push(`score ≤ ${filters.score_max}`);
  if (filters.has_email === true) chips.push("com email");
  if (filters.has_email === false) chips.push("sem email");
  if (filters.country) chips.push(filters.country);
  if (filters.city) chips.push(filters.city);
  if (typeof filters.last_contact_days === "number") chips.push(`ativo ≤ ${filters.last_contact_days}d`);
  if (typeof filters.inactive_days === "number") chips.push(`inativo > ${filters.inactive_days}d`);
  if (typeof filters.created_within_days === "number") chips.push(`novo ≤ ${filters.created_within_days}d`);
  if (filters.source) chips.push(`origem: ${filters.source}`);
  if (chips.length === 0) return <span className="text-xs text-muted-foreground">— sem filtros —</span>;
  return (
    <div className="flex flex-wrap gap-1">
      {chips.slice(0, 4).map((c, i) => <Badge key={i} variant="secondary" className="text-xs">{c}</Badge>)}
      {chips.length > 4 && <Badge variant="outline" className="text-xs">+{chips.length - 4}</Badge>}
    </div>
  );
}

function SegmentEditorDialog({
  open, onOpenChange, segment,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  segment: WhatsAppSegment | null;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [filters, setFilters] = useState<SegmentFilters>(EMPTY_FILTERS);
  const [activeTab, setActiveTab] = useState<"filters" | "preview">("filters");

  const { data: tags = [] } = useAvailableTags();
  const preview = useSegmentPreview(open ? filters : null);
  const save = useSaveSegment();

  // sync when opening
  useMemo(() => {
    if (open) {
      setName(segment?.name ?? "");
      setDescription(segment?.description ?? "");
      setFilters(segment?.filters ?? EMPTY_FILTERS);
      setActiveTab("filters");
    }
  }, [open, segment]);

  const update = <K extends keyof SegmentFilters>(k: K, v: SegmentFilters[K]) =>
    setFilters((f) => ({ ...f, [k]: v }));

  const toggleArr = (key: "tags_any" | "tags_all" | "tags_none" | "temperature" | "client_status", val: string) => {
    setFilters((f) => {
      const cur = (f[key] ?? []) as string[];
      const next = cur.includes(val) ? cur.filter((x) => x !== val) : [...cur, val];
      return { ...f, [key]: next };
    });
  };

  const handleSave = async () => {
    if (!name.trim()) return;
    await save.mutateAsync({
      id: segment?.id,
      name,
      description,
      filters,
      cached_count: preview.data?.total ?? 0,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>{segment ? "Editar segmento" : "Novo segmento"}</DialogTitle>
          <DialogDescription>Define filtros dinâmicos. O segmento é recalculado sempre que é usado.</DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Nome *</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex.: Clientes VIP inativos" maxLength={120} />
          </div>
          <div className="space-y-2">
            <Label>Descrição</Label>
            <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Opcional" maxLength={250} />
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as never)} className="flex-1 overflow-hidden flex flex-col">
          <TabsList className="grid grid-cols-2 w-full">
            <TabsTrigger value="filters">Filtros</TabsTrigger>
            <TabsTrigger value="preview">
              Pré-visualização {preview.data && <Badge variant="secondary" className="ml-2">{preview.data.total}</Badge>}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="filters" className="overflow-y-auto pr-2 space-y-4 mt-4">
            <Section title="Tags" icon={<Filter className="h-4 w-4" />}>
              <div className="space-y-3">
                <TagPicker label="Inclui qualquer uma destas" available={tags} selected={filters.tags_any ?? []} onToggle={(t) => toggleArr("tags_any", t)} />
                <TagPicker label="Tem TODAS estas" available={tags} selected={filters.tags_all ?? []} onToggle={(t) => toggleArr("tags_all", t)} />
                <TagPicker label="Não tem" available={tags} selected={filters.tags_none ?? []} onToggle={(t) => toggleArr("tags_none", t)} />
              </div>
            </Section>

            <Section title="Qualificação">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Temperatura</Label>
                  <div className="flex gap-2 mt-1">
                    {TEMP_OPTIONS.map((t) => (
                      <button
                        key={t.value}
                        type="button"
                        onClick={() => toggleArr("temperature", t.value)}
                        className={`px-3 py-1 rounded-md text-sm border ${filters.temperature?.includes(t.value as never) ? "bg-primary text-primary-foreground border-primary" : "bg-background hover:bg-accent"}`}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <Label className="text-xs">Estado do cliente</Label>
                  <div className="flex gap-1 flex-wrap mt-1">
                    {STATUS_OPTIONS.map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => toggleArr("client_status", s)}
                        className={`px-2 py-1 rounded-md text-xs border capitalize ${filters.client_status?.includes(s) ? "bg-primary text-primary-foreground border-primary" : "bg-background hover:bg-accent"}`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <Label className="text-xs">Score mínimo</Label>
                  <Input type="number" min={0} max={100} value={filters.score_min ?? ""} onChange={(e) => update("score_min", e.target.value === "" ? null : Number(e.target.value))} />
                </div>
                <div>
                  <Label className="text-xs">Score máximo</Label>
                  <Input type="number" min={0} max={100} value={filters.score_max ?? ""} onChange={(e) => update("score_max", e.target.value === "" ? null : Number(e.target.value))} />
                </div>
              </div>
            </Section>

            <Section title="Atividade">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <Label className="text-xs">Contactado nos últimos N dias</Label>
                  <Input type="number" min={1} value={filters.last_contact_days ?? ""} onChange={(e) => update("last_contact_days", e.target.value === "" ? null : Number(e.target.value))} placeholder="ex.: 30" />
                </div>
                <div>
                  <Label className="text-xs">Inativo há mais de N dias</Label>
                  <Input type="number" min={1} value={filters.inactive_days ?? ""} onChange={(e) => update("inactive_days", e.target.value === "" ? null : Number(e.target.value))} placeholder="ex.: 60" />
                </div>
                <div>
                  <Label className="text-xs">Criado nos últimos N dias</Label>
                  <Input type="number" min={1} value={filters.created_within_days ?? ""} onChange={(e) => update("created_within_days", e.target.value === "" ? null : Number(e.target.value))} placeholder="ex.: 7" />
                </div>
              </div>
            </Section>

            <Section title="Atributos & Localização">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <Label className="text-xs">País</Label>
                  <Input value={filters.country ?? ""} onChange={(e) => update("country", e.target.value || null)} placeholder="Portugal" />
                </div>
                <div>
                  <Label className="text-xs">Cidade contém</Label>
                  <Input value={filters.city ?? ""} onChange={(e) => update("city", e.target.value || null)} placeholder="Lisboa" />
                </div>
                <div>
                  <Label className="text-xs">Origem</Label>
                  <Input value={filters.source ?? ""} onChange={(e) => update("source", e.target.value || null)} placeholder="whatsapp_import, manual…" />
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="has_email"
                    checked={filters.has_email === true}
                    onCheckedChange={(v) => update("has_email", v === true ? true : null)}
                  />
                  <Label htmlFor="has_email" className="text-sm cursor-pointer">Apenas com email</Label>
                </div>
                <div className="md:col-span-2">
                  <Label className="text-xs">Procurar (nome/email/empresa)</Label>
                  <div className="relative">
                    <Search className="h-4 w-4 absolute left-2 top-2.5 text-muted-foreground" />
                    <Input className="pl-8" value={filters.search ?? ""} onChange={(e) => update("search", e.target.value || null)} />
                  </div>
                </div>
              </div>
            </Section>

            <Button variant="ghost" size="sm" onClick={() => setFilters(EMPTY_FILTERS)}>
              Limpar todos os filtros
            </Button>
          </TabsContent>

          <TabsContent value="preview" className="overflow-hidden mt-4">
            {preview.isLoading ? (
              <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin" /></div>
            ) : (
              <ScrollArea className="h-[420px] border rounded-md">
                <Table>
                  <TableHeader className="sticky top-0 bg-background z-10">
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>Telefone</TableHead>
                      <TableHead>Tags</TableHead>
                      <TableHead>Temp</TableHead>
                      <TableHead className="text-right">Score</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(preview.data?.rows ?? []).map((r: any) => (
                      <TableRow key={r.id}>
                        <TableCell className="font-medium">{r.name}</TableCell>
                        <TableCell className="font-mono text-xs">{r.phone ? formatPhone(r.phone) : "—"}</TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {(r.tags ?? []).slice(0, 3).map((t: string) => (
                              <Badge key={t} variant="outline" className="text-xs">{t}</Badge>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell><Badge variant="secondary" className="text-xs capitalize">{r.ai_temperature}</Badge></TableCell>
                        <TableCell className="text-right">{r.contact_score}</TableCell>
                      </TableRow>
                    ))}
                    {(preview.data?.rows ?? []).length === 0 && (
                      <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Nenhum contacto corresponde aos filtros.</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </ScrollArea>
            )}
            <p className="text-xs text-muted-foreground mt-2">
              Total estimado: <strong>{preview.data?.total ?? 0}</strong> contactos. A pré-visualização mostra até 50.
            </p>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSave} disabled={!name.trim() || save.isPending}>
            {save.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Guardar segmento
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Section({ title, icon, children }: { title: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="border rounded-md p-4">
      <div className="flex items-center gap-2 mb-3 text-sm font-semibold">
        {icon}{title}
      </div>
      <Separator className="mb-3" />
      {children}
    </div>
  );
}

function TagPicker({ label, available, selected, onToggle }: {
  label: string; available: string[]; selected: string[]; onToggle: (t: string) => void;
}) {
  const [query, setQuery] = useState("");
  const filtered = useMemo(
    () => available.filter((t) => t.toLowerCase().includes(query.toLowerCase())),
    [available, query],
  );
  return (
    <div>
      <Label className="text-xs">{label}</Label>
      {available.length > 0 && (
        <Input className="mt-1 mb-2 h-8 text-xs" placeholder="Procurar tag…" value={query} onChange={(e) => setQuery(e.target.value)} />
      )}
      <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto">
        {available.length === 0 ? (
          <span className="text-xs text-muted-foreground">Nenhuma tag em uso ainda.</span>
        ) : filtered.length === 0 ? (
          <span className="text-xs text-muted-foreground">Sem resultados.</span>
        ) : filtered.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => onToggle(t)}
            className={`px-2 py-0.5 text-xs rounded-md border ${selected.includes(t) ? "bg-primary text-primary-foreground border-primary" : "bg-background hover:bg-accent"}`}
          >
            {t}
          </button>
        ))}
      </div>
    </div>
  );
}
