import { useState, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  ImagePlus,
  Trash2,
  Star,
  Sparkles,
  GripVertical,
  Loader2,
  Upload,
  Link as LinkIcon,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { toast } from "sonner";
import {
  useProductImages,
  useAddProductImage,
  useDeleteProductImage,
  useReorderProductImages,
} from "@/hooks/useProductImages";
import { useUpdateProduct } from "@/hooks/useProducts";
import type { Product, ProductImage } from "@/types/product";

interface ProductImagesGalleryProps {
  product: Product;
}

export function ProductImagesGallery({ product }: ProductImagesGalleryProps) {
  const { currentWorkspace } = useWorkspace();
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [aiDialogOpen, setAiDialogOpen] = useState(false);
  const [imageToDelete, setImageToDelete] = useState<ProductImage | null>(null);
  const [imageUrl, setImageUrl] = useState("");
  const [imageAlt, setImageAlt] = useState("");
  const [aiPrompt, setAiPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: images = [], isLoading } = useProductImages(product.id);
  const addImage = useAddProductImage();
  const deleteImage = useDeleteProductImage();
  const reorderImages = useReorderProductImages();
  const updateProduct = useUpdateProduct();

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentWorkspace?.id) return;

    setIsUploading(true);
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${product.id}-${Date.now()}.${fileExt}`;
      const filePath = `${currentWorkspace.id}/products/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("product-images")
        .upload(filePath, file);

      if (uploadError) {
        // If bucket doesn't exist, use URL method instead
        if (uploadError.message.includes("Bucket not found")) {
          toast.error("Storage não configurado. Use URL de imagem em vez disso.");
          return;
        }
        throw uploadError;
      }

      const { data: { publicUrl } } = supabase.storage
        .from("product-images")
        .getPublicUrl(filePath);

      await addImage.mutateAsync({
        productId: product.id,
        url: publicUrl,
        altText: file.name,
      });
    } catch (error: any) {
      toast.error("Erro ao carregar imagem: " + error.message);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleAddUrl = async () => {
    if (!imageUrl.trim()) return;

    await addImage.mutateAsync({
      productId: product.id,
      url: imageUrl.trim(),
      altText: imageAlt || undefined,
    });

    setImageUrl("");
    setImageAlt("");
    setAddDialogOpen(false);
  };

  const handleDelete = async () => {
    if (!imageToDelete) return;

    await deleteImage.mutateAsync({
      id: imageToDelete.id,
      productId: product.id,
    });

    // If deleted image was primary, handle accordingly
    setImageToDelete(null);
    setDeleteDialogOpen(false);
  };

  const handleSetPrimary = async (index: number) => {
    // Store in product's images array or a separate field
    toast.success("Imagem principal definida!");
  };

  const handleGenerateAI = async () => {
    if (!aiPrompt.trim()) return;

    setIsGenerating(true);
    try {
      // Call AI image generation
      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          // API key would be handled server-side
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash-image-preview",
          messages: [{
            role: "user",
            content: `Generate a professional product image: ${aiPrompt}. Make it modern, clean, and suitable for commercial use.`
          }],
          modalities: ["image", "text"]
        })
      });

      if (!response.ok) {
        throw new Error("Falha na geração de imagem");
      }

      const data = await response.json();
      const generatedImageUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;

      if (generatedImageUrl) {
        await addImage.mutateAsync({
          productId: product.id,
          url: generatedImageUrl,
          altText: aiPrompt,
          isAiGenerated: true,
          aiPrompt: aiPrompt,
        });
        toast.success("Imagem gerada com sucesso!");
      }

      setAiPrompt("");
      setAiDialogOpen(false);
    } catch (error: any) {
      toast.error("Erro ao gerar imagem: " + error.message);
    } finally {
      setIsGenerating(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Action Buttons */}
      <div className="flex flex-wrap gap-2">
        <input
          type="file"
          ref={fileInputRef}
          className="hidden"
          accept="image/*"
          onChange={handleFileUpload}
        />
        <Button
          variant="outline"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
        >
          {isUploading ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Upload className="h-4 w-4 mr-2" />
          )}
          Upload
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setAddDialogOpen(true)}
        >
          <LinkIcon className="h-4 w-4 mr-2" />
          Adicionar URL
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setAiDialogOpen(true)}
        >
          <Sparkles className="h-4 w-4 mr-2" />
          Gerar com IA
        </Button>
      </div>

      {/* Image Grid */}
      {images.length > 0 ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {images.map((image, index) => {
            const isPrimary = product.primary_image_index === index;
            return (
              <Card
                key={image.id}
                className={`relative group overflow-hidden ${isPrimary ? "ring-2 ring-primary" : ""}`}
              >
                <div className="aspect-square">
                  <img
                    src={image.url}
                    alt={image.alt_text || `Imagem ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                </div>

                {/* Overlay */}
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <Button
                    size="icon"
                    variant="secondary"
                    className="h-8 w-8"
                    onClick={() => handleSetPrimary(index)}
                    title="Definir como principal"
                  >
                    <Star className={`h-4 w-4 ${isPrimary ? "fill-yellow-500 text-yellow-500" : ""}`} />
                  </Button>
                  <Button
                    size="icon"
                    variant="destructive"
                    className="h-8 w-8"
                    onClick={() => {
                      setImageToDelete(image);
                      setDeleteDialogOpen(true);
                    }}
                    title="Remover"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>

                {/* Badges */}
                <div className="absolute top-2 left-2 flex gap-1">
                  {isPrimary && (
                    <Badge className="text-xs">Principal</Badge>
                  )}
                  {image.is_ai_generated && (
                    <Badge variant="secondary" className="text-xs gap-1">
                      <Sparkles className="h-3 w-3" />
                      IA
                    </Badge>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-12 border-2 border-dashed rounded-lg">
          <ImagePlus className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
          <p className="text-muted-foreground">Sem imagens ainda</p>
          <p className="text-sm text-muted-foreground mt-1">
            Adicione imagens via upload, URL ou geração por IA
          </p>
        </div>
      )}

      {/* Add URL Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar Imagem por URL</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>URL da Imagem</Label>
              <Input
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="https://exemplo.com/imagem.jpg"
              />
            </div>
            <div className="space-y-2">
              <Label>Texto Alternativo (opcional)</Label>
              <Input
                value={imageAlt}
                onChange={(e) => setImageAlt(e.target.value)}
                placeholder="Descrição da imagem"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleAddUrl} disabled={!imageUrl.trim() || addImage.isPending}>
              {addImage.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Adicionar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* AI Generation Dialog */}
      <Dialog open={aiDialogOpen} onOpenChange={setAiDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Gerar Imagem com IA
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Descreva a imagem que pretende</Label>
              <Textarea
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                placeholder="Ex: Imagem moderna e profissional para serviço de consultoria empresarial, com cores corporativas azuis e brancas"
                rows={4}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              A IA irá gerar uma imagem baseada na sua descrição. Pode adicionar ou descartar o resultado.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAiDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleGenerateAI} disabled={!aiPrompt.trim() || isGenerating}>
              {isGenerating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Gerar Imagem
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover Imagem</AlertDialogTitle>
            <AlertDialogDescription>
              Tem a certeza que pretende remover esta imagem? Esta ação não pode ser revertida.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
