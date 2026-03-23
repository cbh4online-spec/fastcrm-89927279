import { useState, useRef, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import {
  Copy,
  Download,
  ExternalLink,
  QrCode,
  ScanBarcode,
  Pencil,
  Check,
  X,
} from "lucide-react";
import QRCode from "react-qr-code";
import { useUpdateProduct } from "@/hooks/useProducts";

interface ProductBarcodeQRSectionProps {
  productId: string;
  barcode?: string | null;
  sku?: string | null;
  sheetSlug?: string | null;
  sheetPublished?: boolean;
}

function getPublicBaseUrl() {
  return window.location.origin;
}

export function ProductBarcodeQRSection({
  productId,
  barcode,
  sku,
  sheetSlug,
  sheetPublished,
}: ProductBarcodeQRSectionProps) {
  const [editingBarcode, setEditingBarcode] = useState(false);
  const [barcodeValue, setBarcodeValue] = useState(barcode || "");
  const qrRef = useRef<HTMLDivElement>(null);
  const updateProduct = useUpdateProduct();

  const publicUrl = sheetSlug
    ? `${getPublicBaseUrl()}/product/${sheetSlug}`
    : null;

  const qrValue = publicUrl || `${getPublicBaseUrl()}/product/${productId}`;

  const handleCopy = useCallback((text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copiado!`);
  }, []);

  const handleSaveBarcode = async () => {
    await updateProduct.mutateAsync({
      id: productId,
      barcode: barcodeValue.trim() || null,
    });
    setEditingBarcode(false);
    toast.success("Código de barras atualizado");
  };

  const handleDownloadQR = useCallback(() => {
    const svg = qrRef.current?.querySelector("svg");
    if (!svg) return;

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const svgData = new XMLSerializer().serializeToString(svg);
    const img = new Image();
    img.onload = () => {
      canvas.width = 512;
      canvas.height = 512;
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, 512, 512);
      ctx.drawImage(img, 0, 0, 512, 512);
      const link = document.createElement("a");
      link.download = `qr-${sku || productId}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    };
    img.src = `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svgData)))}`;
  }, [productId, sku]);

  return (
    <div className="space-y-4">
      <Separator />
      <div className="flex items-center gap-2">
        <ScanBarcode className="h-4 w-4 text-muted-foreground" />
        <p className="text-sm font-medium">Código de Barras & QR</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Barcode Section */}
        <Card className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">
              Código de Barras / EAN
            </p>
            {!editingBarcode && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2"
                onClick={() => {
                  setBarcodeValue(barcode || "");
                  setEditingBarcode(true);
                }}
              >
                <Pencil className="h-3 w-3" />
              </Button>
            )}
          </div>

          {editingBarcode ? (
            <div className="flex items-center gap-2">
              <Input
                value={barcodeValue}
                onChange={(e) => setBarcodeValue(e.target.value)}
                placeholder="Ex: 8435325454696"
                className="font-mono text-sm"
                autoFocus
              />
              <Button
                size="sm"
                variant="ghost"
                className="h-8 w-8 p-0"
                onClick={handleSaveBarcode}
                disabled={updateProduct.isPending}
              >
                <Check className="h-4 w-4 text-green-600" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-8 w-8 p-0"
                onClick={() => setEditingBarcode(false)}
              >
                <X className="h-4 w-4 text-muted-foreground" />
              </Button>
            </div>
          ) : barcode ? (
            <div className="space-y-2">
              <p className="font-mono text-lg tracking-widest">{barcode}</p>
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs gap-1"
                onClick={() => handleCopy(barcode, "Código de barras")}
              >
                <Copy className="h-3 w-3" /> Copiar
              </Button>
            </div>
          ) : (
            <div className="text-center py-2">
              <p className="text-sm text-muted-foreground">Sem código de barras</p>
              <Button
                variant="outline"
                size="sm"
                className="mt-2 text-xs"
                onClick={() => setEditingBarcode(true)}
              >
                Adicionar EAN / Barcode
              </Button>
            </div>
          )}
        </Card>

        {/* QR Code Section */}
        <Card className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">
              QR Code
            </p>
            {sheetPublished && publicUrl ? (
              <Badge variant="outline" className="text-xs text-green-600 border-green-300">
                Público
              </Badge>
            ) : (
              <Badge variant="outline" className="text-xs text-muted-foreground">
                Interno
              </Badge>
            )}
          </div>

          <div className="flex items-start gap-4">
            <div
              ref={qrRef}
              className="bg-white p-2 rounded-lg border flex-shrink-0"
            >
              <QRCode value={qrValue} size={96} level="M" />
            </div>

            <div className="space-y-2 flex-1 min-w-0">
              {publicUrl && sheetPublished ? (
                <p className="text-xs text-muted-foreground break-all">
                  {publicUrl}
                </p>
              ) : (
                <p className="text-xs text-muted-foreground">
                  QR aponta para a ficha interna do produto
                </p>
              )}

              <div className="flex flex-wrap gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs gap-1"
                  onClick={handleDownloadQR}
                >
                  <Download className="h-3 w-3" /> PNG
                </Button>
                {publicUrl && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs gap-1"
                    onClick={() => handleCopy(publicUrl, "Link")}
                  >
                    <Copy className="h-3 w-3" /> Link
                  </Button>
                )}
                {publicUrl && sheetPublished && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs gap-1"
                    onClick={() => window.open(publicUrl, "_blank")}
                  >
                    <ExternalLink className="h-3 w-3" /> Abrir
                  </Button>
                )}
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
