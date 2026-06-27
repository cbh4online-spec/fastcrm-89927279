import { useRef, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Camera, Loader2, Trash2, Upload } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface EntityAvatarUploadProps {
  value?: string | null;
  onChange: (url: string | null) => void;
  name?: string;
  workspaceId: string;
  /** Folder prefix inside the `avatars` bucket — e.g. "contacts", "companies", "leads" */
  folder: string;
  size?: "md" | "lg" | "xl";
  className?: string;
}

const sizeMap = {
  md: "h-16 w-16 text-lg",
  lg: "h-20 w-20 text-xl",
  xl: "h-24 w-24 text-2xl",
};

export function EntityAvatarUpload({
  value,
  onChange,
  name = "",
  workspaceId,
  folder,
  size = "lg",
  className,
}: EntityAvatarUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  const initials =
    name
      .split(" ")
      .map((n) => n[0])
      .filter(Boolean)
      .join("")
      .toUpperCase()
      .slice(0, 2) || "?";

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Selecione uma imagem válida (PNG ou JPG)");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("A imagem deve ter no máximo 5MB");
      return;
    }
    if (!workspaceId) {
      toast.error("Workspace inválido");
      return;
    }

    setIsUploading(true);
    try {
      const ext = (file.name.split(".").pop() || "png").toLowerCase();
      const id = (crypto as Crypto & { randomUUID?: () => string }).randomUUID?.() ??
        `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const path = `${folder}/${workspaceId}/${id}.${ext}`;

      const { error: upErr } = await supabase.storage
        .from("avatars")
        .upload(path, file, { upsert: true, contentType: file.type });
      if (upErr) throw upErr;

      const { data } = supabase.storage.from("avatars").getPublicUrl(path);
      onChange(data.publicUrl);
      toast.success("Imagem carregada");
    } catch (err) {
      console.error("[EntityAvatarUpload] upload failed", err);
      toast.error("Não foi possível carregar a imagem");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className={cn("flex items-center gap-4", className)}>
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        className="group relative rounded-full focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
        aria-label="Alterar imagem"
      >
        <Avatar className={cn(sizeMap[size], "ring-1 ring-border")}>
          <AvatarImage src={value || undefined} alt={name} />
          <AvatarFallback className="bg-primary/10 font-semibold text-primary">
            {initials}
          </AvatarFallback>
        </Avatar>
        <span
          className={cn(
            "absolute inset-0 flex items-center justify-center rounded-full bg-black/50 opacity-0 transition-opacity group-hover:opacity-100",
            isUploading && "opacity-100",
          )}
        >
          {isUploading ? (
            <Loader2 className="h-5 w-5 animate-spin text-white" />
          ) : (
            <Camera className="h-5 w-5 text-white" />
          )}
        </span>
      </button>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        className="hidden"
        onChange={handleFile}
      />

      <div className="flex flex-col gap-2">
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="rounded-full"
            disabled={isUploading}
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="mr-2 h-3.5 w-3.5" />
            {value ? "Alterar imagem" : "Carregar imagem"}
          </Button>
          {value && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="rounded-full text-destructive hover:text-destructive"
              disabled={isUploading}
              onClick={() => onChange(null)}
            >
              <Trash2 className="mr-2 h-3.5 w-3.5" />
              Remover
            </Button>
          )}
        </div>
        <p className="text-xs text-muted-foreground">PNG ou JPG, até 5MB.</p>
      </div>
    </div>
  );
}
