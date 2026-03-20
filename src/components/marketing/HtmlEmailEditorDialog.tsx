import { useState, useRef, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { HtmlEmailEditor } from '@/components/html-email-editor';
import { useCreateMarketingTemplate } from '@/hooks/useMarketingTemplates';
import { toast } from 'sonner';

interface HtmlEmailEditorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialHtml?: string;
  campaignName?: string;
  onSave?: (html: string) => void;
}

export function HtmlEmailEditorDialog({
  open,
  onOpenChange,
  initialHtml,
  campaignName,
  onSave,
}: HtmlEmailEditorDialogProps) {
  const [html, setHtml] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const createTemplate = useCreateMarketingTemplate();

  const handleSave = useCallback(async (savedHtml: string) => {
    if (onSave) {
      onSave(savedHtml);
      onOpenChange(false);
      return;
    }

    try {
      await createTemplate.mutateAsync({
        name: campaignName || `Template HTML ${new Date().toLocaleDateString('pt-PT')}`,
        subject: '',
        html_content: savedHtml,
        category: 'custom',
      });
      toast.success('Template HTML guardado');
      onOpenChange(false);
    } catch (e) {
      toast.error('Erro ao guardar template');
    }
  }, [onSave, onOpenChange, createTemplate, campaignName]);

  // If no initial HTML, show file picker first
  if (open && !initialHtml && !html) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md">
          <div className="space-y-4 text-center py-4">
            <h3 className="font-semibold">Importar HTML</h3>
            <p className="text-sm text-muted-foreground">
              Seleciona um ficheiro HTML para abrir no editor visual.
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".html,.htm"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = (ev) => {
                  const content = ev.target?.result as string;
                  if (content?.trim()) {
                    setHtml(content);
                  } else {
                    toast.error('Ficheiro vazio');
                  }
                };
                reader.readAsText(file);
              }}
            />
            <div className="flex flex-col gap-2">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed rounded-lg p-8 hover:border-primary/50 transition-colors cursor-pointer text-muted-foreground hover:text-foreground"
              >
                <p className="text-sm font-medium">Clica para selecionar ficheiro</p>
                <p className="text-xs mt-1">.html ou .htm</p>
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  const activeHtml = initialHtml || html;
  if (!activeHtml) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Content
        className="fixed inset-0 z-50 bg-background"
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={() => onOpenChange(false)}
      >
        <HtmlEmailEditor
          htmlContent={activeHtml}
          campaignName={campaignName}
          onSave={handleSave}
          onCancel={() => {
            setHtml('');
            onOpenChange(false);
          }}
        />
      </DialogPrimitive.Content>
    </Dialog>
  );
}
