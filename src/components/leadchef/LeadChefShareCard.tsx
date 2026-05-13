import { useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Copy, ExternalLink, Mail, MessageCircle, QrCode, Share2 } from "lucide-react";
import { toast } from "sonner";

interface Props {
  url: string;
  title?: string;
  description?: string;
  message?: string;
  className?: string;
  compact?: boolean;
}

const FacebookIcon = () => (
  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden>
    <path d="M22 12a10 10 0 1 0-11.5 9.9v-7H8v-3h2.5V9.7c0-2.5 1.5-3.9 3.7-3.9 1.1 0 2.2.2 2.2.2v2.5h-1.3c-1.2 0-1.6.8-1.6 1.6V12H16l-.4 3h-2.1v7A10 10 0 0 0 22 12Z" />
  </svg>
);
const MessengerIcon = () => (
  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden>
    <path d="M12 2C6.5 2 2 6.1 2 11.2c0 2.9 1.4 5.4 3.7 7.1V22l3.4-1.9c.9.3 1.9.4 2.9.4 5.5 0 10-4.1 10-9.3S17.5 2 12 2Zm1 12.5-2.5-2.7L5.7 14.5l5.3-5.6 2.6 2.7 4.7-2.7-5.3 5.6Z" />
  </svg>
);
const WhatsAppIcon = () => (
  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden>
    <path d="M20.5 3.5A11 11 0 0 0 3.6 17.1L2 22l5.1-1.6a11 11 0 0 0 13.4-16.9ZM12 20.1c-1.7 0-3.4-.5-4.8-1.3l-.3-.2-3 .9.9-3-.2-.3a8.9 8.9 0 1 1 7.4 4Zm5-6.7c-.3-.1-1.6-.8-1.9-.9-.3-.1-.4-.1-.6.1-.2.3-.7.9-.9 1.1-.2.2-.3.2-.6.1-.3-.1-1.2-.5-2.4-1.4-.9-.8-1.5-1.7-1.6-2-.2-.3 0-.5.1-.6l.4-.5c.1-.1.2-.3.3-.4.1-.2.1-.3 0-.5l-.9-2c-.2-.5-.4-.5-.6-.5h-.5c-.2 0-.5.1-.7.3-.3.3-.9.9-.9 2.1 0 1.3.9 2.5 1.1 2.7.1.2 1.9 2.9 4.6 4 .6.3 1.1.4 1.5.5.6.2 1.2.2 1.6.1.5-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.1-1.2 0-.2-.2-.3-.5-.4Z" />
  </svg>
);

export function LeadChefShareCard({
  url,
  title = "Partilha a solução",
  description = "Envia o teu link em qualquer canal.",
  message,
  className,
  compact,
}: Props) {
  const [showQr, setShowQr] = useState(false);

  const shareText = useMemo(() => message ?? "Conhece o LeadChef:", [message]);
  const enc = encodeURIComponent;
  const safeUrl = url || "";

  const links = useMemo(
    () => ({
      whatsapp: `https://wa.me/?text=${enc(`${shareText} ${safeUrl}`)}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${enc(safeUrl)}`,
      messenger: `https://www.facebook.com/dialog/send?app_id=140586622674265&link=${enc(safeUrl)}&redirect_uri=${enc(safeUrl)}`,
      email: `mailto:?subject=${enc("LeadChef")}&body=${enc(`${shareText}\n\n${safeUrl}`)}`,
    }),
    [safeUrl, shareText],
  );

  const qrSrc = useMemo(
    () =>
      `https://api.qrserver.com/v1/create-qr-code/?size=240x240&margin=8&data=${enc(safeUrl)}`,
    [safeUrl],
  );

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(safeUrl);
      toast.success("Link copiado!");
    } catch {
      toast.error("Não foi possível copiar.");
    }
  };

  const onNativeShare = async () => {
    if (typeof navigator !== "undefined" && (navigator as any).share) {
      try {
        await (navigator as any).share({ title, text: shareText, url: safeUrl });
      } catch {
        /* utilizador cancelou */
      }
    } else {
      onCopy();
    }
  };

  return (
    <Card className={className}>
      <CardHeader className={compact ? "pb-2" : undefined}>
        <CardTitle className="text-base flex items-center gap-2">
          <Share2 className="h-4 w-4 text-emerald-600" /> {title}
        </CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input readOnly value={safeUrl} aria-label="Link de partilha" />
          <div className="flex gap-2">
            <Button onClick={onCopy} variant="outline" className="gap-2">
              <Copy className="h-4 w-4" /> Copiar
            </Button>
            <a href={safeUrl} target="_blank" rel="noreferrer" aria-label="Abrir link">
              <Button variant="ghost" size="icon"><ExternalLink className="h-4 w-4" /></Button>
            </a>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
          <a href={links.whatsapp} target="_blank" rel="noreferrer">
            <Button variant="outline" className="w-full gap-2 bg-[#25D366]/5 hover:bg-[#25D366]/10 border-[#25D366]/30 text-[#128C7E]">
              <WhatsAppIcon /> WhatsApp
            </Button>
          </a>
          <a href={links.facebook} target="_blank" rel="noreferrer">
            <Button variant="outline" className="w-full gap-2 bg-[#1877F2]/5 hover:bg-[#1877F2]/10 border-[#1877F2]/30 text-[#1877F2]">
              <FacebookIcon /> Facebook
            </Button>
          </a>
          <a href={links.messenger} target="_blank" rel="noreferrer">
            <Button variant="outline" className="w-full gap-2 bg-[#0084FF]/5 hover:bg-[#0084FF]/10 border-[#0084FF]/30 text-[#0084FF]">
              <MessengerIcon /> Messenger
            </Button>
          </a>
          <a href={links.email}>
            <Button variant="outline" className="w-full gap-2">
              <Mail className="h-4 w-4" /> Email
            </Button>
          </a>
          <Button variant="outline" className="w-full gap-2" onClick={() => setShowQr((s) => !s)}>
            <QrCode className="h-4 w-4" /> QR Code
          </Button>
        </div>

        {showQr && safeUrl && (
          <div className="rounded-lg border bg-muted/30 p-4 flex flex-col items-center gap-2">
            <img
              src={qrSrc}
              alt="QR Code do link de partilha"
              width={240}
              height={240}
              className="rounded bg-white p-2"
              loading="lazy"
            />
            <p className="text-xs text-muted-foreground">Aponta a câmara para abrir o link.</p>
            <a href={qrSrc} download="leadchef-qr.png">
              <Button variant="ghost" size="sm">Descarregar PNG</Button>
            </a>
          </div>
        )}

        {typeof navigator !== "undefined" && (navigator as any).share && (
          <Button variant="ghost" size="sm" className="w-full gap-2" onClick={onNativeShare}>
            <MessageCircle className="h-4 w-4" /> Partilhar via app do dispositivo
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
