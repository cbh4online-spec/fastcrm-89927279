import { useState } from 'react';
import {
  Dialog,
  DialogPortal,
  DialogOverlay,
} from '@/components/ui/dialog';
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { EmailBuilder } from '@/components/email-builder';
import { renderEmailToHtml } from '@/utils/emailRenderer';
import { useCreateCampaign } from '@/hooks/useMarketingCampaigns';
import type { EmailDesign } from '@/types/emailBuilder';
import { CampaignMetadataForm } from './CampaignMetadataForm';

interface CampaignCreationFlowProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface SavedDesign {
  design: EmailDesign;
  html: string;
}

export function CampaignCreationFlow({
  open,
  onOpenChange,
}: CampaignCreationFlowProps) {
  const [step, setStep] = useState<'editor' | 'metadata'>('editor');
  const [savedDesign, setSavedDesign] = useState<SavedDesign | null>(null);
  const createCampaign = useCreateCampaign();

  const handleSaveDesign = (design: EmailDesign, html: string) => {
    setSavedDesign({ design, html });
    setStep('metadata');
  };

  const handleCancel = () => {
    // Reset state and close
    setStep('editor');
    setSavedDesign(null);
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
        // Note: design_json will be saved via a separate update once types are regenerated
      });
      
      // Reset and close
      setStep('editor');
      setSavedDesign(null);
      onOpenChange(false);
    } catch (error) {
      console.error('Error creating campaign:', error);
    }
  };

  // Reset when dialog closes
  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setStep('editor');
      setSavedDesign(null);
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
              initialDesign={savedDesign?.design}
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
