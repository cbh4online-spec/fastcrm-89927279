import { useState } from "react";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Search, MoreHorizontal, Eye, Edit, Trash2, Copy, CheckCircle,
  Archive, ExternalLink, Loader2, ChevronLeft, ChevronRight, Plus, FileText,
} from "lucide-react";
import { format } from "date-fns";
import { pt } from "date-fns/locale";
import {
  useBlogArticles, useDeleteBlogArticle, useDuplicateArticle,
} from "@/hooks/useBlogAdmin";
import {
  useUpdateEntityStatus, useBulkUpdateStatus,
} from "@/modules/growth-seo/hooks/useAdminSEOEntities";
import type { EntityStatus, Intent, SEOEntity } from "@/modules/growth-seo/types";

const statusLabels: Record<EntityStatus, string> = {
  draft: "Rascunho",
  published: "Publicado",
  archived: "Arquivado",
};

const statusColors: Record<EntityStatus, string> = {
  draft: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
  published: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  archived: "bg-muted text-muted-foreground",
};

const intentLabels: Record<Intent, string> = {
  informational: "Informacional",
  commercial: "Comercial",
  transactional: "Transaccional",
};

interface BlogArticlesListProps {
  onEdit: (article: SEOEntity) => void;
  onNew: () => void;
}

export default function BlogArticlesList({ onEdit, onNew }: BlogArticlesListProps) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<EntityStatus | "all">("all");
  const [intentFilter, setIntentFilter] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState("updated_at");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [selected, setSelected] = useState<string[]>([]);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data, isLoading } = useBlogArticles(
    { status: statusFilter, intent: intentFilter, search },
    { page, pageSize: 20, sortBy, sortOrder }
  );
  const deleteArticle = useDeleteBlogArticle();
  const duplicateArticle = useDuplicateArticle();
  const updateStatus = useUpdateEntityStatus();
  const bulkUpdate = useBulkUpdateStatus();

  const articles = data?.articles || [];
  const totalPages = data?.totalPages || 0;

  const toggleSelect = (id: string) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const toggleAll = () => {
    setSelected((prev) =>
      prev.length === articles.length ? [] : articles.map((a) => a.id)
    );
  };

  const handleSort = (col: string) => {
    if (sortBy === col) {
      setSortOrder((o) => (o === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(col);
      setSortOrder("desc");
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!articles.length && !search && statusFilter === "all") {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <FileText className="h-16 w-16 text-muted-foreground/40" />
        <h3 className="text-lg font-semibold text-foreground">Nenhum artigo ainda</h3>
        <p className="text-muted-foreground text-sm">
          Crie o seu primeiro artigo de blog para começar.
        </p>
        <Button onClick={onNew}>
          <Plus className="h-4 w-4 mr-2" />
          Criar Artigo
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Pesquisar artigos..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v as EntityStatus | "all"); setPage(1); }}>
          <SelectTrigger className="w-[140px]"><SelectValue placeholder="Estado" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="draft">Rascunho</SelectItem>
            <SelectItem value="published">Publicado</SelectItem>
            <SelectItem value="archived">Arquivado</SelectItem>
          </SelectContent>
        </Select>
        <Select value={intentFilter} onValueChange={(v) => { setIntentFilter(v); setPage(1); }}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="Intenção" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            <SelectItem value="informational">Informacional</SelectItem>
            <SelectItem value="commercial">Comercial</SelectItem>
            <SelectItem value="transactional">Transaccional</SelectItem>
          </SelectContent>
        </Select>
        <Button onClick={onNew} size="sm">
          <Plus className="h-4 w-4 mr-2" />
          Novo Artigo
        </Button>
      </div>

      {/* Bulk Actions */}
      {selected.length > 0 && (
        <div className="flex items-center gap-2 p-2 rounded-md bg-muted">
          <span className="text-sm text-muted-foreground">{selected.length} seleccionados</span>
          <Button size="sm" variant="outline" onClick={() => bulkUpdate.mutate({ entityIds: selected, status: "published" })}>
            Publicar
          </Button>
          <Button size="sm" variant="outline" onClick={() => bulkUpdate.mutate({ entityIds: selected, status: "archived" })}>
            Arquivar
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setSelected([])}>Limpar</Button>
        </div>
      )}

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">
                <Checkbox
                  checked={selected.length === articles.length && articles.length > 0}
                  onCheckedChange={toggleAll}
                />
              </TableHead>
              <TableHead className="cursor-pointer" onClick={() => handleSort("title")}>
                Título {sortBy === "title" && (sortOrder === "asc" ? "↑" : "↓")}
              </TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Intenção</TableHead>
              <TableHead className="cursor-pointer text-right" onClick={() => handleSort("views_count")}>
                Views {sortBy === "views_count" && (sortOrder === "asc" ? "↑" : "↓")}
              </TableHead>
              <TableHead className="cursor-pointer text-right" onClick={() => handleSort("ai_quality_score")}>
                AI Score {sortBy === "ai_quality_score" && (sortOrder === "asc" ? "↑" : "↓")}
              </TableHead>
              <TableHead className="cursor-pointer" onClick={() => handleSort("published_at")}>
                Publicação {sortBy === "published_at" && (sortOrder === "asc" ? "↑" : "↓")}
              </TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {articles.map((article) => (
              <TableRow key={article.id} className="cursor-pointer" onClick={() => onEdit(article)}>
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <Checkbox
                    checked={selected.includes(article.id)}
                    onCheckedChange={() => toggleSelect(article.id)}
                  />
                </TableCell>
                <TableCell>
                  <div>
                    <p className="font-medium text-foreground line-clamp-1">{article.title}</p>
                    <p className="text-xs text-muted-foreground">/{article.slug}</p>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="secondary" className={statusColors[article.status]}>
                    {statusLabels[article.status]}
                  </Badge>
                </TableCell>
                <TableCell>
                  {article.intent && (
                    <span className="text-sm text-muted-foreground">
                      {intentLabels[article.intent]}
                    </span>
                  )}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {article.views_count || 0}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {article.ai_quality_score != null
                    ? `${Math.round(article.ai_quality_score)}%`
                    : "—"}
                </TableCell>
                <TableCell>
                  {article.published_at
                    ? format(new Date(article.published_at), "dd MMM yyyy", { locale: pt })
                    : "—"}
                </TableCell>
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => onEdit(article)}>
                        <Edit className="h-4 w-4 mr-2" /> Editar
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => duplicateArticle.mutate(article.id)}>
                        <Copy className="h-4 w-4 mr-2" /> Duplicar
                      </DropdownMenuItem>
                      {article.status !== "published" && (
                        <DropdownMenuItem onClick={() => updateStatus.mutate({ entityId: article.id, status: "published" })}>
                          <CheckCircle className="h-4 w-4 mr-2" /> Publicar
                        </DropdownMenuItem>
                      )}
                      {article.status === "published" && (
                        <DropdownMenuItem onClick={() => updateStatus.mutate({ entityId: article.id, status: "draft" })}>
                          <Archive className="h-4 w-4 mr-2" /> Despublicar
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem
                        onClick={() => window.open(`/blog/${article.slug}`, "_blank")}
                      >
                        <ExternalLink className="h-4 w-4 mr-2" /> Ver Página
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-destructive"
                        onClick={() => setDeleteId(article.id)}
                      >
                        <Trash2 className="h-4 w-4 mr-2" /> Eliminar
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">
            Página {page} de {totalPages} ({data?.total || 0} artigos)
          </span>
          <div className="flex gap-1">
            <Button size="icon" variant="outline" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button size="icon" variant="outline" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar artigo?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação é irreversível. O artigo será eliminado permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => { if (deleteId) deleteArticle.mutate(deleteId); setDeleteId(null); }}
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
