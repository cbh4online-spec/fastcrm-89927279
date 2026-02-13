import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Mail, MessageCircle, Inbox, StickyNote, Copy, Zap } from 'lucide-react';
import { 
  CommunicationTemplate, 
  TemplateChannel,
  CHANNEL_LABELS,
  JOURNEY_CONTEXT_LABELS,
  TONE_LABELS,
  renderTemplate,
  getPreviewVariables
} from '@/types/communicationTemplate';
import { renderDynamicTemplate, getDynamicPreviewVariables, extractConditions } from '@/lib/dynamicTemplateEngine';
import { stripStructureLabels } from '@/lib/templateUtils';
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
  
  const previewVariables = template.isDynamic ? getDynamicPreviewVariables() : getPreviewVariables();
  const previewSubject = template.subject 
    ? (template.isDynamic ? renderDynamicTemplate(template.subject, previewVariables) : renderTemplate(template.subject, previewVariables))
    : '';
  const previewBody = stripStructureLabels(
    template.isDynamic 
      ? renderDynamicTemplate(template.body, previewVariables)
      : renderTemplate(template.body, previewVariables)
  );

  const conditions = template.isDynamic ? extractConditions(template.body) : [];

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
              <DialogTitle className="flex items-center gap-2">
                {template.name}
                {template.isDynamic && (
                  <Badge variant="secondary" className="gap-1">
                    <Zap className="h-3 w-3" />
                    Dinâmico
                  </Badge>
                )}
              </DialogTitle>
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

          {/* Smart conditions (dynamic only) */}
          {template.isDynamic && conditions.length > 0 && (
            <div className="rounded-lg border p-3 bg-primary/5">
              <div className="text-xs font-medium mb-2 flex items-center gap-1">
                <Zap className="h-3 w-3 text-primary" />
                Variáveis Inteligentes Usadas ({conditions.length})
              </div>
              <div className="flex flex-wrap gap-1">
                {conditions.map((c, i) => (
                  <Badge key={i} variant="outline" className="font-mono text-[10px]">
                    {c.field} {c.operator} {c.value}
                  </Badge>
                ))}
              </div>
            </div>
          )}

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
