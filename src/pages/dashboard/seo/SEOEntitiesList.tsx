import { useState, useMemo } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Checkbox } from "@/components/ui/checkbox";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Search,
  MoreHorizontal,
  Eye,
  Edit,
  Trash2,
  CheckCircle,
  Archive,
  ExternalLink,
  Loader2,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { format } from "date-fns";
import { pt } from "date-fns/locale";
import {
  useAdminSEOEntities,
  useUpdateEntityStatus,
  useDeleteEntity,
  useBulkUpdateStatus,
} from "@/modules/growth-seo/hooks/useAdminSEOEntities";
import { calculateEntityScore } from "@/modules/growth-seo/utils/calculateQualityScore";
import { AIScoreTooltip } from "@/modules/growth-seo/components/admin/AIScoreTooltip";
import type { EntityType, EntityStatus, Intent, SEOEntity, SEOContent } from "@/modules/growth-seo/types";

const entityTypeLabels: Record<EntityType, string> = {
  keyword: "Palavra-chave",
  template: "Template",
  category: "Categoria",
  tool: "Ferramenta",
  glossary: "Glossário",
  guide: "Guia",
  blog: "Blog",
  profile: "Perfil",
};

const entityTypeColors: Record<EntityType, string> = {
  keyword: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  template: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
  category: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
  tool: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  glossary: "bg-slate-100 text-slate-800 dark:bg-slate-900/30 dark:text-slate-300",
  guide: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300",
  blog: "bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-300",
  profile: "bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-300",
};

const statusLabels: Record<EntityStatus, string> = {
  draft: "Rascunho",
  published: "Publicado",
  archived: "Arquivado",
};

const statusColors: Record<EntityStatus, string> = {
  draft: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
  published: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  archived: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300",
};

const intentLabels: Record<Intent, string> = {
  informational: "Informativo",
  commercial: "Comercial",
  transactional: "Transacional",
};

// Component to calculate and display AI Score with tooltip
function EntityAIScore({ entity }: { entity: SEOEntity }) {
  const breakdown = useMemo(() => {
    try {
      return calculateEntityScore({
        title: entity.title,
        meta_description: entity.meta_description,
        h1: entity.h1,
        tldr: entity.tldr,
        content: entity.content as SEOContent,
        schema_markup: entity.schema_markup,
      });
    } catch {
      return null;
    }
  }, [entity]);

  const score = breakdown?.totalScore ?? entity.ai_quality_score ?? 0;

  if (!score && score !== 0) {
    return <span className="text-muted-foreground">-</span>;
  }

  return <AIScoreTooltip score={score} breakdown={breakdown} />;
}

export function SEOEntitiesList() {
  const [filters, setFilters] = useState({
    entityType: "all" as EntityType | "all",
    status: "all" as EntityStatus | "all",
    intent: "all" as Intent | "all",
    search: "",
  });
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 20,
    sortBy: "updated_at",
    sortOrder: "desc" as "asc" | "desc",
  });
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [entityToDelete, setEntityToDelete] = useState<string | null>(null);

  const { data, isLoading, refetch } = useAdminSEOEntities(filters, pagination);
  const updateStatus = useUpdateEntityStatus();
  const deleteEntity = useDeleteEntity();
  const bulkUpdate = useBulkUpdateStatus();

  const handleSelectAll = (checked: boolean) => {
    if (checked && data?.entities) {
      setSelectedIds(data.entities.map((e) => e.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectOne = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedIds((prev) => [...prev, id]);
    } else {
      setSelectedIds((prev) => prev.filter((i) => i !== id));
    }
  };

  const handleBulkAction = async (status: EntityStatus) => {
    if (selectedIds.length === 0) return;
    await bulkUpdate.mutateAsync({ entityIds: selectedIds, status });
    setSelectedIds([]);
  };

  const handleDelete = async () => {
    if (!entityToDelete) return;
    await deleteEntity.mutateAsync(entityToDelete);
    setEntityToDelete(null);
    setDeleteDialogOpen(false);
  };

  const getEntityUrl = (entity: SEOEntity) => {
    const typeRoutes: Record<EntityType, string> = {
      keyword: "/keywords",
      template: "/templates",
      tool: "/tools",
      category: "/categories",
      blog: "/blog",
      guide: "/guides",
      glossary: "/glossary",
      profile: "/profiles",
    };
    return `${typeRoutes[entity.entity_type]}/${entity.slug}`;
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-[300px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Pesquisar..."
            value={filters.search}
            onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
            className="pl-9"
          />
        </div>

        <Select
          value={filters.entityType}
          onValueChange={(v) => setFilters((f) => ({ ...f, entityType: v as EntityType | "all" }))}
        >
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os tipos</SelectItem>
            {Object.entries(entityTypeLabels).map(([key, label]) => (
              <SelectItem key={key} value={key}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={filters.status}
          onValueChange={(v) => setFilters((f) => ({ ...f, status: v as EntityStatus | "all" }))}
        >
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os estados</SelectItem>
            {Object.entries(statusLabels).map(([key, label]) => (
              <SelectItem key={key} value={key}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={filters.intent}
          onValueChange={(v) => setFilters((f) => ({ ...f, intent: v as Intent | "all" }))}
        >
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Intenção" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as intenções</SelectItem>
            {Object.entries(intentLabels).map(([key, label]) => (
              <SelectItem key={key} value={key}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {selectedIds.length > 0 && (
          <div className="flex items-center gap-2 ml-auto">
            <span className="text-sm text-muted-foreground">
              {selectedIds.length} selecionados
            </span>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleBulkAction("published")}
              disabled={bulkUpdate.isPending}
            >
              <CheckCircle className="h-4 w-4 mr-1" />
              Publicar
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleBulkAction("archived")}
              disabled={bulkUpdate.isPending}
            >
              <Archive className="h-4 w-4 mr-1" />
              Arquivar
            </Button>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[40px]">
                <Checkbox
                  checked={
                    data?.entities &&
                    data.entities.length > 0 &&
                    selectedIds.length === data.entities.length
                  }
                  onCheckedChange={handleSelectAll}
                />
              </TableHead>
              <TableHead>Título</TableHead>
              <TableHead className="w-[120px]">Tipo</TableHead>
              <TableHead className="w-[100px]">Estado</TableHead>
              <TableHead className="w-[110px]">Intenção</TableHead>
              <TableHead className="w-[80px] text-right">Views</TableHead>
              <TableHead className="w-[70px] text-right">AI Score</TableHead>
              <TableHead className="w-[110px]">Atualizado</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={9} className="h-32 text-center">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                </TableCell>
              </TableRow>
            ) : !data?.entities.length ? (
              <TableRow>
                <TableCell colSpan={9} className="h-32 text-center text-muted-foreground">
                  Nenhuma entidade encontrada
                </TableCell>
              </TableRow>
            ) : (
              data.entities.map((entity) => (
                <TableRow key={entity.id}>
                  <TableCell>
                    <Checkbox
                      checked={selectedIds.includes(entity.id)}
                      onCheckedChange={(checked) => handleSelectOne(entity.id, !!checked)}
                    />
                  </TableCell>
                  <TableCell>
                    <div className="font-medium line-clamp-1">{entity.title}</div>
                    <div className="text-xs text-muted-foreground line-clamp-1">
                      /{entity.entity_type}s/{entity.slug}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={entityTypeColors[entity.entity_type]}>
                      {entityTypeLabels[entity.entity_type]}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={statusColors[entity.status]}>
                      {statusLabels[entity.status]}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {entity.intent && (
                      <span className="text-sm">{intentLabels[entity.intent]}</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {entity.views_count.toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right">
                    <EntityAIScore entity={entity} />
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {format(new Date(entity.updated_at), "dd MMM yyyy", { locale: pt })}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                          <a href={getEntityUrl(entity)} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="h-4 w-4 mr-2" />
                            Ver página
                          </a>
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Edit className="h-4 w-4 mr-2" />
                          Editar
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        {entity.status !== "published" && (
                          <DropdownMenuItem
                            onClick={() =>
                              updateStatus.mutate({ entityId: entity.id, status: "published" })
                            }
                          >
                            <CheckCircle className="h-4 w-4 mr-2" />
                            Publicar
                          </DropdownMenuItem>
                        )}
                        {entity.status !== "archived" && (
                          <DropdownMenuItem
                            onClick={() =>
                              updateStatus.mutate({ entityId: entity.id, status: "archived" })
                            }
                          >
                            <Archive className="h-4 w-4 mr-2" />
                            Arquivar
                          </DropdownMenuItem>
                        )}
                        {entity.status !== "draft" && (
                          <DropdownMenuItem
                            onClick={() =>
                              updateStatus.mutate({ entityId: entity.id, status: "draft" })
                            }
                          >
                            <Edit className="h-4 w-4 mr-2" />
                            Voltar a rascunho
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => {
                            setEntityToDelete(entity.id);
                            setDeleteDialogOpen(true);
                          }}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Eliminar
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {data && data.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            A mostrar {(pagination.page - 1) * pagination.pageSize + 1} a{" "}
            {Math.min(pagination.page * pagination.pageSize, data.total)} de {data.total}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPagination((p) => ({ ...p, page: p.page - 1 }))}
              disabled={pagination.page === 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm">
              Página {pagination.page} de {data.totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPagination((p) => ({ ...p, page: p.page + 1 }))}
              disabled={pagination.page === data.totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Delete Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar entidade</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser revertida. A entidade será permanentemente eliminada.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
