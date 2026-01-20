import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Send, Eye, Code, Settings } from 'lucide-react';
import { useCreateCampaign, useUpdateCampaign } from '@/hooks/useMarketingCampaigns';
import { useMarketingSegments } from '@/hooks/useMarketingSegments';
import { useMarketingSettings } from '@/hooks/useMarketingSettings';
import type { MarketingCampaign } from '@/types/marketing';

interface CampaignFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campaign?: MarketingCampaign | null;
  onClose: () => void;
}

export function CampaignFormDialog({
  open,
  onOpenChange,
  campaign,
  onClose,
}: CampaignFormDialogProps) {
  const createCampaign = useCreateCampaign();
  const updateCampaign = useUpdateCampaign();
  const { data: segments = [] } = useMarketingSegments();
  const { data: settings } = useMarketingSettings();

  const [formData, setFormData] = useState({
    name: '',
    subject: '',
    previewText: '',
    fromName: '',
    replyTo: '',
    segmentId: '',
    bodyHtml: '',
    bodyText: '',
  });

  const [activeTab, setActiveTab] = useState('content');

  useEffect(() => {
    if (open) {
      if (campaign) {
        setFormData({
          name: campaign.name,
          subject: campaign.subject,
          previewText: campaign.previewText || '',
          fromName: campaign.fromName,
          replyTo: campaign.replyTo || '',
          segmentId: campaign.segmentId || '',
          bodyHtml: campaign.bodyHtml,
          bodyText: campaign.bodyText || '',
        });
      } else {
        setFormData({
          name: '',
          subject: '',
          previewText: '',
          fromName: settings?.defaultFromName || '',
          replyTo: settings?.defaultReplyTo || '',
          segmentId: '',
          bodyHtml: getDefaultTemplate(),
          bodyText: '',
        });
      }
      setActiveTab('content');
    }
  }, [open, campaign, settings]);

  const getDefaultTemplate = () => {
    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <h1>{{subject}}</h1>
  <p>Olá {{primeiro_nome}},</p>
  <p>O teu conteúdo aqui...</p>
  <p style="margin-top: 30px;">Com os melhores cumprimentos,<br>A equipa</p>
</body>
</html>`;
  };

  const handleSubmit = async () => {
    if (!formData.name || !formData.subject || !formData.fromName || !formData.bodyHtml) {
      return;
    }

    try {
      if (campaign) {
        await updateCampaign.mutateAsync({
          id: campaign.id,
          ...formData,
          segmentId: formData.segmentId || undefined,
        });
      } else {
        await createCampaign.mutateAsync({
          ...formData,
          segmentId: formData.segmentId || undefined,
        });
      }
      onClose();
    } catch (error) {
      console.error('Error saving campaign:', error);
    }
  };

  const isPending = createCampaign.isPending || updateCampaign.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="h-5 w-5" />
            {campaign ? 'Editar Campanha' : 'Nova Campanha'}
          </DialogTitle>
          <DialogDescription>
            {campaign
              ? 'Edita os detalhes da tua campanha de email'
              : 'Cria uma nova campanha de email marketing'}
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="content" className="gap-2">
              <Send className="h-4 w-4" />
              Conteúdo
            </TabsTrigger>
            <TabsTrigger value="settings" className="gap-2">
              <Settings className="h-4 w-4" />
              Definições
            </TabsTrigger>
            <TabsTrigger value="preview" className="gap-2">
              <Eye className="h-4 w-4" />
              Preview
            </TabsTrigger>
          </TabsList>

          <TabsContent value="content" className="space-y-4">
            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Nome da Campanha *</Label>
                <Input
                  id="name"
                  placeholder="Ex: Newsletter Janeiro 2026"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="subject">Assunto do Email *</Label>
                <Input
                  id="subject"
                  placeholder="Ex: 🎉 Novidades de Janeiro"
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="previewText">Texto de Preview</Label>
                <Input
                  id="previewText"
                  placeholder="Texto que aparece após o assunto na inbox"
                  value={formData.previewText}
                  onChange={(e) => setFormData({ ...formData, previewText: e.target.value })}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="bodyHtml">Conteúdo HTML *</Label>
                <Textarea
                  id="bodyHtml"
                  placeholder="<html>...</html>"
                  value={formData.bodyHtml}
                  onChange={(e) => setFormData({ ...formData, bodyHtml: e.target.value })}
                  className="min-h-[300px] font-mono text-sm"
                />
                <p className="text-xs text-muted-foreground">
                  Variáveis disponíveis: {'{{primeiro_nome}}'}, {'{{nome_cliente}}'}, {'{{empresa_nome}}'}, {'{{subject}}'}
                </p>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="settings" className="space-y-4">
            <div className="grid gap-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="fromName">Nome do Remetente *</Label>
                  <Input
                    id="fromName"
                    placeholder="Ex: João da Empresa"
                    value={formData.fromName}
                    onChange={(e) => setFormData({ ...formData, fromName: e.target.value })}
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="replyTo">Email de Resposta</Label>
                  <Input
                    id="replyTo"
                    type="email"
                    placeholder="responder@empresa.com"
                    value={formData.replyTo}
                    onChange={(e) => setFormData({ ...formData, replyTo: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="segment">Segmento de Destinatários</Label>
                <Select
                  value={formData.segmentId || "_all"}
                  onValueChange={(value) => setFormData({ ...formData, segmentId: value === "_all" ? "" : value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecionar segmento (ou todos os contactos)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_all">Todos os contactos subscritos</SelectItem>
                    {segments.map((segment) => (
                      <SelectItem key={segment.id} value={segment.id}>
                        {segment.name} ({segment.contactCount} contactos)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="bodyText">Versão Texto Simples</Label>
                <Textarea
                  id="bodyText"
                  placeholder="Versão em texto simples do email (opcional)"
                  value={formData.bodyText}
                  onChange={(e) => setFormData({ ...formData, bodyText: e.target.value })}
                  className="min-h-[150px]"
                />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="preview" className="space-y-4">
            <div className="border rounded-lg p-4 bg-white">
              <div className="mb-4 pb-4 border-b">
                <p className="text-sm text-muted-foreground">
                  <strong>De:</strong> {formData.fromName || 'Remetente'} &lt;news@m.fastcrm.metodopare.ai&gt;
                </p>
                <p className="text-sm text-muted-foreground">
                  <strong>Assunto:</strong> {formData.subject || 'Sem assunto'}
                </p>
                {formData.previewText && (
                  <p className="text-sm text-muted-foreground">
                    <strong>Preview:</strong> {formData.previewText}
                  </p>
                )}
              </div>
              <div
                className="email-preview"
                dangerouslySetInnerHTML={{
                  __html: formData.bodyHtml
                    .replace(/\{\{primeiro_nome\}\}/g, 'João')
                    .replace(/\{\{nome_cliente\}\}/g, 'João Silva')
                    .replace(/\{\{empresa_nome\}\}/g, 'Minha Empresa')
                    .replace(/\{\{subject\}\}/g, formData.subject),
                }}
              />
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isPending || !formData.name || !formData.subject || !formData.fromName || !formData.bodyHtml}
          >
            {isPending ? 'A guardar...' : campaign ? 'Guardar Alterações' : 'Criar Campanha'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
