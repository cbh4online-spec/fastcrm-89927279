import { useState, useEffect } from "react";
import { Helmet } from "react-helmet-async";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useStoreSettings, useUpsertStoreSettings } from "@/hooks/useStoreSettings";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Store, Palette, Bell, Save, Loader2, Truck, Target, HelpCircle, Star } from "lucide-react";
import { toast } from "sonner";
import { ShippingMethodsManager } from "@/components/store-settings/ShippingMethodsManager";
import { CrmOffersManager } from "@/components/store-settings/CrmOffersManager";
import { StoreShareCard } from "@/components/store-settings/StoreShareCard";
import { StoreFaqManager } from "@/components/store-settings/StoreFaqManager";
import { StoreLoyaltyManager } from "@/components/store-settings/StoreLoyaltyManager";

export default function StoreSettingsPage() {
  const { currentWorkspace } = useWorkspace();
  const { data: settings, isLoading } = useStoreSettings();
  const upsert = useUpsertStoreSettings();

  const [form, setForm] = useState({
    store_name: "",
    store_description: "",
    logo_url: "",
    banner_url: "",
    primary_color: "#6366f1",
    accent_color: "#f59e0b",
    footer_text: "",
    show_categories: true,
    show_search: true,
    notification_email: "",
  });

  useEffect(() => {
    if (settings) {
      setForm({
        store_name: settings.store_name || "",
        store_description: settings.store_description || "",
        logo_url: settings.logo_url || "",
        banner_url: settings.banner_url || "",
        primary_color: settings.primary_color || "#6366f1",
        accent_color: settings.accent_color || "#f59e0b",
        footer_text: settings.footer_text || "",
        show_categories: settings.show_categories ?? true,
        show_search: settings.show_search ?? true,
        notification_email: settings.notification_email || "",
      });
    }
  }, [settings]);

  const handleSave = () => {
    upsert.mutate(form);
  };

  const storeUrl = currentWorkspace?.id
    ? `${window.location.origin}/store/${currentWorkspace.id}`
    : "";

  const copyUrl = () => {
    navigator.clipboard.writeText(storeUrl);
    toast.success("URL copiada!");
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="p-6 flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <>
      <Helmet>
        <title>Configurações da Loja | FastCRM</title>
      </Helmet>
      <DashboardLayout>
        <div className="p-6 space-y-6 max-w-3xl">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <Store className="h-6 w-6" />
                Configurações da Loja
              </h1>
              <p className="text-sm text-muted-foreground">Personalizar a loja online do workspace</p>
            </div>
            <Button onClick={handleSave} disabled={upsert.isPending} className="gap-2">
              {upsert.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Guardar
            </Button>
          </div>

          {/* Store URL + QR Code */}
          {storeUrl && (
            <StoreShareCard storeUrl={storeUrl} storeName={form.store_name || currentWorkspace?.name} />
          )}

          <Tabs defaultValue="general">
            <TabsList>
              <TabsTrigger value="general" className="gap-1"><Store className="h-4 w-4" /> Geral</TabsTrigger>
              <TabsTrigger value="branding" className="gap-1"><Palette className="h-4 w-4" /> Branding</TabsTrigger>
              <TabsTrigger value="notifications" className="gap-1"><Bell className="h-4 w-4" /> Notificações</TabsTrigger>
              <TabsTrigger value="shipping" className="gap-1"><Truck className="h-4 w-4" /> Envio</TabsTrigger>
              <TabsTrigger value="crm-offers" className="gap-1"><Target className="h-4 w-4" /> CRM & Ofertas</TabsTrigger>
              <TabsTrigger value="faq" className="gap-1"><HelpCircle className="h-4 w-4" /> FAQ</TabsTrigger>
              <TabsTrigger value="loyalty" className="gap-1"><Star className="h-4 w-4" /> Fidelidade</TabsTrigger>
            </TabsList>

            <TabsContent value="general" className="space-y-4 mt-4">
              <Card>
                <CardHeader>
                  <CardTitle>Informações Gerais</CardTitle>
                  <CardDescription>Nome e descrição da loja</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Nome da Loja</Label>
                    <Input
                      value={form.store_name}
                      onChange={(e) => setForm(p => ({ ...p, store_name: e.target.value }))}
                      placeholder="A minha loja"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Descrição</Label>
                    <Textarea
                      value={form.store_description}
                      onChange={(e) => setForm(p => ({ ...p, store_description: e.target.value }))}
                      placeholder="Descrição da loja para SEO"
                      rows={3}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Texto do Rodapé</Label>
                    <Input
                      value={form.footer_text}
                      onChange={(e) => setForm(p => ({ ...p, footer_text: e.target.value }))}
                      placeholder="© 2026 A minha empresa"
                    />
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Mostrar Categorias</Label>
                      <p className="text-xs text-muted-foreground">Filtros de categoria na loja</p>
                    </div>
                    <Switch
                      checked={form.show_categories}
                      onCheckedChange={(v) => setForm(p => ({ ...p, show_categories: v }))}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Mostrar Pesquisa</Label>
                      <p className="text-xs text-muted-foreground">Barra de pesquisa de produtos</p>
                    </div>
                    <Switch
                      checked={form.show_search}
                      onCheckedChange={(v) => setForm(p => ({ ...p, show_search: v }))}
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="branding" className="space-y-4 mt-4">
              <Card>
                <CardHeader>
                  <CardTitle>Branding</CardTitle>
                  <CardDescription>Logo, cores e banner da loja</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>URL do Logo</Label>
                    <Input
                      value={form.logo_url}
                      onChange={(e) => setForm(p => ({ ...p, logo_url: e.target.value }))}
                      placeholder="https://..."
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>URL do Banner</Label>
                    <Input
                      value={form.banner_url}
                      onChange={(e) => setForm(p => ({ ...p, banner_url: e.target.value }))}
                      placeholder="https://..."
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Cor Primária</Label>
                      <div className="flex gap-2">
                        <input
                          type="color"
                          value={form.primary_color}
                          onChange={(e) => setForm(p => ({ ...p, primary_color: e.target.value }))}
                          className="h-10 w-12 rounded border cursor-pointer"
                        />
                        <Input
                          value={form.primary_color}
                          onChange={(e) => setForm(p => ({ ...p, primary_color: e.target.value }))}
                          className="flex-1"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Cor de Destaque</Label>
                      <div className="flex gap-2">
                        <input
                          type="color"
                          value={form.accent_color}
                          onChange={(e) => setForm(p => ({ ...p, accent_color: e.target.value }))}
                          className="h-10 w-12 rounded border cursor-pointer"
                        />
                        <Input
                          value={form.accent_color}
                          onChange={(e) => setForm(p => ({ ...p, accent_color: e.target.value }))}
                          className="flex-1"
                        />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="notifications" className="space-y-4 mt-4">
              <Card>
                <CardHeader>
                  <CardTitle>Notificações</CardTitle>
                  <CardDescription>Email para receber alertas de novas encomendas</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <Label>Email de Notificação</Label>
                    <Input
                      type="email"
                      value={form.notification_email}
                      onChange={(e) => setForm(p => ({ ...p, notification_email: e.target.value }))}
                      placeholder="admin@empresa.com"
                    />
                    <p className="text-xs text-muted-foreground">
                      Receberá um email sempre que uma nova encomenda for paga.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="shipping" className="mt-4">
              <ShippingMethodsManager />
            </TabsContent>

            <TabsContent value="crm-offers" className="mt-4">
              <CrmOffersManager />
            </TabsContent>

            <TabsContent value="faq" className="mt-4">
              <StoreFaqManager />
            </TabsContent>

            <TabsContent value="loyalty" className="mt-4">
              <StoreLoyaltyManager />
            </TabsContent>
          </Tabs>
        </div>
      </DashboardLayout>
    </>
  );
}
