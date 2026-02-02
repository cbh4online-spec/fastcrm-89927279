import { useState, useRef } from "react";
import QRCode from "react-qr-code";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Link as LinkIcon, 
  QrCode, 
  Mail, 
  Copy, 
  Check, 
  Download, 
  Printer,
  Key,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";

interface InviteLinkDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientName: string;
  clientEmail: string;
  inviteUrl: string;
  temporaryPassword?: string;
  onSendEmail: () => Promise<void>;
  emailSending?: boolean;
  emailSent: boolean;
}

export function InviteLinkDialog({
  open,
  onOpenChange,
  clientName,
  clientEmail,
  inviteUrl,
  temporaryPassword,
  onSendEmail,
  emailSending = false,
  emailSent,
}: InviteLinkDialogProps) {
  const [copied, setCopied] = useState(false);
  const [copiedPassword, setCopiedPassword] = useState(false);
  const qrRef = useRef<HTMLDivElement>(null);

  const copyToClipboard = async () => {
    await navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    toast.success("Link copiado!");
    setTimeout(() => setCopied(false), 2000);
  };

  const copyPasswordToClipboard = async () => {
    if (!temporaryPassword) return;
    await navigator.clipboard.writeText(temporaryPassword);
    setCopiedPassword(true);
    toast.success("Palavra-passe copiada!");
    setTimeout(() => setCopiedPassword(false), 2000);
  };

  const downloadQRCode = () => {
    const svg = qrRef.current?.querySelector("svg");
    if (!svg) return;

    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const img = new Image();

    img.onload = () => {
      canvas.width = 300;
      canvas.height = 300;
      if (ctx) {
        ctx.fillStyle = "white";
        ctx.fillRect(0, 0, 300, 300);
        ctx.drawImage(img, 50, 50, 200, 200);
      }

      const pngFile = canvas.toDataURL("image/png");
      const downloadLink = document.createElement("a");
      downloadLink.download = `convite-${clientName.replace(/\s+/g, "-").toLowerCase()}.png`;
      downloadLink.href = pngFile;
      downloadLink.click();
    };

    img.src = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svgData)));
  };

  const handlePrint = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const svg = qrRef.current?.querySelector("svg");
    const svgString = svg ? new XMLSerializer().serializeToString(svg) : "";

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Convite - ${clientName}</title>
          <style>
            body {
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              min-height: 100vh;
              margin: 0;
              font-family: system-ui, sans-serif;
            }
            .container {
              text-align: center;
              padding: 2rem;
            }
            .qr-code {
              margin: 2rem 0;
            }
            .qr-code svg {
              width: 200px;
              height: 200px;
            }
            .info {
              margin-top: 1rem;
              color: #666;
              font-size: 0.875rem;
            }
            .password {
              margin-top: 1rem;
              padding: 0.5rem 1rem;
              background: #f3f4f6;
              border-radius: 0.375rem;
              font-family: monospace;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <h2>Convite para Portal de Clientes</h2>
            <p>Olá <strong>${clientName}</strong>,</p>
            <p>Leia o código QR para aceder ao portal:</p>
            <div class="qr-code">${svgString}</div>
            ${temporaryPassword ? `
              <p>Palavra-passe temporária:</p>
              <div class="password">${temporaryPassword}</div>
            ` : ""}
            <div class="info">
              <p>Ou aceda através do link:</p>
              <p style="word-break: break-all;">${inviteUrl}</p>
            </div>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Check className="h-5 w-5 text-green-600" />
            Cliente Criado com Sucesso
          </DialogTitle>
          <DialogDescription>
            <strong>{clientName}</strong> foi adicionado. Escolha como enviar o convite.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="link" className="mt-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="link" className="gap-1.5">
              <LinkIcon className="h-4 w-4" />
              <span className="hidden sm:inline">Link</span>
            </TabsTrigger>
            <TabsTrigger value="qr" className="gap-1.5">
              <QrCode className="h-4 w-4" />
              <span className="hidden sm:inline">QR Code</span>
            </TabsTrigger>
            <TabsTrigger value="email" className="gap-1.5">
              <Mail className="h-4 w-4" />
              <span className="hidden sm:inline">Email</span>
            </TabsTrigger>
          </TabsList>

          {/* Tab: Link */}
          <TabsContent value="link" className="space-y-4 mt-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Link de Convite</label>
              <div className="flex gap-2">
                <Input 
                  value={inviteUrl} 
                  readOnly 
                  className="font-mono text-xs flex-1" 
                />
                <Button onClick={copyToClipboard} variant="outline" size="icon">
                  {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            {temporaryPassword && (
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-1.5">
                  <Key className="h-3.5 w-3.5" />
                  Palavra-passe Temporária
                </label>
                <div className="flex gap-2">
                  <Input 
                    value={temporaryPassword} 
                    readOnly 
                    className="font-mono text-sm flex-1" 
                  />
                  <Button onClick={copyPasswordToClipboard} variant="outline" size="icon">
                    {copiedPassword ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            )}

            <Alert>
              <AlertDescription className="text-xs">
                Copie o link e envie via WhatsApp, SMS ou outro canal. O cliente
                deverá definir uma nova palavra-passe no primeiro acesso.
              </AlertDescription>
            </Alert>
          </TabsContent>

          {/* Tab: QR Code */}
          <TabsContent value="qr" className="space-y-4 mt-4">
            <div ref={qrRef} className="flex justify-center p-6 bg-white rounded-lg border">
              <QRCode
                value={inviteUrl}
                size={180}
                level="M"
              />
            </div>
            
            <div className="flex gap-2">
              <Button onClick={downloadQRCode} variant="outline" className="flex-1">
                <Download className="h-4 w-4 mr-2" />
                Descarregar
              </Button>
              <Button onClick={handlePrint} variant="outline" className="flex-1">
                <Printer className="h-4 w-4 mr-2" />
                Imprimir
              </Button>
            </div>

            {temporaryPassword && (
              <Alert>
                <AlertDescription className="text-xs flex items-center justify-between">
                  <span>Palavra-passe: <code className="bg-muted px-1.5 py-0.5 rounded">{temporaryPassword}</code></span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2"
                    onClick={copyPasswordToClipboard}
                  >
                    {copiedPassword ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                  </Button>
                </AlertDescription>
              </Alert>
            )}
          </TabsContent>

          {/* Tab: Email */}
          <TabsContent value="email" className="space-y-4 mt-4">
            <div className="text-sm text-muted-foreground space-y-2">
              <p>
                Enviar convite formatado com credenciais de acesso para:
              </p>
              <p className="font-medium text-foreground">
                {clientEmail}
              </p>
            </div>
            
            <Button 
              onClick={onSendEmail} 
              disabled={emailSent || emailSending}
              className="w-full"
            >
              {emailSending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  A enviar...
                </>
              ) : emailSent ? (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  Email Enviado
                </>
              ) : (
                <>
                  <Mail className="h-4 w-4 mr-2" />
                  Enviar Convite por Email
                </>
              )}
            </Button>

            {emailSent && (
              <Alert>
                <AlertDescription className="text-xs text-green-700">
                  O email de convite foi enviado com sucesso para {clientEmail}.
                </AlertDescription>
              </Alert>
            )}
          </TabsContent>
        </Tabs>

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
