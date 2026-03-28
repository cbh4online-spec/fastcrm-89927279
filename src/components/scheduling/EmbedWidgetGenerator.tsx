import { useState } from 'react';
import { Copy, Code, QrCode, ExternalLink, Check } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { useBookingPages } from '@/hooks/useBookingPages';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { getPublicBaseUrl } from '@/utils/getPublicDomain';
import QRCode from 'react-qr-code';

export function EmbedWidgetGenerator() {
  const { data: pages = [], isLoading } = useBookingPages();
  const { currentWorkspace } = useWorkspace();
  const [selectedPageId, setSelectedPageId] = useState<string>('');
  const [embedHeight, setEmbedHeight] = useState('700');
  const [copied, setCopied] = useState<string | null>(null);

  const selectedPage = pages.find(p => p.id === selectedPageId);
  const wsSlug = currentWorkspace?.slug || 'workspace';
  const base = getPublicBaseUrl();
  const publicUrl = selectedPage ? `${base}/${wsSlug}/book/${selectedPage.slug}` : '';

  const iframeCode = `<iframe
  src="${publicUrl}"
  width="100%"
  height="${embedHeight}px"
  frameborder="0"
  style="border: none; border-radius: 12px; max-width: 560px;"
  title="Agendar reunião - ${selectedPage?.title || ''}"
></iframe>`;

  const scriptCode = `<div id="booking-widget-${selectedPage?.slug || 'widget'}"></div>
<script>
(function() {
  var container = document.getElementById('booking-widget-${selectedPage?.slug || 'widget'}');
  var iframe = document.createElement('iframe');
  iframe.src = '${publicUrl}?embed=true';
  iframe.style.cssText = 'width:100%;height:${embedHeight}px;border:none;border-radius:12px;max-width:560px;';
  iframe.title = 'Agendar reunião';
  container.appendChild(iframe);
})();
</script>`;

  const popupCode = `<a href="${publicUrl}" target="_blank" rel="noopener noreferrer"
  style="display:inline-flex;align-items:center;gap:8px;padding:12px 24px;background:${selectedPage?.brand_color || '#6366f1'};color:white;border-radius:8px;text-decoration:none;font-family:sans-serif;font-weight:600;font-size:14px;">
  📅 Agendar Reunião
</a>`;

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    toast.success('Código copiado!');
    setTimeout(() => setCopied(null), 2000);
  };

  if (isLoading) {
    return <div className="flex justify-center py-12 text-muted-foreground">A carregar...</div>;
  }

  return (
    <div className="space-y-6 p-4">
      <div>
        <h3 className="text-lg font-semibold">Widget & QR Code</h3>
        <p className="text-sm text-muted-foreground">Incorpore o seu link de agendamento em qualquer site ou gere um QR code</p>
      </div>

      {pages.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-muted-foreground">Crie primeiro um link de agendamento na tab "Links"</p>
        </Card>
      ) : (
        <>
          {/* Page Selector */}
          <Card className="p-4">
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-end">
              <div className="flex-1 space-y-2">
                <Label>Link de Agendamento</Label>
                <Select value={selectedPageId} onValueChange={setSelectedPageId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecionar link..." />
                  </SelectTrigger>
                  <SelectContent>
                    {pages.map(page => (
                      <SelectItem key={page.id} value={page.id}>
                        <div className="flex items-center gap-2">
                          <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: page.brand_color }} />
                          {page.title}
                          {!page.is_active && <Badge variant="secondary" className="text-[10px] ml-1">Inativo</Badge>}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Altura (px)</Label>
                <Input
                  type="number"
                  value={embedHeight}
                  onChange={e => setEmbedHeight(e.target.value)}
                  min={400}
                  max={1200}
                  className="w-24"
                />
              </div>
            </div>
          </Card>

          {selectedPage && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Embed Codes */}
              <div className="lg:col-span-2 space-y-4">
                <Tabs defaultValue="iframe">
                  <TabsList className="w-full">
                    <TabsTrigger value="iframe" className="flex-1 gap-1.5">
                      <Code className="h-3.5 w-3.5" />
                      iFrame
                    </TabsTrigger>
                    <TabsTrigger value="script" className="flex-1 gap-1.5">
                      <Code className="h-3.5 w-3.5" />
                      Script
                    </TabsTrigger>
                    <TabsTrigger value="popup" className="flex-1 gap-1.5">
                      <ExternalLink className="h-3.5 w-3.5" />
                      Botão
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="iframe">
                    <CodeBlock
                      code={iframeCode}
                      label="iframe"
                      description="Cole este código HTML na página onde quer mostrar o widget de agendamento."
                      copied={copied === 'iframe'}
                      onCopy={() => copyToClipboard(iframeCode, 'iframe')}
                    />
                  </TabsContent>

                  <TabsContent value="script">
                    <CodeBlock
                      code={scriptCode}
                      label="script"
                      description="Use este script para inserção dinâmica — ideal para SPAs e sites com lazy loading."
                      copied={copied === 'script'}
                      onCopy={() => copyToClipboard(scriptCode, 'script')}
                    />
                  </TabsContent>

                  <TabsContent value="popup">
                    <CodeBlock
                      code={popupCode}
                      label="popup"
                      description="Um botão de call-to-action que abre o agendamento numa nova janela."
                      copied={copied === 'popup'}
                      onCopy={() => copyToClipboard(popupCode, 'popup')}
                    />
                    <div className="mt-4 flex justify-center">
                      <a
                        href={publicUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-6 py-3 rounded-lg text-white font-semibold text-sm"
                        style={{ backgroundColor: selectedPage.brand_color }}
                      >
                        📅 Agendar Reunião
                      </a>
                    </div>
                  </TabsContent>
                </Tabs>
              </div>

              {/* QR Code */}
              <Card className="p-6 flex flex-col items-center gap-4">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <QrCode className="h-4 w-4 text-muted-foreground" />
                  QR Code
                </div>
                <div className="bg-white p-4 rounded-xl">
                  <QRCode
                    value={publicUrl}
                    size={180}
                    level="M"
                    fgColor={selectedPage.brand_color}
                  />
                </div>
                <p className="text-xs text-muted-foreground text-center">
                  Imprima este QR code em materiais de marketing, cartões de visita ou expositores.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  onClick={() => {
                    const svg = document.querySelector('.bg-white.p-4.rounded-xl svg');
                    if (!svg) return;
                    const serializer = new XMLSerializer();
                    const svgStr = serializer.serializeToString(svg);
                    const blob = new Blob([svgStr], { type: 'image/svg+xml' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `qr-${selectedPage.slug}.svg`;
                    a.click();
                    URL.revokeObjectURL(url);
                    toast.success('QR Code descarregado!');
                  }}
                >
                  Descarregar SVG
                </Button>
                <div className="text-[10px] text-muted-foreground break-all text-center px-2">
                  {publicUrl}
                </div>
              </Card>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function CodeBlock({
  code,
  label,
  description,
  copied,
  onCopy,
}: {
  code: string;
  label: string;
  description: string;
  copied: boolean;
  onCopy: () => void;
}) {
  return (
    <Card className="p-4 space-y-3">
      <p className="text-xs text-muted-foreground">{description}</p>
      <div className="relative">
        <pre className="bg-muted/50 rounded-lg p-4 text-xs overflow-x-auto font-mono text-foreground/80 leading-relaxed">
          {code}
        </pre>
        <Button
          variant="outline"
          size="sm"
          className="absolute top-2 right-2 gap-1.5"
          onClick={onCopy}
        >
          {copied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
          {copied ? 'Copiado' : 'Copiar'}
        </Button>
      </div>
    </Card>
  );
}
