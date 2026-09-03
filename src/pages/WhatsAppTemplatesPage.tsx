import { useMemo, useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useWhatsAppTemplates, useDeleteWhatsAppTemplate, useSetTemplateStatus, type WhatsAppTemplate, detectVariables } from "@/hooks/useWhatsAppTemplates";
import { WhatsAppTemplateDialog } from "@/components/whatsapp-pro/WhatsAppTemplateDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, Plus, MoreVertical, Search, CheckCircle2, Clock, XCircle, Pencil, Trash2, Send } from "lucide-react";
import { Link } from "react-router-dom";
import { PlaybookLibraryPanel } from "@/components/whatsapp-pro/PlaybookLibraryPanel";
import { PlaybookTemplatesList } from "@/components/whatsapp-pro/PlaybookTemplatesList";

const STATUS_CONFIG: Record<string, { label: string; icon: any; tone: string }> = {
  draft: { label: "Rascunho", icon: Pencil, tone: "bg-muted text-muted-foreground" },
  pending_review: { label: "Em revisão", icon: Clock, tone: "bg-amber-500/15 text-amber-600" },
  approved: { label: "Aprovado", icon: CheckCircle2, tone: "bg-emerald-500/15 text-emerald-600" },
  rejected: { label: "Rejeitado", icon: XCircle, tone: "bg-destructive/15 text-destructive" },
};

export default function WhatsAppTemplatesPage() {
  const { data: templates, isLoading } = useWhatsAppTemplates();
  const del = useDeleteWhatsAppTemplate();
  const setStatus = useSetTemplateStatus();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<WhatsAppTemplate | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [view, setView] = useState<"mine" | "playbook">("mine");

  const filtered = useMemo(() => {
    return (templates || []).filter(t => {
      if (statusFilter !== "all" && (t.status || "draft") !== statusFilter) return false;
      if (categoryFilter !== "all" && (t.category || "general") !== categoryFilter) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        if (!t.name.toLowerCase().includes(q) && !t.body.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [templates, search, statusFilter, categoryFilter]);

  const counts = useMemo(() => {
    const c = { all: 0, draft: 0, pending_review: 0, approved: 0, rejected: 0 };
    for (const t of templates || []) {
      c.all++;
      const s = (t.status || "draft") as keyof typeof c;
      if (s in c) c[s]++;
    }
    return c;
  }, [templates]);

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <FileText className="h-6 w-6 text-primary" />
            <div>
              <h1 className="text-2xl font-bold">Templates WhatsApp</h1>
              <p className="text-sm text-muted-foreground">
                Mensagens reutilizáveis com variáveis dinâmicas e fluxo de aprovação
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Link to="/dashboard/whatsapp-pro/campaigns">
              <Button variant="outline" size="sm"><Send className="h-4 w-4 mr-2" />Campanhas</Button>
            </Link>
            <Button onClick={() => { setEditing(null); setDialogOpen(true); }}>
              <Plus className="h-4 w-4 mr-2" /> Novo template
            </Button>
          </div>
        </div>

        <PlaybookLibraryPanel />

        <Tabs value={view} onValueChange={(v) => setView(v as "mine" | "playbook")}>
          <TabsList>
            <TabsTrigger value="mine">Os meus templates ({counts.all})</TabsTrigger>
            <TabsTrigger value="playbook">Biblioteca comercial</TabsTrigger>
          </TabsList>
        </Tabs>

        {view === "playbook" ? <PlaybookTemplatesList /> : (
        <>
        <div className="flex flex-wrap items-center gap-2">
          <Tabs value={statusFilter} onValueChange={setStatusFilter}>
            <TabsList>
              <TabsTrigger value="all">Todos ({counts.all})</TabsTrigger>
              <TabsTrigger value="draft">Rascunhos ({counts.draft})</TabsTrigger>
              <TabsTrigger value="pending_review">Revisão ({counts.pending_review})</TabsTrigger>
              <TabsTrigger value="approved">Aprovados ({counts.approved})</TabsTrigger>
              <TabsTrigger value="rejected">Rejeitados ({counts.rejected})</TabsTrigger>
            </TabsList>
          </Tabs>
          <div className="relative flex-1 min-w-[220px] max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input className="pl-9" placeholder="Pesquisar nome ou texto…" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas categorias</SelectItem>
              <SelectItem value="general">Geral</SelectItem>
              <SelectItem value="marketing">Marketing</SelectItem>
              <SelectItem value="transactional">Transacional</SelectItem>
              <SelectItem value="support">Suporte</SelectItem>
              <SelectItem value="reminder">Lembrete</SelectItem>
              <SelectItem value="onboarding">Onboarding</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-44 rounded-lg" />)}
          </div>
        ) : filtered.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center text-muted-foreground">
              <FileText className="h-10 w-10 mx-auto mb-3 opacity-40" />
              <p>Sem templates {statusFilter !== "all" ? `no estado "${STATUS_CONFIG[statusFilter]?.label}"` : ""}</p>
              <Button className="mt-4" onClick={() => { setEditing(null); setDialogOpen(true); }}>
                <Plus className="h-4 w-4 mr-2" /> Criar primeiro template
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map(t => {
              const st = STATUS_CONFIG[t.status || "draft"];
              const StIcon = st?.icon || Pencil;
              const vars = detectVariables(t.body);
              return (
                <Card key={t.id} className="flex flex-col">
                  <CardContent className="p-4 flex-1 flex flex-col gap-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h3 className="font-semibold truncate">{t.name}</h3>
                        <div className="flex items-center gap-1 mt-1">
                          <Badge variant="outline" className="text-xs">{t.language}</Badge>
                          <Badge variant="outline" className="text-xs">{t.category}</Badge>
                        </div>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button size="icon" variant="ghost" className="h-7 w-7"><MoreVertical className="h-4 w-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => { setEditing(t); setDialogOpen(true); }}>
                            <Pencil className="h-4 w-4 mr-2" /> Editar
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => setStatus.mutate({ id: t.id, status: "approved" })}>
                            <CheckCircle2 className="h-4 w-4 mr-2" /> Aprovar
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setStatus.mutate({ id: t.id, status: "pending_review" })}>
                            <Clock className="h-4 w-4 mr-2" /> Marcar em revisão
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setStatus.mutate({ id: t.id, status: "rejected" })}>
                            <XCircle className="h-4 w-4 mr-2" /> Rejeitar
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => { if (confirm(`Eliminar template "${t.name}"?`)) del.mutate(t.id); }}
                          >
                            <Trash2 className="h-4 w-4 mr-2" /> Eliminar
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    <p className="text-sm text-muted-foreground whitespace-pre-wrap line-clamp-4 flex-1">
                      {t.body}
                    </p>

                    {vars.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {vars.slice(0, 4).map(v => <Badge key={v} variant="secondary" className="text-xs">{`{{${v}}}`}</Badge>)}
                        {vars.length > 4 && <Badge variant="secondary" className="text-xs">+{vars.length - 4}</Badge>}
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-2 border-t">
                      <span className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded ${st?.tone}`}>
                        <StIcon className="h-3 w-3" /> {st?.label}
                      </span>
                      <span className="text-xs text-muted-foreground">{t.usage_count || 0} usos</span>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
        </>
        )}


        <WhatsAppTemplateDialog open={dialogOpen} onOpenChange={setDialogOpen} template={editing} />
      </div>
    </DashboardLayout>
  );
}
