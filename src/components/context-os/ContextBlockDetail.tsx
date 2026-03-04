import { useState, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ContextFieldEditor } from "./ContextFieldEditor";
import { ContextScoreRing } from "./ContextScoreRing";
import { ContextVersionsTab } from "./ContextVersionsTab";
import { ContextCommentsTab } from "./ContextCommentsTab";
import { ContextAttachmentsTab } from "./ContextAttachmentsTab";
import { TagInput } from "./TagInput";
import {
  ContextBlock, BLOCK_META,
  useUpsertContextField, useUpdateBlockStatus, useUpdateBlockRichText, useUpdateBlockTags,
} from "@/hooks/useContextBlocks";
import { useCreateVersion } from "@/hooks/useContextVersions";
import { Save, CheckCircle2, RotateCcw, FileText, List, Clock, MessageSquare, Paperclip } from "lucide-react";
import { toast } from "sonner";

interface Props {
  block: ContextBlock;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ContextBlockDetail({ block, open, onOpenChange }: Props) {
  const meta = BLOCK_META[block.block_type];
  const upsertField = useUpsertContextField();
  const updateStatus = useUpdateBlockStatus();
  const updateRichText = useUpdateBlockRichText();
  const updateTags = useUpdateBlockTags();
  const createVersion = useCreateVersion();

  const [richText, setRichText] = useState(block.rich_text || '');
  const [localFields, setLocalFields] = useState<Record<string, any>>({});
  const [tags, setTags] = useState<string[]>(block.tags || []);

  const handleFieldChange = useCallback((fieldId: string, value: any) => {
    setLocalFields(prev => ({ ...prev, [fieldId]: value }));
  }, []);

  const handleSaveFields = useCallback(async () => {
    const promises = Object.entries(localFields).map(([fieldId, value]) =>
      upsertField.mutateAsync({ fieldId, value })
    );
    await Promise.all(promises);
    // Create version snapshot
    createVersion.mutate({ block, changeSummary: "Campos atualizados" });
    setLocalFields({});
    toast.success("Campos guardados");
  }, [localFields, upsertField, createVersion, block]);

  const handleSaveRichText = useCallback(() => {
    updateRichText.mutate({ blockId: block.id, richText });
    createVersion.mutate({ block: { ...block, rich_text: richText }, changeSummary: "Resumo atualizado" });
  }, [block, richText, updateRichText, createVersion]);

  const handleSaveTags = useCallback(() => {
    updateTags.mutate({ blockId: block.id, tags });
  }, [block.id, tags, updateTags]);

  const handleStatusToggle = useCallback(() => {
    const newStatus = block.status === 'draft' ? 'approved' : 'draft';
    updateStatus.mutate({ blockId: block.id, status: newStatus });
  }, [block, updateStatus]);

  const hasUnsavedFields = Object.keys(localFields).length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto bg-card border-gold/20">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2 text-lg">
              <span className="text-xl">{meta.icon}</span>
              {meta.labelPt}
              <Badge variant={block.status === 'approved' ? 'default' : 'secondary'} className="ml-2 text-[10px]">
                {block.status === 'approved' ? 'Aprovado' : 'Rascunho'}
              </Badge>
            </DialogTitle>
            <ContextScoreRing score={block.score} size={48} strokeWidth={4} />
          </div>
        </DialogHeader>

        <Tabs defaultValue="fields" className="mt-2">
          <TabsList className="w-full bg-muted/30 grid grid-cols-5">
            <TabsTrigger value="fields" className="gap-1 text-[11px]">
              <List className="h-3 w-3" /> Campos
            </TabsTrigger>
            <TabsTrigger value="summary" className="gap-1 text-[11px]">
              <FileText className="h-3 w-3" /> Resumo
            </TabsTrigger>
            <TabsTrigger value="versions" className="gap-1 text-[11px]">
              <Clock className="h-3 w-3" /> Versões
            </TabsTrigger>
            <TabsTrigger value="comments" className="gap-1 text-[11px]">
              <MessageSquare className="h-3 w-3" /> Comentários
            </TabsTrigger>
            <TabsTrigger value="attachments" className="gap-1 text-[11px]">
              <Paperclip className="h-3 w-3" /> Anexos
            </TabsTrigger>
          </TabsList>

          <TabsContent value="fields" className="space-y-4 mt-4">
            {(block.fields || []).map(field => (
              <ContextFieldEditor
                key={field.id}
                field={{ ...field, field_value: localFields[field.id] !== undefined ? localFields[field.id] : field.field_value }}
                onChange={handleFieldChange}
              />
            ))}
            <Button
              onClick={handleSaveFields}
              disabled={!hasUnsavedFields || upsertField.isPending}
              className="w-full gap-2 bg-gold hover:bg-gold/90 text-gold-foreground"
            >
              <Save className="h-4 w-4" /> Guardar Campos
            </Button>
          </TabsContent>

          <TabsContent value="summary" className="space-y-4 mt-4">
            <Textarea
              value={richText}
              onChange={e => setRichText(e.target.value)}
              placeholder="Escreva um resumo em texto livre ou markdown..."
              className="min-h-[200px] bg-background/50 border-border/50 text-sm"
            />
            <Button
              onClick={handleSaveRichText}
              disabled={updateRichText.isPending}
              className="w-full gap-2 bg-gold hover:bg-gold/90 text-gold-foreground"
            >
              <Save className="h-4 w-4" /> Guardar Resumo
            </Button>
          </TabsContent>

          <TabsContent value="versions" className="mt-4">
            <ContextVersionsTab blockId={block.id} />
          </TabsContent>

          <TabsContent value="comments" className="mt-4">
            <ContextCommentsTab blockId={block.id} />
          </TabsContent>

          <TabsContent value="attachments" className="mt-4">
            <ContextAttachmentsTab blockId={block.id} />
          </TabsContent>
        </Tabs>

        {/* Tags */}
        <div className="mt-4 space-y-2">
          <p className="text-xs font-medium text-muted-foreground">Tags</p>
          <TagInput values={tags} onChange={setTags} placeholder="Adicionar tag..." />
          {JSON.stringify(tags) !== JSON.stringify(block.tags || []) && (
            <Button size="sm" variant="outline" onClick={handleSaveTags} className="text-xs">
              Guardar Tags
            </Button>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2 mt-4 pt-4 border-t border-border/50">
          <Button
            variant="outline"
            onClick={handleStatusToggle}
            disabled={updateStatus.isPending}
            className="flex-1 gap-2 text-xs"
          >
            {block.status === 'draft' ? (
              <><CheckCircle2 className="h-3.5 w-3.5 text-green-500" /> Aprovar</>
            ) : (
              <><RotateCcw className="h-3.5 w-3.5" /> Reverter para Rascunho</>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
