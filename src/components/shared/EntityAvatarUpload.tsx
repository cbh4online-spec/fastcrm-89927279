import { useState, useRef } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Camera, Upload, Trash2, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface EntityAvatarUploadProps {
  entityType: 'lead' | 'contact' | 'company';
  entityId: string;
  entityName: string;
  currentAvatarUrl?: string | null;
  onAvatarChange: (url: string | null) => void;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeClasses = {
  sm: "h-10 w-10",
  md: "h-16 w-16",
  lg: "h-24 w-24",
};

const textSizeClasses = {
  sm: "text-sm",
  md: "text-xl",
  lg: "text-2xl",
};

export function EntityAvatarUpload({
  entityType,
  entityId,
  entityName,
  currentAvatarUrl,
  onAvatarChange,
  size = 'md',
  className,
}: EntityAvatarUploadProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { currentWorkspace } = useWorkspace();
  
  const initials = entityName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
  
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error("Por favor selecione uma imagem válida");
      return;
    }
    
    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("A imagem deve ter no máximo 5MB");
      return;
    }
    
    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  };
  
  const handleUpload = async () => {
    if (!selectedFile || !currentWorkspace) return;
    
    setIsUploading(true);
    
    try {
      const fileExt = selectedFile.name.split('.').pop();
      const fileName = `${entityType}/${entityId}/avatar.${fileExt}`;
      
      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, selectedFile, { upsert: true });
      
      if (uploadError) {
        // If bucket doesn't exist, show a message
        if (uploadError.message?.includes('bucket')) {
          toast.error("Bucket de avatars não configurado. Contacte o administrador.");
        } else {
          throw uploadError;
        }
        return;
      }
      
      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);
      
      onAvatarChange(publicUrl);
      toast.success("Avatar atualizado com sucesso!");
      setIsDialogOpen(false);
      setSelectedFile(null);
      setPreviewUrl(null);
    } catch (error) {
      console.error('Error uploading avatar:', error);
      toast.error("Erro ao fazer upload do avatar");
    } finally {
      setIsUploading(false);
    }
  };
  
  const handleRemove = () => {
    onAvatarChange(null);
    setIsDialogOpen(false);
    toast.success("Avatar removido");
  };
  
  const handleCancel = () => {
    setIsDialogOpen(false);
    setSelectedFile(null);
    setPreviewUrl(null);
  };
  
  const getAvatarColor = () => {
    switch (entityType) {
      case 'lead':
        return "bg-gradient-to-br from-violet-500 to-violet-600";
      case 'contact':
        return "bg-gradient-to-br from-emerald-500 to-emerald-600";
      case 'company':
        return "bg-gradient-to-br from-blue-500 to-blue-600";
      default:
        return "bg-gradient-to-br from-primary to-primary/80";
    }
  };
  
  return (
    <>
      <div 
        className={cn(
          "relative group cursor-pointer",
          className
        )}
        onClick={() => setIsDialogOpen(true)}
      >
        <Avatar className={cn(
          sizeClasses[size],
          "ring-2 ring-offset-2 ring-offset-background",
          entityType === 'lead' && "ring-violet-500/20",
          entityType === 'contact' && "ring-emerald-500/20",
          entityType === 'company' && "ring-blue-500/20"
        )}>
          <AvatarImage src={currentAvatarUrl || undefined} />
          <AvatarFallback className={cn(
            "text-white font-semibold",
            textSizeClasses[size],
            getAvatarColor()
          )}>
            {initials}
          </AvatarFallback>
        </Avatar>
        
        {/* Hover overlay */}
        <div className={cn(
          "absolute inset-0 rounded-full bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity",
          sizeClasses[size]
        )}>
          <Camera className="w-5 h-5 text-white" />
        </div>
      </div>
      
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Alterar Avatar</DialogTitle>
            <DialogDescription>
              Faça upload de uma imagem para personalizar o perfil de {entityName}
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex flex-col items-center gap-4 py-4">
            {/* Preview */}
            <Avatar className="h-32 w-32">
              <AvatarImage src={previewUrl || currentAvatarUrl || undefined} />
              <AvatarFallback className={cn(
                "text-3xl text-white font-semibold",
                getAvatarColor()
              )}>
                {initials}
              </AvatarFallback>
            </Avatar>
            
            {/* Upload area */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
            />
            
            <Button
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              className="gap-2"
            >
              <Upload className="w-4 h-4" />
              Selecionar Imagem
            </Button>
            
            <p className="text-xs text-muted-foreground text-center">
              Formatos aceites: JPG, PNG, GIF (máx. 5MB)
            </p>
          </div>
          
          <DialogFooter className="flex-col sm:flex-row gap-2">
            {currentAvatarUrl && (
              <Button
                variant="outline"
                onClick={handleRemove}
                className="gap-2 text-destructive hover:text-destructive"
              >
                <Trash2 className="w-4 h-4" />
                Remover
              </Button>
            )}
            <div className="flex-1" />
            <Button variant="ghost" onClick={handleCancel}>
              Cancelar
            </Button>
            <Button 
              onClick={handleUpload} 
              disabled={!selectedFile || isUploading}
              className="gap-2"
            >
              {isUploading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  A carregar...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  Guardar
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
