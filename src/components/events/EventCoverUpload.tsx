import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Upload, X, Image as ImageIcon, Loader2 } from "lucide-react";

interface EventCoverUploadProps {
  coverUrl: string | null;
  onUpload: (url: string) => void;
  onRemove: () => void;
}

export function EventCoverUpload({ coverUrl, onUpload, onRemove }: EventCoverUploadProps) {
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Apenas imagens são permitidas");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Imagem demasiado grande (máx 5MB)");
      return;
    }

    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `covers/${Date.now()}.${ext}`;

      const { error: uploadErr } = await supabase.storage
        .from("event-covers")
        .upload(path, file, { upsert: true });

      if (uploadErr) throw uploadErr;

      const { data: urlData } = supabase.storage
        .from("event-covers")
        .getPublicUrl(path);

      onUpload(urlData.publicUrl);
      toast.success("Imagem carregada!");
    } catch (err) {
      console.error("Upload error:", err);
      toast.error("Erro ao carregar imagem");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div className="space-y-2">
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={handleUpload}
        className="hidden"
      />

      {coverUrl ? (
        <div className="relative rounded-lg overflow-hidden border group">
          <img
            src={coverUrl}
            alt="Cover"
            className="w-full h-40 object-cover"
          />
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => inputRef.current?.click()}
              className="text-white hover:text-white hover:bg-white/20 rounded-full"
              disabled={uploading}
            >
              <Upload className="h-4 w-4 mr-1" /> Alterar
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onRemove}
              className="text-white hover:text-white hover:bg-white/20 rounded-full"
            >
              <X className="h-4 w-4 mr-1" /> Remover
            </Button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="w-full h-32 rounded-lg border-2 border-dashed border-border hover:border-primary/50 transition-colors flex flex-col items-center justify-center gap-2 text-muted-foreground hover:text-foreground"
        >
          {uploading ? (
            <>
              <Loader2 className="h-6 w-6 animate-spin" />
              <span className="text-xs">A carregar...</span>
            </>
          ) : (
            <>
              <ImageIcon className="h-6 w-6" />
              <span className="text-xs">Adicionar capa do evento</span>
            </>
          )}
        </button>
      )}
    </div>
  );
}
