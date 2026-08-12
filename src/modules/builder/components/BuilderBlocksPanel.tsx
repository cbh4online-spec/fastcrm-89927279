import { useMemo, useState } from "react";
import { Search, Copy, Plus, Trash2, Globe, Building2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  BUILTIN_BLOCKS,
  BLOCK_CATEGORY_LABEL,
  type BuilderBlockCategory,
} from "../lib/blocks";
import {
  useBuilderBlocksLibrary,
  useDeleteBuilderBlock,
} from "../hooks/useBuilderBlocks";

interface Props {
  /** Insere o HTML do bloco no editor (no cursor ou no fim). */
  onInsert: (html: string) => void;
  /** Arrasto iniciado a partir de um bloco (payload HTML). */
  onDragStartBlock?: (html: string, name: string) => void;
  /** Arrasto terminado (largado ou cancelado). */
  onDragEndBlock?: () => void;
}

const CATEGORIES: ("all" | BuilderBlockCategory)[] = [
  "all", "header", "hero", "features", "stats", "cta",
  "pricing", "testimonials", "faq", "form", "footer", "custom",
];

export function BuilderBlocksPanel({ onInsert, onDragStartBlock, onDragEndBlock }: Props) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<"all" | BuilderBlockCategory>("all");
  const [tab, setTab] = useState<"builtin" | "library">("builtin");
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const library = useBuilderBlocksLibrary();
  const del = useDeleteBuilderBlock();

  const filteredBuiltins = useMemo(() => {
    return BUILTIN_BLOCKS.filter((b) => {
      if (category !== "all" && b.category !== category) return false;
      if (query && !`${b.name} ${b.description}`.toLowerCase().includes(query.toLowerCase())) return false;
      return true;
    });
  }, [query, category]);

  const filteredLibrary = useMemo(() => {
    const list = library.data ?? [];
    return list.filter((b) => {
      if (category !== "all" && b.category !== category) return false;
      if (query && !`${b.name} ${b.description ?? ""}`.toLowerCase().includes(query.toLowerCase())) return false;
      return true;
    });
  }, [library.data, query, category]);

  const handleInsert = (html: string, name: string) => {
    onInsert(html);
    toast.success(`Inserido: ${name}`);
  };

  const handleCopy = async (html: string) => {
    await navigator.clipboard.writeText(html);
    toast.success("HTML copiado");
  };

  const handleDelete = async () => {
    if (!confirmDeleteId) return;
    try {
      await del.mutateAsync(confirmDeleteId);
      toast.success("Bloco removido");
    } catch (e) {
      toast.error("Erro ao remover", { description: e instanceof Error ? e.message : undefined });
    } finally {
      setConfirmDeleteId(null);
    }
  };

  return (
    <div className="h-full flex flex-col bg-background border-l">
      <div className="p-3 border-b space-y-2 shrink-0">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">Biblioteca de blocos</h3>
        </div>
        <div className="flex gap-1 p-0.5 bg-muted rounded-md text-xs">
          <button
            className={`flex-1 px-2 py-1 rounded ${tab === "builtin" ? "bg-background shadow-sm font-medium" : "text-muted-foreground"}`}
            onClick={() => setTab("builtin")}
          >
            Built-in
          </button>
          <button
            className={`flex-1 px-2 py-1 rounded ${tab === "library" ? "bg-background shadow-sm font-medium" : "text-muted-foreground"}`}
            onClick={() => setTab("library")}
          >
            Workspace
            {library.data && library.data.length > 0 && (
              <span className="ml-1 text-[10px] opacity-70">({library.data.length})</span>
            )}
          </button>
        </div>
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Pesquisar…"
            className="pl-7 h-8 text-xs"
          />
        </div>
        <Select value={category} onValueChange={(v) => setCategory(v as "all" | BuilderBlockCategory)}>
          <SelectTrigger className="h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {CATEGORIES.map((c) => (
              <SelectItem key={c} value={c} className="text-xs">
                {c === "all" ? "Todas as categorias" : BLOCK_CATEGORY_LABEL[c]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <ScrollArea className="flex-1 min-h-0">
        <TooltipProvider delayDuration={200}>
          {tab === "builtin" ? (
            <div className="p-2 space-y-2">
              {filteredBuiltins.length === 0 ? (
                <div className="text-xs text-muted-foreground text-center py-8">
                  Nenhum bloco encontrado.
                </div>
              ) : (
                filteredBuiltins.map((b) => (
                  <BlockCard
                    key={b.id}
                    name={b.name}
                    description={b.description}
                    category={b.category}
                    html={b.html}
                    onInsert={() => handleInsert(b.html, b.name)}
                    onCopy={() => handleCopy(b.html)}
                    onDragStart={
                      onDragStartBlock ? () => onDragStartBlock(b.html, b.name) : undefined
                    }
                    onDragEnd={onDragEndBlock}
                  />
                ))
              )}
            </div>
          ) : (
            <div className="p-2 space-y-2">
              {library.isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                </div>
              ) : filteredLibrary.length === 0 ? (
                <div className="text-xs text-muted-foreground text-center py-8 px-3">
                  {query || category !== "all"
                    ? "Sem resultados."
                    : "Ainda não guardaste blocos. Selecciona HTML no editor e usa “Guardar como bloco”."}
                </div>
              ) : (
                filteredLibrary.map((b) => (
                  <BlockCard
                    key={b.id}
                    name={b.name}
                    description={b.description ?? ""}
                    category={b.category as BuilderBlockCategory}
                    html={b.html}
                    scope={b.scope}
                    onInsert={() => handleInsert(b.html, b.name)}
                    onCopy={() => handleCopy(b.html)}
                    onDelete={() => setConfirmDeleteId(b.id)}
                    onDragStart={
                      onDragStartBlock ? () => onDragStartBlock(b.html, b.name) : undefined
                    }
                    onDragEnd={onDragEndBlock}
                  />
                ))
              )}
            </div>
          )}
        </TooltipProvider>
      </ScrollArea>

      <AlertDialog open={!!confirmDeleteId} onOpenChange={(o) => !o && setConfirmDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover bloco?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acção é irreversível. O bloco será removido da biblioteca.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Remover</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

interface BlockCardProps {
  name: string;
  description: string;
  category: BuilderBlockCategory | string;
  html: string;
  scope?: "workspace" | "global";
  onInsert: () => void;
  onCopy: () => void;
  onDelete?: () => void;
  onDragStart?: () => void;
  onDragEnd?: () => void;
}

function BlockCard({
  name,
  description,
  category,
  html,
  scope,
  onInsert,
  onCopy,
  onDelete,
  onDragStart,
  onDragEnd,
}: BlockCardProps) {
  return (
    <div
      draggable={!!onDragStart}
      onDragStart={(e) => {
        e.dataTransfer.effectAllowed = "copy";
        e.dataTransfer.setData("text/html", html);
        onDragStart?.();
      }}
      onDragEnd={() => onDragEnd?.()}
      className={cn(
        "group border rounded-lg p-2.5 hover:border-primary/50 transition-colors bg-card",
        onDragStart && "cursor-grab active:cursor-grabbing",
      )}
    >
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <h4 className="text-xs font-medium truncate">{name}</h4>
            {scope === "global" && (
              <Tooltip>
                <TooltipTrigger>
                  <Globe className="h-3 w-3 text-muted-foreground shrink-0" />
                </TooltipTrigger>
                <TooltipContent>Bloco global</TooltipContent>
              </Tooltip>
            )}
            {scope === "workspace" && (
              <Tooltip>
                <TooltipTrigger>
                  <Building2 className="h-3 w-3 text-muted-foreground shrink-0" />
                </TooltipTrigger>
                <TooltipContent>Bloco do workspace</TooltipContent>
              </Tooltip>
            )}
          </div>
          {description && (
            <p className="text-[10px] text-muted-foreground line-clamp-1 mt-0.5">{description}</p>
          )}
        </div>
        <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4 shrink-0">
          {BLOCK_CATEGORY_LABEL[category as BuilderBlockCategory] ?? category}
        </Badge>
      </div>
      <div className="flex gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
        <Button size="sm" variant="default" className="h-7 text-xs flex-1" onClick={onInsert}>
          <Plus className="h-3 w-3 mr-1" /> Inserir
        </Button>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button size="icon" variant="outline" className="h-7 w-7" onClick={onCopy}>
              <Copy className="h-3 w-3" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Copiar HTML</TooltipContent>
        </Tooltip>
        {onDelete && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button size="icon" variant="outline" className="h-7 w-7 text-destructive" onClick={onDelete}>
                <Trash2 className="h-3 w-3" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Remover</TooltipContent>
          </Tooltip>
        )}
      </div>
    </div>
  );
}
