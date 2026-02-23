import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Camera, X, ArrowUp, ArrowDown, RefreshCw, ImagePlus, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { toast } from "sonner";

interface ImageItem {
  id: string;
  file: File;
  preview: string;
  url: string | null;
  uploading: boolean;
  error: boolean;
}

interface MQPCStepImagesProps {
  images: ImageItem[];
  onImagesChange: (images: ImageItem[]) => void;
}

const MAX_IMAGES = 6;
const MAX_SIZE = 1200;
const QUALITY = 0.8;

async function compressImage(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      let { width, height } = img;
      if (width > MAX_SIZE || height > MAX_SIZE) {
        if (width > height) {
          height = Math.round((height * MAX_SIZE) / width);
          width = MAX_SIZE;
        } else {
          width = Math.round((width * MAX_SIZE) / height);
          height = MAX_SIZE;
        }
      }
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error("Compression failed"))),
        "image/jpeg",
        QUALITY
      );
    };
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}

export function MQPCStepImages({ images, onImagesChange }: MQPCStepImagesProps) {
  const { currentWorkspace } = useWorkspace();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [compressing, setCompressing] = useState(false);

  const uploadImage = useCallback(
    async (item: ImageItem): Promise<ImageItem> => {
      if (!currentWorkspace?.id) return { ...item, error: true };
      try {
        const compressed = await compressImage(item.file);
        const path = `products/${currentWorkspace.id}/${Date.now()}-${item.id}.jpg`;
        const { error } = await supabase.storage
          .from("product-images")
          .upload(path, compressed, { contentType: "image/jpeg" });
        if (error) throw error;
        const { data: urlData } = supabase.storage
          .from("product-images")
          .getPublicUrl(path);
        return { ...item, url: urlData.publicUrl, uploading: false, error: false };
      } catch {
        return { ...item, uploading: false, error: true };
      }
    },
    [currentWorkspace?.id]
  );

  const handleFiles = async (files: FileList) => {
    const remaining = MAX_IMAGES - images.length;
    if (remaining <= 0) {
      toast.error(`Máximo de ${MAX_IMAGES} imagens`);
      return;
    }
    const selected = Array.from(files).slice(0, remaining);
    setCompressing(true);

    const newItems: ImageItem[] = selected.map((file, i) => ({
      id: `${Date.now()}-${i}`,
      file,
      preview: URL.createObjectURL(file),
      url: null,
      uploading: true,
      error: false,
    }));

    const updated = [...images, ...newItems];
    onImagesChange(updated);
    setCompressing(false);
  };

  const imagesRef = useRef(images);
  imagesRef.current = images;

  const handleFilesWithRef = async (files: FileList) => {
    const remaining = MAX_IMAGES - imagesRef.current.length;
    if (remaining <= 0) {
      toast.error(`Máximo de ${MAX_IMAGES} imagens`);
      return;
    }
    const selected = Array.from(files).slice(0, remaining);
    setCompressing(true);

    const newItems: ImageItem[] = selected.map((file, i) => ({
      id: `${Date.now()}-${i}`,
      file,
      preview: URL.createObjectURL(file),
      url: null,
      uploading: true,
      error: false,
    }));

    const updated = [...imagesRef.current, ...newItems];
    onImagesChange(updated);
    setCompressing(false);

    for (const item of newItems) {
      const result = await uploadImage(item);
      onImagesChange(
        imagesRef.current.map((img) => (img.id === item.id ? result : img))
      );
    }
  };

  const removeImage = (id: string) => {
    onImagesChange(images.filter((img) => img.id !== id));
  };

  const moveImage = (index: number, direction: "up" | "down") => {
    const newImages = [...images];
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newImages.length) return;
    [newImages[index], newImages[targetIndex]] = [newImages[targetIndex], newImages[index]];
    onImagesChange(newImages);
  };

  const retryUpload = async (id: string) => {
    const item = images.find((img) => img.id === id);
    if (!item) return;
    onImagesChange(images.map((img) => (img.id === id ? { ...img, uploading: true, error: false } : img)));
    const result = await uploadImage(item);
    onImagesChange(imagesRef.current.map((img) => (img.id === id ? result : img)));
  };

  return (
    <div className="space-y-4">
      <div className="text-center space-y-2">
        <h2 className="text-lg font-semibold">Adicionar Imagens</h2>
        <p className="text-sm text-muted-foreground">
          Até {MAX_IMAGES} imagens • Compressão automática
        </p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {images.map((img, index) => (
          <div key={img.id} className="relative aspect-square rounded-xl overflow-hidden border-2 border-border bg-muted">
            <img src={img.preview} alt="" className="w-full h-full object-cover" />
            {img.uploading && (
              <div className="absolute inset-0 bg-background/60 flex items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            )}
            {img.error && (
              <div className="absolute inset-0 bg-destructive/20 flex items-center justify-center">
                <Button size="sm" variant="secondary" onClick={() => retryUpload(img.id)} className="gap-1">
                  <RefreshCw className="h-3 w-3" />
                  Retry
                </Button>
              </div>
            )}
            <div className="absolute top-1 right-1 flex gap-1">
              <Button
                size="icon"
                variant="secondary"
                className="h-7 w-7 rounded-full opacity-80"
                onClick={() => removeImage(img.id)}
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
            <div className="absolute bottom-1 right-1 flex gap-1">
              {index > 0 && (
                <Button size="icon" variant="secondary" className="h-6 w-6 rounded-full opacity-80" onClick={() => moveImage(index, "up")}>
                  <ArrowUp className="h-3 w-3" />
                </Button>
              )}
              {index < images.length - 1 && (
                <Button size="icon" variant="secondary" className="h-6 w-6 rounded-full opacity-80" onClick={() => moveImage(index, "down")}>
                  <ArrowDown className="h-3 w-3" />
                </Button>
              )}
            </div>
            {index === 0 && (
              <span className="absolute top-1 left-1 bg-primary text-primary-foreground text-[10px] px-1.5 py-0.5 rounded-full font-medium">
                Principal
              </span>
            )}
          </div>
        ))}

        {images.length < MAX_IMAGES && (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="aspect-square rounded-xl border-2 border-dashed border-muted-foreground/30 flex flex-col items-center justify-center gap-2 text-muted-foreground hover:border-primary hover:text-primary transition-colors"
          >
            {compressing ? (
              <Loader2 className="h-8 w-8 animate-spin" />
            ) : (
              <>
                <ImagePlus className="h-8 w-8" />
                <span className="text-xs font-medium">Adicionar</span>
              </>
            )}
          </button>
        )}
      </div>

      {images.length === 0 && (
        <Button
          variant="outline"
          className="w-full h-32 flex-col gap-3 border-dashed text-muted-foreground"
          onClick={() => fileInputRef.current?.click()}
        >
          <Camera className="h-10 w-10" />
          <span>Tirar foto ou selecionar imagens</span>
        </Button>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        capture="environment"
        className="hidden"
        onChange={(e) => e.target.files && handleFilesWithRef(e.target.files)}
      />
    </div>
  );
}

export type { ImageItem };
