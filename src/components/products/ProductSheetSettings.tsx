import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  ExternalLink,
  Link as LinkIcon,
  Copy,
  Check,
  Eye,
  EyeOff,
  Download,
  Loader2,
  Settings2,
} from "lucide-react";
import { useUpdateProduct } from "@/hooks/useProducts";
import { useProductImages } from "@/hooks/useProductImages";
import { useProductPdfExport } from "@/hooks/useProductPdfExport";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { toast } from "sonner";
import type { Product } from "@/types/product";

interface ProductSheetSettingsProps {
  product: Product;
}

export function ProductSheetSettings({ product }: ProductSheetSettingsProps) {
  const { currentWorkspace } = useWorkspace();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [formData, setFormData] = useState({
    commercialDescription: product.commercial_description || "",
    benefits: (product.benefits || []).join("\n"),
    conditions: product.conditions || "",
    sheetPublished: product.sheet_published || false,
    sheetSlug: product.sheet_slug || "",
  });

  const updateProduct = useUpdateProduct();
  const { data: images = [] } = useProductImages(product.id);
  const { generatePdf, isGenerating } = useProductPdfExport();

  const handleDownloadPdf = async () => {
    if (!currentWorkspace) return;
    
    await generatePdf(product, images, {
      id: currentWorkspace.id,
      name: currentWorkspace.name,
      email: (currentWorkspace as any).email || null,
      phone: (currentWorkspace as any).phone || null,
      website: (currentWorkspace as any).website || null,
    });
  };

  // Generate default slug from product name
  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
  };

  const publicUrl = product.sheet_slug
    ? `${window.location.origin}/product/${product.sheet_slug}`
    : null;

  const handleCopyLink = () => {
    if (publicUrl) {
      navigator.clipboard.writeText(publicUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast.success("Link copiado!");
    }
  };

  const handleSave = async () => {
    const slug = formData.sheetSlug || generateSlug(product.name);
    const benefits = formData.benefits
      .split("\n")
      .map((b) => b.trim())
      .filter(Boolean);

    await updateProduct.mutateAsync({
      id: product.id,
      commercial_description: formData.commercialDescription || null,
      benefits: benefits.length > 0 ? benefits : null,
      conditions: formData.conditions || null,
      sheet_published: formData.sheetPublished,
      sheet_slug: slug,
    });

    setSettingsOpen(false);
    toast.success("Ficha atualizada!");
  };

  const handleTogglePublish = async () => {
    const newPublished = !product.sheet_published;
    const slug = product.sheet_slug || generateSlug(product.name);

    await updateProduct.mutateAsync({
      id: product.id,
      sheet_published: newPublished,
      sheet_slug: slug,
    });

    toast.success(newPublished ? "Ficha publicada!" : "Ficha despublicada");
  };

  return (
    <div className="space-y-4">
      {/* Status Card */}
      <Card className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${product.sheet_published ? "bg-green-500/10" : "bg-muted"}`}>
              {product.sheet_published ? (
                <Eye className="h-5 w-5 text-green-500" />
              ) : (
                <EyeOff className="h-5 w-5 text-muted-foreground" />
              )}
            </div>
            <div>
              <h4 className="font-medium">
                Ficha Pública {product.sheet_published ? "Ativa" : "Desativada"}
              </h4>
              <p className="text-sm text-muted-foreground">
                {product.sheet_published
                  ? "Clientes podem ver esta ficha"
                  : "Ficha não visível publicamente"}
              </p>
            </div>
          </div>
          <Switch
            checked={product.sheet_published || false}
            onCheckedChange={handleTogglePublish}
          />
        </div>

        {product.sheet_published && publicUrl && (
          <div className="mt-4 pt-4 border-t">
            <Label className="text-xs text-muted-foreground">Link Público</Label>
            <div className="flex items-center gap-2 mt-1">
              <Input
                value={publicUrl}
                readOnly
                className="flex-1 text-sm bg-muted"
              />
              <Button variant="outline" size="icon" onClick={handleCopyLink}>
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
              <Button variant="outline" size="icon" asChild>
                <a href={publicUrl} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4" />
                </a>
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Quick Actions */}
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={() => setSettingsOpen(true)}>
          <Settings2 className="h-4 w-4 mr-2" />
          Configurar Ficha
        </Button>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={handleDownloadPdf}
          disabled={isGenerating}
        >
          {isGenerating ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Download className="h-4 w-4 mr-2" />
          )}
          Descarregar PDF
        </Button>
      </div>

      {/* Preview */}
      <Card className="p-4">
        <h4 className="font-medium mb-3">Pré-visualização</h4>
        <div className="space-y-3 text-sm">
          <div>
            <span className="text-muted-foreground">Nome:</span>{" "}
            <span className="font-medium">{product.name}</span>
          </div>
          
          {product.commercial_description && (
            <div>
              <span className="text-muted-foreground">Descrição:</span>{" "}
              <span>{product.commercial_description.slice(0, 100)}...</span>
            </div>
          )}

          {product.benefits && product.benefits.length > 0 && (
            <div>
              <span className="text-muted-foreground">Benefícios:</span>{" "}
              <span>{product.benefits.length} item(s)</span>
            </div>
          )}

          {product.base_price > 0 && (
            <div>
              <span className="text-muted-foreground">Preço:</span>{" "}
              <span className="font-medium">
                {new Intl.NumberFormat("pt-PT", {
                  style: "currency",
                  currency: product.currency,
                }).format(product.base_price)}
              </span>
            </div>
          )}
        </div>
      </Card>

      {/* Settings Dialog */}
      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Configurar Ficha de Produto</DialogTitle>
            <DialogDescription>
              Configure as informações que aparecem na ficha pública do produto.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Slug (URL)</Label>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">/product/</span>
                <Input
                  value={formData.sheetSlug}
                  onChange={(e) => setFormData({ ...formData, sheetSlug: e.target.value })}
                  placeholder={generateSlug(product.name)}
                />
              </div>
            </div>

            <Separator />

            <div className="space-y-2">
              <Label>Descrição Comercial</Label>
              <Textarea
                value={formData.commercialDescription}
                onChange={(e) => setFormData({ ...formData, commercialDescription: e.target.value })}
                placeholder="Descrição detalhada para clientes..."
                rows={4}
              />
              <p className="text-xs text-muted-foreground">
                Esta descrição aparece na ficha pública e no PDF.
              </p>
            </div>

            <div className="space-y-2">
              <Label>Benefícios / Entregáveis</Label>
              <Textarea
                value={formData.benefits}
                onChange={(e) => setFormData({ ...formData, benefits: e.target.value })}
                placeholder="Um benefício por linha...&#10;Ex: Suporte 24/7&#10;Ex: Relatórios mensais"
                rows={4}
              />
              <p className="text-xs text-muted-foreground">
                Um benefício por linha. Aparece como lista com checkmarks.
              </p>
            </div>

            <div className="space-y-2">
              <Label>Condições (opcional)</Label>
              <Textarea
                value={formData.conditions}
                onChange={(e) => setFormData({ ...formData, conditions: e.target.value })}
                placeholder="Termos e condições, validade, etc..."
                rows={3}
              />
            </div>

            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <div>
                <p className="font-medium text-sm">Publicar Ficha</p>
                <p className="text-xs text-muted-foreground">
                  Tornar visível para clientes
                </p>
              </div>
              <Switch
                checked={formData.sheetPublished}
                onCheckedChange={(v) => setFormData({ ...formData, sheetPublished: v })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setSettingsOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={updateProduct.isPending}>
              {updateProduct.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
