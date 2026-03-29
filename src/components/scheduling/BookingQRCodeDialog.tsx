import { useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Copy, Download } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  url: string;
  title: string;
  brandColor: string;
}

export function BookingQRCodeDialog({ open, onOpenChange, url, title, brandColor }: Props) {
  const qrRef = useRef<HTMLDivElement>(null);

  const copyLink = () => {
    navigator.clipboard.writeText(url);
    toast.success('Link copiado!');
  };

  const downloadPng = () => {
    const svg = qrRef.current?.querySelector('svg');
    if (!svg) return;
    const canvas = document.createElement('canvas');
    const size = 1024;
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;
    const data = new XMLSerializer().serializeToString(svg);
    const img = new Image();
    img.onload = () => {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, size, size);
      ctx.drawImage(img, 0, 0, size, size);
      const a = document.createElement('a');
      a.download = `qr-${title.replace(/\s+/g, '-').toLowerCase()}.png`;
      a.href = canvas.toDataURL('image/png');
      a.click();
    };
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>QR Code — {title}</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col items-center gap-4 py-4">
          <div ref={qrRef} className="bg-white p-4 rounded-xl">
            <QRCodeSVG
              value={url}
              size={240}
              fgColor={brandColor}
              level="H"
              includeMargin={false}
            />
          </div>

          <p className="text-xs text-muted-foreground text-center break-all max-w-full px-2">
            {url}
          </p>

          <div className="flex gap-2 w-full">
            <Button variant="outline" className="flex-1 gap-2" onClick={copyLink}>
              <Copy className="h-4 w-4" />
              Copiar link
            </Button>
            <Button className="flex-1 gap-2" onClick={downloadPng}>
              <Download className="h-4 w-4" />
              Descarregar PNG
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
