import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { IXCard } from "@/components/entity/ix/IXCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
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
import { Search, Check, EyeOff, Trash2, MessageCircleQuestion } from "lucide-react";
import {
  useProductQAModeration,
  useModerateQA,
  useDeleteQA,
  type QAStatusFilter,
  type ProductQAItem,
} from "@/hooks/products/useProductQAModeration";

const STATUS_TABS: Array<{ id: QAStatusFilter; label: string }> = [
  { id: "pending", label: "Por moderar" },
  { id: "answered", label: "Respondidas" },
  { id: "published", label: "Publicadas" },
  { id: "all", label: "Todas" },
];

const PAGE_SIZE = 20;

interface Props {
  /** Quando definido, mostra apenas as perguntas deste produto. */
  productId?: string;
}

export function ProductQAModeration({ productId }: Props) {
  const { currentWorkspace } = useWorkspace();
  const [status, setStatus] = useState<QAStatusFilter>(productId ? "all" : "pending");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [toDelete, setToDelete] = useState<ProductQAItem | null>(null);

  const { data, isLoading, isError, refetch } = useProductQAModeration({
    status,
    search,
    productId,
    page,
    pageSize: PAGE_SIZE,
  });
  const moderate = useModerateQA();
  const remove = useDeleteQA();

  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const setDraft = (id: string, value: string) => setDrafts((d) => ({ ...d, [id]: value }));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {STATUS_TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => {
              setStatus(t.id);
              setPage(1);
            }}
            className={`rounded-full border px-4 py-1.5 text-sm transition-colors ${
              status === t.id
                ? "border-primary text-primary"
                : "border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            {t.label}
          </button>
        ))}

        <div className="relative ml-auto w-full sm:w-72">
          <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <Input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Pesquisar perguntas..."
            aria-label="Pesquisar perguntas"
            className="h-11 rounded-full pl-11"
          />
        </div>
      </div>

      {isLoading && (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-28 w-full rounded-2xl" />
          ))}
        </div>
      )}

      {isError && !isLoading && (
        <IXCard>
          <div className="flex flex-col items-start gap-3">
            <p className="text-sm text-muted-foreground">Não foi possível carregar as perguntas.</p>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              Tentar novamente
            </Button>
          </div>
        </IXCard>
      )}

      {!isLoading && !isError && items.length === 0 && (
        <IXCard>
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <MessageCircleQuestion className="h-4 w-4" aria-hidden="true" />
            Sem perguntas neste estado.
          </div>
        </IXCard>
      )}

      {!isLoading &&
        !isError &&
        items.map((item) => {
          const draft = drafts[item.id] ?? item.answer ?? "";
          const busy = moderate.isPending || remove.isPending;
          return (
            <IXCard key={item.id}>
              <div className="space-y-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-medium text-foreground">{item.question}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {item.asker_name || "Anónimo"} ·{" "}
                      {new Date(item.created_at).toLocaleDateString("pt-PT")}
                      {!productId && item.products?.name ? ` · ${item.products.name}` : ""}
                      {item.source ? ` · ${item.source}` : ""}
                    </p>
                  </div>
                  <Badge variant={item.is_approved ? "default" : "secondary"}>
                    {item.is_approved ? "Publicada" : item.answer ? "Respondida" : "Por moderar"}
                  </Badge>
                </div>

                <div className="space-y-2">
                  <Textarea
                    value={draft}
                    onChange={(e) => setDraft(item.id, e.target.value)}
                    placeholder="Escrever resposta..."
                    rows={3}
                    maxLength={2000}
                    aria-label="Resposta"
                  />
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={busy}
                      onClick={() => moderate.mutate({ id: item.id, answer: draft })}
                    >
                      Guardar resposta
                    </Button>
                    {!item.is_approved ? (
                      <Button
                        size="sm"
                        disabled={busy || !draft.trim()}
                        onClick={() => moderate.mutate({ id: item.id, answer: draft, is_approved: true })}
                      >
                        <Check className="mr-1.5 h-4 w-4" aria-hidden="true" />
                        Aprovar e publicar
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={busy}
                        onClick={() => moderate.mutate({ id: item.id, is_approved: false })}
                      >
                        <EyeOff className="mr-1.5 h-4 w-4" aria-hidden="true" />
                        Despublicar
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-destructive hover:text-destructive"
                      disabled={busy}
                      onClick={() => setToDelete(item)}
                    >
                      <Trash2 className="mr-1.5 h-4 w-4" aria-hidden="true" />
                      Eliminar
                    </Button>
                  </div>
                </div>
              </div>
            </IXCard>
          );
        })}

      {!isLoading && !isError && total > PAGE_SIZE && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            {total} pergunta{total === 1 ? "" : "s"} · página {page} de {totalPages}
          </span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              Anterior
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Seguinte
            </Button>
          </div>
        </div>
      )}

      <AlertDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar pergunta?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação é permanente e remove a pergunta da loja pública.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (toDelete) remove.mutate(toDelete.id);
                setToDelete(null);
              }}
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {!currentWorkspace?.id && (
        <p className="text-sm text-muted-foreground">Selecione um workspace para gerir perguntas.</p>
      )}
    </div>
  );
}
