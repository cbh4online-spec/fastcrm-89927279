import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Sparkles, Link2, ArrowUpRight, Package, X } from "lucide-react";
import {
  usePostCreationSuggestions,
  type RelationSuggestion,
} from "@/hooks/usePostCreationSuggestions";

interface PostCreationSuggestionsCardProps {
  productId: string;
  workspaceId: string;
  productName: string;
  onDismiss: () => void;
  onViewProduct?: () => void;
}

const typeConfig: Record<string, { label: string; color: string; icon: typeof Link2 }> = {
  compatible: { label: "Compatível", color: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200", icon: Link2 },
  related: { label: "Alternativa / Upgrade", color: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200", icon: ArrowUpRight },
  bundle: { label: "Compre Junto", color: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200", icon: Package },
};

export function PostCreationSuggestionsCard({
  productId,
  workspaceId,
  productName,
  onDismiss,
}: PostCreationSuggestionsCardProps) {
  const { suggestions, added, isLoading, error } = usePostCreationSuggestions(
    productId,
    workspaceId
  );

  if (error) {
    return (
      <Card className="border-destructive/30 bg-destructive/5">
        <CardContent className="p-4 flex items-center justify-between">
          <p className="text-sm text-destructive">Não foi possível sugerir relações: {error}</p>
          <Button variant="ghost" size="sm" onClick={onDismiss}>
            <X className="h-4 w-4" />
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="p-4 flex items-center gap-3">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
          <div>
            <p className="text-sm font-medium">A analisar catálogo com IA...</p>
            <p className="text-xs text-muted-foreground">
              A procurar cross-sells e up-sells para "{productName}"
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (suggestions.length === 0) {
    return (
      <Card className="border-muted">
        <CardContent className="p-4 flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Nenhuma relação encontrada no catálogo para este produto.
          </p>
          <Button variant="ghost" size="sm" onClick={onDismiss}>
            Fechar
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Group by type
  const grouped = suggestions.reduce<Record<string, RelationSuggestion[]>>(
    (acc, s) => {
      (acc[s.type] = acc[s.type] || []).push(s);
      return acc;
    },
    {}
  );

  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardHeader className="pb-3 flex flex-row items-center justify-between">
        <CardTitle className="text-base flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-amber-500" />
          {added} {added === 1 ? "relação adicionada" : "relações adicionadas"} com IA
        </CardTitle>
        <Button variant="ghost" size="sm" onClick={onDismiss}>
          <X className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {Object.entries(grouped).map(([type, items]) => {
          const config = typeConfig[type] || typeConfig.compatible;
          return (
            <div key={type} className="space-y-1.5">
              <Badge variant="outline" className={`${config.color} text-xs`}>
                {config.label}
              </Badge>
              <div className="space-y-1">
                {items.map((s) => (
                  <div
                    key={s.targetId}
                    className="flex items-center justify-between gap-2 text-sm py-1 px-2 rounded bg-background/60"
                  >
                    <div className="min-w-0">
                      <span className="font-medium truncate block">{s.targetName}</span>
                      <span className="text-xs text-muted-foreground">{s.label} — {s.reason}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
        <Button variant="outline" size="sm" className="w-full mt-2" onClick={onDismiss}>
          Fechar
        </Button>
      </CardContent>
    </Card>
  );
}
