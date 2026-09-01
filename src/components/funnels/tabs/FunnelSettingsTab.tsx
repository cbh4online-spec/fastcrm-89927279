import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useFunnel, useFunnelSteps, useUpdateFunnel } from "@/hooks/useFunnels";
import { Save, Shield, Search, Eye } from "lucide-react";
import { runFunnelPreflight, type PreflightResult } from "@/utils/funnelPreflight";
import { FunnelPreflightDialog } from "@/components/funnels/FunnelPreflightDialog";
import { normalizeFunnelPublicPath } from "@/utils/funnelPath";
import { toast } from "sonner";

interface FunnelSettingsTabProps {
  funnelId: string;
}

export function FunnelSettingsTab({ funnelId }: FunnelSettingsTabProps) {
  const { data: funnel } = useFunnel(funnelId);
  const { data: steps = [] } = useFunnelSteps(funnelId);
  const updateFunnel = useUpdateFunnel();

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [domain, setDomain] = useState("");
  const [path, setPath] = useState("");
  const [faviconUrl, setFaviconUrl] = useState("");
  const [headCode, setHeadCode] = useState("");
  const [bodyCode, setBodyCode] = useState("");
  const [isPublished, setIsPublished] = useState(false);

  // SEO
  const [seoTitle, setSeoTitle] = useState("");
  const [seoDescription, setSeoDescription] = useState("");
  const [ogImageUrl, setOgImageUrl] = useState("");
  const [canonicalUrl, setCanonicalUrl] = useState("");
  const [noindex, setNoindex] = useState(false);

  // Consent
  const [consentRequired, setConsentRequired] = useState(false);
  const [consentText, setConsentText] = useState("");
  const [consentTextVersion, setConsentTextVersion] = useState("");
  const [privacyPolicyUrl, setPrivacyPolicyUrl] = useState("");
  const [marketingOptInEnabled, setMarketingOptInEnabled] = useState(false);
  const [marketingOptInLabel, setMarketingOptInLabel] = useState("");

  // Preflight
  const [preflightOpen, setPreflightOpen] = useState(false);
  const [preflightResult, setPreflightResult] = useState<PreflightResult | null>(null);

  useEffect(() => {
    if (funnel) {
      setName(funnel.name);
      setSlug(funnel.slug);
      setDomain((funnel as any).domain || "");
      setPath((funnel as any).path || `/${funnel.slug}`);
      setFaviconUrl((funnel as any).favicon_url || "");
      setHeadCode((funnel as any).head_tracking_code || "");
      setBodyCode((funnel as any).body_tracking_code || "");
      setIsPublished((funnel as any).is_published || false);
      setSeoTitle((funnel as any).seo_title || "");
      setSeoDescription((funnel as any).seo_description || "");
      setOgImageUrl((funnel as any).og_image_url || "");
      setCanonicalUrl((funnel as any).canonical_url || "");
      setNoindex((funnel as any).noindex || false);
      setConsentRequired((funnel as any).consent_required || false);
      setConsentText((funnel as any).consent_text || "");
      setConsentTextVersion((funnel as any).consent_text_version || "");
      setPrivacyPolicyUrl((funnel as any).privacy_policy_url || "");
      setMarketingOptInEnabled((funnel as any).marketing_opt_in_enabled || false);
      setMarketingOptInLabel((funnel as any).marketing_opt_in_label || "");
    }
  }, [funnel]);

  const handleSave = () => {
    const publicPath = normalizeFunnelPublicPath(path);
    if (!publicPath) {
      toast.error("Path inválido. Use apenas um nome com pelo menos 3 caracteres.");
      return;
    }

    setSlug(publicPath.slug);
    setPath(publicPath.path);

    updateFunnel.mutate({
      id: funnelId,
      name,
      slug: publicPath.slug,
      domain: domain || null,
      path: publicPath.path,
      favicon_url: faviconUrl || null,
      head_tracking_code: headCode || null,
      body_tracking_code: bodyCode || null,
      is_published: isPublished,
      published_at: isPublished ? new Date().toISOString() : null,
      seo_title: seoTitle || null,
      seo_description: seoDescription || null,
      og_image_url: ogImageUrl || null,
      canonical_url: canonicalUrl || null,
      noindex,
      consent_required: consentRequired,
      consent_text: consentText || null,
      consent_text_version: consentTextVersion || null,
      privacy_policy_url: privacyPolicyUrl || null,
      marketing_opt_in_enabled: marketingOptInEnabled,
      marketing_opt_in_label: marketingOptInLabel || null,
    } as any);
  };

  const handlePreflight = () => {
    const result = runFunnelPreflight(
      {
        slug,
        consent_required: consentRequired,
        consent_text: consentText,
        privacy_policy_url: privacyPolicyUrl,
        seo_title: seoTitle,
        seo_description: seoDescription,
        og_image_url: ogImageUrl,
      },
      steps.map(s => ({
        id: s.id,
        name: s.name,
        step_type: s.step_type,
        sort_order: s.sort_order,
        content: s.content as Record<string, unknown>,
      }))
    );
    setPreflightResult(result);
    setPreflightOpen(true);
  };

  const handlePreflightPublish = () => {
    setIsPublished(true);
    setPreflightOpen(false);
    updateFunnel.mutate({
      id: funnelId,
      is_published: true,
      published_at: new Date().toISOString(),
    } as any);
  };

  if (!funnel) return null;

  return (
    <div className="space-y-6 max-w-4xl">
      {/* General */}
      <Card>
        <CardHeader><CardTitle className="text-sm">Geral</CardTitle></CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-2 gap-6">
            <div>
              <Label>Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div>
              <Label>Domain</Label>
              <Input value={domain} onChange={(e) => setDomain(e.target.value)} placeholder="Selecionar domínio" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-6">
            <div>
              <Label>Path</Label>
              <Input value={path} onChange={(e) => setPath(e.target.value)} />
            </div>
            <div>
              <Label>Favicon URL</Label>
              <Input value={faviconUrl} onChange={(e) => setFaviconUrl(e.target.value)} placeholder="URL do favicon" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* SEO */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Search className="h-4 w-4" /> SEO & Open Graph
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-6">
            <div>
              <Label>SEO Title</Label>
              <Input value={seoTitle} onChange={(e) => setSeoTitle(e.target.value)} placeholder={name || "Título para motores de busca"} />
              <p className="text-xs text-muted-foreground mt-1">{seoTitle.length}/60 caracteres</p>
            </div>
            <div>
              <Label>OG Image URL</Label>
              <Input value={ogImageUrl} onChange={(e) => setOgImageUrl(e.target.value)} placeholder="URL da imagem para partilha" />
            </div>
          </div>
          <div>
            <Label>SEO Description</Label>
            <Textarea value={seoDescription} onChange={(e) => setSeoDescription(e.target.value)} rows={2} placeholder="Descrição para motores de busca" />
            <p className="text-xs text-muted-foreground mt-1">{seoDescription.length}/160 caracteres</p>
          </div>
          <div className="grid grid-cols-2 gap-6">
            <div>
              <Label>Canonical URL</Label>
              <Input value={canonicalUrl} onChange={(e) => setCanonicalUrl(e.target.value)} placeholder="https://..." />
            </div>
            <div className="flex items-center justify-between border rounded-lg p-4">
              <div>
                <Label className="font-medium">Noindex</Label>
                <p className="text-xs text-muted-foreground mt-1">Impedir indexação por motores de busca</p>
              </div>
              <Switch checked={noindex} onCheckedChange={setNoindex} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Consent & Compliance */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Shield className="h-4 w-4" /> Consentimento & Compliance
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between border rounded-lg p-4">
            <div>
              <Label className="font-medium">Consentimento obrigatório</Label>
              <p className="text-xs text-muted-foreground mt-1">Exigir aceitação dos termos antes de submeter formulários</p>
            </div>
            <Switch checked={consentRequired} onCheckedChange={setConsentRequired} />
          </div>
          {consentRequired && (
            <>
              <div>
                <Label>Texto de consentimento</Label>
                <Textarea value={consentText} onChange={(e) => setConsentText(e.target.value)} rows={2} placeholder="Aceito os termos e condições e a política de privacidade..." />
              </div>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <Label>Versão do texto</Label>
                  <Input value={consentTextVersion} onChange={(e) => setConsentTextVersion(e.target.value)} placeholder="v1.0" />
                </div>
                <div>
                  <Label>URL Política de Privacidade</Label>
                  <Input value={privacyPolicyUrl} onChange={(e) => setPrivacyPolicyUrl(e.target.value)} placeholder="https://..." />
                </div>
              </div>
            </>
          )}
          <div className="flex items-center justify-between border rounded-lg p-4">
            <div>
              <Label className="font-medium">Marketing opt-in</Label>
              <p className="text-xs text-muted-foreground mt-1">Mostrar checkbox de opt-in de marketing nos formulários</p>
            </div>
            <Switch checked={marketingOptInEnabled} onCheckedChange={setMarketingOptInEnabled} />
          </div>
          {marketingOptInEnabled && (
            <div>
              <Label>Label do opt-in marketing</Label>
              <Input value={marketingOptInLabel} onChange={(e) => setMarketingOptInLabel(e.target.value)} placeholder="Aceito receber comunicações de marketing" />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tracking */}
      <Card>
        <CardHeader><CardTitle className="text-sm">Tracking</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-6">
            <div>
              <Label>Head tracking code</Label>
              <Textarea value={headCode} onChange={(e) => setHeadCode(e.target.value)} rows={4} placeholder="Código de tracking para o head" />
              <p className="text-xs text-muted-foreground mt-1">Código global para o tag head do funil</p>
            </div>
            <div>
              <Label>Body tracking code</Label>
              <Textarea value={bodyCode} onChange={(e) => setBodyCode(e.target.value)} rows={4} placeholder="Código de tracking para o body" />
              <p className="text-xs text-muted-foreground mt-1">Código global para o tag body do funil</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Publish */}
      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="flex items-center justify-between border rounded-lg p-4">
            <div>
              <Label className="font-medium">Publicado</Label>
              <p className="text-xs text-muted-foreground mt-1">Tornar o funil acessível publicamente</p>
            </div>
            <Switch checked={isPublished} onCheckedChange={setIsPublished} />
          </div>

          <div className="flex gap-3">
            <Button variant="outline" onClick={handlePreflight}>
              <Eye className="h-4 w-4 mr-2" />
              Verificar antes de publicar
            </Button>
            <Button onClick={handleSave} disabled={updateFunnel.isPending}>
              <Save className="h-4 w-4 mr-2" />
              Guardar Settings
            </Button>
          </div>
        </CardContent>
      </Card>

      <FunnelPreflightDialog
        open={preflightOpen}
        onOpenChange={setPreflightOpen}
        result={preflightResult}
        onConfirmPublish={handlePreflightPublish}
        isPending={updateFunnel.isPending}
      />
    </div>
  );
}
