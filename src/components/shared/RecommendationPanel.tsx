import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Sparkles, RefreshCw, ThumbsUp, X, Package, ShoppingCart, FileText,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import {
  useProductRecommendations,
  type RecommendationContext,
  type RecommendationFeedback,
  type Recommendation,
} from "@/hooks/useProductRecommendations";

interface RecommendationPanelProps {
  contactId?: string;
  companyId?: string;
  leadId?: string;
  context: RecommendationContext;
  mode?: "panel" | "inline" | "widget";
  maxItems?: number;
  onAddToProposal?: (productId: string, productName: string) => void;
  onAddToOrder?: (productId: string, productName: string) => void;
  className?: string;
}

export function RecommendationPanel({
  contactId,
  companyId,
  leadId,
  context,
  mode = "panel",
  maxItems,
  onAddToProposal,
  onAddToOrder,
  className,
}: RecommendationPanelProps) {
  const limit = maxItems ?? (mode === "inline" ? 3 : mode === "widget" ? 5 : 8);
  const { data, isLoading, giveFeedback, refresh } = useProductRecommendations({
    contactId,
    companyId,
    leadId,
    context,
    limit,
  });

  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  const recommendations = (data?.recommendations ?? []).filter(
    (r) => !dismissed.has(r.id) && r.status === "pending"
  );

  const handleFeedback = (rec: Recommendation, feedback: RecommendationFeedback) => {
    if (["not_relevant", "already_has", "too_expensive", "wrong_timing"].includes(feedback)) {
      setDismissed((prev) => new Set(prev).add(rec.id));
    }
    giveFeedback.mutate({ recommendationId: rec.id, feedback });
  };

  const handleAddToProposal = (rec: Recommendation) => {
    onAddToProposal?.(rec.product?.id ?? "", rec.product?.name ?? "");
    handleFeedback(rec, "added_to_proposal");
  };

  const handleAddToOrder = (rec: Recommendation) => {
    onAddToOrder?.(rec.product?.id ?? "", rec.product?.name ?? "");
    handleFeedback(rec, "added_to_order");
  };

  // Loading state
  if (isLoading) {
    if (mode === "inline") {
      return (
        <div className={cn("flex gap-3", className)}>
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-20 flex-1 rounded-lg" />
          ))}
        </div>
      );
    }
    return (
      <Card className={cn("border-primary/10", className)}>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-amber-500 animate-pulse" />
            A carregar sugestões...
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16 rounded-lg" />
          ))}
        </CardContent>
      </Card>
    );
  }

  // Empty state
  if (recommendations.length === 0) {
    return (
      <Card className={cn("border-muted", className)}>
        <CardContent className="p-6 text-center">
          <Sparkles className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">Ainda sem sugestões</p>
          <p className="text-xs text-muted-foreground/60 mt-1">
            As recomendações aparecem com base no histórico e perfil do cliente.
          </p>
        </CardContent>
      </Card>
    );
  }

  // Inline mode
  if (mode === "inline") {
    return (
      <div className={cn("space-y-2", className)}>
        <p className="text-xs font-medium text-muted-foreground">Também sugerimos:</p>
        <div className="flex gap-2 overflow-x-auto pb-1">
          <AnimatePresence>
            {recommendations.slice(0, 3).map((rec) => (
              <motion.div
                key={rec.id}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="flex-shrink-0 w-52"
              >
                <Card className="hover:border-primary/30 transition-colors">
                  <CardContent className="p-3">
                    <div className="flex items-start gap-2">
                      <div className="w-8 h-8 rounded bg-muted flex items-center justify-center flex-shrink-0">
                        {rec.product?.product_images?.[0]?.url ? (
                          <img
                            src={rec.product.product_images[0].url}
                            alt=""
                            className="w-8 h-8 rounded object-cover"
                          />
                        ) : (
                          <Package className="h-4 w-4 text-muted-foreground/50" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium truncate">
                          {rec.product?.name}
                        </p>
                        {rec.product?.base_price != null && (
                          <p className="text-xs text-primary font-bold">
                            {rec.product.base_price.toFixed(2)}€
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-1 mt-2">
                      {onAddToProposal && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-6 text-xs flex-1"
                          onClick={() => handleAddToProposal(rec)}
                        >
                          <FileText className="h-3 w-3 mr-1" />
                          Proposta
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0"
                        onClick={() => handleFeedback(rec, "not_relevant")}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>
    );
  }

  // Widget mode
  if (mode === "widget") {
    return (
      <Card className={cn(className)}>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-amber-500" />
            Oportunidades IA
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 p-3 pt-0">
          {recommendations.slice(0, 5).map((rec) => (
            <div
              key={rec.id}
              className="flex items-center gap-2 p-2 rounded-md hover:bg-muted/50 text-sm"
            >
              <div className="min-w-0 flex-1">
                <p className="font-medium truncate text-xs">{rec.product?.name}</p>
                <p className="text-xs text-muted-foreground truncate">{rec.reason}</p>
              </div>
              <Badge
                variant="outline"
                className={cn(
                  "text-xs flex-shrink-0",
                  rec.confidence === "high"
                    ? "bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400"
                    : rec.confidence === "medium"
                    ? "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400"
                    : "bg-muted"
                )}
              >
                {Math.round(rec.score)}
              </Badge>
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  // Panel mode (default)
  return (
    <Card className={cn("border-primary/10", className)}>
      <CardHeader className="pb-3 flex flex-row items-center justify-between">
        <CardTitle className="text-sm flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-amber-500" />
          Sugestões IA
          <Badge variant="secondary" className="text-xs">
            {recommendations.length}
          </Badge>
        </CardTitle>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => refresh.mutate()}
          disabled={refresh.isPending}
          className="h-7 w-7 p-0"
        >
          <RefreshCw
            className={cn("h-3.5 w-3.5", refresh.isPending && "animate-spin")}
          />
        </Button>
      </CardHeader>
      <CardContent className="space-y-2 pt-0">
        <AnimatePresence>
          {recommendations.map((rec) => (
            <motion.div
              key={rec.id}
              layout
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: -100, height: 0 }}
              transition={{ duration: 0.2 }}
            >
              <div className="flex gap-3 p-3 rounded-lg border bg-card hover:border-primary/20 transition-colors">
                {/* Thumbnail */}
                <div className="w-10 h-10 rounded bg-muted flex-shrink-0 flex items-center justify-center overflow-hidden">
                  {rec.product?.product_images?.[0]?.url ? (
                    <img
                      src={rec.product.product_images[0].url}
                      alt=""
                      className="w-10 h-10 object-cover"
                    />
                  ) : (
                    <Package className="h-5 w-5 text-muted-foreground/40" />
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">
                        {rec.product?.name}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        {rec.product?.category && (
                          <Badge variant="outline" className="text-xs h-5">
                            {rec.product.category}
                          </Badge>
                        )}
                        {rec.product?.base_price != null && (
                          <span className="text-sm font-bold text-primary">
                            {rec.product.base_price.toFixed(2)}€
                          </span>
                        )}
                      </div>
                    </div>
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-xs flex-shrink-0",
                        rec.confidence === "high"
                          ? "bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400"
                          : rec.confidence === "medium"
                          ? "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400"
                          : "bg-muted"
                      )}
                    >
                      {rec.confidence === "high"
                        ? "Alta"
                        : rec.confidence === "medium"
                        ? "Média"
                        : "Baixa"}
                    </Badge>
                  </div>

                  {/* Reason */}
                  {rec.reason && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {rec.reason}
                    </p>
                  )}

                  {/* Tags */}
                  {rec.reason_tags && rec.reason_tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {rec.reason_tags.map((tag) => (
                        <span
                          key={tag}
                          className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex items-center gap-1 mt-2">
                    {onAddToProposal && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-6 text-xs gap-1"
                        onClick={() => handleAddToProposal(rec)}
                      >
                        <FileText className="h-3 w-3" />
                        Proposta
                      </Button>
                    )}
                    {onAddToOrder && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-6 text-xs gap-1"
                        onClick={() => handleAddToOrder(rec)}
                      >
                        <ShoppingCart className="h-3 w-3" />
                        Encomenda
                      </Button>
                    )}
                    <div className="flex-1" />
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 text-green-600 hover:text-green-700"
                      onClick={() => handleFeedback(rec, "relevant")}
                    >
                      <ThumbsUp className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                      onClick={() => handleFeedback(rec, "not_relevant")}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </CardContent>
    </Card>
  );
}
