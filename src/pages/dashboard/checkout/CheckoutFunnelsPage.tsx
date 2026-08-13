import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCheckoutFunnels } from "@/hooks/useCheckoutFunnels";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Copy, CopyPlus, ExternalLink, Loader2, Plus, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { IXCard } from "@/components/entity/ix/IXCard";
import { funnelSchema, normalizeSlug, readFunnelSettings, funnelTotal } from "@/schemas/checkout/funnelSchema";

type Filter = "all" | "active" | "inactive";

export default function CheckoutFunnelsPage() {
  const navigate = useNavigate();
  const { funnels, createFunnel, updateFunnel, duplicateFunnel, deleteFunnel } = useCheckoutFunnels();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [pendingDelete, setPendingDelete] = useState<any>(null);

  const list = useMemo(() => {
    const term = search.trim().toLowerCase();
    return (funnels.data ?? []).filter((f: any) => {
      if (filter === "active" && !f.is_active) return false;
      if (filter === "inactive" && f.is_active) return false;
      if (!term) return true;
      return f.name?.toLowerCase().includes(term) || f.slug?.toLowerCase().includes(term);
    });
  }, [funnels.data, search, filter]);

  function handleCreate() {
    const parsed = funnelSchema.safeParse({ name, slug: normalizeSlug(slug) });
    if (!parsed.success) { toast.error(parsed.error.issues[0].message); return; }
    createFunnel.mutate(parsed.data, {
      onSuccess: (created: any) => {
        setOpen(false); setName(""); setSlug("");
        navigate(`/dashboard/checkout/${created.id}`);
      },
    });
  }

  const filters: { value: Filter; label: string }[] = [
    { value: "all", label: "Todos" },
    { value: "active", label: "Ativos" },
    { value: "inactive", label: "Inativos" },
  ];

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Funis de Checkout</h1>
          <p className="mt-1 text-sm text-muted-foreground">Configure produtos, order bumps e upsells de cada funil de venda.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" /> Novo funil</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Criar funil</DialogTitle></DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label htmlFor="new-name">Nome</Label>
                <Input
                  id="new-name"
                  value={name}
                  maxLength={120}
                  onChange={(e) => { setName(e.target.value); setSlug(normalizeSlug(e.target.value)); }}
                  placeholder="Black Friday Oferta"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-slug">Slug (URL)</Label>
                <Input id="new-slug" value={slug} maxLength={60} onChange={(e) => setSlug(e.target.value)} onBlur={() => setSlug(normalizeSlug(slug))} placeholder="black-friday" />
                <p className="text-xs text-muted-foreground">/checkout/{normalizeSlug(slug) || "slug"}</p>
              </div>
              <Button onClick={handleCreate} disabled={createFunnel.isPending} className="w-full">
                {createFunnel.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Criar e configurar
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[240px] flex-1">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="h-12 rounded-full pl-11"
            placeholder="Procurar por nome ou slug"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Procurar funis"
          />
        </div>
        <div className="flex items-center gap-2">
          {filters.map((f) => (
            <button
              key={f.value}
              type="button"
              onClick={() => setFilter(f.value)}
              className={cn(
                "rounded-full border border-border px-4 py-2 text-sm transition-colors",
                filter === f.value ? "border-primary text-primary" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {funnels.isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : funnels.isError ? (
        <IXCard title="Erro ao carregar">
          <div className="space-y-3">
            <p className="text-sm text-destructive">Não foi possível obter os funis.</p>
            <Button variant="outline" onClick={() => funnels.refetch()}>Tentar novamente</Button>
          </div>
        </IXCard>
      ) : list.length === 0 ? (
        <IXCard>
          <div className="flex flex-col items-center gap-3 py-10 text-center">
            <p className="text-sm text-muted-foreground">
              {funnels.data?.length ? "Nenhum funil corresponde à pesquisa." : "Ainda não existem funis de checkout."}
            </p>
            {!funnels.data?.length && (
              <Button variant="outline" onClick={() => setOpen(true)}><Plus className="mr-2 h-4 w-4" /> Criar primeiro funil</Button>
            )}
          </div>
        </IXCard>
      ) : (
        <IXCard contentClassName="px-0 pb-0">
          <ul className="divide-y divide-border">
            {list.map((f: any) => {
              const settings = readFunnelSettings(f.settings);
              const total = funnelTotal(settings.products);
              return (
                <li key={f.id} className="flex flex-wrap items-center gap-4 px-6 py-4">
                  <button
                    type="button"
                    onClick={() => navigate(`/dashboard/checkout/${f.id}`)}
                    className="min-w-0 flex-1 text-left"
                  >
                    <div className="flex items-center gap-2">
                      <span className="truncate font-medium text-foreground">{f.name}</span>
                      {!settings.products.length && <Badge variant="destructive">Sem produtos</Badge>}
                    </div>
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">
                      /checkout/{f.slug} · {f.steps_count} passos · {f.bumps_count} bumps
                      {total > 0 && ` · ${total.toFixed(2)} ${settings.currency}`}
                    </p>
                  </button>

                  <div className="flex items-center gap-2">
                    <Label htmlFor={`active-${f.id}`} className="text-xs text-muted-foreground">Ativo</Label>
                    <Switch
                      id={`active-${f.id}`}
                      checked={!!f.is_active}
                      onCheckedChange={(checked) => updateFunnel.mutate({ id: f.id, is_active: checked })}
                    />
                  </div>

                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost" size="icon" aria-label={`Copiar link de ${f.name}`}
                      onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/checkout/${f.slug}`); toast.success("Link copiado"); }}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" aria-label={`Abrir checkout de ${f.name}`} asChild>
                      <a href={`/checkout/${f.slug}`} target="_blank" rel="noopener noreferrer"><ExternalLink className="h-4 w-4" /></a>
                    </Button>
                    <Button
                      variant="ghost" size="icon" aria-label={`Duplicar ${f.name}`}
                      disabled={duplicateFunnel.isPending}
                      onClick={() => duplicateFunnel.mutate(f)}
                    >
                      <CopyPlus className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" aria-label={`Eliminar ${f.name}`} onClick={() => setPendingDelete(f)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        </IXCard>
      )}

      <AlertDialog open={!!pendingDelete} onOpenChange={(o) => !o && setPendingDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar “{pendingDelete?.name}”?</AlertDialogTitle>
            <AlertDialogDescription>Esta ação é irreversível e o link público deixa de funcionar.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => { deleteFunnel.mutate(pendingDelete.id); setPendingDelete(null); }}>
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
