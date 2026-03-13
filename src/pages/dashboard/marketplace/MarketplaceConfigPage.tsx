import { useState, useEffect } from "react";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useMarketplaceAdmin, useSaveMarketplaceConfig } from "@/hooks/useMarketplace";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Copy, ExternalLink, Globe, Palette, Settings, BarChart3 } from "lucide-react";
import { getPublicBaseUrl } from "@/utils/getPublicDomain";

export default function MarketplaceConfigPage() {
  const { currentWorkspace } = useWorkspace();
  const workspaceId = currentWorkspace?.id;
  const { data: config, isLoading } = useMarketplaceAdmin(workspaceId);
  const saveConfig = useSaveMarketplaceConfig();

  const [form, setForm] = useState({
    slug: "",
    name: "",
    tagline: "",
    description: "",
    logo_url: "",
    cover_image_url: "",
    seo_title: "",
    seo_description: "",
    og_image_url: "",
    support_email: "",
    commission_rate: 10,
    boost_price_day: 500,
    featured_price_week: 2000,
    status: "active",
    theme: {
      primaryColor: "#6366f1",
      secondaryColor: "#f59e0b",
      backgroundColor: "#ffffff",
      textColor: "#1f2937",
      fontFamily: "Inter",
    },
    settings: {
      allowGuestBrowsing: true,
      requireLoginToContact: true,
      showSellerPhone: false,
      showSellerEmail: false,
      enableMessaging: true,
      enableOffers: true,
      enableBoost: true,
      moderateListings: true,
      categoriesEnabled: true,
      searchEnabled: true,
      filtersEnabled: true,
    },
  });

  useEffect(() => {
    if (config) {
      setForm({
        slug: config.slug || "",
        name: config.name || "",
        tagline: config.tagline || "",
        description: config.description || "",
        logo_url: config.logo_url || "",
        cover_image_url: config.cover_image_url || "",
        seo_title: config.seo_title || "",
        seo_description: config.seo_description || "",
        og_image_url: config.og_image_url || "",
        support_email: config.support_email || "",
        commission_rate: config.commission_rate || 10,
        boost_price_day: config.boost_price_day || 500,
        featured_price_week: config.featured_price_week || 2000,
        status: config.status || "active",
        theme: config.theme || form.theme,
        settings: { ...form.settings, ...(config.settings as any) },
      });
    } else if (currentWorkspace) {
      setForm((f) => ({
        ...f,
        slug: currentWorkspace.slug || "",
        name: currentWorkspace.name || "",
      }));
    }
  }, [config, currentWorkspace]);

  const handleSave = async () => {
    if (!workspaceId || !form.slug || !form.name) {
      toast.error("Slug e nome são obrigatórios");
      return;
    }
    try {
      await saveConfig.mutateAsync({
        workspace_id: workspaceId,
        ...form,
      });
      toast.success("Configuração guardada!");
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const publicUrl = `${getPublicBaseUrl()}/marketplace/${form.slug}`;

  const copyUrl = () => {
    navigator.clipboard.writeText(publicUrl);
    toast.success("Link copiado!");
  };

  if (isLoading) return <div className="p-8 text-muted-foreground">A carregar...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Configuração do Marketplace</h1>
          <p className="text-muted-foreground text-sm">Personaliza a aparência e configurações do teu marketplace público</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={copyUrl}>
            <Copy className="h-4 w-4 mr-1" /> Copiar Link
          </Button>
          <Button variant="outline" size="sm" asChild>
            <a href={publicUrl} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-4 w-4 mr-1" /> Abrir
            </a>
          </Button>
          <Button onClick={handleSave} disabled={saveConfig.isPending}>
            {saveConfig.isPending ? "A guardar..." : "Guardar"}
          </Button>
        </div>
      </div>

      <Tabs defaultValue="general" className="space-y-4">
        <TabsList>
          <TabsTrigger value="general"><Globe className="h-4 w-4 mr-1" /> Geral</TabsTrigger>
          <TabsTrigger value="theme"><Palette className="h-4 w-4 mr-1" /> Tema</TabsTrigger>
          <TabsTrigger value="settings"><Settings className="h-4 w-4 mr-1" /> Definições</TabsTrigger>
          <TabsTrigger value="monetization"><BarChart3 className="h-4 w-4 mr-1" /> Monetização</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Informações básicas</CardTitle>
              <CardDescription>Nome, slug e descrição do marketplace</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Slug (URL)</Label>
                  <Input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "") })} placeholder="meu-marketplace" />
                  <p className="text-xs text-muted-foreground">{publicUrl}</p>
                </div>
                <div className="space-y-2">
                  <Label>Nome</Label>
                  <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Meu Marketplace" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Tagline</Label>
                <Input value={form.tagline} onChange={(e) => setForm({ ...form, tagline: e.target.value })} placeholder="O teu marketplace de confiança" />
              </div>
              <div className="space-y-2">
                <Label>Descrição</Label>
                <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>URL do Logotipo</Label>
                  <Input value={form.logo_url} onChange={(e) => setForm({ ...form, logo_url: e.target.value })} placeholder="https://..." />
                </div>
                <div className="space-y-2">
                  <Label>URL da Capa</Label>
                  <Input value={form.cover_image_url} onChange={(e) => setForm({ ...form, cover_image_url: e.target.value })} placeholder="https://..." />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Email de suporte</Label>
                <Input value={form.support_email} onChange={(e) => setForm({ ...form, support_email: e.target.value })} placeholder="suporte@exemplo.pt" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>SEO</CardTitle>
              <CardDescription>Metadados para motores de busca e redes sociais</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Título SEO</Label>
                <Input value={form.seo_title} onChange={(e) => setForm({ ...form, seo_title: e.target.value })} placeholder="Título para Google" />
              </div>
              <div className="space-y-2">
                <Label>Descrição SEO</Label>
                <Textarea value={form.seo_description} onChange={(e) => setForm({ ...form, seo_description: e.target.value })} rows={2} />
              </div>
              <div className="space-y-2">
                <Label>Imagem OG</Label>
                <Input value={form.og_image_url} onChange={(e) => setForm({ ...form, og_image_url: e.target.value })} placeholder="https://..." />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="theme">
          <Card>
            <CardHeader>
              <CardTitle>Tema Visual</CardTitle>
              <CardDescription>Cores e tipografia do marketplace</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                { key: "primaryColor", label: "Cor Primária" },
                { key: "secondaryColor", label: "Cor Secundária" },
                { key: "backgroundColor", label: "Cor de Fundo" },
                { key: "textColor", label: "Cor do Texto" },
              ].map(({ key, label }) => (
                <div key={key} className="flex items-center gap-4">
                  <Label className="w-32">{label}</Label>
                  <input
                    type="color"
                    value={(form.theme as any)[key]}
                    onChange={(e) => setForm({ ...form, theme: { ...form.theme, [key]: e.target.value } })}
                    className="h-10 w-16 rounded cursor-pointer"
                  />
                  <Input
                    value={(form.theme as any)[key]}
                    onChange={(e) => setForm({ ...form, theme: { ...form.theme, [key]: e.target.value } })}
                    className="w-32"
                  />
                </div>
              ))}
              <div className="flex items-center gap-4">
                <Label className="w-32">Fonte</Label>
                <Input
                  value={form.theme.fontFamily}
                  onChange={(e) => setForm({ ...form, theme: { ...form.theme, fontFamily: e.target.value } })}
                  className="w-48"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings">
          <Card>
            <CardHeader>
              <CardTitle>Funcionalidades</CardTitle>
              <CardDescription>Ativa ou desativa funcionalidades do marketplace</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                { key: "allowGuestBrowsing", label: "Navegação sem login" },
                { key: "requireLoginToContact", label: "Exigir login para contactar" },
                { key: "showSellerPhone", label: "Mostrar telefone do vendedor" },
                { key: "showSellerEmail", label: "Mostrar email do vendedor" },
                { key: "enableMessaging", label: "Chat integrado" },
                { key: "enableOffers", label: "Permitir ofertas" },
                { key: "enableBoost", label: "Permitir boost de anúncios" },
                { key: "moderateListings", label: "Moderar anúncios antes de publicar" },
                { key: "categoriesEnabled", label: "Categorias" },
                { key: "searchEnabled", label: "Pesquisa" },
                { key: "filtersEnabled", label: "Filtros" },
              ].map(({ key, label }) => (
                <div key={key} className="flex items-center justify-between">
                  <Label>{label}</Label>
                  <Switch
                    checked={(form.settings as any)[key]}
                    onCheckedChange={(v) => setForm({ ...form, settings: { ...form.settings, [key]: v } })}
                  />
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="monetization">
          <Card>
            <CardHeader>
              <CardTitle>Monetização</CardTitle>
              <CardDescription>Comissões e preços de funcionalidades premium</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Taxa de comissão (%)</Label>
                <Input type="number" min={0} max={100} step={0.5} value={form.commission_rate} onChange={(e) => setForm({ ...form, commission_rate: parseFloat(e.target.value) || 0 })} />
              </div>
              <div className="space-y-2">
                <Label>Preço do Boost / dia (cêntimos)</Label>
                <Input type="number" min={0} value={form.boost_price_day} onChange={(e) => setForm({ ...form, boost_price_day: parseInt(e.target.value) || 0 })} />
                <p className="text-xs text-muted-foreground">{(form.boost_price_day / 100).toFixed(2)} €/dia</p>
              </div>
              <div className="space-y-2">
                <Label>Preço do Destaque / semana (cêntimos)</Label>
                <Input type="number" min={0} value={form.featured_price_week} onChange={(e) => setForm({ ...form, featured_price_week: parseInt(e.target.value) || 0 })} />
                <p className="text-xs text-muted-foreground">{(form.featured_price_week / 100).toFixed(2)} €/semana</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
