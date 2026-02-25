import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useObjectRecords, useCreateObjectRecord, useDeleteObjectRecord, ObjectRecord } from "@/hooks/useCustomObjects";
import { useCoreObjectFields, CoreObjectView } from "@/hooks/useCoreObjectFields";
import { DynamicRecordTable } from "./DynamicRecordTable";
import { DynamicRecordForm } from "./DynamicRecordForm";
import { ObjectViewsManager } from "./ObjectViewsManager";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Plus, Search, Info, Trash2, ChevronLeft, ChevronRight, ArrowUpDown, X, Download, Settings } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Props {
  objectId: string;
  objectSlug: string;
  objectName: string;
  objectIcon?: string;
  objectColor?: string;
}

const PAGE_SIZE = 25;

export function AttioObjectListView({ objectId, objectSlug, objectName }: Props) {
  const navigate = useNavigate();
  const { data: records = [], isLoading: recordsLoading } = useObjectRecords(objectId);
  const { data: fields = [], isLoading: fieldsLoading } = useCoreObjectFields(objectId);
  const createRecord = useCreateObjectRecord();
  const deleteRecord = useDeleteObjectRecord();

  const [showForm, setShowForm] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [sortField, setSortField] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [activeView, setActiveView] = useState<CoreObjectView | null>(null);

  // Filter fields based on active view
  const visibleFields = useMemo(() => {
    if (!activeView?.visible_fields || activeView.visible_fields.length === 0) return fields;
    return fields.filter((f) => activeView.visible_fields!.includes(f.slug));
  }, [fields, activeView]);

  const isLoading = recordsLoading || fieldsLoading;

  // Search + sort
  const filteredRecords = useMemo(() => {
    let result = records;

    if (searchValue) {
      const lower = searchValue.toLowerCase();
      result = result.filter((r) => {
        const data = r.data as Record<string, unknown>;
        return Object.values(data).some((v) =>
          v?.toString().toLowerCase().includes(lower)
        );
      });
    }

    if (sortField) {
      result = [...result].sort((a, b) => {
        const aVal = (a.data as Record<string, unknown>)[sortField];
        const bVal = (b.data as Record<string, unknown>)[sortField];
        const aStr = String(aVal ?? "");
        const bStr = String(bVal ?? "");
        const cmp = aStr.localeCompare(bStr, "pt-BR", { numeric: true });
        return sortDir === "asc" ? cmp : -cmp;
      });
    }

    return result;
  }, [records, searchValue, sortField, sortDir]);

  // Pagination
  const totalRecords = filteredRecords.length;
  const totalPages = Math.max(1, Math.ceil(totalRecords / PAGE_SIZE));
  const paginatedRecords = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredRecords.slice(start, start + PAGE_SIZE);
  }, [filteredRecords, currentPage]);

  const handleCreateRecord = (data: Record<string, unknown>) => {
    createRecord.mutate(
      { object_id: objectId, data },
      { onSuccess: () => { setShowForm(false); toast.success("Registo criado"); } }
    );
  };

  const handleDeleteRecord = (id: string) => {
    deleteRecord.mutate(
      { id, object_id: objectId },
      { onSuccess: () => { selectedIds.delete(id); setSelectedIds(new Set(selectedIds)); } }
    );
  };

  const handleBulkDelete = () => {
    const ids = Array.from(selectedIds);
    Promise.all(ids.map((id) => deleteRecord.mutateAsync({ id, object_id: objectId })))
      .then(() => { setSelectedIds(new Set()); toast.success(`${ids.length} registos eliminados`); });
  };

  const handleRecordClick = (record: ObjectRecord) => {
    navigate(`/objects/${objectSlug}/${record.id}`);
  };

  const handleExport = () => {
    if (fields.length === 0) return;
    const csv = [
      fields.map((f) => f.name).join(","),
      ...filteredRecords.map((r) => {
        const data = r.data as Record<string, unknown>;
        return fields.map((f) => String(data[f.slug] ?? "")).join(",");
      }),
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${objectSlug}-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Exportação concluída");
  };

  const handleSort = (fieldSlug: string) => {
    if (sortField === fieldSlug) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(fieldSlug);
      setSortDir("asc");
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* ── Header ── */}
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-semibold text-foreground tracking-tight">{objectName}</h1>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <button className="text-muted-foreground hover:text-foreground transition-colors">
                  <Info className="h-4 w-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-xs">Objeto personalizado · {fields.length} campos definidos</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          {totalRecords > 0 && (
            <span className="text-xs text-muted-foreground bg-muted/60 px-2 py-0.5 rounded-full font-medium">
              {totalRecords}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 text-xs text-muted-foreground gap-1.5"
            onClick={() => navigate(`/objects/settings/${objectId}`)}
          >
            <Settings className="h-3.5 w-3.5" />
            Configurar
          </Button>
          <Button size="sm" className="gap-1.5 h-8" onClick={() => setShowForm(!showForm)}>
            <Plus className="h-3.5 w-3.5" />
            Novo registo
          </Button>
        </div>
      </div>

      {/* ── Views bar ── */}
      <div className="py-2 border-b border-border/40">
        <ObjectViewsManager
          objectId={objectId}
          activeViewId={activeView?.id || null}
          onSelectView={setActiveView}
        />
      </div>

      {/* ── Filter bar ── */}
      <div className="flex items-center gap-2 py-2 border-b border-border/40">
        {/* Sort */}
        {fields.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-7 text-xs text-muted-foreground gap-1.5 px-2">
                <ArrowUpDown className="h-3 w-3" />
                {sortField
                  ? `Ordenado por ${fields.find((f) => f.slug === sortField)?.name || sortField}`
                  : "Ordenar"
                }
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="bg-popover">
              <DropdownMenuItem onClick={() => { setSortField(null); }}>
                Mais recentes
              </DropdownMenuItem>
              {fields.map((f) => (
                <DropdownMenuItem key={f.id} onClick={() => handleSort(f.slug)}>
                  {f.name} {sortField === f.slug && (sortDir === "asc" ? "↑" : "↓")}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        <div className="flex-1" />

        {/* Search */}
        {showSearch ? (
          <div className="flex items-center gap-1">
            <Input
              value={searchValue}
              onChange={(e) => { setSearchValue(e.target.value); setCurrentPage(1); }}
              placeholder="Pesquisar..."
              className="h-7 w-48 text-xs"
              autoFocus
            />
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setShowSearch(false); setSearchValue(""); }}>
              <X className="h-3 w-3" />
            </Button>
          </div>
        ) : (
          <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground" onClick={() => setShowSearch(true)}>
            <Search className="h-3.5 w-3.5" />
          </Button>
        )}

        <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground" onClick={handleExport}>
          <Download className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* ── Bulk actions ── */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-3 py-2 px-3 bg-primary/5 border-b border-border/40">
          <span className="text-xs font-medium text-foreground">{selectedIds.size} selecionados</span>
          <Button size="sm" variant="ghost" className="h-7 text-xs gap-1 text-destructive hover:text-destructive" onClick={handleBulkDelete}>
            <Trash2 className="h-3 w-3" />
            Eliminar
          </Button>
          <Button size="sm" variant="ghost" className="h-7 text-xs text-muted-foreground ml-auto" onClick={() => setSelectedIds(new Set())}>
            Limpar seleção
          </Button>
        </div>
      )}

      {/* ── New record form ── */}
      {showForm && (
        <div className="py-3 border-b border-border/40">
          <DynamicRecordForm
            fields={fields}
            onSubmit={handleCreateRecord}
            isPending={createRecord.isPending}
            submitLabel="Criar registo"
            onCancel={() => setShowForm(false)}
          />
        </div>
      )}

      {/* ── Table ── */}
      <div className="flex-1 overflow-auto mt-0">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <div className="h-5 w-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
          </div>
        ) : (
          <DynamicRecordTable
            fields={visibleFields}
            records={paginatedRecords}
            onDeleteRecord={handleDeleteRecord}
            onRecordClick={handleRecordClick}
            selectedIds={selectedIds}
            onSelectionChange={setSelectedIds}
          />
        )}
      </div>

      {/* ── Pagination ── */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between py-2 border-t border-border/40 mt-auto">
          <span className="text-xs text-muted-foreground">
            {((currentPage - 1) * PAGE_SIZE) + 1}–{Math.min(currentPage * PAGE_SIZE, totalRecords)} de {totalRecords}
          </span>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((p) => p - 1)}
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </Button>
            <span className="text-xs text-muted-foreground px-2">
              {currentPage} / {totalPages}
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage((p) => p + 1)}
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
