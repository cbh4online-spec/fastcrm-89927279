import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Save } from "lucide-react";
import { useVerticalTemplateSettings, useUpsertVerticalTemplateSettings, type VerticalTemplateSettings } from "@/hooks/useVerticalFunnelManager";
import { useUpdateVerticalTemplate } from "@/hooks/useVerticalTemplates";

interface Props {
  templateId: string;
  templateName: string;
}

export function VerticalSettingsTab({ templateId, templateName }: Props) {
  const { data: settings } = useVerticalTemplateSettings(templateId);
  const upsert = useUpsertVerticalTemplateSettings();
  const updateTemplate = useUpdateVerticalTemplate();

  const [name, setName] = useState(templateName);
  const [domain, setDomain] = useState("");
  const [path, setPath] = useState("");
  const [faviconUrl, setFaviconUrl] = useState("");
  const [headCode, setHeadCode] = useState("");
  const [bodyCode, setBodyCode] = useState("");
  const [chatWidget, setChatWidget] = useState("none");
  const [paymentLive, setPaymentLive] = useState(false);
  const [requireCard, setRequireCard] = useState(false);
  const [imageOpt, setImageOpt] = useState(true);
  const [jsOpt, setJsOpt] = useState(true);
  const [gdprFonts, setGdprFonts] = useState(false);

  useEffect(() => {
    if (settings) {
      setDomain(settings.domain || "");
      setPath(settings.path || "");
      setFaviconUrl(settings.favicon_url || "");
      setHeadCode(settings.head_tracking_code || "");
      setBodyCode(settings.body_tracking_code || "");
      setChatWidget(settings.chat_widget || "none");
      setPaymentLive(settings.payment_mode_live);
      setRequireCard(settings.require_credit_card);
      setImageOpt(settings.image_optimization);
      setJsOpt(settings.optimize_javascript);
      setGdprFonts(settings.gdpr_compliant_fonts);
    }
  }, [settings]);

  const handleSave = async () => {
    if (name !== templateName) {
      await updateTemplate.mutateAsync({ id: templateId, nome: name });
    }
    await upsert.mutateAsync({
      template_id: templateId,
      domain: domain || null,
      path: path || null,
      favicon_url: faviconUrl || null,
      head_tracking_code: headCode || null,
      body_tracking_code: bodyCode || null,
      chat_widget: chatWidget,
      payment_mode_live: paymentLive,
      require_credit_card: requireCard,
      image_optimization: imageOpt,
      optimize_javascript: jsOpt,
      gdpr_compliant_fonts: gdprFonts,
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="pt-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div>
              <Label>Domain</Label>
              <Input value={domain} onChange={(e) => setDomain(e.target.value)} placeholder="example.com" />
            </div>
            <div>
              <Label>Path</Label>
              <Input value={path} onChange={(e) => setPath(e.target.value)} placeholder="/landing" />
            </div>
            <div>
              <Label>Favicon URL</Label>
              <Input value={faviconUrl} onChange={(e) => setFaviconUrl(e.target.value)} placeholder="https://..." />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Head tracking code</Label>
              <Textarea value={headCode} onChange={(e) => setHeadCode(e.target.value)} placeholder="<script>..." rows={4} />
            </div>
            <div>
              <Label>Body tracking code</Label>
              <Textarea value={bodyCode} onChange={(e) => setBodyCode(e.target.value)} placeholder="<script>..." rows={4} />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Chat widget</Label>
              <Select value={chatWidget} onValueChange={setChatWidget}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  <SelectItem value="intercom">Intercom</SelectItem>
                  <SelectItem value="crisp">Crisp</SelectItem>
                  <SelectItem value="tawk">Tawk.to</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <Label>Payment mode live</Label>
                <p className="text-xs text-muted-foreground">Activar pagamentos reais</p>
              </div>
              <Switch checked={paymentLive} onCheckedChange={setPaymentLive} />
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <Label>Require credit card</Label>
                <p className="text-xs text-muted-foreground">Exigir cartão de crédito</p>
              </div>
              <Switch checked={requireCard} onCheckedChange={setRequireCard} />
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <Label>Image Optimization</Label>
                <p className="text-xs text-muted-foreground">Optimizar imagens automaticamente</p>
              </div>
              <Switch checked={imageOpt} onCheckedChange={setImageOpt} />
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <Label>Optimize Javascript</Label>
                <p className="text-xs text-muted-foreground">Minificar e optimizar JS</p>
              </div>
              <Switch checked={jsOpt} onCheckedChange={setJsOpt} />
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <Label>GDPR Compliant Fonts</Label>
                <p className="text-xs text-muted-foreground">Usar apenas fontes locais</p>
              </div>
              <Switch checked={gdprFonts} onCheckedChange={setGdprFonts} />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={upsert.isPending}>
          <Save className="h-4 w-4 mr-2" />
          Guardar
        </Button>
      </div>
    </div>
  );
}
