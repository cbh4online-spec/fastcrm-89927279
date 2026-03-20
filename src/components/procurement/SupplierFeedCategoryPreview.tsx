import React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Loader2, Sparkles, Check, X } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { CategorySuggestionItem } from "@/hooks/useFeedCategorySuggestions";

interface Props {
  suggestions: CategorySuggestionItem[];
  isLoading: boolean;
  onPreview: () => void;
  onToggle: (index: number) => void;
  onUpdate: (index: number, updates: Partial<CategorySuggestionItem>) => void;
  enabled: boolean;
  onEnabledChange: (v: boolean) => void;
}

const confidenceBadge = (c: string) => {
  if (c === "high") return <Badge variant="default" className="bg-emerald-600 text-xs">Alta</Badge>;
  if (c === "medium") return <Badge variant="secondary" className="text-xs bg-amber-500/20 text-amber-700">Média</Badge>;
  return <Badge variant="destructive" className="text-xs">Baixa</Badge>;
};

export function SupplierFeedCategoryPreview({
  suggestions,
  isLoading,
  onPreview,
  onToggle,
  onUpdate,
  enabled,
  onEnabledChange,
}: Props) {
  return (
    <div className="space-y-3 border rounded-lg p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <h4 className="font-semibold text-sm">Sugestão IA de categorias</h4>
        </div>
        <Switch checked={enabled} onCheckedChange={onEnabledChange} />
      </div>

      {enabled && (
        <>
          <p className="text-xs text-muted-foreground">
            A IA analisa os nomes dos produtos e sugere as melhores categorias e subcategorias.
          </p>

          {suggestions.length === 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={onPreview}
              disabled={isLoading}
              className="w-full"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  A analisar produtos...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Pré-visualizar categorias (amostra de 20)
                </>
              )}
            </Button>
          )}

          {suggestions.length > 0 && (
            <div className="overflow-auto max-h-[300px] border rounded">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-8"></TableHead>
                    <TableHead className="text-xs">Produto</TableHead>
                    <TableHead className="text-xs">Categoria</TableHead>
                    <TableHead className="text-xs">Subcategoria</TableHead>
                    <TableHead className="text-xs w-16">Conf.</TableHead>
                    <TableHead className="text-xs w-16">Nova?</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {suggestions.map((s, i) => (
                    <TableRow key={i} className={!s.accepted ? "opacity-40" : ""}>
                      <TableCell className="p-1">
                        <button
                          onClick={() => onToggle(i)}
                          className="p-1 rounded hover:bg-muted"
                        >
                          {s.accepted ? (
                            <Check className="h-3.5 w-3.5 text-emerald-600" />
                          ) : (
                            <X className="h-3.5 w-3.5 text-muted-foreground" />
                          )}
                        </button>
                      </TableCell>
                      <TableCell className="text-xs max-w-[180px] truncate">
                        {s.product_name}
                      </TableCell>
                      <TableCell className="p-1">
                        <Input
                          value={s.category}
                          onChange={(e) => onUpdate(i, { category: e.target.value })}
                          className="h-7 text-xs"
                          disabled={!s.accepted}
                        />
                      </TableCell>
                      <TableCell className="p-1">
                        <Input
                          value={s.subcategory}
                          onChange={(e) => onUpdate(i, { subcategory: e.target.value })}
                          className="h-7 text-xs"
                          disabled={!s.accepted}
                        />
                      </TableCell>
                      <TableCell>{confidenceBadge(s.confidence)}</TableCell>
                      <TableCell>
                        {s.is_new_category && (
                          <Badge variant="outline" className="text-[10px]">Nova</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
