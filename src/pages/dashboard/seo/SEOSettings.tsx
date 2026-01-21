import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  Globe,
  Languages,
  Image,
  Code,
  Save,
  RefreshCw,
  Loader2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";

const languages = [
  { code: "pt", label: "Português" },
  { code: "en", label: "Inglês" },
  { code: "es", label: "Espanhol" },
];

export function SEOSettings() {
  const { currentWorkspace } = useWorkspace();
  const [isLoading, setIsLoading] = useState(true);
  const [settings, setSettings] = useState({
    baseUrl: "https://fastcrm.lovable.app",
    defaultLanguage: "pt",
    supportedLanguages: ["pt", "en"] as string[],
    defaultOgImage: "",
    gtmContainerId: "",
    ga4MeasurementId: "",
    metaPixelId: "",
    clarityProjectId: "",
    autoSitemapUpdate: true,
    enableSchemaMarkup: true,
  });
  const [isSaving, setIsSaving] = useState(false);

  // Load settings from database
  useEffect(() => {
    const loadSettings = async () => {
      if (!currentWorkspace?.id) return;
      
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from('growth_settings')
          .select('*')
          .eq('workspace_id', currentWorkspace.id)
          .maybeSingle();
        
        if (error) throw error;
        
        if (data) {
          setSettings({
            baseUrl: data.base_url || "https://fastcrm.lovable.app",
            defaultLanguage: data.default_language || "pt",
            supportedLanguages: data.supported_languages || ["pt"],
            defaultOgImage: data.default_og_image || "",
            gtmContainerId: data.gtm_container_id || "",
            ga4MeasurementId: data.ga4_measurement_id || "",
            metaPixelId: data.meta_pixel_id || "",
            clarityProjectId: data.clarity_project_id || "",
            autoSitemapUpdate: data.sitemap_auto_update ?? true,
            enableSchemaMarkup: data.enable_schema_markup ?? true,
          });
        }
      } catch (error) {
        console.error('Error loading settings:', error);
        toast.error("Erro ao carregar configurações");
      } finally {
        setIsLoading(false);
      }
    };
    
    loadSettings();
  }, [currentWorkspace?.id]);

  const handleSave = async () => {
    if (!currentWorkspace?.id) {
      toast.error("Workspace não encontrado");
      return;
    }
    
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('growth_settings')
        .upsert({
          workspace_id: currentWorkspace.id,
          base_url: settings.baseUrl,
          default_language: settings.defaultLanguage,
          supported_languages: settings.supportedLanguages,
          default_og_image: settings.defaultOgImage,
          gtm_container_id: settings.gtmContainerId,
          ga4_measurement_id: settings.ga4MeasurementId,
          meta_pixel_id: settings.metaPixelId,
          clarity_project_id: settings.clarityProjectId,
          sitemap_auto_update: settings.autoSitemapUpdate,
          enable_schema_markup: settings.enableSchemaMarkup,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'workspace_id' });

      if (error) throw error;
      toast.success("Configurações guardadas com sucesso");
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error("Erro ao guardar configurações");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* General Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Configurações Gerais
          </CardTitle>
          <CardDescription>
            Definições base para todas as páginas SEO
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="baseUrl">URL Base do Site</Label>
              <Input
                id="baseUrl"
                value={settings.baseUrl}
                onChange={(e) => setSettings((s) => ({ ...s, baseUrl: e.target.value }))}
                placeholder="https://example.com"
              />
              <p className="text-xs text-muted-foreground">
                URL base usado para gerar links canónicos e sitemap
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="defaultLanguage">Idioma Padrão</Label>
              <Select
                value={settings.defaultLanguage}
                onValueChange={(v) => setSettings((s) => ({ ...s, defaultLanguage: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {languages.map((lang) => (
                    <SelectItem key={lang.code} value={lang.code}>
                      {lang.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Idiomas Suportados</Label>
            <div className="flex flex-wrap gap-2">
              {languages.map((lang) => (
                <Badge
                  key={lang.code}
                  variant={settings.supportedLanguages.includes(lang.code) ? "default" : "outline"}
                  className="cursor-pointer"
                  onClick={() => {
                    setSettings((s) => ({
                      ...s,
                      supportedLanguages: s.supportedLanguages.includes(lang.code)
                        ? s.supportedLanguages.filter((l) => l !== lang.code)
                        : [...s.supportedLanguages, lang.code],
                    }));
                  }}
                >
                  {lang.label}
                </Badge>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Media Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Image className="h-5 w-5" />
            Imagens & Media
          </CardTitle>
          <CardDescription>
            Configurações de imagens para partilha social
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="defaultOgImage">Imagem OG Padrão</Label>
            <Input
              id="defaultOgImage"
              value={settings.defaultOgImage}
              onChange={(e) => setSettings((s) => ({ ...s, defaultOgImage: e.target.value }))}
              placeholder="https://example.com/og-image.jpg"
            />
            <p className="text-xs text-muted-foreground">
              Imagem usada quando uma página não tem imagem específica (1200x630px recomendado)
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Tracking Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Code className="h-5 w-5" />
            Tracking & Analytics
          </CardTitle>
          <CardDescription>
            Integração com ferramentas de análise
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="gtmContainerId">GTM Container ID</Label>
              <Input
                id="gtmContainerId"
                value={settings.gtmContainerId}
                onChange={(e) => setSettings((s) => ({ ...s, gtmContainerId: e.target.value }))}
                placeholder="GTM-XXXXXXX"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="ga4MeasurementId">GA4 Measurement ID</Label>
              <Input
                id="ga4MeasurementId"
                value={settings.ga4MeasurementId}
                onChange={(e) => setSettings((s) => ({ ...s, ga4MeasurementId: e.target.value }))}
                placeholder="G-XXXXXXXXXX"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="metaPixelId">Meta Pixel ID</Label>
              <Input
                id="metaPixelId"
                value={settings.metaPixelId}
                onChange={(e) => setSettings((s) => ({ ...s, metaPixelId: e.target.value }))}
                placeholder="XXXXXXXXXXXXXXX"
              />
              <p className="text-xs text-muted-foreground">
                ID do pixel Meta/Facebook para tracking de conversões
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="clarityProjectId">Microsoft Clarity ID</Label>
              <Input
                id="clarityProjectId"
                value={settings.clarityProjectId}
                onChange={(e) => setSettings((s) => ({ ...s, clarityProjectId: e.target.value }))}
                placeholder="xxxxxxxxxx"
              />
              <p className="text-xs text-muted-foreground">
                ID do projeto Clarity para heatmaps e recordings
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Advanced Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5" />
            Opções Avançadas
          </CardTitle>
          <CardDescription>
            Configurações automáticas e schema markup
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Atualização Automática do Sitemap</Label>
              <p className="text-sm text-muted-foreground">
                Regenerar sitemap quando conteúdo for publicado
              </p>
            </div>
            <Switch
              checked={settings.autoSitemapUpdate}
              onCheckedChange={(checked) =>
                setSettings((s) => ({ ...s, autoSitemapUpdate: checked }))
              }
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Schema Markup Automático</Label>
              <p className="text-sm text-muted-foreground">
                Gerar JSON-LD automaticamente para todas as páginas
              </p>
            </div>
            <Switch
              checked={settings.enableSchemaMarkup}
              onCheckedChange={(checked) =>
                setSettings((s) => ({ ...s, enableSchemaMarkup: checked }))
              }
            />
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving ? (
            <>
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              A guardar...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              Guardar Configurações
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
