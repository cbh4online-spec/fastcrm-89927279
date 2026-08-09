import { useState, useEffect, useCallback } from "react";
import { Helmet } from "react-helmet-async";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useStoreSettings, useUpsertStoreSettings } from "@/hooks/useStoreSettings";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Store, Palette, Bell, Save, Loader2, Truck, TrendingUp, ShoppingBag, CreditCard, FileText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { StoreShareCard } from "@/components/store-settings/StoreShareCard";
import { ShippingMethodsManager } from "@/components/store-settings/ShippingMethodsManager";
import { StoreC2CSettings } from "@/components/store-settings/StoreC2CSettings";
import { StoreIdentitySettings } from "@/components/store-settings/sections/StoreIdentitySettings";
import { StoreBrandingSettings } from "@/components/store-settings/sections/StoreBrandingSettings";
import { StoreNotificationSettings } from "@/components/store-settings/sections/StoreNotificationSettings";
import { StoreGrowthSettings } from "@/components/store-settings/sections/StoreGrowthSettings";
import { StorePaymentSettings } from "@/components/store-settings/sections/StorePaymentSettings";
import { StoreProductPageSettings } from "@/components/store/settings/StoreProductPageSettings";

export default function StoreSettingsPage() {
  const { currentWorkspace } = useWorkspace();
  const { data: settings, isLoading } = useStoreSettings();
  const upsert = useUpsertStoreSettings();
  const [isGeneratingBanner, setIsGeneratingBanner] = useState(false);
  const [isSuggestingColors, setIsSuggestingColors] = useState(false);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [isUploadingBanner, setIsUploadingBanner] = useState(false);

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
    if (file.size > 2 * 1024 * 1024) { toast.error("Ficheiro demasiado grande. Máximo: 2MB"); return; }
    if (!file.type.startsWith("image/")) { toast.error("Apenas ficheiros de imagem são permitidos"); return; }
    const setUploading = type === "logo" ? setIsUploadingLogo : setIsUploadingBanner;
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() || "png";
      const filePath = `${currentWorkspace.id}/${type}-${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage.from("store-assets").upload(filePath, file, { contentType: file.type, upsert: true });
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from("store-assets").getPublicUrl(filePath);
      setForm(p => ({ ...p, [type === "logo" ? "logo_url" : "banner_url"]: publicUrl }));
      toast.success(`${type === "logo" ? "Logotipo" : "Banner"} carregado com sucesso!`);
    } catch (err: any) {
      toast.error("Erro no upload: " + (err.message || "Erro desconhecido"));
    } finally {
      setUploading(false);
    }
  }, [currentWorkspace?.id]);

  const handleGenerateBanner = async () => {
    if (!form.store_name.trim()) { toast.error("Preencha o nome da loja primeiro"); return; }
    if (!currentWorkspace?.id) return;
    setIsGeneratingBanner(true);
    try {
      const { data, error } = await supabase.functions.invoke("ai-product-assistant", {
        body: { mode: "generate-store-banner", storeName: form.store_name, description: form.store_description || undefined },
      });
      if (error) throw error;
      if (!data.success) throw new Error(data.error);
      const imageBase64 = data.data.imageBase64;
      if (!imageBase64) throw new Error("Imagem não gerada");
      const base64Match = imageBase64.match(/^data:image\/(png|jpeg|jpg|webp);base64,(.+)$/);
      if (!base64Match) throw new Error("Formato de imagem inválido");
      const mimeType = base64Match[1];
      const base64Data = base64Match[2];
      const binaryString = atob(base64Data);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) bytes[i] = binaryString.charCodeAt(i);
      const ext = mimeType === "jpeg" ? "jpg" : mimeType;
      const filePath = `${currentWorkspace.id}/banner-ai-${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage.from("store-assets").upload(filePath, bytes, { contentType: `image/${mimeType}`, upsert: true });
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from("store-assets").getPublicUrl(filePath);
      setForm(p => ({ ...p, banner_url: publicUrl }));
      toast.success("Banner gerado com IA!");
    } catch (err: any) {
      toast.error("Erro ao gerar banner: " + (err.message || "Erro desconhecido"));
    } finally {
      setIsGeneratingBanner(false);
    }
  };

  const handleSuggestColors = async () => {
    if (!form.store_name.trim()) { toast.error("Preencha o nome da loja primeiro"); return; }
    setIsSuggestingColors(true);
    try {
      const { data, error } = await supabase.functions.invoke("ai-product-assistant", {
        body: { mode: "suggest-brand-colors", storeName: form.store_name, description: form.store_description || undefined },
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
    if (slugError) { toast.error(slugError); return; }
    upsert.mutate({ ...form, store_slug: form.store_slug.trim() || null, custom_domain: form.custom_domain.trim() || null });
  };

  const storeSlugOrId = form.store_slug.trim() || currentWorkspace?.id || "";
  const baseUrl = form.custom_domain.trim() ? `https://${form.custom_domain.trim()}` : "https://fastcrm.metodopare.ai";
  const storeUrl = storeSlugOrId ? `${baseUrl}/store/${storeSlugOrId}` : "";

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

          {storeUrl && (
            <StoreShareCard storeUrl={storeUrl} storeName={form.store_name || currentWorkspace?.name} />
          )}

          <Tabs defaultValue="general">
            <TabsList className="flex-wrap">
              <TabsTrigger value="general" className="gap-1"><Store className="h-4 w-4" /> Geral</TabsTrigger>
              <TabsTrigger value="branding" className="gap-1"><Palette className="h-4 w-4" /> Branding</TabsTrigger>
              <TabsTrigger value="notifications" className="gap-1"><Bell className="h-4 w-4" /> Notificações</TabsTrigger>
              <TabsTrigger value="payments" className="gap-1"><CreditCard className="h-4 w-4" /> Pagamentos</TabsTrigger>
              <TabsTrigger value="shipping" className="gap-1"><Truck className="h-4 w-4" /> Envio</TabsTrigger>
              <TabsTrigger value="growth" className="gap-1"><TrendingUp className="h-4 w-4" /> Crescimento</TabsTrigger>
              <TabsTrigger value="marketplace" className="gap-1"><ShoppingBag className="h-4 w-4" /> Marketplace</TabsTrigger>
              <TabsTrigger value="product-page" className="gap-1"><FileText className="h-4 w-4" /> Ficha de Produto</TabsTrigger>
            </TabsList>

            <TabsContent value="general" className="space-y-4 mt-4">
              <StoreIdentitySettings form={form} setForm={setForm} slugError={slugError} />
            </TabsContent>

            <TabsContent value="branding" className="space-y-4 mt-4">
              <StoreBrandingSettings
                form={form}
                setForm={setForm}
                handleFileUpload={handleFileUpload}
                handleGenerateBanner={handleGenerateBanner}
                handleSuggestColors={handleSuggestColors}
                isUploadingLogo={isUploadingLogo}
                isUploadingBanner={isUploadingBanner}
                isGeneratingBanner={isGeneratingBanner}
                isSuggestingColors={isSuggestingColors}
              />
            </TabsContent>

            <TabsContent value="notifications" className="space-y-4 mt-4">
              <StoreNotificationSettings form={form} setForm={setForm} />
            </TabsContent>

            <TabsContent value="payments" className="mt-4">
              <StorePaymentSettings />
            </TabsContent>

            <TabsContent value="shipping" className="mt-4">
              <ShippingMethodsManager />
            </TabsContent>

            <TabsContent value="growth" className="mt-4">
              <StoreGrowthSettings />
            </TabsContent>

            <TabsContent value="marketplace" className="mt-4">
              <StoreC2CSettings />
            </TabsContent>
          </Tabs>
        </div>
      </DashboardLayout>
    </>
  );
}
