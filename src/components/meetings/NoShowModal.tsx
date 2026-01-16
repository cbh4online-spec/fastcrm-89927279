import { useState } from 'react';
import { format, addDays } from 'date-fns';
import { pt } from 'date-fns/locale';
import { Copy, Check, Send, Calendar, MessageSquare, Mail, RefreshCw, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import type { Meeting } from '@/hooks/useMeetings';
import { useMeetingAutomations } from '@/hooks/useMeetingAutomations';

interface NoShowModalProps {
  isOpen: boolean;
  onClose: () => void;
  meeting: Meeting;
  onStatusUpdated: () => void;
}

export function NoShowModal({ isOpen, onClose, meeting, onStatusUpdated }: NoShowModalProps) {
  const { processNoShow, isProcessing } = useMeetingAutomations();
  const [result, setResult] = useState<{
    rescheduleRequest?: { id: string; reschedule_token: string };
    message?: string;
    suggested_slots?: Array<{ date: string; start_time: string; end_time: string }>;
  } | null>(null);
  const [editedMessage, setEditedMessage] = useState('');
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [step, setStep] = useState<'confirm' | 'result'>('confirm');

  const handleConfirmNoShow = async () => {
    const noShowResult = await processNoShow(meeting);
    if (noShowResult) {
      setResult(noShowResult);
      setEditedMessage(noShowResult.message || '');
      setStep('result');
    }
  };

  const handleCopy = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
    toast.success('Copiado para a área de transferência');
  };

  const handleClose = () => {
    setResult(null);
    setStep('confirm');
    setEditedMessage('');
    onStatusUpdated();
    onClose();
  };

  const clientName = meeting.contact?.name || 'Cliente';

  // Generate reschedule link (would be a public page in real implementation)
  const rescheduleLink = result?.rescheduleRequest 
    ? `${window.location.origin}/reschedule/${result.rescheduleRequest.reschedule_token}`
    : '';

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5 text-orange-500" />
            Registar No-Show
          </DialogTitle>
        </DialogHeader>

        {step === 'confirm' && (
          <div className="space-y-4">
            <div className="bg-muted/50 rounded-lg p-4">
              <h3 className="font-medium mb-2">Reunião</h3>
              <p className="text-sm text-muted-foreground">{meeting.title}</p>
              <p className="text-sm text-muted-foreground">
                {format(new Date(meeting.start_time), "d 'de' MMMM 'às' HH:mm", { locale: pt })}
              </p>
              <p className="text-sm font-medium mt-2">{clientName}</p>
            </div>

            <div className="bg-orange-50 dark:bg-orange-950/20 rounded-lg p-4 border border-orange-200 dark:border-orange-900">
              <h4 className="font-medium text-orange-800 dark:text-orange-200 mb-2">
                Automações que serão executadas:
              </h4>
              <ul className="text-sm text-orange-700 dark:text-orange-300 space-y-1">
                <li>✓ Gerar mensagem de follow-up personalizada</li>
                <li>✓ Criar link de remarcação em 1 clique</li>
                <li>✓ Registar no CRM como no-show</li>
                <li>✓ Sugerir novos slots para remarcação</li>
              </ul>
            </div>

            <div className="flex gap-3 justify-end">
              <Button variant="outline" onClick={onClose}>
                Cancelar
              </Button>
              <Button onClick={handleConfirmNoShow} disabled={isProcessing}>
                {isProcessing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Confirmar No-Show
              </Button>
            </div>
          </div>
        )}

        {step === 'result' && result && (
          <div className="space-y-6">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                <Check className="h-3 w-3 mr-1" />
                Automações executadas
              </Badge>
            </div>

            {/* Message for client */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="font-medium flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" />
                  Mensagem para o Cliente
                </h4>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleCopy(editedMessage, 'message')}
                  >
                    {copiedField === 'message' ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
              <Textarea
                value={editedMessage}
                onChange={(e) => setEditedMessage(e.target.value)}
                className="min-h-[120px]"
              />
            </div>

            {/* Reschedule link */}
            {rescheduleLink && (
              <div className="space-y-2">
                <h4 className="font-medium flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Link de Remarcação (1 clique)
                </h4>
                <div className="flex gap-2">
                  <code className="flex-1 bg-muted p-2 rounded text-sm break-all">
                    {rescheduleLink}
                  </code>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleCopy(rescheduleLink, 'link')}
                  >
                    {copiedField === 'link' ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            )}

            <Separator />

            {/* Suggested slots */}
            {result.suggested_slots && result.suggested_slots.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-medium">Slots Sugeridos para Remarcação</h4>
                <div className="grid grid-cols-2 gap-2">
                  {result.suggested_slots.slice(0, 4).map((slot, i) => (
                    <div key={i} className="bg-muted/50 rounded-lg p-3 text-sm">
                      <p className="font-medium">
                        {format(new Date(slot.date), "EEEE, d 'de' MMMM", { locale: pt })}
                      </p>
                      <p className="text-muted-foreground">
                        {slot.start_time} - {slot.end_time}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Quick actions */}
            <div className="flex gap-2 pt-4 border-t">
              <Button variant="outline" className="flex-1" onClick={() => {
                const whatsappMessage = encodeURIComponent(
                  editedMessage + (rescheduleLink ? `\n\nRemarcar: ${rescheduleLink}` : '')
                );
                const phone = meeting.contact?.email?.includes('@') ? '' : meeting.contact?.email || '';
                window.open(`https://wa.me/${phone}?text=${whatsappMessage}`, '_blank');
              }}>
                <MessageSquare className="h-4 w-4 mr-2" />
                Enviar WhatsApp
              </Button>
              <Button variant="outline" className="flex-1" onClick={() => {
                const subject = encodeURIComponent(`Reunião não realizada - ${meeting.title}`);
                const body = encodeURIComponent(
                  editedMessage + (rescheduleLink ? `\n\nRemarcar reunião: ${rescheduleLink}` : '')
                );
                window.open(`mailto:${meeting.contact?.email || ''}?subject=${subject}&body=${body}`, '_blank');
              }}>
                <Mail className="h-4 w-4 mr-2" />
                Enviar Email
              </Button>
            </div>

            <div className="flex justify-end">
              <Button onClick={handleClose}>
                Concluir
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
