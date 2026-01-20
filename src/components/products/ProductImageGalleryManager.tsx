import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { 
  Check, 
  ChevronLeft, 
  ChevronRight, 
  Star, 
  Image as ImageIcon,
  Plus,
  Trash2,
  GripVertical
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ProductImageGalleryManagerProps {
  images: string[];
  onImagesChange: (images: string[]) => void;
  skuImages?: string[];
  onSelectFromSku?: (images: string[]) => void;
  maxImages?: number;
}

export function ProductImageGalleryManager({
  images,
  onImagesChange,
  skuImages = [],
  maxImages = 10,
}: ProductImageGalleryManagerProps) {
  const [selectedSkuImages, setSelectedSkuImages] = useState<Set<string>>(new Set());
  const [previewIndex, setPreviewIndex] = useState(0);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  // Toggle SKU image selection
  const toggleSkuImage = useCallback((imageUrl: string) => {
    setSelectedSkuImages(prev => {
      const next = new Set(prev);
      if (next.has(imageUrl)) {
        next.delete(imageUrl);
      } else {
        next.add(imageUrl);
      }
      return next;
    });
  }, []);

  // Add selected SKU images to product
  const addSelectedImages = useCallback(() => {
    const newImages = [...images];
    selectedSkuImages.forEach(img => {
      if (!newImages.includes(img) && newImages.length < maxImages) {
        newImages.push(img);
      }
    });
    onImagesChange(newImages);
    setSelectedSkuImages(new Set());
  }, [images, selectedSkuImages, maxImages, onImagesChange]);

  // Select all SKU images
  const selectAllSkuImages = useCallback(() => {
    const available = skuImages.filter(img => !images.includes(img));
    setSelectedSkuImages(new Set(available));
  }, [skuImages, images]);

  // Deselect all
  const deselectAllSkuImages = useCallback(() => {
    setSelectedSkuImages(new Set());
  }, []);

  // Remove image from product
  const removeImage = useCallback((index: number) => {
    const newImages = images.filter((_, i) => i !== index);
    onImagesChange(newImages);
    if (previewIndex >= newImages.length) {
      setPreviewIndex(Math.max(0, newImages.length - 1));
    }
  }, [images, onImagesChange, previewIndex]);

  // Set as primary (move to first position)
  const setPrimary = useCallback((index: number) => {
    if (index === 0) return;
    const newImages = [...images];
    const [img] = newImages.splice(index, 1);
    newImages.unshift(img);
    onImagesChange(newImages);
    setPreviewIndex(0);
  }, [images, onImagesChange]);

  // Drag and drop handlers
  const handleDragStart = useCallback((index: number) => {
    setDraggedIndex(index);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;
  }, [draggedIndex]);

  const handleDrop = useCallback((e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === targetIndex) {
      setDraggedIndex(null);
      return;
    }
    const newImages = [...images];
    const [draggedImage] = newImages.splice(draggedIndex, 1);
    newImages.splice(targetIndex, 0, draggedImage);
    onImagesChange(newImages);
    setDraggedIndex(null);
  }, [draggedIndex, images, onImagesChange]);

  const handleDragEnd = useCallback(() => {
    setDraggedIndex(null);
  }, []);

  // Navigate preview
  const prevPreview = useCallback(() => {
    setPreviewIndex(prev => (prev > 0 ? prev - 1 : images.length - 1));
  }, [images.length]);

  const nextPreview = useCallback(() => {
    setPreviewIndex(prev => (prev < images.length - 1 ? prev + 1 : 0));
  }, [images.length]);

  const availableSkuImages = skuImages.filter(img => !images.includes(img));
  const hasAvailableSkuImages = availableSkuImages.length > 0;

  return (
    <div className="space-y-4">
      {/* Current Images - Carousel Preview */}
      {images.length > 0 && (
        <Card className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ImageIcon className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Imagens do Produto</span>
              <Badge variant="secondary" className="text-xs">
                {images.length}/{maxImages}
              </Badge>
            </div>
          </div>

          {/* Main Preview */}
          <div className="relative aspect-video bg-muted/50 rounded-lg overflow-hidden group">
            <img
              src={images[previewIndex]}
              alt={`Produto ${previewIndex + 1}`}
              className="w-full h-full object-contain"
              onError={(e) => {
                (e.target as HTMLImageElement).src = '/placeholder.svg';
              }}
            />
            
            {/* Navigation Arrows */}
            {images.length > 1 && (
              <>
                <Button
                  type="button"
                  variant="secondary"
                  size="icon"
                  className="absolute left-2 top-1/2 -translate-y-1/2 h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={prevPreview}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  size="icon"
                  className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={nextPreview}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </>
            )}

            {/* Primary Badge */}
            {previewIndex === 0 && (
              <Badge className="absolute top-2 left-2 gap-1">
                <Star className="h-3 w-3" />
                Principal
              </Badge>
            )}

            {/* Image Counter */}
            {images.length > 1 && (
              <div className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-black/60 text-white px-2 py-0.5 rounded text-xs">
                {previewIndex + 1} / {images.length}
              </div>
            )}
          </div>

          {/* Thumbnails */}
          <ScrollArea className="w-full">
            <div className="flex gap-2 p-1">
              {images.map((img, idx) => (
                <div
                  key={`${img}-${idx}`}
                  draggable
                  onDragStart={() => handleDragStart(idx)}
                  onDragOver={(e) => handleDragOver(e, idx)}
                  onDrop={(e) => handleDrop(e, idx)}
                  onDragEnd={handleDragEnd}
                  className={cn(
                    "relative shrink-0 h-16 w-16 rounded border overflow-hidden cursor-grab active:cursor-grabbing group/thumb",
                    previewIndex === idx && "ring-2 ring-primary",
                    draggedIndex === idx && "opacity-50"
                  )}
                  onClick={() => setPreviewIndex(idx)}
                >
                  <img
                    src={img}
                    alt={`Miniatura ${idx + 1}`}
                    className="h-full w-full object-cover"
                  />
                  
                  {/* Drag Handle */}
                  <div className="absolute top-0 left-0 p-0.5 opacity-0 group-hover/thumb:opacity-100 transition-opacity">
                    <GripVertical className="h-3 w-3 text-white drop-shadow-md" />
                  </div>

                  {/* Primary Star */}
                  {idx === 0 && (
                    <Star className="absolute top-1 right-1 h-3 w-3 text-yellow-400 fill-yellow-400" />
                  )}

                  {/* Hover Actions */}
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover/thumb:opacity-100 transition-opacity flex items-center justify-center gap-1">
                    {idx !== 0 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-white hover:text-yellow-400"
                        onClick={(e) => {
                          e.stopPropagation();
                          setPrimary(idx);
                        }}
                        title="Definir como principal"
                      >
                        <Star className="h-3 w-3" />
                      </Button>
                    )}
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-white hover:text-destructive"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeImage(idx);
                      }}
                      title="Remover imagem"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </Card>
      )}

      {/* SKU Images Selection */}
      {hasAvailableSkuImages && (
        <Card className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ImageIcon className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">Imagens Encontradas</span>
              <Badge variant="outline" className="text-xs">
                {availableSkuImages.length} disponíveis
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              {selectedSkuImages.size > 0 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={deselectAllSkuImages}
                >
                  Limpar
                </Button>
              )}
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7 text-xs"
                onClick={selectAllSkuImages}
              >
                Selecionar Todas
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-2">
            {availableSkuImages.map((img, idx) => (
              <div
                key={img}
                className={cn(
                  "relative aspect-square rounded-lg border-2 overflow-hidden cursor-pointer transition-all",
                  selectedSkuImages.has(img) 
                    ? "border-primary ring-2 ring-primary/20" 
                    : "border-transparent hover:border-muted-foreground/30"
                )}
                onClick={() => toggleSkuImage(img)}
              >
                <img
                  src={img}
                  alt={`SKU ${idx + 1}`}
                  className="h-full w-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
                
                {/* Selection Indicator */}
                <div className={cn(
                  "absolute top-1 right-1 h-5 w-5 rounded-full flex items-center justify-center transition-all",
                  selectedSkuImages.has(img) 
                    ? "bg-primary text-primary-foreground" 
                    : "bg-black/40 text-white"
                )}>
                  {selectedSkuImages.has(img) ? (
                    <Check className="h-3 w-3" />
                  ) : (
                    <Plus className="h-3 w-3" />
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Add Selected Button */}
          {selectedSkuImages.size > 0 && (
            <Button
              type="button"
              onClick={addSelectedImages}
              className="w-full"
              disabled={images.length >= maxImages}
            >
              <Plus className="h-4 w-4 mr-2" />
              Adicionar {selectedSkuImages.size} {selectedSkuImages.size === 1 ? 'Imagem' : 'Imagens'}
            </Button>
          )}
        </Card>
      )}

      {/* Empty State */}
      {images.length === 0 && !hasAvailableSkuImages && (
        <Card className="p-6 text-center border-dashed">
          <ImageIcon className="h-10 w-10 mx-auto text-muted-foreground/50 mb-2" />
          <p className="text-sm text-muted-foreground">
            Nenhuma imagem adicionada
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Pesquise por SKU para encontrar imagens ou gere com IA
          </p>
        </Card>
      )}
    </div>
  );
}
