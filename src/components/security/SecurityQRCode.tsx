import QRCode from "react-qr-code";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { QrCode, Printer, Download } from "lucide-react";
import { useState, useRef } from "react";

interface Props {
  /** Type of entity: site, system, device */
  entityType: "site" | "system" | "device";
  entityId: string;
  label: string;
  sublabel?: string;
  /** Base URL for the QR code */
  baseUrl?: string;
  /** Size variant */
  size?: "sm" | "md" | "lg";
  /** Show inline (card) or just button that opens dialog */
  inline?: boolean;
}

function getEntityPath(entityType: string, entityId: string) {
  switch (entityType) {
    case "site": return `/dashboard/security/sites/${entityId}`;
    case "system": return `/dashboard/security/systems/${entityId}`;
    case "device": return `/dashboard/security/equipment/${entityId}`;
    default: return `/dashboard/security/${entityType}/${entityId}`;
  }
}

const sizeMap = { sm: 96, md: 160, lg: 256 };

export function SecurityQRCode({ entityType, entityId, label, sublabel, baseUrl, size = "md", inline = false }: Props) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  const url = `${baseUrl || window.location.origin}${getEntityPath(entityType, entityId)}`;
  const qrSize = sizeMap[size];

  const entityLabels: Record<string, string> = {
    site: "Local",
    system: "Sistema",
    device: "Dispositivo",
  };

  const handlePrint = () => {
    const printContent = printRef.current;
    if (!printContent) return;

    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>QR Code - ${label}</title>
        <style>
          body { font-family: system-ui, sans-serif; display: flex; justify-content: center; align-items: center; min-height: 100vh; margin: 0; }
          .qr-card { text-align: center; padding: 32px; border: 2px solid #e5e7eb; border-radius: 12px; max-width: 320px; }
          .qr-card h3 { margin: 16px 0 4px; font-size: 16px; }
          .qr-card p { margin: 0; color: #6b7280; font-size: 12px; }
          .qr-card .type { display: inline-block; background: #f3f4f6; padding: 2px 8px; border-radius: 4px; font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 12px; }
          .qr-card .id { font-family: monospace; font-size: 9px; color: #9ca3af; margin-top: 8px; word-break: break-all; }
          svg { display: block; margin: 0 auto; }
          @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
        </style>
      </head>
      <body>
        ${printContent.innerHTML}
        <script>window.onload = function() { window.print(); window.close(); }</script>
      </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleDownloadSVG = () => {
    const svg = printRef.current?.querySelector("svg");
    if (!svg) return;
    const svgData = new XMLSerializer().serializeToString(svg);
    const blob = new Blob([svgData], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `qr-${entityType}-${entityId.slice(0, 8)}.svg`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (inline) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <QrCode className="h-4 w-4" /> QR Code
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-3">
          <div ref={printRef}>
            <div className="qr-card">
              <span className="type">{entityLabels[entityType] || entityType}</span>
              <QRCode value={url || ""} size={qrSize} level="M" />
              <h3>{label}</h3>
              {sublabel && <p>{sublabel}</p>}
              <p className="id">{entityId.slice(0, 8)}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="gap-1.5" onClick={handlePrint}>
              <Printer className="h-3.5 w-3.5" /> Imprimir
            </Button>
            <Button variant="outline" size="sm" className="gap-1.5" onClick={handleDownloadSVG}>
              <Download className="h-3.5 w-3.5" /> SVG
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setDialogOpen(true)}>
        <QrCode className="h-3.5 w-3.5" /> QR Code
      </Button>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <QrCode className="h-4 w-4" /> QR Code — {entityLabels[entityType]}
            </DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center gap-4" ref={printRef}>
            <div className="qr-card" style={{ textAlign: "center" }}>
              <div className="mb-3">
                <span className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground bg-muted px-2 py-0.5 rounded">
                  {entityLabels[entityType]}
                </span>
              </div>
              <QRCode value={url} size={200} level="M" />
              <h3 className="mt-3 font-semibold text-sm">{label}</h3>
              {sublabel && <p className="text-xs text-muted-foreground">{sublabel}</p>}
              <p className="text-[9px] text-muted-foreground font-mono mt-2">{entityId.slice(0, 8)}</p>
            </div>
          </div>
          <div className="flex justify-center gap-2">
            <Button variant="outline" size="sm" className="gap-1.5" onClick={handlePrint}>
              <Printer className="h-3.5 w-3.5" /> Imprimir
            </Button>
            <Button variant="outline" size="sm" className="gap-1.5" onClick={handleDownloadSVG}>
              <Download className="h-3.5 w-3.5" /> SVG
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

/** Batch QR code generator for printing multiple labels */
export function SecurityQRBatchPrint({ items, entityType }: { items: { id: string; label: string; sublabel?: string }[]; entityType: "site" | "system" | "device" }) {
  const entityLabels: Record<string, string> = { site: "Local", system: "Sistema", device: "Dispositivo" };

  const handleBatchPrint = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const cards = items.map((item) => {
      const url = `${window.location.origin}${getEntityPath(entityType, item.id)}`;
      return `
        <div class="qr-label">
          <span class="type">${entityLabels[entityType]}</span>
          <div class="qr-placeholder" data-url="${url}" data-id="${item.id.slice(0, 8)}"></div>
          <h4>${item.label}</h4>
          ${item.sublabel ? `<p>${item.sublabel}</p>` : ""}
          <span class="code">${item.id.slice(0, 8)}</span>
        </div>
      `;
    }).join("");

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>QR Codes - ${entityLabels[entityType]}</title>
        <script src="https://cdn.jsdelivr.net/npm/qrcode@1.5.3/build/qrcode.min.js"><\/script>
        <style>
          body { font-family: system-ui, sans-serif; margin: 20px; }
          .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
          .qr-label { text-align: center; padding: 16px; border: 1px solid #d1d5db; border-radius: 8px; break-inside: avoid; }
          .qr-label h4 { margin: 8px 0 2px; font-size: 11px; }
          .qr-label p { margin: 0; color: #6b7280; font-size: 9px; }
          .qr-label .type { display: inline-block; background: #f3f4f6; padding: 1px 6px; border-radius: 3px; font-size: 8px; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px; }
          .qr-label .code { font-family: monospace; font-size: 8px; color: #9ca3af; }
          canvas { display: block; margin: 0 auto; }
          @media print { .grid { grid-template-columns: repeat(3, 1fr); } }
        </style>
      </head>
      <body>
        <div class="grid">${cards}</div>
        <script>
          document.querySelectorAll('.qr-placeholder').forEach(function(el) {
            var canvas = document.createElement('canvas');
            QRCode.toCanvas(canvas, el.dataset.url, { width: 120, margin: 1 }, function() {});
            el.appendChild(canvas);
          });
          setTimeout(function() { window.print(); }, 500);
        <\/script>
      </body>
      </html>
    `);
    printWindow.document.close();
  };

  if (items.length === 0) return null;

  return (
    <Button variant="outline" size="sm" className="gap-1.5" onClick={handleBatchPrint}>
      <Printer className="h-3.5 w-3.5" /> Imprimir QR ({items.length})
    </Button>
  );
}
