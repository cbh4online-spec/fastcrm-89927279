import { useState } from 'react';
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';
import { EmailBuilder } from '@/components/email-builder';
import { renderEmailToHtml } from '@/utils/emailRenderer';
import { useCreateMarketingTemplate } from '@/hooks/useMarketingTemplates';
import { toast } from 'sonner';
import type { EmailDesign } from '@/types/emailBuilder';

interface EmailBuilderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialDesign?: EmailDesign;
  onSave?: (design: EmailDesign, html: string) => void;
}

export function EmailBuilderDialog({
  open,
  onOpenChange,
  initialDesign,
  onSave,
}: EmailBuilderDialogProps) {
  const createTemplate = useCreateMarketingTemplate();

  const handleSave = async (design: EmailDesign, html: string) => {
    if (onSave) {
      onSave(design, html);
      onOpenChange(false);
      return;
    }

    // Default: save as new template
    try {
      await createTemplate.mutateAsync({
        name: `Template Visual - ${new Date().toLocaleDateString('pt-PT')}`,
        description: 'Criado com o editor visual',
        bodyHtml: html,
        category: 'general',
        isActive: true,
      });
      toast.success('Template guardado com sucesso!');
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving template:', error);
      toast.error('Erro ao guardar template');
    }
  };

  const handleCancel = () => {
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[100vw] w-[100vw] h-[100vh] max-h-[100vh] p-0 rounded-none">
        <EmailBuilder
          initialDesign={initialDesign}
          onSave={handleSave}
          onCancel={handleCancel}
        />
      </DialogContent>
    </Dialog>
  );
}
