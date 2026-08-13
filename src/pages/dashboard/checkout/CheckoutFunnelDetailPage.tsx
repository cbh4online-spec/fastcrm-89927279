import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ArrowLeft, Copy, ExternalLink, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { IXCard } from "@/components/entity/ix/IXCard";
import { useCheckoutFunnel, useCheckoutFunnels } from "@/hooks/useCheckoutFunnels";
import { FunnelProductsEditor } from "@/components/checkout/admin/FunnelProductsEditor";
import { FunnelStepsEditor } from "@/components/checkout/admin/FunnelStepsEditor";
import { FunnelBumpsEditor } from "@/components/checkout/admin/FunnelBumpsEditor";
import { funnelSchema, normalizeSlug, readFunnelSettings } from "@/schemas/checkout/funnelSchema";

export default function CheckoutFunnelDetailPage() {
  const { funnelId } = useParams();
  const navigate = useNavigate();
  const funnelQuery = useCheckoutFunnel(funnelId);
  const { updateFunnel, deleteFunnel } = useCheckoutFunnels();
  const funnel = funnelQuery.data;

  const settings = useMemo(() => readFunnelSettings(funnel?.settings), [funnel?.settings]);

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [countdown, setCountdown] = useState("");
  const [scarcity, setScarcity] = useState("");
  const [requireShipping, setRequireShipping] = useState(true);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (!funnel) return;
    setName(funnel.name ?? "");
    setSlug(funnel.slug ?? "");
    setDescription(funnel.description ?? "");
    setCountdown(settings.countdown_seconds ? String(settings.countdown_seconds) : "");
    setScarcity(settings.scarcity_text ?? "");
    setRequireShipping(settings.require_shipping);
  }, [funnel, settings]);

  const publicUrl = funnel ? `${window.location.origin}/checkout/${funnel.slug}` : "";

  function saveSettings(patch: Record<string, unknown>, options?: { silent?: boolean }) {
    if (!funnel) return;
    updateFunnel.mutate({
      id: funnel.id,
      silent: options?.silent,
      settings: { ...(funnel.settings ?? {}), ...patch },
    } as any);
  }

  function handleSaveDetails() {
    const parsed = funnelSchema.safeParse({ name, slug: normalizeSlug(slug), description });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }
    updateFunnel.mutate({ id: funnel.id, ...parsed.data });
  }

  if (funnelQuery.isLoading) {
    return <div className="flex justify-center p-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  if (funnelQuery.isError) {
    return (
      <div className="p-6">
        <IXCard title="Erro">
          <div className="space-y-3">
            <p className="text-sm text-destructive">Não foi possível carregar este funil.</p>
            <Button variant="outline" onClick={() => funnelQuery.refetch()}>Tentar novamente</Button>
          </div>
        </IXCard>
      </div>
    );
  }

  if (!funnel) {
    return (
      <div className="p-6">
        <IXCard title="Funil não encontrado">
          <Button variant="outline" onClick={() => navigate("/dashboard/checkout")}>Voltar aos funis</Button>
        </IXCard>
      </div>
    );
  }

  const hasProducts = settings.products.some((p) => p.price > 0);

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <Button variant="ghost" size="sm" className="-ml-2 mb-1" onClick={() => navigate("/dashboard/checkout")}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Funis
          </Button>
          <div className="flex items-center gap-3">
            <h1 className="truncate text-3xl font-bold tracking-tight">{funnel.name}</h1>
            <Badge variant={funnel.is_active ? "default" : "secondary"}>{funnel.is_active ? "Ativo" : "Inativo"}</Badge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">/checkout/{funnel.slug}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => { navigator.clipboard.writeText(publicUrl); toast.success("Link copiado"); }}
          >
            <Copy className="mr-2 h-4 w-4" /> Copiar link
          </Button>
          <Button variant="outline" asChild>
            <a href={`/checkout/${funnel.slug}`} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="mr-2 h-4 w-4" /> Pré-visualizar
            </a>
          </Button>
        </div>
      </div>

      {!hasProducts && (
        <div className="rounded-2xl border border-destructive/40 bg-destructive/5 px-5 py-4 text-sm text-foreground">
          Este funil ainda não tem produtos com preço definido — o pagamento vai falhar. Configure-os no separador
          <strong> Produtos &amp; preço</strong>.
        </div>
      )}

      <Tabs defaultValue="produtos">
        <TabsList className="w-full justify-start overflow-x-auto">
          <TabsTrigger value="produtos">Produtos &amp; preço</TabsTrigger>
          <TabsTrigger value="passos">Passos</TabsTrigger>
          <TabsTrigger value="bumps">Order bumps</TabsTrigger>
          <TabsTrigger value="conversao">Conversão</TabsTrigger>
          <TabsTrigger value="definicoes">Definições</TabsTrigger>
        </TabsList>

        <TabsContent value="produtos" className="mt-6">
          <FunnelProductsEditor
            products={settings.products}
            currency={settings.currency}
            saving={updateFunnel.isPending}
            onSave={(products, currency) => saveSettings({ products, currency })}
          />
        </TabsContent>

        <TabsContent value="passos" className="mt-6">
          <FunnelStepsEditor funnelId={funnel.id} />
        </TabsContent>

        <TabsContent value="bumps" className="mt-6">
          <FunnelBumpsEditor funnelId={funnel.id} />
        </TabsContent>

        <TabsContent value="conversao" className="mt-6">
          <IXCard
            title="Elementos de conversão"
            description="Urgência e escassez apresentadas na página de checkout."
            actions={
              <Button
                disabled={updateFunnel.isPending}
                onClick={() => {
                  const seconds = countdown ? Number(countdown) : null;
                  if (seconds !== null && (!Number.isFinite(seconds) || seconds < 0 || seconds > 86400)) {
                    toast.error("O contador deve estar entre 0 e 86400 segundos");
                    return;
                  }
                  saveSettings({
                    countdown_seconds: seconds,
                    scarcity_text: scarcity.trim().slice(0, 160) || null,
                    require_shipping: requireShipping,
                  });
                }}
              >
                {updateFunnel.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Guardar
              </Button>
            }
          >
            <div className="grid gap-5 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="countdown">Contador regressivo (segundos)</Label>
                <Input id="countdown" type="number" min={0} max={86400} value={countdown} onChange={(e) => setCountdown(e.target.value)} placeholder="900" />
                <p className="text-xs text-muted-foreground">Deixe vazio para não mostrar contador.</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="scarcity">Texto de escassez</Label>
                <Input id="scarcity" maxLength={160} value={scarcity} onChange={(e) => setScarcity(e.target.value)} placeholder="Apenas 12 vagas disponíveis" />
              </div>
              <div className="flex items-center gap-3 sm:col-span-2">
                <Switch id="require-shipping" checked={requireShipping} onCheckedChange={setRequireShipping} />
                <Label htmlFor="require-shipping">Pedir morada de envio</Label>
              </div>
            </div>
          </IXCard>
        </TabsContent>

        <TabsContent value="definicoes" className="mt-6 space-y-6">
          <IXCard
            title="Definições gerais"
            actions={
              <Button onClick={handleSaveDetails} disabled={updateFunnel.isPending}>
                {updateFunnel.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Guardar
              </Button>
            }
          >
            <div className="grid gap-5 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="funnel-name">Nome</Label>
                <Input id="funnel-name" value={name} maxLength={120} onChange={(e) => setName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="funnel-slug">Slug (URL)</Label>
                <Input id="funnel-slug" value={slug} maxLength={60} onChange={(e) => setSlug(e.target.value)} onBlur={() => setSlug(normalizeSlug(slug))} />
                <p className="text-xs text-muted-foreground">/checkout/{normalizeSlug(slug) || "slug"}</p>
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="funnel-desc">Descrição</Label>
                <Textarea id="funnel-desc" value={description} maxLength={500} onChange={(e) => setDescription(e.target.value)} rows={3} />
              </div>
              <div className="flex items-center gap-3 sm:col-span-2">
                <Switch
                  id="funnel-active"
                  checked={!!funnel.is_active}
                  onCheckedChange={(checked) => updateFunnel.mutate({ id: funnel.id, is_active: checked })}
                />
                <Label htmlFor="funnel-active">Funil ativo (visível publicamente)</Label>
              </div>
            </div>
          </IXCard>

          <IXCard title="Zona perigosa" description="Eliminar o funil remove passos e order bumps associados.">
            <Button variant="destructive" onClick={() => setConfirmDelete(true)}>
              <Trash2 className="mr-2 h-4 w-4" /> Eliminar funil
            </Button>
          </IXCard>
        </TabsContent>
      </Tabs>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar “{funnel.name}”?</AlertDialogTitle>
            <AlertDialogDescription>Esta ação é irreversível e o link público deixa de funcionar.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteFunnel.mutate(funnel.id, { onSuccess: () => navigate("/dashboard/checkout") })}
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
