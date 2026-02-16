import { useState, useRef, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Upload, Sparkles, Image, Loader2, X } from "lucide-react";

const AI_MESSAGES = [
  "A imaginar a sua imagem...",
  "A criar algo único...",
  "A dar vida ao prompt...",
  "Quase pronta...",
  "A aplicar os toques finais...",
];

interface BioImageUploaderProps {
  workspaceId: string;
  currentImage?: string;
  onImageSelected: (url: string) => void;
  label?: string;
}

export function BioImageUploader({ workspaceId, currentImage, onImageSelected, label = "Escolher Imagem" }: BioImageUploaderProps) {
  const [open, setOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [preview, setPreview] = useState<string | null>(null);
  const [aiMessageIndex, setAiMessageIndex] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const startRotatingMessages = () => {
    setAiMessageIndex(0);
    intervalRef.current = setInterval(() => {
      setAiMessageIndex((prev) => (prev + 1) % AI_MESSAGES.length);
    }, 2500);
  };

  const stopRotatingMessages = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  const handleFileUpload = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Por favor selecione um ficheiro de imagem.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Ficheiro demasiado grande (máx. 5MB).");
      return;
    }

    setUploading(true);
    try {
      const ext = file.name.split(".").pop() || "png";
      const filePath = `${workspaceId}/bio-${Date.now()}.${ext}`;

      const { error } = await supabase.storage.from("bio-assets").upload(filePath, file, {
        contentType: file.type,
        upsert: true,
      });
      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage.from("bio-assets").getPublicUrl(filePath);

      setPreview(publicUrl);
      onImageSelected(publicUrl);
      toast.success("Imagem carregada com sucesso!");
      setOpen(false);
    } catch (err: any) {
      console.error("Upload error:", err);
      toast.error("Erro ao carregar imagem: " + (err.message || "Erro desconhecido"));
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileUpload(file);
  }, [workspaceId]);

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast.error("Escreva um prompt para gerar a imagem.");
      return;
    }

    setGenerating(true);
    startRotatingMessages();
    try {
      const { data, error } = await supabase.functions.invoke("bio-generate-image", {
        body: { prompt: prompt.trim(), workspaceId },
      });

      if (error) throw error;
      if (data?.error) {
        toast.error(data.error);
        return;
      }

      if (data?.url) {
        setPreview(data.url);
        onImageSelected(data.url);
        toast.success("Imagem gerada com sucesso!");
        setOpen(false);
      }
    } catch (err: any) {
      console.error("Generate error:", err);
      toast.error("Erro ao gerar imagem: " + (err.message || "Erro desconhecido"));
    } finally {
      setGenerating(false);
      stopRotatingMessages();
    }
  };

  return (
    <div className="space-y-2">
      {currentImage && (
        <div className="relative group rounded-lg overflow-hidden border">
          <img src={currentImage} alt="Imagem actual" className="w-full h-24 object-cover" />
          <button
            className="absolute top-1 right-1 bg-background/80 rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={() => onImageSelected("")}
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm" className="w-full gap-2">
            <Image className="h-4 w-4" />
            {label}
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Adicionar Imagem</DialogTitle>
          </DialogHeader>

          <Tabs defaultValue="upload" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="upload" className="gap-1.5">
                <Upload className="h-3.5 w-3.5" />
                Upload
              </TabsTrigger>
              <TabsTrigger value="ai" className="gap-1.5">
                <Sparkles className="h-3.5 w-3.5" />
                Gerar com IA
              </TabsTrigger>
            </TabsList>

            <TabsContent value="upload" className="mt-4">
              <div
                className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors cursor-pointer ${
                  dragOver ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-primary/50"
                }`}
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                {uploading ? (
                  <div className="flex flex-col items-center gap-2">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <p className="text-sm text-muted-foreground">A carregar...</p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2">
                    <Upload className="h-8 w-8 text-muted-foreground" />
                    <p className="text-sm font-medium">Arraste uma imagem ou clique para selecionar</p>
                    <p className="text-xs text-muted-foreground">PNG, JPG, WebP • Máx. 5MB</p>
                  </div>
                )}
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
              </div>
            </TabsContent>

            <TabsContent value="ai" className="mt-4 space-y-4">
              <Textarea
                placeholder="Descreva a imagem que deseja gerar... Ex: 'Uma paisagem tropical com tons quentes e vibrantes'"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                rows={3}
                disabled={generating}
              />
              <Button onClick={handleGenerate} disabled={generating || !prompt.trim()} className="w-full gap-2">
                {generating ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {AI_MESSAGES[aiMessageIndex]}
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    Gerar Imagem
                  </>
                )}
              </Button>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    </div>
  );
}
