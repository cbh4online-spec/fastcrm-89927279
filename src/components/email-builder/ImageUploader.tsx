import { useState, useCallback, useRef } from 'react';
import { Upload, Link, Image, X, Loader2, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface ImageUploaderProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImageSelect: (url: string, alt?: string) => void;
  currentImage?: string;
}

export function ImageUploader({
  open,
  onOpenChange,
  onImageSelect,
  currentImage,
}: ImageUploaderProps) {
  const [activeTab, setActiveTab] = useState<'upload' | 'url'>('upload');
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [imageUrl, setImageUrl] = useState('');
  const [altText, setAltText] = useState('');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const uploadFile = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Ficheiro inválido',
        description: 'Por favor seleciona uma imagem (JPG, PNG, GIF, WebP)',
        variant: 'destructive',
      });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: 'Ficheiro muito grande',
        description: 'O tamanho máximo é 5MB',
        variant: 'destructive',
      });
      return;
    }

    setIsUploading(true);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${fileExt}`;
      const filePath = `email-images/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('marketing-assets')
        .upload(filePath, file);

      if (uploadError) {
        // If bucket doesn't exist, show friendly message
        if (uploadError.message.includes('Bucket not found')) {
          toast({
            title: 'Armazenamento não configurado',
            description: 'Por favor configure o bucket de storage primeiro',
            variant: 'destructive',
          });
          return;
        }
        throw uploadError;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('marketing-assets')
        .getPublicUrl(filePath);

      setPreviewUrl(publicUrl);
      
      toast({
        title: 'Imagem carregada',
        description: 'A imagem foi carregada com sucesso',
      });
    } catch (error) {
      console.error('Upload error:', error);
      // Fallback: use local preview
      const localUrl = URL.createObjectURL(file);
      setPreviewUrl(localUrl);
      
      toast({
        title: 'A usar preview local',
        description: 'Imagem carregada localmente. Cole um URL para guardar.',
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      await uploadFile(files[0]);
    }
  }, []);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      await uploadFile(files[0]);
    }
  };

  const handleUrlSubmit = () => {
    if (imageUrl) {
      setPreviewUrl(imageUrl);
    }
  };

  const handleConfirm = () => {
    if (previewUrl) {
      onImageSelect(previewUrl, altText || 'Imagem');
      handleClose();
    }
  };

  const handleClose = () => {
    setPreviewUrl(null);
    setImageUrl('');
    setAltText('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Image className="h-5 w-5" />
            Adicionar Imagem
          </DialogTitle>
          <DialogDescription>
            Faz upload de uma imagem ou cola um URL
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'upload' | 'url')}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="upload" className="gap-2">
              <Upload className="h-4 w-4" />
              Upload
            </TabsTrigger>
            <TabsTrigger value="url" className="gap-2">
              <Link className="h-4 w-4" />
              URL
            </TabsTrigger>
          </TabsList>

          <TabsContent value="upload" className="space-y-4">
            {/* Drop zone */}
            <div
              className={cn(
                "border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer",
                isDragging ? "border-primary bg-primary/5" : "border-muted-foreground/30 hover:border-primary/50",
                isUploading && "pointer-events-none opacity-50"
              )}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileSelect}
              />
              
              {isUploading ? (
                <div className="flex flex-col items-center gap-3">
                  <Loader2 className="h-10 w-10 animate-spin text-primary" />
                  <p className="text-sm text-muted-foreground">A carregar...</p>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-3">
                  <div className="p-4 rounded-full bg-muted">
                    <Upload className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="font-medium">Arrasta uma imagem ou clica para selecionar</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      JPG, PNG, GIF ou WebP até 5MB
                    </p>
                  </div>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="url" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="image-url">URL da Imagem</Label>
              <div className="flex gap-2">
                <Input
                  id="image-url"
                  placeholder="https://exemplo.com/imagem.jpg"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                />
                <Button onClick={handleUrlSubmit} disabled={!imageUrl}>
                  Carregar
                </Button>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {/* Preview */}
        {previewUrl && (
          <div className="space-y-4 pt-4 border-t">
            <div className="relative">
              <img
                src={previewUrl}
                alt="Preview"
                className="w-full max-h-48 object-contain rounded-lg bg-muted"
              />
              <Button
                variant="secondary"
                size="icon"
                className="absolute top-2 right-2 h-7 w-7"
                onClick={() => setPreviewUrl(null)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="space-y-2">
              <Label htmlFor="alt-text">Texto Alternativo (opcional)</Label>
              <Input
                id="alt-text"
                placeholder="Descrição da imagem"
                value={altText}
                onChange={(e) => setAltText(e.target.value)}
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={handleClose}>
                Cancelar
              </Button>
              <Button onClick={handleConfirm}>
                <Check className="h-4 w-4 mr-2" />
                Inserir Imagem
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
