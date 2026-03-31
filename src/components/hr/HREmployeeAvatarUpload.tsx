import { useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useUpdateHREmployee } from "@/hooks/hr/useHREmployees";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Camera, Loader2 } from "lucide-react";
import { toast } from "sonner";
import imageCompression from "browser-image-compression";
import { cn } from "@/lib/utils";

interface HREmployeeAvatarUploadProps {
  employeeId: string;
  workspaceId: string;
  currentAvatarUrl?: string | null;
  fallbackInitial: string;
  size?: "sm" | "md" | "lg";
  disabled?: boolean;
}

const SIZE_MAP = {
  sm: "h-10 w-10",
  md: "h-16 w-16",
  lg: "h-24 w-24",
} as const;

const ICON_SIZE_MAP = {
  sm: "h-3 w-3",
  md: "h-4 w-4",
  lg: "h-5 w-5",
} as const;

export function HREmployeeAvatarUpload({
  employeeId,
  workspaceId,
  currentAvatarUrl,
  fallbackInitial,
  size = "md",
  disabled = false,
}: HREmployeeAvatarUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const updateEmployee = useUpdateHREmployee();

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Por favor selecione uma imagem");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("A imagem não pode exceder 5MB");
      return;
    }

    setIsUploading(true);
    try {
      // Compress image
      const compressed = await imageCompression(file, {
        maxSizeMB: 0.5,
        maxWidthOrHeight: 512,
        useWebWorker: true,
      });

      // Generate preview
      const preview = URL.createObjectURL(compressed);
      setPreviewUrl(preview);

      // Upload to storage
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${workspaceId}/${employeeId}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("hr-avatars")
        .upload(path, compressed, { upsert: true, contentType: compressed.type });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from("hr-avatars")
        .getPublicUrl(path);

      const avatarUrl = `${urlData.publicUrl}?t=${Date.now()}`;

      // Update employee record
      updateEmployee.mutate(
        { id: employeeId, avatar_url: avatarUrl },
        {
          onSuccess: () => toast.success("Foto atualizada"),
          onError: (err) => {
            toast.error("Erro ao guardar foto");
            console.error(err);
          },
        }
      );
    } catch (err) {
      console.error("Upload error:", err);
      toast.error("Erro ao fazer upload da foto");
      setPreviewUrl(null);
    } finally {
      setIsUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const displayUrl = previewUrl || currentAvatarUrl || undefined;

  return (
    <div
      className={cn("relative group cursor-pointer", disabled && "pointer-events-none opacity-60")}
      onClick={() => !isUploading && inputRef.current?.click()}
      title="Alterar foto de perfil"
    >
      <Avatar className={cn(SIZE_MAP[size], "transition-opacity group-hover:opacity-75")}>
        <AvatarImage src={displayUrl} />
        <AvatarFallback className={size === "lg" ? "text-2xl" : size === "md" ? "text-xl" : "text-sm"}>
          {fallbackInitial}
        </AvatarFallback>
      </Avatar>

      {/* Overlay */}
      <div
        className={cn(
          "absolute inset-0 flex items-center justify-center rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity",
          isUploading && "opacity-100"
        )}
      >
        {isUploading ? (
          <Loader2 className={cn(ICON_SIZE_MAP[size], "animate-spin text-white")} />
        ) : (
          <Camera className={cn(ICON_SIZE_MAP[size], "text-white")} />
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={handleFileSelect}
      />
    </div>
  );
}
