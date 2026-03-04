import { useState, useRef } from "react";
import {
  useContextAttachments,
  useAddUrlAttachment,
  useUploadFileAttachment,
  useDeleteAttachment,
} from "@/hooks/useContextAttachments";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Upload, Link2, Trash2, FileText, ExternalLink, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { pt } from "date-fns/locale";

interface Props {
  blockId: string;
}

export function ContextAttachmentsTab({ blockId }: Props) {
  const { data: attachments, isLoading } = useContextAttachments(blockId);
  const addUrl = useAddUrlAttachment();
  const uploadFile = useUploadFileAttachment();
  const deleteAttachment = useDeleteAttachment();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [showUrlForm, setShowUrlForm] = useState(false);
  const [urlName, setUrlName] = useState("");
  const [urlValue, setUrlValue] = useState("");

  const handleAddUrl = () => {
    if (!urlValue.trim() || !urlName.trim()) return;
    addUrl.mutate(
      { blockId, url: urlValue.trim(), name: urlName.trim() },
      {
        onSuccess: () => {
          setUrlName("");
          setUrlValue("");
          setShowUrlForm(false);
        },
      }
    );
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      return alert("Ficheiro demasiado grande (máx 10MB)");
    }
    uploadFile.mutate({ blockId, file });
    e.target.value = "";
  };

  const formatSize = (bytes: number | null) => {
    if (!bytes) return "";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-5 w-5 animate-spin text-gold" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Actions */}
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          className="text-xs gap-1.5"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploadFile.isPending}
        >
          {uploadFile.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
          Carregar Ficheiro
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="text-xs gap-1.5"
          onClick={() => setShowUrlForm(!showUrlForm)}
        >
          <Link2 className="h-3.5 w-3.5" /> Adicionar URL
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          onChange={handleFileChange}
          accept=".pdf,.doc,.docx,.xlsx,.xls,.csv,.png,.jpg,.jpeg,.webp,.txt,.md"
        />
      </div>

      {/* URL Form */}
      {showUrlForm && (
        <div className="flex gap-2 p-3 rounded-lg border border-border/50 bg-muted/10">
          <Input
            value={urlName}
            onChange={e => setUrlName(e.target.value)}
            placeholder="Nome do link..."
            className="text-sm bg-background/50"
          />
          <Input
            value={urlValue}
            onChange={e => setUrlValue(e.target.value)}
            placeholder="https://..."
            className="text-sm bg-background/50 flex-1"
          />
          <Button
            size="sm"
            onClick={handleAddUrl}
            disabled={addUrl.isPending || !urlName.trim() || !urlValue.trim()}
            className="bg-gold hover:bg-gold/90 text-gold-foreground"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Attachment list */}
      <div className="space-y-2">
        {(!attachments || attachments.length === 0) && (
          <p className="text-sm text-muted-foreground text-center py-4">
            Sem anexos. Carregue ficheiros ou adicione URLs de referência.
          </p>
        )}
        {(attachments || []).map(a => (
          <div
            key={a.id}
            className={cn(
              "flex items-center gap-3 p-3 rounded-lg",
              "border border-border/30 bg-muted/10",
              "group hover:border-gold/20 transition-colors"
            )}
          >
            <div className={cn(
              "h-8 w-8 rounded flex items-center justify-center flex-shrink-0",
              a.attachment_type === 'url' ? "bg-primary/10 text-primary" : "bg-gold/10 text-gold"
            )}>
              {a.attachment_type === 'url' ? <Link2 className="h-4 w-4" /> : <FileText className="h-4 w-4" />}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">{a.file_name}</p>
              <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                <span>{format(new Date(a.created_at), "d MMM yyyy", { locale: pt })}</span>
                {a.file_size && <span>· {formatSize(a.file_size)}</span>}
              </div>
            </div>
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              {a.file_url && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0"
                  onClick={() => window.open(a.file_url!, "_blank")}
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0 hover:text-destructive"
                onClick={() => deleteAttachment.mutate({ attachmentId: a.id, blockId })}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
