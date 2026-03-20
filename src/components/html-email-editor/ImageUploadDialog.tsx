import { useState, useRef, useEffect } from 'react';
import { Upload, Link2, Image as ImageIcon, Loader2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ImageUploadDialogProps {
  open: boolean;
  onClose: () => void;
  onSelect: (url: string) => void;
}

export function ImageUploadDialog({ open, onClose, onSelect }: ImageUploadDialogProps) {
  const [uploading, setUploading] = useState(false);
  const [externalUrl, setExternalUrl] = useState('');
  const [libraryImages, setLibraryImages] = useState<string[]>([]);
  const [loadingLibrary, setLoadingLibrary] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) loadLibrary();
  }, [open]);

  const loadLibrary = async () => {
    setLoadingLibrary(true);
    try {
      const { data, error } = await supabase.storage.from('email-images').list('', {
        limit: 50,
        sortBy: { column: 'created_at', order: 'desc' },
      });
      if (error) throw error;

      const urls = (data || [])
        .filter((f) => f.name && !f.name.startsWith('.'))
        .map((f) => {
          const { data: urlData } = supabase.storage.from('email-images').getPublicUrl(f.name);
          return urlData.publicUrl;
        });
      setLibraryImages(urls);
    } catch (err) {
      console.error('Error loading library:', err);
    } finally {
      setLoadingLibrary(false);
    }
  };

  const handleFileUpload = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast.error('Ficheiro deve ser uma imagem');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Imagem deve ter no máximo 5MB');
      return;
    }

    setUploading(true);
    try {
      const ext = file.name.split('.').pop() || 'png';
      const fileName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

      const { error } = await supabase.storage.from('email-images').upload(fileName, file, {
        cacheControl: '3600',
        upsert: false,
      });
      if (error) throw error;

      const { data: urlData } = supabase.storage.from('email-images').getPublicUrl(fileName);
      onSelect(urlData.publicUrl);
      toast.success('Imagem carregada');
      onClose();
    } catch (err: any) {
      console.error('Upload error:', err);
      toast.error(err.message || 'Erro ao carregar imagem');
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFileUpload(file);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Substituir imagem</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="upload">
          <TabsList className="w-full">
            <TabsTrigger value="upload" className="flex-1 text-xs gap-1">
              <Upload className="h-3 w-3" /> Upload
            </TabsTrigger>
            <TabsTrigger value="url" className="flex-1 text-xs gap-1">
              <Link2 className="h-3 w-3" /> URL
            </TabsTrigger>
            <TabsTrigger value="library" className="flex-1 text-xs gap-1">
              <ImageIcon className="h-3 w-3" /> Biblioteca
            </TabsTrigger>
          </TabsList>

          <TabsContent value="upload" className="mt-4">
            <div
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
            >
              {uploading ? (
                <Loader2 className="h-8 w-8 mx-auto animate-spin text-muted-foreground" />
              ) : (
                <>
                  <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">
                    Arrasta uma imagem ou clica para selecionar
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-1">
                    JPG, PNG, GIF, WebP · Máx. 5MB
                  </p>
                </>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFileUpload(file);
              }}
            />
          </TabsContent>

          <TabsContent value="url" className="mt-4 space-y-3">
            <div className="space-y-2">
              <Label className="text-xs">URL da imagem</Label>
              <Input
                value={externalUrl}
                onChange={(e) => setExternalUrl(e.target.value)}
                placeholder="https://exemplo.com/imagem.jpg"
                className="h-9"
              />
            </div>
            {externalUrl && (
              <div className="rounded-lg border overflow-hidden bg-muted">
                <img src={externalUrl} alt="Preview" className="w-full h-auto max-h-40 object-contain" />
              </div>
            )}
            <Button
              className="w-full h-9"
              disabled={!externalUrl.trim()}
              onClick={() => {
                onSelect(externalUrl);
                onClose();
              }}
            >
              Usar esta imagem
            </Button>
          </TabsContent>

          <TabsContent value="library" className="mt-4">
            {loadingLibrary ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : libraryImages.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                Nenhuma imagem na biblioteca
              </p>
            ) : (
              <div className="grid grid-cols-3 gap-2 max-h-64 overflow-y-auto">
                {libraryImages.map((url, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      onSelect(url);
                      onClose();
                    }}
                    className="rounded-lg border overflow-hidden hover:ring-2 ring-primary transition-all aspect-square"
                  >
                    <img src={url} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
