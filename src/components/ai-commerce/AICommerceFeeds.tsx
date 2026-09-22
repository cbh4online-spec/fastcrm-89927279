import { useState } from "react";
import { Copy, Loader2, Play, Plus, ShieldCheck, Trash2 } from "lucide-react";
import { FeedComplianceAuditDialog } from "./FeedComplianceAuditDialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  feedPublicUrl,
  useCommerceFeeds,
  useCreateCommerceFeed,
  useDeleteCommerceFeed,
  useUpdateCommerceFeed,
} from "@/hooks/useAICommerce";
import { useQueryClient } from "@tanstack/react-query";
import type { FeedChannel, FeedFormat } from "@/lib/ai-commerce/types";

const CHANNELS: { value: FeedChannel; label: string; format: FeedFormat }[] = [
  { value: "openai", label: "OpenAI / ChatGPT", format: "json" },
  { value: "google", label: "Google Merchant", format: "xml" },
  { value: "meta", label: "Meta Commerce", format: "csv" },
  { value: "json", label: "JSON genérico", format: "json" },
  { value: "xml", label: "XML genérico", format: "xml" },
  { value: "csv", label: "CSV genérico", format: "csv" },
];

export function AICommerceFeeds() {
  const { data: feeds, isLoading } = useCommerceFeeds();
  const create = useCreateCommerceFeed();
  const update = useUpdateCommerceFeed();
  const remove = useDeleteCommerceFeed();
  const qc = useQueryClient();

  const [open, setOpen] = useState(false);
  const [running, setRunning] = useState<string | null>(null);
  const [form, setForm] = useState<{ name: string; channel: FeedChannel; language: string; country: string }>({
    name: "",
    channel: "openai",
    language: "pt",
    country: "PT",
  });

  const handleCreate = async () => {
    if (!form.name.trim()) {
      toast.error("Indique um nome para o feed");
      return;
    }
    const channel = CHANNELS.find((c) => c.value === form.channel)!;
    await create.mutateAsync({
      name: form.name.trim().slice(0, 120),
      channel: form.channel,
      format: channel.format,
      language: form.language.trim() || null,
      country: form.country.trim() || null,
    });
    setOpen(false);
    setForm({ name: "", channel: "openai", language: "pt", country: "PT" });
  };

  const handleGenerate = async (token: string, id: string) => {
    setRunning(id);
    try {
      const res = await fetch(feedPublicUrl(token));
      if (!res.ok) throw new Error(`Falha ao gerar feed (${res.status})`);
      await res.text();
      toast.success("Feed gerado");
      qc.invalidateQueries({ queryKey: ["commerce-feeds"] });
      qc.invalidateQueries({ queryKey: ["commerce-feed-runs"] });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Falha ao gerar feed");
    } finally {
      setRunning(null);
    }
  };

  if (isLoading) return <Skeleton className="h-64 w-full" />;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Cada feed publica apenas produtos com AI Commerce ativo e sem erros de validação.
        </p>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="mr-2 h-4 w-4" aria-hidden />
              Novo feed
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Novo feed</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="feed-name">Nome</Label>
                <Input
                  id="feed-name"
                  value={form.name}
                  maxLength={120}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="feed-channel">Canal</Label>
                <Select
                  value={form.channel}
                  onValueChange={(v) => setForm((f) => ({ ...f, channel: v as FeedChannel }))}
                >
                  <SelectTrigger id="feed-channel">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CHANNELS.map((c) => (
                      <SelectItem key={c.value} value={c.value}>
                        {c.label} ({c.format.toUpperCase()})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="feed-language">Idioma</Label>
                  <Input
                    id="feed-language"
                    value={form.language}
                    maxLength={10}
                    onChange={(e) => setForm((f) => ({ ...f, language: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="feed-country">País</Label>
                  <Input
                    id="feed-country"
                    value={form.country}
                    maxLength={5}
                    onChange={(e) => setForm((f) => ({ ...f, country: e.target.value }))}
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleCreate} disabled={create.isPending}>
                {create.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Criar feed
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {(feeds || []).length === 0 && (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            Ainda não existem feeds. Crie o primeiro para publicar em canais externos.
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        {(feeds || []).map((feed) => (
          <Card key={feed.id}>
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <CardTitle className="text-base">{feed.name}</CardTitle>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    <Badge variant="outline">{feed.channel}</Badge>
                    <Badge variant="outline">{feed.format.toUpperCase()}</Badge>
                    {feed.language && <Badge variant="outline">{feed.language}</Badge>}
                    {feed.country && <Badge variant="outline">{feed.country}</Badge>}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Label htmlFor={`feed-active-${feed.id}`} className="text-xs text-muted-foreground">
                    Ativo
                  </Label>
                  <Switch
                    id={`feed-active-${feed.id}`}
                    checked={feed.is_active}
                    onCheckedChange={(v) => update.mutate({ id: feed.id, is_active: v })}
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="text-sm text-muted-foreground">
                {feed.last_generated_at ? (
                  <>
                    Última geração: {new Date(feed.last_generated_at).toLocaleString("pt-PT")} —{" "}
                    {feed.last_product_count} produtos, {feed.last_error_count} erros,{" "}
                    {feed.last_warning_count} avisos.
                  </>
                ) : (
                  "Nunca gerado."
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={running === feed.id}
                  onClick={() => handleGenerate(feed.public_token, feed.id)}
                >
                  {running === feed.id ? (
                    <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Play className="mr-1 h-3.5 w-3.5" aria-hidden />
                  )}
                  Gerar agora
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    navigator.clipboard.writeText(feedPublicUrl(feed.public_token));
                    toast.success("URL do feed copiado");
                  }}
                >
                  <Copy className="mr-1 h-3.5 w-3.5" aria-hidden />
                  Copiar URL
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-destructive"
                  onClick={() => {
                    if (confirm(`Remover o feed "${feed.name}"?`)) remove.mutate(feed.id);
                  }}
                >
                  <Trash2 className="mr-1 h-3.5 w-3.5" aria-hidden />
                  Remover
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
