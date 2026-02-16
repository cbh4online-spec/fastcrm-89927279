import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useFunnel, useUpdateFunnel } from "@/hooks/useFunnels";
import { Save } from "lucide-react";

interface FunnelSettingsTabProps {
  funnelId: string;
}

export function FunnelSettingsTab({ funnelId }: FunnelSettingsTabProps) {
  const { data: funnel } = useFunnel(funnelId);
  const updateFunnel = useUpdateFunnel();

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [domain, setDomain] = useState("");
  const [path, setPath] = useState("");
  const [faviconUrl, setFaviconUrl] = useState("");
  const [headCode, setHeadCode] = useState("");
  const [bodyCode, setBodyCode] = useState("");
  const [isPublished, setIsPublished] = useState(false);

  useEffect(() => {
    if (funnel) {
      setName(funnel.name);
      setSlug(funnel.slug);
      setDomain(funnel.domain || "");
      setPath(funnel.path || `/${funnel.slug}`);
      setFaviconUrl(funnel.favicon_url || "");
      setHeadCode(funnel.head_tracking_code || "");
      setBodyCode(funnel.body_tracking_code || "");
      setIsPublished(funnel.is_published || false);
    }
  }, [funnel]);

  const handleSave = () => {
    updateFunnel.mutate({
      id: funnelId,
      name,
      slug,
      domain: domain || null,
      path: path || null,
      favicon_url: faviconUrl || null,
      head_tracking_code: headCode || null,
      body_tracking_code: bodyCode || null,
      is_published: isPublished,
      published_at: isPublished ? new Date().toISOString() : null,
    });
  };

  if (!funnel) return null;

  return (
    <div className="space-y-6 max-w-4xl">
      <Card>
        <CardContent className="pt-6 space-y-6">
          {/* Name & Domain */}
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

          {/* Path & Favicon */}
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

          {/* Tracking codes */}
          <div className="grid grid-cols-2 gap-6">
            <div>
              <Label>Head tracking code</Label>
              <Textarea
                value={headCode}
                onChange={(e) => setHeadCode(e.target.value)}
                rows={4}
                placeholder="Código de tracking para o head"
              />
              <p className="text-xs text-muted-foreground mt-1">Código global para o tag head do funil</p>
            </div>
            <div>
              <Label>Body tracking code</Label>
              <Textarea
                value={bodyCode}
                onChange={(e) => setBodyCode(e.target.value)}
                rows={4}
                placeholder="Código de tracking para o body"
              />
              <p className="text-xs text-muted-foreground mt-1">Código global para o tag body do funil</p>
            </div>
          </div>

          {/* Toggles */}
          <div className="grid grid-cols-2 gap-6">
            <div className="flex items-center justify-between border rounded-lg p-4">
              <div>
                <Label className="font-medium">Publicado</Label>
                <p className="text-xs text-muted-foreground mt-1">Tornar o funil acessível publicamente</p>
              </div>
              <Switch checked={isPublished} onCheckedChange={setIsPublished} />
            </div>
          </div>

          <Button onClick={handleSave} disabled={updateFunnel.isPending}>
            <Save className="h-4 w-4 mr-2" />
            Guardar Settings
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
