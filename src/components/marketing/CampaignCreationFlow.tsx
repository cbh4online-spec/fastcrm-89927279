import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogPortal,
  DialogOverlay,
} from '@/components/ui/dialog';
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { EmailBuilder } from '@/components/email-builder';
import { renderEmailToHtml } from '@/utils/emailRenderer';
import { useCreateCampaign } from '@/hooks/useMarketingCampaigns';
import type { EmailDesign, HtmlBlockContent } from '@/types/emailBuilder';
import { CampaignMetadataForm } from './CampaignMetadataForm';
import { generateBlockId } from '@/types/emailBuilder';

interface CampaignCreationFlowProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialHtml?: string | null;
}

interface SavedDesign {
  design: EmailDesign;
  html: string;
}

export function CampaignCreationFlow({
  open,
  onOpenChange,
  initialHtml,
}: CampaignCreationFlowProps) {
  const [step, setStep] = useState<'editor' | 'metadata'>('editor');
  const [savedDesign, setSavedDesign] = useState<SavedDesign | null>(null);
  const [initialDesignFromHtml, setInitialDesignFromHtml] = useState<EmailDesign | undefined>(undefined);
  const createCampaign = useCreateCampaign();

  // When initialHtml changes and dialog opens, create an initial design with an HTML block
  useEffect(() => {
    if (open && initialHtml) {
      const design: EmailDesign = {
        blocks: [
          {
            id: generateBlockId(),
            type: 'html',
            content: { html: initialHtml } as HtmlBlockContent,
            styles: { padding: '0' },
          },
        ],
        globalStyles: {
          backgroundColor: '#f5f5f5',
          contentBackgroundColor: '#ffffff',
          contentWidth: 600,
          fontFamily: 'Arial, sans-serif',
          textColor: '#333333',
          linkColor: '#3b82f6',
          accentColor: '#3b82f6',
          borderRadius: 8,
        },
      };
      setInitialDesignFromHtml(design);
    } else if (!open) {
      setInitialDesignFromHtml(undefined);
    }
  }, [open, initialHtml]);

  const handleSaveDesign = (design: EmailDesign, html: string) => {
    setSavedDesign({ design, html });
    setStep('metadata');
  };

  const handleCancel = () => {
    setStep('editor');
    setSavedDesign(null);
    setInitialDesignFromHtml(undefined);
    onOpenChange(false);
  };

  const handleBackToEditor = () => {
    setStep('editor');
  };

  const handleCreateCampaign = async (metadata: {
    name: string;
    subject: string;
    previewText?: string;
    fromName: string;
    replyTo?: string;
    segmentId?: string;
  }) => {
    if (!savedDesign) return;

    try {
      await createCampaign.mutateAsync({
        ...metadata,
        bodyHtml: savedDesign.html,
        designJson: savedDesign.design as unknown as Record<string, unknown>,
      });
      
      setStep('editor');
      setSavedDesign(null);
      setInitialDesignFromHtml(undefined);
      onOpenChange(false);
    } catch (error) {
      console.error('Error creating campaign:', error);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setStep('editor');
      setSavedDesign(null);
      setInitialDesignFromHtml(undefined);
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogPortal>
        <DialogOverlay />
        <DialogPrimitive.Content
          className="fixed inset-0 z-50 bg-background overflow-hidden"
          onPointerDownOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={handleCancel}
        >
          {step === 'editor' && (
            <EmailBuilder
              initialDesign={initialDesignFromHtml || savedDesign?.design}
              onSave={handleSaveDesign}
              onCancel={handleCancel}
            />
          )}
          
          {step === 'metadata' && savedDesign && (
            <CampaignMetadataForm
              html={savedDesign.html}
              onSubmit={handleCreateCampaign}
              onBack={handleBackToEditor}
              onCancel={handleCancel}
              isLoading={createCampaign.isPending}
            />
          )}
        </DialogPrimitive.Content>
      </DialogPortal>
    </Dialog>
  );
}
