import { useRef, useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Copy, Check, Download, ExternalLink, Mail } from "lucide-react";
import QRCode from "react-qr-code";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}

function FacebookIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  );
}

interface MarketplaceShareCardProps {
  marketplaceUrl: string;
  marketplaceName?: string;
}

export function MarketplaceShareCard({ marketplaceUrl, marketplaceName }: MarketplaceShareCardProps) {
  const { t } = useTranslation('marketplace');
  const [copied, setCopied] = useState(false);
  const qrRef = useRef<HTMLDivElement>(null);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(marketplaceUrl);
      setCopied(true);
      toast.success(t('linkCopied'));
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error(t('copyError'));
    }
  }, [marketplaceUrl, t]);

  const handleDownloadQR = useCallback(() => {
    const svgEl = qrRef.current?.querySelector("svg");
    if (!svgEl) return;
    const svgData = new XMLSerializer().serializeToString(svgEl);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const img = new Image();
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx?.drawImage(img, 0, 0);
      const link = document.createElement("a");
      link.download = `qr-${marketplaceName || "marketplace"}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    };
    img.src = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svgData)));
  }, [marketplaceName]);

  const handleWhatsApp = () => {
    const text = `${marketplaceName ? `${marketplaceName} - ` : ""}${t('seeOurMarketplace')}\n${marketplaceUrl}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
  };

  const handleFacebook = () => {
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(marketplaceUrl)}`, "_blank", "width=600,height=400");
  };

  const handleEmail = () => {
    const subject = marketplaceName ? `${t('seeOurMarketplace')} - ${marketplaceName}` : t('seeOurMarketplace');
    const body = `${t('seeOurMarketplace')}\n${marketplaceUrl}`;
    window.open(`mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`);
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">{t('shareMarketplace')}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col md:flex-row gap-6">
          <div className="flex flex-col items-center gap-3">
            <div ref={qrRef} className="bg-white p-3 rounded-lg border">
              <QRCode value={marketplaceUrl} size={160} />
            </div>
            <Button variant="outline" size="sm" className="gap-2 w-full" onClick={handleDownloadQR}>
              <Download className="h-4 w-4" />
              {t('downloadQR')}
            </Button>
          </div>

          <div className="flex-1 space-y-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground mb-1.5 block">{t('marketplaceURL')}</label>
              <div className="flex items-center gap-2">
                <code className="flex-1 text-sm bg-muted px-3 py-2 rounded truncate block">{marketplaceUrl}</code>
                <Button variant="outline" size="icon" onClick={handleCopy} title={t('copy')}>
                  {copied ? <Check className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-muted-foreground mb-1.5 block">{t('quickShare')}</label>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" className="gap-2" onClick={handleWhatsApp}>
                  <WhatsAppIcon className="h-4 w-4" />
                  WhatsApp
                </Button>
                <Button variant="outline" size="sm" className="gap-2" onClick={handleFacebook}>
                  <FacebookIcon className="h-4 w-4" />
                  Facebook
                </Button>
                <Button variant="outline" size="sm" className="gap-2" onClick={handleEmail}>
                  <Mail className="h-4 w-4" />
                  Email
                </Button>
                <Button variant="outline" size="sm" className="gap-2" asChild>
                  <a href={marketplaceUrl} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-4 w-4" />
                    {t('openMarketplace')}
                  </a>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
