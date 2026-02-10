import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useModerationQueue, useReviewModerationItem, useModerationFilters, useUpdateModerationFilters } from "@/hooks/useModeration";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { CheckCircle, XCircle, Clock, AlertTriangle, Shield, Filter } from "lucide-react";
import { format } from "date-fns";
import { pt } from "date-fns/locale";
import { Textarea } from "@/components/ui/textarea";

const entityTypeLabels: Record<string, string> = {
  c2c_listing: "Anúncio C2C",
  forum_topic: "Tópico Fórum",
  forum_post: "Post Fórum",
};

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: typeof Clock }> = {
  pending: { label: "Pendente", variant: "secondary", icon: Clock },
  approved: { label: "Aprovado", variant: "default", icon: CheckCircle },
  rejected: { label: "Rejeitado", variant: "destructive", icon: XCircle },
};

export function ModerationSection() {
  const { currentWorkspace } = useWorkspace();
  const workspaceId = currentWorkspace?.id;
  const [statusFilter, setStatusFilter] = useState("pending");

  const { data: queue = [], isLoading } = useModerationQueue(workspaceId, statusFilter);
  const reviewItem = useReviewModerationItem(workspaceId);
  const { data: filters } = useModerationFilters(workspaceId);
  const updateFilters = useUpdateModerationFilters(workspaceId);

  const [bannedWordsText, setBannedWordsText] = useState("");
  const [filtersInitialized, setFiltersInitialized] = useState(false);

  // Initialize banned words text once
  if (filters && !filtersInitialized) {
    setBannedWordsText((filters.banned_words || []).join(", "));
    setFiltersInitialized(true);
  }

  const pendingCount = queue.filter(i => i.status === "pending").length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Shield className="h-6 w-6 text-primary" />
            Moderação
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Gerir conteúdo flagged e filtros de moderação
          </p>
        </div>
        {pendingCount > 0 && (
          <Badge variant="destructive" className="text-sm px-3 py-1">
            {pendingCount} pendente{pendingCount > 1 ? "s" : ""}
          </Badge>
        )}
      </div>

      <Tabs defaultValue="queue">
        <TabsList>
          <TabsTrigger value="queue" className="flex items-center gap-1.5">
            <AlertTriangle className="h-3.5 w-3.5" />
            Fila de Moderação
          </TabsTrigger>
          <TabsTrigger value="filters" className="flex items-center gap-1.5">
            <Filter className="h-3.5 w-3.5" />
            Filtros
          </TabsTrigger>
        </TabsList>

        <TabsContent value="queue" className="space-y-4 mt-4">
          {/* Status filter tabs */}
          <div className="flex gap-2">
            {["pending", "approved", "rejected", "all"].map((s) => (
              <Button
                key={s}
                variant={statusFilter === s ? "default" : "outline"}
                size="sm"
                onClick={() => setStatusFilter(s)}
              >
                {s === "all" ? "Todos" : statusConfig[s]?.label || s}
              </Button>
            ))}
          </div>

          {isLoading ? (
            <div className="text-center py-12 text-muted-foreground">A carregar...</div>
          ) : queue.length === 0 ? (
          <Card>
              <CardContent className="py-12 text-center">
                <CheckCircle className="h-10 w-10 mx-auto text-primary mb-3" />
                <p className="font-medium">Tudo limpo!</p>
                <p className="text-sm text-muted-foreground">Sem itens para moderar</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {queue.map((item) => {
                const st = statusConfig[item.status || "pending"] || statusConfig.pending;
                const StIcon = st.icon;
                return (
                  <Card key={item.id}>
                    <CardContent className="p-4">
                      <div className="flex items-start gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge variant="outline" className="text-xs">
                              {entityTypeLabels[item.entity_type] || item.entity_type}
                            </Badge>
                            <Badge variant={st.variant} className="text-xs flex items-center gap-1">
                              <StIcon className="h-3 w-3" />
                              {st.label}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {format(new Date(item.created_at), "d MMM yyyy, HH:mm", { locale: pt })}
                            </span>
                          </div>
                          <p className="text-sm font-medium mb-1">{item.reason}</p>
                          {item.flagged_text && (
                            <div className="bg-muted/50 rounded-lg p-3 text-sm text-muted-foreground border">
                              "{item.flagged_text}"
                            </div>
                          )}
                        </div>
                        {item.status === "pending" && (
                          <div className="flex gap-2 flex-shrink-0">
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-primary hover:bg-primary/10"
                              onClick={() => reviewItem.mutate({ itemId: item.id, action: "approved" })}
                              disabled={reviewItem.isPending}
                            >
                              <CheckCircle className="h-4 w-4 mr-1" />
                              Aprovar
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-destructive hover:bg-destructive/10"
                              onClick={() => reviewItem.mutate({ itemId: item.id, action: "rejected" })}
                              disabled={reviewItem.isPending}
                            >
                              <XCircle className="h-4 w-4 mr-1" />
                              Rejeitar
                            </Button>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="filters" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Palavras Proibidas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Textarea
                placeholder="spam, promoção, grátis (separadas por vírgula)"
                value={bannedWordsText}
                onChange={(e) => setBannedWordsText(e.target.value)}
                rows={4}
              />
              <Button
                size="sm"
                onClick={() => {
                  const words = bannedWordsText
                    .split(",")
                    .map((w) => w.trim())
                    .filter(Boolean);
                  updateFilters.mutate({ banned_words: words });
                }}
                disabled={updateFilters.isPending}
              >
                Guardar Filtros
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Configurações</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="text-sm font-medium">Limite de denúncias para ocultar</label>
                <Input
                  type="number"
                  min={1}
                  defaultValue={filters?.max_reports_before_hide || 5}
                  onChange={(e) =>
                    updateFilters.mutate({ max_reports_before_hide: parseInt(e.target.value) || 5 })
                  }
                />
              </div>
              <div>
                <label className="text-sm font-medium">Threshold auto-flag</label>
                <Input
                  type="number"
                  min={1}
                  defaultValue={filters?.auto_flag_threshold || 3}
                  onChange={(e) =>
                    updateFilters.mutate({ auto_flag_threshold: parseInt(e.target.value) || 3 })
                  }
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
