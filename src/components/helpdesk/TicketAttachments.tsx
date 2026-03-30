import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Paperclip, X, Download, FileText, Image as ImageIcon, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { saveAs } from "file-saver";

interface Attachment {
  name: string;
  url: string;
  type: string;
  size: number;
}

interface TicketAttachmentsProps {
  ticketId: string;
  attachments: Attachment[];
  onAttachmentsChange: (attachments: Attachment[]) => void;
  readOnly?: boolean;
}

export function TicketAttachments({
  ticketId,
  attachments,
  onAttachmentsChange,
  readOnly = false,
}: TicketAttachmentsProps) {
  const [uploading, setUploading] = useState(false);

  const onDrop = useCallback(
    async (files: File[]) => {
      if (files.length === 0) return;
      setUploading(true);

      try {
        const { data: { user } } = await supabase.auth.getUser();
        const newAttachments: Attachment[] = [];

        for (const file of files) {
          const ext = file.name.split(".").pop();
          const path = `${user?.id || "anon"}/${ticketId}/${Date.now()}-${file.name}`;

          const { error } = await supabase.storage
            .from("ticket-attachments")
            .upload(path, file);

          if (error) {
            toast.error(`Erro ao enviar ${file.name}`);
            continue;
          }

          const { data: urlData } = supabase.storage
            .from("ticket-attachments")
            .getPublicUrl(path);

          newAttachments.push({
            name: file.name,
            url: urlData.publicUrl,
            type: file.type,
            size: file.size,
          });
        }

        onAttachmentsChange([...attachments, ...newAttachments]);
        if (newAttachments.length > 0) {
          toast.success(`${newAttachments.length} ficheiro(s) enviado(s)`);
        }
      } catch {
        toast.error("Erro ao enviar ficheiros");
      } finally {
        setUploading(false);
      }
    },
    [ticketId, attachments, onAttachmentsChange]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    maxSize: 10 * 1024 * 1024, // 10MB
    disabled: readOnly || uploading,
  });

  const removeAttachment = (index: number) => {
    const updated = attachments.filter((_, i) => i !== index);
    onAttachmentsChange(updated);
  };

  const downloadAttachment = (att: Attachment) => {
    saveAs(att.url, att.name);
  };

  const isImage = (type: string) => type.startsWith("image/");

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes}B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
  };

  return (
    <div className="space-y-2">
      {/* Upload zone */}
      {!readOnly && (
        <div
          {...getRootProps()}
          className={cn(
            "border-2 border-dashed rounded-lg p-3 text-center cursor-pointer transition-colors",
            isDragActive
              ? "border-primary bg-primary/5"
              : "border-border hover:border-primary/50",
            uploading && "opacity-50 pointer-events-none"
          )}
        >
          <input {...getInputProps()} />
          {uploading ? (
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              A enviar...
            </div>
          ) : (
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Paperclip className="h-4 w-4" />
              {isDragActive ? "Soltar ficheiros aqui" : "Arrastar ficheiros ou clicar para enviar"}
            </div>
          )}
        </div>
      )}

      {/* Attachments list */}
      {attachments.length > 0 && (
        <div className="space-y-1.5">
          {attachments.map((att, i) => (
            <div
              key={i}
              className="flex items-center gap-2 p-2 rounded-md bg-muted/50 border"
            >
              {isImage(att.type) ? (
                <img
                  src={att.url}
                  alt={att.name}
                  className="h-10 w-10 rounded object-cover shrink-0"
                />
              ) : (
                <div className="h-10 w-10 rounded bg-muted flex items-center justify-center shrink-0">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium truncate">{att.name}</p>
                <p className="text-[10px] text-muted-foreground">{formatSize(att.size)}</p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => downloadAttachment(att)}
                >
                  <Download className="h-3.5 w-3.5" />
                </Button>
                {!readOnly && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-destructive"
                    onClick={() => removeAttachment(i)}
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
