import { useState, useEffect, useRef, useCallback } from "react";
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
import { Store, Palette, Bell, Save, Loader2, Truck, Target, HelpCircle, Star, Users, HandCoins, Gift, Link as LinkIcon, Sparkles, Upload, X, Image as ImageIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { SectionAIAssistButton } from "@/components/proposals/SectionAIAssistButton";
import { toast } from "sonner";
import { ShippingMethodsManager } from "@/components/store-settings/ShippingMethodsManager";
import { CrmOffersManager } from "@/components/store-settings/CrmOffersManager";
import { StoreShareCard } from "@/components/store-settings/StoreShareCard";
import { StoreFaqManager } from "@/components/store-settings/StoreFaqManager";
import { StoreLoyaltyManager } from "@/components/store-settings/StoreLoyaltyManager";
import { StoreReferralManager } from "@/components/store-settings/StoreReferralManager";
import { StoreOffersManager } from "@/components/store-settings/StoreOffersManager";
import { StoreGiftCardsManager } from "@/components/store-settings/StoreGiftCardsManager";

export default function StoreSettingsPage() {
  const { currentWorkspace } = useWorkspace();
  const { data: settings, isLoading } = useStoreSettings();
  const upsert = useUpsertStoreSettings();
  const [isGeneratingDesc, setIsGeneratingDesc] = useState(false);
  const [isGeneratingBanner, setIsGeneratingBanner] = useState(false);
  const [isSuggestingColors, setIsSuggestingColors] = useState(false);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [isUploadingBanner, setIsUploadingBanner] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);

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
    store_slug: "",
    custom_domain: "",
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
        store_slug: settings.store_slug || "",
        custom_domain: settings.custom_domain || "",
      });
    }
  }, [settings]);

  const RESERVED_SLUGS = ["admin", "api", "checkout", "store", "dashboard", "auth", "login", "signup"];
  const SLUG_REGEX = /^[a-z0-9][a-z0-9-]*[a-z0-9]$/;

  const slugError = (() => {
    const s = form.store_slug.trim();
    if (!s) return null;
    if (s.length < 3) return "Mínimo 3 caracteres";
    if (!SLUG_REGEX.test(s)) return "Apenas letras minúsculas, números e hífens";
    if (RESERVED_SLUGS.includes(s)) return "Este nome está reservado";
    return null;
  })();

  const handleFileUpload = useCallback(async (file: File, type: "logo" | "banner") => {
    if (!currentWorkspace?.id) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Ficheiro demasiado grande. Máximo: 2MB");
      return;
    }
    if (!file.type.startsWith("image/")) {
      toast.error("Apenas ficheiros de imagem são permitidos");
      return;
    }
    const setUploading = type === "logo" ? setIsUploadingLogo : setIsUploadingBanner;
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() || "png";
      const filePath = `${currentWorkspace.id}/${type}-${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("store-assets")
        .upload(filePath, file, { contentType: file.type, upsert: true });
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage
        .from("store-assets")
        .getPublicUrl(filePath);
      setForm(p => ({ ...p, [type === "logo" ? "logo_url" : "banner_url"]: publicUrl }));
      toast.success(`${type === "logo" ? "Logotipo" : "Banner"} carregado com sucesso!`);
    } catch (err: any) {
      toast.error("Erro no upload: " + (err.message || "Erro desconhecido"));
    } finally {
      setUploading(false);
    }
  }, [currentWorkspace?.id]);

  const handleGenerateBanner = async () => {
    if (!form.store_name.trim()) {
      toast.error("Preencha o nome da loja primeiro");
      return;
    }
    if (!currentWorkspace?.id) return;
    setIsGeneratingBanner(true);
    try {
      const { data, error } = await supabase.functions.invoke("ai-product-assistant", {
        body: {
          mode: "generate-store-banner",
          storeName: form.store_name,
          description: form.store_description || undefined,
        },
      });
      if (error) throw error;
      if (!data.success) throw new Error(data.error);
      const imageBase64 = data.data.imageBase64;
      if (!imageBase64) throw new Error("Imagem não gerada");
      // Convert base64 data URL to blob and upload
      const base64Match = imageBase64.match(/^data:image\/(png|jpeg|jpg|webp);base64,(.+)$/);
      if (!base64Match) throw new Error("Formato de imagem inválido");
      const mimeType = base64Match[1];
      const base64Data = base64Match[2];
      const binaryString = atob(base64Data);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      const ext = mimeType === "jpeg" ? "jpg" : mimeType;
      const filePath = `${currentWorkspace.id}/banner-ai-${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("store-assets")
        .upload(filePath, bytes, { contentType: `image/${mimeType}`, upsert: true });
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage
        .from("store-assets")
        .getPublicUrl(filePath);
      setForm(p => ({ ...p, banner_url: publicUrl }));
      toast.success("Banner gerado com IA!");
    } catch (err: any) {
      toast.error("Erro ao gerar banner: " + (err.message || "Erro desconhecido"));
    } finally {
      setIsGeneratingBanner(false);
    }
  };

  const handleSuggestColors = async () => {
    if (!form.store_name.trim()) {
      toast.error("Preencha o nome da loja primeiro");
      return;
    }
    setIsSuggestingColors(true);
    try {
      const { data, error } = await supabase.functions.invoke("ai-product-assistant", {
        body: {
          mode: "suggest-brand-colors",
          storeName: form.store_name,
          description: form.store_description || undefined,
        },
      });
      if (error) throw error;
      if (!data.success) throw new Error(data.error);
      const { primaryColor, accentColor, rationale } = data.data;
      setForm(p => ({ ...p, primary_color: primaryColor, accent_color: accentColor }));
      toast.success(rationale || "Cores sugeridas com IA!");
    } catch (err: any) {
      toast.error("Erro ao sugerir cores: " + (err.message || "Erro desconhecido"));
    } finally {
      setIsSuggestingColors(false);
    }
  };

  const handleSave = () => {
    if (slugError) {
      toast.error(slugError);
      return;
    }
    const payload = {
      ...form,
      store_slug: form.store_slug.trim() || null,
      custom_domain: form.custom_domain.trim() || null,
    };
    upsert.mutate(payload);
  };

  const storeSlugOrId = form.store_slug.trim() || currentWorkspace?.id || "";
  const baseUrl = form.custom_domain.trim()
    ? `https://${form.custom_domain.trim()}`
    : "https://fastcrm.metodopare.ai";
  const storeUrl = storeSlugOrId
    ? `${baseUrl}/store/${storeSlugOrId}`
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
              <TabsTrigger value="referrals" className="gap-1"><Users className="h-4 w-4" /> Referrals</TabsTrigger>
              <TabsTrigger value="offers" className="gap-1"><HandCoins className="h-4 w-4" /> Ofertas</TabsTrigger>
              <TabsTrigger value="gift-cards" className="gap-1"><Gift className="h-4 w-4" /> Gift Cards</TabsTrigger>
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
                    <div className="flex items-center justify-between">
                      <Label>Descrição</Label>
                      <SectionAIAssistButton
                        onClick={async () => {
                          if (!form.store_name.trim()) {
                            toast.error("Preencha o nome da loja primeiro");
                            return;
                          }
                          const doGenerate = async () => {
                            setIsGeneratingDesc(true);
                            try {
                              const { data, error } = await supabase.functions.invoke("ai-product-assistant", {
                                body: { mode: "generate-store-description", storeName: form.store_name },
                              });
                              if (error) throw error;
                              if (!data.success) throw new Error(data.error);
                              setForm(p => ({ ...p, store_description: data.data.fullDescription || data.data.metaDescription }));
                              toast.success("Descrição gerada com IA!");
                            } catch (err: any) {
                              toast.error("Erro ao gerar descrição: " + (err.message || "Erro desconhecido"));
                            } finally {
                              setIsGeneratingDesc(false);
                            }
                          };
                          if (form.store_description.trim()) {
                            toast("Já existe uma descrição. Substituir?", {
                              action: { label: "Substituir", onClick: doGenerate },
                            });
                            return;
                          }
                          doGenerate();
                        }}
                        isLoading={isGeneratingDesc}
                        disabled={!form.store_name.trim()}
                        tooltip="Gerar descrição SEO com IA baseada no nome da loja"
                      />
                    </div>
                    <Textarea
                      value={form.store_description}
                      onChange={(e) => setForm(p => ({ ...p, store_description: e.target.value }))}
                      placeholder="Descrição da loja para SEO"
                      rows={3}
                    />
                  </div>
                  <Separator />
                  <div className="space-y-2">
                    <Label className="flex items-center gap-1.5">
                      <LinkIcon className="h-3.5 w-3.5 text-muted-foreground" />
                      Link Personalizado da Loja
                    </Label>
                    <div className="flex items-center gap-0">
                      <span className="text-sm text-muted-foreground bg-muted px-3 py-2 rounded-l-md border border-r-0 border-input h-10 flex items-center whitespace-nowrap">
                        {form.custom_domain.trim() ? `https://${form.custom_domain.trim()}` : "https://fastcrm.metodopare.ai"}/store/
                      </span>
                      <Input
                        value={form.store_slug}
                        onChange={(e) => setForm(p => ({ ...p, store_slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "") }))}
                        placeholder="minha-loja"
                        className="rounded-l-none"
                      />
                    </div>
                    {slugError && (
                      <p className="text-sm text-destructive">{slugError}</p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      Deixe vazio para usar o link padrão. Apenas letras minúsculas, números e hífens.
                    </p>
                   </div>
                  <Separator />
                  <div className="space-y-2">
                    <Label className="flex items-center gap-1.5">
                      🌐 Domínio Próprio (opcional)
                    </Label>
                    <Input
                      value={form.custom_domain}
                      onChange={(e) => setForm(p => ({ ...p, custom_domain: e.target.value.trim().replace(/^https?:\/\//, "") }))}
                      placeholder="loja.minhaempresa.pt"
                    />
                    <p className="text-xs text-muted-foreground">
                      Para usar um domínio próprio, configure um registo A no seu DNS a apontar para <code className="bg-muted px-1 rounded">185.158.133.1</code>. Deixe vazio para usar o domínio padrão.
                    </p>
                  </div>
                  <Separator />
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
                <CardContent className="space-y-6">
                  {/* Logo Upload */}
                  <div className="space-y-3">
                    <Label className="text-base font-semibold">Logotipo</Label>
                    <div className="flex items-start gap-4">
                      <div className="w-24 h-24 rounded-lg border-2 border-dashed border-border flex items-center justify-center overflow-hidden bg-muted/50 flex-shrink-0">
                        {form.logo_url ? (
                          <img src={form.logo_url} alt="Logo" className="w-full h-full object-contain" />
                        ) : (
                          <ImageIcon className="h-8 w-8 text-muted-foreground" />
                        )}
                      </div>
                      <div className="space-y-2">
                        <input
                          ref={logoInputRef}
                          type="file"
                          accept="image/png,image/jpeg,image/jpg,image/svg+xml,image/webp"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleFileUpload(file, "logo");
                            e.target.value = "";
                          }}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => logoInputRef.current?.click()}
                          disabled={isUploadingLogo}
                          className="gap-1.5"
                        >
                          {isUploadingLogo ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                          Escolher ficheiro
                        </Button>
                        {form.logo_url && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => setForm(p => ({ ...p, logo_url: "" }))}
                            className="gap-1.5 text-destructive hover:text-destructive"
                          >
                            <X className="h-3.5 w-3.5" />
                            Remover
                          </Button>
                        )}
                        <p className="text-xs text-muted-foreground">PNG, JPG, SVG ou WebP. Máx: 2MB</p>
                      </div>
                    </div>
                  </div>

                  <Separator />

                  {/* Banner Upload + AI */}
                  <div className="space-y-3">
                    <Label className="text-base font-semibold">Banner</Label>
                    <div className="w-full aspect-[16/5] rounded-lg border-2 border-dashed border-border flex items-center justify-center overflow-hidden bg-muted/50">
                      {form.banner_url ? (
                        <img src={form.banner_url} alt="Banner" className="w-full h-full object-cover" />
                      ) : (
                        <div className="flex flex-col items-center gap-1 text-muted-foreground">
                          <ImageIcon className="h-10 w-10" />
                          <span className="text-sm">Nenhum banner definido</span>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <input
                        ref={bannerInputRef}
                        type="file"
                        accept="image/png,image/jpeg,image/jpg,image/webp"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleFileUpload(file, "banner");
                          e.target.value = "";
                        }}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => bannerInputRef.current?.click()}
                        disabled={isUploadingBanner}
                        className="gap-1.5"
                      >
                        {isUploadingBanner ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                        Escolher ficheiro
                      </Button>
                      <SectionAIAssistButton
                        onClick={handleGenerateBanner}
                        isLoading={isGeneratingBanner}
                        disabled={!form.store_name.trim()}
                        label="Gerar com IA"
                        tooltip="Gerar banner fotorealista com IA baseado no nome da loja"
                      />
                      {form.banner_url && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setForm(p => ({ ...p, banner_url: "" }))}
                          className="gap-1.5 text-destructive hover:text-destructive"
                        >
                          <X className="h-3.5 w-3.5" />
                          Remover
                        </Button>
                      )}
                    </div>
                  </div>

                  <Separator />

                  {/* Colors + AI */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="text-base font-semibold">Cores</Label>
                      <SectionAIAssistButton
                        onClick={handleSuggestColors}
                        isLoading={isSuggestingColors}
                        disabled={!form.store_name.trim()}
                        label="Sugerir cores com IA"
                        tooltip="Sugerir paleta de cores com IA baseada no nome e descrição da loja"
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

            <TabsContent value="referrals" className="mt-4">
              <StoreReferralManager />
            </TabsContent>

            <TabsContent value="offers" className="mt-4">
              <StoreOffersManager />
            </TabsContent>

            <TabsContent value="gift-cards" className="mt-4">
              <StoreGiftCardsManager />
            </TabsContent>
          </Tabs>
        </div>
      </DashboardLayout>
    </>
  );
}
