import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Loader2, Wand2, Upload, ImageIcon, X, RefreshCw } from "lucide-react";
import { useProductAIAssistant } from "@/hooks/useProductAIAssistant";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ProductImageGeneratorProps {
  productName: string;
  category?: string;
  description?: string;
  images: string[];
  onImagesChange: (images: string[]) => void;
  maxImages?: number;
}

export function ProductImageGenerator({
  productName,
  category,
  description,
  images,
  onImagesChange,
  maxImages = 5,
}: ProductImageGeneratorProps) {
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [generatingIndex, setGeneratingIndex] = useState<number | null>(null);
  const { generateProductImage } = useProductAIAssistant();

  const handleGenerateImage = async (index?: number) => {
    if (!productName.trim()) {
      toast.error("Insira o nome do produto primeiro");
      return;
    }

    try {
      setGeneratingIndex(index ?? images.length);
      
      const result = await generateProductImage.mutateAsync({
        productName,
        category,
        description,
      });

      if (result.imageBase64) {
        // Upload to storage
        const imageUrl = await uploadImageToStorage(result.imageBase64);
        if (imageUrl) {
          if (index !== undefined) {
            // Replace existing image
            const newImages = [...images];
            newImages[index] = imageUrl;
            onImagesChange(newImages);
          } else {
            // Add new image
            onImagesChange([...images, imageUrl]);
          }
          toast.success("Imagem gerada com sucesso!");
        }
      }
    } catch (error) {
      toast.error("Erro ao gerar imagem");
    } finally {
      setGeneratingIndex(null);
    }
  };

  const uploadImageToStorage = async (base64Image: string): Promise<string | null> => {
    try {
      setIsUploadingImage(true);
      
      // Extract base64 data
      const base64Data = base64Image.includes(',') 
        ? base64Image.split(',')[1] 
        : base64Image;
      
      // Convert base64 to blob
      const byteCharacters = atob(base64Data);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: 'image/png' });
      
      // Generate unique filename
      const fileName = `product-${Date.now()}-${Math.random().toString(36).substring(7)}.png`;
      
      // Upload to storage
      const { data, error } = await supabase.storage
        .from('product-images')
        .upload(fileName, blob, {
          contentType: 'image/png',
          upsert: false,
        });

      if (error) {
        console.error('Upload error:', error);
        toast.error("Erro ao guardar imagem");
        return null;
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('product-images')
        .getPublicUrl(fileName);

      return publicUrl;
    } catch (error) {
      console.error('Upload error:', error);
      toast.error("Erro ao processar imagem");
      return null;
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;

    const remainingSlots = maxImages - images.length;
    const filesToUpload = files.slice(0, remainingSlots);

    try {
      setIsUploadingImage(true);
      
      const uploadedUrls: string[] = [];
      
      for (const file of filesToUpload) {
        const fileName = `product-${Date.now()}-${Math.random().toString(36).substring(7)}.${file.name.split('.').pop()}`;
        
        const { data, error } = await supabase.storage
          .from('product-images')
          .upload(fileName, file, {
            contentType: file.type,
            upsert: false,
          });

        if (error) {
          console.error('Upload error:', error);
          continue;
        }

        const { data: { publicUrl } } = supabase.storage
          .from('product-images')
          .getPublicUrl(fileName);

        uploadedUrls.push(publicUrl);
      }

      if (uploadedUrls.length > 0) {
        onImagesChange([...images, ...uploadedUrls]);
        toast.success(`${uploadedUrls.length} imagem(s) carregada(s)!`);
      }
    } catch (error) {
      console.error('Upload error:', error);
      toast.error("Erro ao carregar imagens");
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleRemoveImage = (index: number) => {
    const newImages = images.filter((_, i) => i !== index);
    onImagesChange(newImages);
  };

  const canAddMore = images.length < maxImages;

  return (
    <div className="space-y-3">
      <Label>Imagens do Produto</Label>
      
      {/* Image Grid */}
      <div className="grid grid-cols-5 gap-2">
        {images.map((imageUrl, index) => (
          <div
            key={index}
            className="relative aspect-square rounded-lg border bg-muted/50 overflow-hidden group"
          >
            <img
              src={imageUrl}
              alt={`Produto ${index + 1}`}
              className="w-full h-full object-cover"
            />
            
            {/* Overlay Actions */}
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
              <Button
                type="button"
                variant="secondary"
                size="icon"
                className="h-7 w-7"
                onClick={() => handleGenerateImage(index)}
                disabled={generatingIndex === index}
              >
                {generatingIndex === index ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <RefreshCw className="h-3.5 w-3.5" />
                )}
              </Button>
              <Button
                type="button"
                variant="destructive"
                size="icon"
                className="h-7 w-7"
                onClick={() => handleRemoveImage(index)}
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>

            {/* Primary Badge */}
            {index === 0 && (
              <div className="absolute top-1 left-1 bg-primary text-primary-foreground text-[10px] px-1.5 py-0.5 rounded">
                Principal
              </div>
            )}
          </div>
        ))}

        {/* Add New Image Slot */}
        {canAddMore && (
          <div className="aspect-square rounded-lg border-2 border-dashed bg-muted/30 flex flex-col items-center justify-center gap-2 p-2">
            {generatingIndex === images.length || isUploadingImage ? (
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            ) : (
              <>
                <div className="flex gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => handleGenerateImage()}
                    disabled={!productName.trim()}
                    title="Gerar com IA"
                  >
                    <Wand2 className="h-4 w-4" />
                  </Button>
                  <label>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      onChange={handleFileUpload}
                      disabled={isUploadingImage}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      asChild
                    >
                      <span title="Carregar imagem">
                        <Upload className="h-4 w-4" />
                      </span>
                    </Button>
                  </label>
                </div>
                <span className="text-[10px] text-muted-foreground text-center">
                  IA ou Upload
                </span>
              </>
            )}
          </div>
        )}
      </div>

      {/* Helper Text */}
      <p className="text-xs text-muted-foreground">
        {images.length}/{maxImages} imagens • A primeira imagem será a principal
      </p>
    </div>
  );
}
