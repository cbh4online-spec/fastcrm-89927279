import { useMemo, useState } from "react";
import { Search, Sparkles } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BUILDER_TEMPLATES, type BuilderTemplate } from "../lib/templates";
import { BUILDER_ASSET_TYPES, type BuilderAssetType } from "../types";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Pré-filtra os templates por tipo. */
  defaultType?: BuilderAssetType | "all";
  /** Chamado quando o utilizador escolhe um template. */
  onSelect: (template: BuilderTemplate) => void;
}

export function BuilderTemplatesDialog({
  open,
  onOpenChange,
  defaultType = "all",
  onSelect,
}: Props) {
  const [filter, setFilter] = useState<BuilderAssetType | "all">(defaultType);
  const [query, setQuery] = useState("");

  const templates = useMemo(() => {
    return BUILDER_TEMPLATES.filter((t) => {
      if (filter !== "all" && t.type !== filter) return false;
      if (query && !`${t.name} ${t.description}`.toLowerCase().includes(query.toLowerCase()))
        return false;
      return true;
    });
  }, [filter, query]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl h-[85vh] flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-3 shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Galeria de templates
          </DialogTitle>
          <DialogDescription>
            Começa a partir de um template pronto e personaliza ao teu gosto.
          </DialogDescription>
        </DialogHeader>

        <div className="px-6 pb-3 flex flex-col md:flex-row gap-3 shrink-0">
          <Tabs
            value={filter}
            onValueChange={(v) => setFilter(v as BuilderAssetType | "all")}
            className="flex-1"
          >
            <TabsList className="flex-wrap h-auto">
              <TabsTrigger value="all">Todos</TabsTrigger>
              {BUILDER_ASSET_TYPES.map((t) => (
                <TabsTrigger key={t.value} value={t.value}>
                  {t.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
          <div className="relative md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Pesquisar…"
              className="pl-9"
            />
          </div>
        </div>

        <ScrollArea className="flex-1 min-h-0 px-6 pb-6">
          {templates.length === 0 ? (
            <div className="text-center text-sm text-muted-foreground py-16">
              Nenhum template para este filtro.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {templates.map((t) => (
                <TemplateCard key={t.id} template={t} onSelect={() => onSelect(t)} />
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

function TemplateCard({
  template,
  onSelect,
}: {
  template: BuilderTemplate;
  onSelect: () => void;
}) {
  const typeLabel =
    BUILDER_ASSET_TYPES.find((t) => t.value === template.type)?.label ?? template.type;

  return (
    <div className="border rounded-xl overflow-hidden hover:border-primary/50 hover:shadow-md transition-all flex flex-col bg-card">
      <div className="aspect-[16/10] bg-muted/40 border-b overflow-hidden relative">
        <iframe
          srcDoc={template.html}
          title={template.name}
          sandbox=""
          className="w-[200%] h-[200%] origin-top-left scale-50 pointer-events-none border-0"
        />
      </div>
      <div className="p-3 flex-1 flex flex-col gap-2">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-medium text-sm leading-tight">{template.name}</h3>
          <Badge variant="outline" className="text-[10px] shrink-0">
            {typeLabel}
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground line-clamp-2">{template.description}</p>
        <Button size="sm" className="mt-auto" onClick={onSelect}>
          Usar este template
        </Button>
      </div>
    </div>
  );
}
