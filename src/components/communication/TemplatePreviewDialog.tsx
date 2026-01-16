import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Mail, MessageCircle, Inbox, StickyNote, Copy } from 'lucide-react';
import { 
  CommunicationTemplate, 
  TemplateChannel,
  CHANNEL_LABELS,
  JOURNEY_CONTEXT_LABELS,
  TONE_LABELS,
  renderTemplate,
  getPreviewVariables
} from '@/types/communicationTemplate';
import { toast } from 'sonner';

interface TemplatePreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template: CommunicationTemplate;
}

const CHANNEL_ICONS: Record<TemplateChannel, React.ElementType> = {
  email: Mail,
  whatsapp: MessageCircle,
  inbox: Inbox,
  note: StickyNote
};

export function TemplatePreviewDialog({ open, onOpenChange, template }: TemplatePreviewDialogProps) {
  const ChannelIcon = CHANNEL_ICONS[template.channel];
  const previewVariables = getPreviewVariables();
  const previewSubject = template.subject ? renderTemplate(template.subject, previewVariables) : '';
  const previewBody = renderTemplate(template.body, previewVariables);

  const handleCopy = () => {
    navigator.clipboard.writeText(previewBody);
    toast.success('Mensagem copiada');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <ChannelIcon className="h-5 w-5 text-primary" />
            </div>
            <div>
              <DialogTitle>{template.name}</DialogTitle>
              <p className="text-sm text-muted-foreground">
                {CHANNEL_LABELS[template.channel]} • {TONE_LABELS[template.tone]}
              </p>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          {/* Contexts */}
          <div>
            <div className="text-sm font-medium mb-2">Contextos de uso:</div>
            <div className="flex flex-wrap gap-1">
              {template.journeyContexts.map(ctx => (
                <Badge key={ctx} variant="secondary">
                  {JOURNEY_CONTEXT_LABELS[ctx]}
                </Badge>
              ))}
            </div>
          </div>

          {/* Preview */}
          <div className="rounded-lg border overflow-hidden">
            <div className="bg-muted/50 px-4 py-2 text-xs text-muted-foreground border-b">
              Pré-visualização (com dados de exemplo)
            </div>
            <div className="p-4 space-y-3">
              {template.channel === 'email' && previewSubject && (
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Assunto:</div>
                  <div className="font-medium">{previewSubject}</div>
                </div>
              )}
              <div>
                {template.channel === 'email' && previewSubject && (
                  <div className="text-xs text-muted-foreground mb-1">Corpo:</div>
                )}
                <div className="whitespace-pre-wrap text-sm">{previewBody}</div>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span>{template.usageCount} utilizações</span>
            {template.responseRate && (
              <span>{template.responseRate.toFixed(1)}% taxa de resposta</span>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={handleCopy}>
              <Copy className="h-4 w-4 mr-2" />
              Copiar
            </Button>
            <Button onClick={() => onOpenChange(false)}>
              Fechar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
