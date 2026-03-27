import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Paperclip, X, FileIcon, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { toast } from "sonner";

export interface EmailAttachment {
  name: string;
  size: number;
  url: string;
  path: string;
}

interface EmailAttachmentListProps {
  attachments: EmailAttachment[];
  onChange: (attachments: EmailAttachment[]) => void;
  disabled?: boolean;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function EmailAttachmentList({ attachments, onChange, disabled }: EmailAttachmentListProps) {
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { currentWorkspace } = useWorkspace();

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !currentWorkspace) return;

    setUploading(true);
    const newAttachments: EmailAttachment[] = [];

    try {
      for (const file of Array.from(files)) {
        if (file.size > 10 * 1024 * 1024) {
          toast.error(`"${file.name}" excede 10MB`);
          continue;
        }

        const uuid = crypto.randomUUID();
        const path = `${currentWorkspace.id}/${uuid}/${file.name}`;

        const { error } = await supabase.storage
          .from("email-attachments")
          .upload(path, file);

        if (error) {
          toast.error(`Erro ao enviar "${file.name}"`);
          continue;
        }

        const { data: urlData } = supabase.storage
          .from("email-attachments")
          .getPublicUrl(path);

        newAttachments.push({
          name: file.name,
          size: file.size,
          url: urlData.publicUrl,
          path,
        });
      }

      if (newAttachments.length > 0) {
        onChange([...attachments, ...newAttachments]);
        toast.success(`${newAttachments.length} ficheiro(s) anexado(s)`);
      }
    } catch {
      toast.error("Erro ao enviar ficheiros");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleRemove = async (index: number) => {
    const att = attachments[index];
    await supabase.storage.from("email-attachments").remove([att.path]);
    onChange(attachments.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-2">
      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={handleUpload}
        disabled={disabled || uploading}
      />

      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="gap-1"
        onClick={() => fileInputRef.current?.click()}
        disabled={disabled || uploading}
      >
        {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Paperclip className="w-4 h-4" />}
        <span className="hidden sm:inline">Anexar</span>
      </Button>

      {attachments.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {attachments.map((att, i) => (
            <div
              key={att.path}
              className="flex items-center gap-1.5 px-2 py-1 bg-muted rounded-md text-xs"
            >
              <FileIcon className="w-3 h-3 text-muted-foreground" />
              <span className="max-w-[120px] truncate">{att.name}</span>
              <span className="text-muted-foreground">({formatFileSize(att.size)})</span>
              <button
                type="button"
                onClick={() => handleRemove(i)}
                className="text-muted-foreground hover:text-destructive ml-1"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
