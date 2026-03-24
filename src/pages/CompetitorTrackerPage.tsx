import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PageHeader } from "@/components/common/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Eye, Plus, RefreshCw, Globe, Clock, AlertTriangle, History } from "lucide-react";
import { useCompetitors, useAddCompetitor, useTrackCompetitor, useCompetitorSnapshots } from "@/hooks/useFirecrawl";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { pt } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export default function CompetitorTrackerPage() {
  const { data: competitors, isLoading } = useCompetitors();
  const [addOpen, setAddOpen] = useState(false);
  const [historyCompetitorId, setHistoryCompetitorId] = useState<string | null>(null);

  return (
    <DashboardLayout>
      <div className="space-y-6 p-4 md:p-6">
        <PageHeader
          title="Monitor de Concorrentes"
          description="Monitorize alterações nos websites dos seus concorrentes automaticamente"
        >
          <Dialog open={addOpen} onOpenChange={setAddOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Adicionar Concorrente
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Adicionar Concorrente</DialogTitle>
              </DialogHeader>
              <AddCompetitorForm onSuccess={() => setAddOpen(false)} />
            </DialogContent>
          </Dialog>
        </PageHeader>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-48 rounded-xl" />)}
          </div>
        ) : !competitors?.length ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16 gap-4">
              <Eye className="h-12 w-12 text-muted-foreground/40" />
              <p className="text-muted-foreground">Nenhum concorrente a monitorizar</p>
              <Button variant="outline" onClick={() => setAddOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Adicionar primeiro concorrente
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {competitors.map(comp => (
              <CompetitorCard
                key={comp.id}
                competitor={comp}
                onViewHistory={() => setHistoryCompetitorId(comp.id)}
              />
            ))}
          </div>
        )}

        <Sheet open={!!historyCompetitorId} onOpenChange={() => setHistoryCompetitorId(null)}>
          <SheetContent className="w-full sm:max-w-lg">
            <SheetHeader>
              <SheetTitle>Histórico de Alterações</SheetTitle>
            </SheetHeader>
            {historyCompetitorId && <CompetitorHistory competitorId={historyCompetitorId} />}
          </SheetContent>
        </Sheet>
      </div>
    </DashboardLayout>
  );
}

function CompetitorCard({
  competitor,
  onViewHistory,
}: {
  competitor: {
    id: string;
    name: string;
    website_url: string;
    tracked_pages: string[];
    last_scraped_at: string | null;
    last_change_detected_at: string | null;
    changes_count: number;
  };
  onViewHistory: () => void;
}) {
  const trackMutation = useTrackCompetitor();

  const handleTrack = () => {
    trackMutation.mutate(
      { competitor_id: competitor.id, url: competitor.website_url, track_pages: competitor.tracked_pages },
      {
        onSuccess: (data) => {
          if (data.changes_detected > 0) {
            toast.warning(`${data.changes_detected} alteração(ões) detectada(s)!`);
          } else {
            toast.success("Sem alterações detectadas");
          }
        },
        onError: (e) => toast.error(`Erro: ${e.message}`),
      }
    );
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className="text-base">{competitor.name}</CardTitle>
            <a
              href={competitor.website_url.startsWith("http") ? competitor.website_url : `https://${competitor.website_url}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1"
            >
              <Globe className="h-3 w-3" />
              {competitor.website_url}
            </a>
          </div>
          {competitor.changes_count > 0 && (
            <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/30">
              <AlertTriangle className="h-3 w-3 mr-1" />
              {competitor.changes_count}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap gap-1">
          {competitor.tracked_pages.map(page => (
            <Badge key={page} variant="secondary" className="text-[10px]">
              {page}
            </Badge>
          ))}
        </div>

        {competitor.last_scraped_at && (
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <Clock className="h-3 w-3" />
            Verificado {formatDistanceToNow(new Date(competitor.last_scraped_at), { addSuffix: true, locale: pt })}
          </p>
        )}

        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={handleTrack}
            disabled={trackMutation.isPending}
            className="flex-1"
          >
            <RefreshCw className={cn("h-3 w-3 mr-1", trackMutation.isPending && "animate-spin")} />
            Verificar agora
          </Button>
          <Button size="sm" variant="ghost" onClick={onViewHistory}>
            <History className="h-3 w-3 mr-1" />
            Histórico
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function AddCompetitorForm({ onSuccess }: { onSuccess: () => void }) {
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [pages, setPages] = useState("/, /pricing, /features, /about");
  const [notes, setNotes] = useState("");
  const addMutation = useAddCompetitor();
  const trackMutation = useTrackCompetitor();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !url.trim()) return;

    const trackedPages = pages.split(",").map(p => p.trim()).filter(Boolean);

    addMutation.mutate(
      { name, website_url: url, tracked_pages: trackedPages, notes: notes || undefined },
      {
        onSuccess: (data: any) => {
          toast.success("Concorrente adicionado!");
          // Trigger first analysis
          trackMutation.mutate({
            competitor_id: data.id,
            url,
            track_pages: trackedPages,
          });
          onSuccess();
        },
        onError: (e) => toast.error(`Erro: ${e.message}`),
      }
    );
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label>Nome</Label>
        <Input value={name} onChange={e => setName(e.target.value)} placeholder="Ex: Empresa X" required />
      </div>
      <div className="space-y-2">
        <Label>Website URL</Label>
        <Input value={url} onChange={e => setUrl(e.target.value)} placeholder="https://competitor.com" required />
      </div>
      <div className="space-y-2">
        <Label>Páginas a monitorizar (separadas por vírgula)</Label>
        <Input value={pages} onChange={e => setPages(e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label>Notas (opcional)</Label>
        <Textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} />
      </div>
      <Button type="submit" className="w-full" disabled={addMutation.isPending}>
        {addMutation.isPending ? "A guardar..." : "Guardar e fazer primeira análise"}
      </Button>
    </form>
  );
}

function CompetitorHistory({ competitorId }: { competitorId: string }) {
  const { data: snapshots, isLoading } = useCompetitorSnapshots(competitorId);

  if (isLoading) return <div className="space-y-2 mt-4">{[1, 2, 3].map(i => <Skeleton key={i} className="h-16" />)}</div>;
  if (!snapshots?.length) return <p className="text-sm text-muted-foreground mt-4">Sem histórico disponível</p>;

  return (
    <div className="space-y-3 mt-4 max-h-[70vh] overflow-y-auto">
      {snapshots.map(snap => (
        <Card key={snap.id} className={cn(snap.has_changed && "border-amber-500/50")}>
          <CardContent className="py-3 space-y-1">
            <div className="flex items-center justify-between">
              <code className="text-xs text-muted-foreground">{snap.page_path}</code>
              {snap.has_changed && (
                <Badge variant="outline" className="text-[10px] bg-amber-500/10 text-amber-600">
                  Alterado
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(snap.created_at), { addSuffix: true, locale: pt })}
            </p>
            {snap.content_preview && (
              <p className="text-xs text-foreground/70 line-clamp-3">{snap.content_preview.slice(0, 200)}</p>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
