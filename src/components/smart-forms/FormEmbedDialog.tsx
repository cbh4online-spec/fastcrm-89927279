import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Copy, Check, Code, ExternalLink, MessageSquareMore, Link2 } from 'lucide-react';
import { toast } from 'sonner';
import { getPublicBaseUrl } from '@/utils/getPublicDomain';
import { SmartForm } from '@/types/smartForm';
import { FormEmbedPreview } from './FormEmbedPreview';

interface FormEmbedDialogProps {
  form: SmartForm;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function FormEmbedDialog({ form, open, onOpenChange }: FormEmbedDialogProps) {
  const [iframeWidth, setIframeWidth] = useState('100%');
  const [iframeHeight, setIframeHeight] = useState('600');
  const [copied, setCopied] = useState<string | null>(null);

  const baseUrl = getPublicBaseUrl();
  const formUrl = `${baseUrl}/f/${form.slug}`;

  const iframeSnippet = `<iframe
  src="${formUrl}"
  width="${iframeWidth}"
  height="${iframeHeight}px"
  frameborder="0"
  style="border: none; border-radius: 8px;"
  title="${form.name}"
></iframe>`;

  const scriptSnippet = `<div id="fastcrm-form-${form.slug}"></div>
<script>
(function() {
  var container = document.getElementById('fastcrm-form-${form.slug}');
  var iframe = document.createElement('iframe');
  iframe.src = '${formUrl}?embed=true';
  iframe.style.cssText = 'width:100%;border:none;border-radius:8px;min-height:500px;';
  iframe.title = '${form.name}';
  container.appendChild(iframe);
  window.addEventListener('message', function(e) {
    if (e.data && e.data.type === 'fastcrm-form-resize' && e.data.formSlug === '${form.slug}') {
      iframe.style.height = e.data.height + 'px';
    }
  });
})();
</script>`;

  const popupSnippet = `<script>
(function() {
  var btn = document.createElement('button');
  btn.textContent = '${form.name}';
  btn.style.cssText = 'position:fixed;bottom:24px;right:24px;z-index:9999;padding:12px 24px;background:#6366f1;color:#fff;border:none;border-radius:24px;cursor:pointer;font-size:14px;font-weight:500;box-shadow:0 4px 12px rgba(0,0,0,0.15);';
  btn.onclick = function() {
    var overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;inset:0;z-index:10000;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;';
    var modal = document.createElement('div');
    modal.style.cssText = 'background:#fff;border-radius:12px;width:90%;max-width:600px;max-height:90vh;overflow:hidden;position:relative;';
    var close = document.createElement('button');
    close.textContent = '✕';
    close.style.cssText = 'position:absolute;top:8px;right:12px;z-index:1;background:none;border:none;font-size:20px;cursor:pointer;color:#666;';
    close.onclick = function() { overlay.remove(); };
    overlay.onclick = function(e) { if (e.target === overlay) overlay.remove(); };
    var iframe = document.createElement('iframe');
    iframe.src = '${formUrl}?embed=true';
    iframe.style.cssText = 'width:100%;height:80vh;border:none;';
    modal.appendChild(close);
    modal.appendChild(iframe);
    overlay.appendChild(modal);
    document.body.appendChild(overlay);
  };
  document.body.appendChild(btn);
})();
</script>`;

  const handleCopy = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    setCopied(type);
    toast.success('Código copiado!');
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Incorporar Formulário</DialogTitle>
          <DialogDescription>
            Escolhe como incorporar "{form.name}" no teu site
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="iframe" className="space-y-4">
          <TabsList className="grid grid-cols-4 w-full">
            <TabsTrigger value="iframe" className="gap-1.5 text-xs">
              <Code className="h-3.5 w-3.5" />
              iFrame
            </TabsTrigger>
            <TabsTrigger value="script" className="gap-1.5 text-xs">
              <Code className="h-3.5 w-3.5" />
              Script JS
            </TabsTrigger>
            <TabsTrigger value="popup" className="gap-1.5 text-xs">
              <MessageSquareMore className="h-3.5 w-3.5" />
              Popup
            </TabsTrigger>
            <TabsTrigger value="link" className="gap-1.5 text-xs">
              <Link2 className="h-3.5 w-3.5" />
              Link
            </TabsTrigger>
          </TabsList>

          {/* iFrame */}
          <TabsContent value="iframe" className="space-y-4">
            <div className="flex gap-3">
              <div className="space-y-1.5 flex-1">
                <Label className="text-xs">Largura</Label>
                <Input value={iframeWidth} onChange={(e) => setIframeWidth(e.target.value)} placeholder="100%" />
              </div>
              <div className="space-y-1.5 flex-1">
                <Label className="text-xs">Altura (px)</Label>
                <Input value={iframeHeight} onChange={(e) => setIframeHeight(e.target.value)} placeholder="600" />
              </div>
            </div>
            <Card className="bg-muted/50">
              <CardContent className="p-3">
                <pre className="text-xs overflow-x-auto whitespace-pre-wrap break-all font-mono text-muted-foreground">
                  {iframeSnippet}
                </pre>
              </CardContent>
            </Card>
            <Button onClick={() => handleCopy(iframeSnippet, 'iframe')} className="w-full gap-2">
              {copied === 'iframe' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {copied === 'iframe' ? 'Copiado!' : 'Copiar Código'}
            </Button>
            <FormEmbedPreview mode="iframe" formName={form.name} />
          </TabsContent>

          {/* Script JS */}
          <TabsContent value="script" className="space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="secondary" className="text-xs">Recomendado</Badge>
              <span className="text-xs text-muted-foreground">Adapta-se automaticamente ao container</span>
            </div>
            <Card className="bg-muted/50">
              <CardContent className="p-3">
                <pre className="text-xs overflow-x-auto whitespace-pre-wrap break-all font-mono text-muted-foreground">
                  {scriptSnippet}
                </pre>
              </CardContent>
            </Card>
            <Button onClick={() => handleCopy(scriptSnippet, 'script')} className="w-full gap-2">
              {copied === 'script' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {copied === 'script' ? 'Copiado!' : 'Copiar Código'}
            </Button>
            <FormEmbedPreview mode="script" formName={form.name} />
          </TabsContent>

          {/* Popup */}
          <TabsContent value="popup" className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Adiciona um botão flutuante que abre o formulário num popup/modal.
            </p>
            <Card className="bg-muted/50">
              <CardContent className="p-3">
                <pre className="text-xs overflow-x-auto whitespace-pre-wrap break-all font-mono text-muted-foreground">
                  {popupSnippet}
                </pre>
              </CardContent>
            </Card>
            <Button onClick={() => handleCopy(popupSnippet, 'popup')} className="w-full gap-2">
              {copied === 'popup' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {copied === 'popup' ? 'Copiado!' : 'Copiar Código'}
            </Button>
            <FormEmbedPreview mode="popup" formName={form.name} />
          </TabsContent>

          {/* Link Direto */}
          <TabsContent value="link" className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Partilha o link direto para o formulário.
            </p>
            <div className="flex gap-2">
              <Input value={formUrl} readOnly className="font-mono text-sm" />
              <Button variant="outline" onClick={() => handleCopy(formUrl, 'link')}>
                {copied === 'link' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
              <Button variant="outline" onClick={() => window.open(formUrl, '_blank')}>
                <ExternalLink className="h-4 w-4" />
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
