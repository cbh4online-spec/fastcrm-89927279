import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { format } from "date-fns";
import { pt } from "date-fns/locale";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Plus, RefreshCw, MoreHorizontal, Search } from "lucide-react";
import { callMetaTemplates, STATUS_LABEL, CATEGORY_LABEL, type ListResult, type MetaTemplateRow } from "./meta-templates/api";
import { TemplateEditorDialog } from "./meta-templates/TemplateEditorDialog";
import { SendTemplateDialog } from "./meta-templates/SendTemplateDialog";
import { META_LANGUAGES } from "../../../supabase/functions/_shared/metaTemplateRules";

const ALL = "__all";
const fmt = (d: string | null) => (d ? format(new Date(d), "dd/MM/yyyy HH:mm", { locale: pt }) : "—");
const CHANGE: Record<string, string> = { create: "Criado", edit: "Editado", submit: "Enviado para aprovação", status_sync: "Estado atualizado", duplicate: "Duplicado", imported: "Importado da Meta" };

export function MetaOfficialTemplatesPanel() {
  const { currentWorkspace } = useWorkspace();
  const wid = currentWorkspace?.id;
  const qc = useQueryClient();
  const [editing, setEditing] = useState<MetaTemplateRow | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [details, setDetails] = useState<MetaTemplateRow | null>(null);
  const [sending, setSending] = useState<{ t: MetaTemplateRow; test: boolean } | null>(null);
  const [search, setSearch] = useState(""); const [fStatus, setFStatus] = useState(ALL); const [fCat, setFCat] = useState(ALL); const [fLang, setFLang] = useState(ALL);

  const key = ["meta-templates-db", wid];
  const q = useQuery({ queryKey: key, enabled: !!wid, retry: false, queryFn: () => callMetaTemplates<ListResult>({ action: "list", workspaceId: wid }) });
  const refresh = () => qc.invalidateQueries({ queryKey: key });
  const sync = useMutation({
    mutationFn: () => callMetaTemplates({ action: "sync", workspaceId: wid }),
    onSuccess: (r: any) => { toast.success(`Estados atualizados (${r.updated} atualizados, ${r.imported} importados).`); refresh(); },
    onError: (e: Error) => toast.error(e.message),
  });
  const dup = useMutation({
    mutationFn: (id: string) => callMetaTemplates({ action: "duplicate", workspaceId: wid, templateId: id }),
    onSuccess: (r: any) => { toast.success("Cópia criada como rascunho."); refresh(); setEditing(r.template); setEditorOpen(true); },
    onError: (e: Error) => toast.error(e.message),
  });
  const del = useMutation({
    mutationFn: (id: string) => callMetaTemplates({ action: "delete", workspaceId: wid, templateId: id }),
    onSuccess: () => { toast.success("Modelo apagado."); refresh(); },
    onError: (e: Error) => toast.error(e.message),
  });

  const notActive = (q.error as { code?: string } | null)?.code === "META_NOT_ALLOWED";
  const rows = useMemo(() => {
    const s = search.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    return (q.data?.templates ?? []).filter((t) =>
      (fStatus === ALL || t.status === fStatus) && (fCat === ALL || t.category === fCat) && (fLang === ALL || t.language === fLang) &&
      (!s || `${t.internal_name} ${t.meta_name} ${(t.tags ?? []).join(" ")}`.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").includes(s)));
  }, [q.data, search, fStatus, fCat, fLang]);
  const vars = q.data?.variables ?? [];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground max-w-2xl">
          Fora das 24 h desde a última mensagem do cliente, a Meta só aceita modelos aprovados. A aprovação demora de minutos a 48 h e o estado atualiza ao carregar em «Atualizar estado Meta».
        </p>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => sync.mutate()} disabled={sync.isPending || notActive || !wid}>
            <RefreshCw className={`h-4 w-4 mr-2 ${sync.isPending ? "animate-spin" : ""}`} />Atualizar estado Meta
          </Button>
          <Button size="sm" onClick={() => { setEditing(null); setEditorOpen(true); }} disabled={notActive || !wid}><Plus className="h-4 w-4 mr-2" />Novo modelo Meta</Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input className="pl-8" placeholder="Pesquisar por nome ou etiqueta" aria-label="Pesquisar modelos" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={fStatus} onValueChange={setFStatus}><SelectTrigger className="w-[190px]" aria-label="Estado"><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value={ALL}>Todos os estados</SelectItem>{Object.entries(STATUS_LABEL).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}</SelectContent></Select>
        <Select value={fCat} onValueChange={setFCat}><SelectTrigger className="w-[160px]" aria-label="Categoria"><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value={ALL}>Todas as categorias</SelectItem>{Object.entries(CATEGORY_LABEL).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent></Select>
        <Select value={fLang} onValueChange={setFLang}><SelectTrigger className="w-[170px]" aria-label="Idioma"><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value={ALL}>Todos os idiomas</SelectItem>{META_LANGUAGES.map((l) => <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>)}</SelectContent></Select>
      </div>

      {q.isLoading ? (
        <div className="space-y-2">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-16 rounded-lg" />)}</div>
      ) : q.error ? (
        <Card><CardContent className="p-8 text-center text-sm text-muted-foreground">
          {notActive ? "Este workspace não tem a linha oficial WhatsApp ativa. Peça o add-on em Definições → Canais." : (q.error as Error).message}
        </CardContent></Card>
      ) : !rows.length ? (
        <Card><CardContent className="p-8 text-center text-sm text-muted-foreground">
          {(q.data?.templates ?? []).length ? "Nenhum modelo corresponde aos filtros." : "Ainda não há modelos. Crie um novo ou carregue em «Atualizar estado Meta» para importar os que já existem na Meta."}
        </CardContent></Card>
      ) : (
        <Card><CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs text-muted-foreground border-b">
              <tr><th className="p-3">Modelo</th><th className="p-3">Conta</th><th className="p-3">Categoria</th><th className="p-3">Idioma</th><th className="p-3">Estado Meta</th><th className="p-3">Qualidade</th><th className="p-3">Criado</th><th className="p-3">Última sincronização</th><th className="p-3 sr-only">Ações</th></tr>
            </thead>
            <tbody className="divide-y">
              {rows.map((t) => {
                const st = STATUS_LABEL[t.status] ?? { label: t.status, variant: "outline" as const };
                return (
                  <tr key={t.id} className="hover:bg-muted/40 cursor-pointer" onClick={() => setDetails(t)}>
                    <td className="p-3"><div className="font-medium">{t.internal_name}</div><div className="text-xs text-muted-foreground font-mono">{t.meta_name} · v{t.version}</div></td>
                    <td className="p-3 text-xs">{q.data?.phone ?? "Linha oficial"}</td>
                    <td className="p-3">{CATEGORY_LABEL[t.category] ?? t.category}</td>
                    <td className="p-3">{t.language}</td>
                    <td className="p-3"><Badge variant={st.variant}>{st.label}</Badge>{t.status === "REJECTED" && t.rejected_reason && <div className="text-xs text-destructive mt-1 max-w-[200px]">{t.rejected_reason}</div>}</td>
                    <td className="p-3 text-xs">{t.quality_score ?? "—"}</td>
                    <td className="p-3 text-xs whitespace-nowrap">{fmt(t.created_at)}</td>
                    <td className="p-3 text-xs whitespace-nowrap">{fmt(t.last_synced_at)}</td>
                    <td className="p-3" onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild><Button size="icon" variant="ghost" aria-label={`Ações de ${t.internal_name}`}><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => { setEditing(t); setEditorOpen(true); }}>{t.status === "DRAFT" || t.status === "REJECTED" ? "Editar" : "Ver"}</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => dup.mutate(t.id)}>Duplicar</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setDetails(t)}>Detalhes e versões</DropdownMenuItem>
                          {t.status === "APPROVED" && <DropdownMenuItem onClick={() => setSending({ t, test: true })}>Testar modelo</DropdownMenuItem>}
                          {t.status === "APPROVED" && <DropdownMenuItem onClick={() => setSending({ t, test: false })}>Enviar a um contacto</DropdownMenuItem>}
                          <DropdownMenuItem className="text-destructive" onClick={() => { if (confirm(`Apagar «${t.internal_name}»${t.meta_template_id ? " também na Meta" : ""}? Esta ação não pode ser desfeita.`)) del.mutate(t.id); }}>Apagar</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </CardContent></Card>
      )}

      {wid && <TemplateEditorDialog open={editorOpen} onOpenChange={setEditorOpen} workspaceId={wid} phone={q.data?.phone ?? null}
        template={editing} variables={vars} buttonActions={q.data?.buttonActions ?? []} onSaved={refresh} />}
      {wid && <SendTemplateDialog open={!!sending} onOpenChange={(o) => !o && setSending(null)} workspaceId={wid} template={sending?.t ?? null}
        variables={vars.filter((v) => v.template_id === sending?.t.id)} test={sending?.test} />}

      <Sheet open={!!details} onOpenChange={(o) => !o && setDetails(null)}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto">
          {details && <>
            <SheetHeader><SheetTitle>{details.internal_name}</SheetTitle></SheetHeader>
            <dl className="mt-4 grid grid-cols-[130px_1fr] gap-y-2 text-sm">
              <dt className="text-muted-foreground">Nome técnico</dt><dd className="font-mono break-all">{details.meta_name}</dd>
              <dt className="text-muted-foreground">ID Meta</dt><dd className="font-mono break-all">{details.meta_template_id ?? "—"}</dd>
              <dt className="text-muted-foreground">Estado</dt><dd>{STATUS_LABEL[details.status]?.label ?? details.status}</dd>
              {details.rejected_reason && <><dt className="text-muted-foreground">Motivo</dt><dd className="text-destructive">{details.rejected_reason}</dd></>}
              <dt className="text-muted-foreground">Submetido</dt><dd>{fmt(details.submitted_at)}</dd>
              <dt className="text-muted-foreground">Etiquetas</dt><dd>{details.tags?.length ? details.tags.join(", ") : "—"}</dd>
              {details.description && <><dt className="text-muted-foreground">Descrição</dt><dd>{details.description}</dd></>}
            </dl>
            <h3 className="mt-6 mb-2 text-sm font-medium">Histórico de versões</h3>
            <ol className="space-y-2">
              {(q.data?.versions ?? []).filter((v) => v.template_id === details.id).map((v) => (
                <li key={v.id} className="text-sm border-l-2 pl-3">
                  <div>{CHANGE[v.change_type] ?? v.change_type} · v{v.version}{v.status ? ` · ${STATUS_LABEL[v.status]?.label ?? v.status}` : ""}</div>
                  <div className="text-xs text-muted-foreground">{fmt(v.created_at)}</div>
                </li>
              ))}
            </ol>
          </>}
        </SheetContent>
      </Sheet>
    </div>
  );
}
