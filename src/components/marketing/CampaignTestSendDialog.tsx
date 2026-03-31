import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Send, Plus, X, CheckCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useUpdateCampaign } from '@/hooks/useMarketingCampaigns';
import { toast } from 'sonner';

interface CampaignTestSendDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campaignId: string;
}

export function CampaignTestSendDialog({ open, onOpenChange, campaignId }: CampaignTestSendDialogProps) {
  const [emails, setEmails] = useState<string[]>(['']);
  const [isSending, setIsSending] = useState(false);
  const [sent, setSent] = useState(false);
  const updateCampaign = useUpdateCampaign();

  const addEmail = () => {
    if (emails.length < 5) setEmails([...emails, '']);
  };

  const removeEmail = (index: number) => {
    setEmails(emails.filter((_, i) => i !== index));
  };

  const updateEmail = (index: number, value: string) => {
    const updated = [...emails];
    updated[index] = value;
    setEmails(updated);
  };

  const validEmails = emails.filter(e => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.trim()));

  const handleSend = async () => {
    if (validEmails.length === 0) return;
    setIsSending(true);
    try {
      const { data, error } = await supabase.functions.invoke('marketing-send-campaign', {
        body: { campaignId, test_only: true, test_recipients: validEmails },
      });
      if (error) throw error;

      // Mark test_sent_at
      const { data: user } = await supabase.auth.getUser();
      await updateCampaign.mutateAsync({
        id: campaignId,
        testSentAt: new Date().toISOString(),
        testSentBy: user.user?.id || null,
      });

      setSent(true);
      toast.success(`Teste enviado para ${validEmails.length} email(s)`);
    } catch (err) {
      toast.error('Erro ao enviar teste');
      console.error(err);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) setSent(false); onOpenChange(v); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="h-5 w-5" />
            Enviar Teste
          </DialogTitle>
          <DialogDescription>
            Envie um email de teste sem afetar as métricas da campanha.
          </DialogDescription>
        </DialogHeader>

        {sent ? (
          <div className="flex flex-col items-center gap-3 py-6">
            <CheckCircle className="h-12 w-12 text-green-500" />
            <p className="text-sm text-muted-foreground">Teste enviado com sucesso!</p>
            <Button variant="outline" onClick={() => { setSent(false); onOpenChange(false); }}>
              Fechar
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Emails de teste (máx. 5)</Label>
              {emails.map((email, i) => (
                <div key={i} className="flex gap-2">
                  <Input
                    type="email"
                    placeholder="email@exemplo.com"
                    value={email}
                    onChange={(e) => updateEmail(i, e.target.value)}
                  />
                  {emails.length > 1 && (
                    <Button variant="ghost" size="icon" onClick={() => removeEmail(i)}>
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
              {emails.length < 5 && (
                <Button variant="outline" size="sm" onClick={addEmail}>
                  <Plus className="h-4 w-4 mr-1" /> Adicionar email
                </Button>
              )}
            </div>
            <Button
              onClick={handleSend}
              disabled={validEmails.length === 0 || isSending}
              className="w-full"
            >
              {isSending ? 'A enviar...' : `Enviar teste (${validEmails.length})`}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
