import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useProductAIAssistant } from "@/hooks/useProductAIAssistant";
import { useCreateProduct } from "@/hooks/useProducts";
import { useQueryClient } from "@tanstack/react-query";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Search, Camera, Upload, Sparkles, Package, AlertTriangle } from "lucide-react";
import type { StockStatus } from "@/types/product-operations";

interface StoreQuickProductDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type ProductCondition = "new" | "used" | "refurbished";

interface ProductPreview {
  name: string;
  description: string;
  price: number;
  category: string;
  sku?: string;
  images: string[];
  specifications?: Record<string, string>;
  stock_status: StockStatus;
  stock_quantity: number | null;
  track_stock: boolean;
  brandLogoUrl?: string;
  weight: number;
  condition: ProductCondition;
}

export function StoreQuickProductDialog({ open, onOpenChange }: StoreQuickProductDialogProps) {
  const [tab, setTab] = useState("sku");
  const [skuInput, setSkuInput] = useState("");
  const [preview, setPreview] = useState<ProductPreview | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { searchBySKU } = useProductAIAssistant();
  const createProduct = useCreateProduct();
  const queryClient = useQueryClient();
  const { currentWorkspace } = useWorkspace();
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);

  const handleSkuSearch = async () => {
    if (!skuInput.trim()) return;
    setIsSearching(true);
    setPreview(null);
    try {
      const result = await searchBySKU.mutateAsync(skuInput.trim());
      if (result.found) {
        setPreview({
          name: result.commercialName || result.name || skuInput,
          description: result.commercialDescription || result.description || "",
          price: result.suggestedPrice || 0,
          category: result.category || "",
          sku: skuInput.trim(),
          images: result.images || (result.imageUrl ? [result.imageUrl] : []),
          specifications: result.specifications as Record<string, string> | undefined,
          stock_status: "available",
          stock_quantity: null,
          track_stock: false,
          brandLogoUrl: (result as any).brandLogoUrl,
          weight: (result as any).weight || 0.5,
          condition: (result as any).condition || "new",
        });
      } else {
        toast.error("Nenhum produto encontrado para este SKU");
      }
    } catch (error) {
      toast.error("Erro ao pesquisar SKU");
    } finally {
      setIsSearching(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsSearching(true);
    setPreview(null);
    setUploadedFile(file);

    // Show image preview
    const objectUrl = URL.createObjectURL(file);
    setImagePreviewUrl(objectUrl);

    try {
      // Convert to base64
      const reader = new FileReader();
      const base64 = await new Promise<string>((resolve, reject) => {
        reader.onload = () => {
          const result = reader.result as string;
          resolve(result.split(",")[1]);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const { data, error } = await supabase.functions.invoke("ai-product-assistant", {
        body: { mode: "image-to-product", imageBase64: base64 },
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error || "Falha na análise");

      const result = data.data;
      if (result.found) {
        setPreview({
          name: result.commercialName || result.name || "Produto",
          description: result.commercialDescription || result.description || "",
          price: result.suggestedPrice || 0,
          category: result.category || "",
          images: result.images || (result.imageUrl ? [result.imageUrl] : []),
          specifications: result.specifications,
          stock_status: "available",
          stock_quantity: null,
          track_stock: false,
          brandLogoUrl: result.brandLogoUrl,
          weight: result.weight || 0.5,
          condition: result.condition || "new",
        });
      } else {
        toast.error("Não foi possível identificar o produto na imagem");
      }
    } catch (error) {
      toast.error("Erro ao analisar imagem");
    } finally {
      setIsSearching(false);
    }
  };

  const uploadImageToStorage = async (source: string | File, index: number): Promise<string | null> => {
    const timestamp = Date.now();
    const ext = source instanceof File ? source.name.split(".").pop() || "jpg" : "jpg";
    const filePath = `ai-created/${timestamp}-${index}.${ext}`;

    try {
      let fileBody: Blob;
      if (source instanceof File) {
        fileBody = source;
      } else {
        // Fetch external URL
        const response = await fetch(source);
        if (!response.ok) return null;
        fileBody = await response.blob();
      }

      const { error } = await supabase.storage
        .from("product-images")
        .upload(filePath, fileBody, { contentType: fileBody.type || "image/jpeg", upsert: true });

      if (error) {
        console.error("Upload error:", error);
        return null;
      }

      const { data: publicData } = supabase.storage
        .from("product-images")
        .getPublicUrl(filePath);

      return publicData.publicUrl;
    } catch (err) {
      console.error("Failed to upload image:", err);
      return null;
    }
  };

  const handleCreate = async () => {
    if (!preview) return;
    setIsCreating(true);
    setDuplicateWarning(null);
    try {
      const workspaceId = currentWorkspace?.id;
      if (!workspaceId) throw new Error("No workspace");

      // Check for duplicate products (by SKU or name)
      const duplicateChecks = [];
      if (preview.sku) {
        duplicateChecks.push(
          supabase.from("products").select("id, name").eq("workspace_id", workspaceId).ilike("sku", preview.sku.trim()).maybeSingle().then(r => r)
        );
      }
      duplicateChecks.push(
        supabase.from("products").select("id, name").eq("workspace_id", workspaceId).ilike("name", preview.name.trim()).maybeSingle().then(r => r)
      );

      const dupResults = await Promise.all(duplicateChecks);
      for (const { data: dup } of dupResults) {
        if (dup) {
          setDuplicateWarning(`Já existe um produto "${dup.name}" com o mesmo ${preview.sku ? 'SKU ou ' : ''}nome.`);
          setIsCreating(false);
          return;
        }
      }

      // Ensure store category exists (auto-create with AI if needed)
      let storeCategoryId: string | null = null;
      if (preview.category?.trim()) {
        try {
          const { data: catData, error: catError } = await supabase.functions.invoke("ai-product-assistant", {
            body: {
              mode: "ensure-store-category",
              categoryName: preview.category.trim(),
              workspaceId,
            },
          });
          if (!catError && catData?.success) {
            storeCategoryId = catData.data.categoryId;
            if (catData.data.isNew) {
              toast.info(`Categoria "${catData.data.categoryName}" criada automaticamente`);
            }
          }
        } catch (e) {
          console.error("ensure-store-category failed:", e);
        }
      }

      // Upload images to storage
      let storageUrls: string[] = [];

      if (uploadedFile) {
        const url = await uploadImageToStorage(uploadedFile, 0);
        if (url) storageUrls.push(url);
      } else if (preview.images.length > 0) {
        const uploads = await Promise.all(
          preview.images.slice(0, 4).map((img, i) => uploadImageToStorage(img, i))
        );
        storageUrls = uploads.filter((u): u is string => u !== null);
      }

      // Upload brand logo to storage if it's an external URL
      let brandLogoStorageUrl: string | null = null;
      if (preview.brandLogoUrl) {
        const brandSlug = (preview.specifications?.brand || "brand").toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
        const timestamp = Date.now();
        const logoPath = `brands/${brandSlug}-${timestamp}.png`;
        try {
          const logoResp = await fetch(preview.brandLogoUrl);
          if (logoResp.ok) {
            const logoBlob = await logoResp.blob();
            const { error } = await supabase.storage
              .from("product-images")
              .upload(logoPath, logoBlob, { contentType: logoBlob.type || "image/png", upsert: true });
            if (!error) {
              const { data: publicData } = supabase.storage.from("product-images").getPublicUrl(logoPath);
              brandLogoStorageUrl = publicData.publicUrl;
            }
          }
        } catch (e) {
          console.error("Brand logo upload failed:", e);
        }
      }

      await createProduct.mutateAsync({
        name: preview.name,
        short_description: preview.description,
        commercial_description: preview.description,
        base_price: preview.price,
        category: preview.category,
        store_category_id: storeCategoryId,
        sku: preview.sku,
        images: storageUrls,
        specifications: {
          ...preview.specifications,
          condition: preview.condition,
        },
        status: "active",
        product_type: "physical",
        store_published: true,
        stock_status: preview.stock_status,
        stock_quantity: preview.stock_quantity,
        track_stock: preview.track_stock,
        brand_logo_url: brandLogoStorageUrl,
        weight: preview.weight || 0.5,
        condition: preview.condition,
      } as any);

      queryClient.invalidateQueries({ queryKey: ["store-admin-products"] });
      queryClient.invalidateQueries({ queryKey: ["store-products"] });
      queryClient.invalidateQueries({ queryKey: ["admin-store-categories"] });
      queryClient.invalidateQueries({ queryKey: ["store-categories-db"] });
      toast.success("Produto criado e publicado na loja!");
      handleReset();
      onOpenChange(false);
    } catch (error) {
      // Error toast is handled by useCreateProduct
    } finally {
      setIsCreating(false);
    }
  };

  const handleReset = () => {
    setPreview(null);
    setSkuInput("");
    setImagePreviewUrl(null);
    setUploadedFile(null);
    setDuplicateWarning(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            Criar Produto com IA
          </DialogTitle>
        </DialogHeader>

        <Tabs value={tab} onValueChange={(v) => { setTab(v); handleReset(); }}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="sku" className="flex items-center gap-1.5">
              <Search className="h-3.5 w-3.5" />
              Por SKU
            </TabsTrigger>
            <TabsTrigger value="photo" className="flex items-center gap-1.5">
              <Camera className="h-3.5 w-3.5" />
              Por Fotografia
            </TabsTrigger>
          </TabsList>

          <TabsContent value="sku" className="space-y-4 mt-4">
            <div className="flex gap-2">
              <Input
                placeholder="Inserir código SKU..."
                value={skuInput}
                onChange={(e) => setSkuInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSkuSearch()}
                disabled={isSearching}
              />
              <Button onClick={handleSkuSearch} disabled={isSearching || !skuInput.trim()}>
                {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="photo" className="space-y-4 mt-4">
            <div
              className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              {imagePreviewUrl ? (
                <img src={imagePreviewUrl} alt="Preview" className="max-h-40 mx-auto rounded-lg object-contain" />
              ) : (
                <div className="space-y-2">
                  <Upload className="h-8 w-8 mx-auto text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">Clique para enviar uma foto do produto</p>
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleImageUpload}
              />
            </div>
            {isSearching && (
              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                A analisar imagem com IA...
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Product Preview / Edit Form */}
        {preview && (
          <div className="space-y-4 border-t pt-4">
            <h3 className="text-sm font-medium flex items-center gap-1.5">
              <Package className="h-4 w-4" />
              Dados do Produto
              {preview.brandLogoUrl && (
                <img src={preview.brandLogoUrl} alt="Brand" className="h-5 ml-auto object-contain" />
              )}
            </h3>

            {/* Images: show SKU images or uploaded photo */}
            {(preview.images.length > 0 || imagePreviewUrl) && (
              <div className="flex gap-2 overflow-x-auto pb-2">
                {preview.images.length > 0
                  ? preview.images.slice(0, 4).map((img, i) => (
                      <img key={i} src={img} alt="" className="h-16 w-16 rounded-lg object-cover border flex-shrink-0" />
                    ))
                  : imagePreviewUrl && (
                      <img src={imagePreviewUrl} alt="" className="h-16 w-16 rounded-lg object-cover border flex-shrink-0" />
                    )}
              </div>
            )}

            <div className="space-y-3">
              <div>
                <Label className="text-xs">Nome</Label>
                <Input
                  value={preview.name}
                  onChange={(e) => setPreview({ ...preview, name: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label className="text-xs">Preço (€)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={preview.price}
                    onChange={(e) => setPreview({ ...preview, price: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div>
                  <Label className="text-xs">Peso (kg)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={preview.weight}
                    onChange={(e) => setPreview({ ...preview, weight: parseFloat(e.target.value) || 0.5 })}
                  />
                </div>
                <div>
                  <Label className="text-xs">Categoria</Label>
                  <Input
                    value={preview.category}
                    onChange={(e) => setPreview({ ...preview, category: e.target.value })}
                  />
                </div>
              </div>

              {/* Stock & Condition fields */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label className="text-xs">Estado do Stock</Label>
                  <Select
                    value={preview.stock_status}
                    onValueChange={(v) => setPreview({ ...preview, stock_status: v as StockStatus })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="available">Disponível</SelectItem>
                      <SelectItem value="limited">Stock Limitado</SelectItem>
                      <SelectItem value="backorder">Sob Encomenda</SelectItem>
                      <SelectItem value="out_of_stock">Esgotado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Quantidade</Label>
                  <Input
                    type="number"
                    min="0"
                    placeholder="Ex: 100"
                    value={preview.stock_quantity ?? ""}
                    onChange={(e) =>
                      setPreview({
                        ...preview,
                        stock_quantity: e.target.value ? parseInt(e.target.value, 10) : null,
                      })
                    }
                  />
                </div>
                <div>
                  <Label className="text-xs">Condição</Label>
                  <Select
                    value={preview.condition}
                    onValueChange={(v) => setPreview({ ...preview, condition: v as ProductCondition })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="new">Novo</SelectItem>
                      <SelectItem value="used">Usado</SelectItem>
                      <SelectItem value="refurbished">Recondicionado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={preview.track_stock}
                  onCheckedChange={(v) => setPreview({ ...preview, track_stock: v })}
                />
                <Label className="text-xs cursor-pointer">Controlar inventário automaticamente</Label>
              </div>

              <div>
                <Label className="text-xs">Descrição</Label>
                <Textarea
                  value={preview.description}
                  onChange={(e) => setPreview({ ...preview, description: e.target.value })}
                  rows={3}
                />
              </div>
            </div>

            {duplicateWarning && (
              <div className="flex items-start gap-2 p-3 rounded-md bg-destructive/10 text-destructive text-sm">
                <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <div>
                  <p>{duplicateWarning}</p>
                  <Button variant="ghost" size="sm" className="mt-1 h-7 text-xs" onClick={() => setDuplicateWarning(null)}>
                    Criar mesmo assim
                  </Button>
                </div>
              </div>
            )}

            <Button onClick={handleCreate} disabled={isCreating || !!duplicateWarning} className="w-full">
              {isCreating ? (
                <><Loader2 className="h-4 w-4 animate-spin mr-2" /> A criar...</>
              ) : (
                <><Sparkles className="h-4 w-4 mr-2" /> Criar e Publicar na Loja</>
              )}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
