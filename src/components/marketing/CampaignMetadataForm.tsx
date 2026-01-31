import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ArrowLeft, Send, Eye, X } from 'lucide-react';
import { useMarketingSegments } from '@/hooks/useMarketingSegments';
import { useMarketingSettings } from '@/hooks/useMarketingSettings';
import { ScrollArea } from '@/components/ui/scroll-area';

interface CampaignMetadataFormProps {
  html: string;
  onSubmit: (data: {
    name: string;
    subject: string;
    previewText?: string;
    fromName: string;
    replyTo?: string;
    segmentId?: string;
  }) => void;
  onBack: () => void;
  onCancel: () => void;
  isLoading: boolean;
}

export function CampaignMetadataForm({
  html,
  onSubmit,
  onBack,
  onCancel,
  isLoading,
}: CampaignMetadataFormProps) {
  const { data: segments = [] } = useMarketingSegments();
  const { data: settings } = useMarketingSettings();
  
  const [formData, setFormData] = useState({
    name: '',
    subject: '',
    previewText: '',
    fromName: settings?.defaultFromName || '',
    replyTo: settings?.defaultReplyTo || '',
    segmentId: '',
  });

  const [showPreview, setShowPreview] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.subject || !formData.fromName) return;
    
    onSubmit({
      name: formData.name,
      subject: formData.subject,
      previewText: formData.previewText || undefined,
      fromName: formData.fromName,
      replyTo: formData.replyTo || undefined,
      segmentId: formData.segmentId || undefined,
    });
  };

  const isValid = formData.name && formData.subject && formData.fromName;

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b bg-background">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-xl font-semibold">Detalhes da Campanha</h1>
            <p className="text-sm text-muted-foreground">
              Preenche as informações para criar a campanha
            </p>
          </div>
        </div>
        <Button variant="ghost" size="icon" onClick={onCancel}>
          <X className="h-5 w-5" />
        </Button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden flex">
        {/* Form */}
        <div className="flex-1 overflow-auto p-6">
          <form onSubmit={handleSubmit} className="max-w-xl mx-auto space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome da Campanha *</Label>
                <Input
                  id="name"
                  placeholder="Ex: Newsletter Fevereiro 2026"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  autoFocus
                />
                <p className="text-xs text-muted-foreground">
                  Nome interno para identificar a campanha
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="subject">Assunto do Email *</Label>
                <Input
                  id="subject"
                  placeholder="Ex: 🎉 Novidades de Fevereiro"
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="previewText">Texto de Preview</Label>
                <Input
                  id="previewText"
                  placeholder="Texto que aparece após o assunto na inbox"
                  value={formData.previewText}
                  onChange={(e) => setFormData({ ...formData, previewText: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="fromName">Nome do Remetente *</Label>
                  <Input
                    id="fromName"
                    placeholder="Ex: João da Empresa"
                    value={formData.fromName}
                    onChange={(e) => setFormData({ ...formData, fromName: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
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

              <div className="space-y-2">
                <Label htmlFor="segment">Segmento de Destinatários</Label>
                <Select
                  value={formData.segmentId || "_all"}
                  onValueChange={(value) => setFormData({ ...formData, segmentId: value === "_all" ? "" : value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecionar segmento" />
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
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowPreview(!showPreview)}
                className="gap-2"
              >
                <Eye className="h-4 w-4" />
                {showPreview ? 'Esconder Preview' : 'Ver Preview'}
              </Button>
              <Button
                type="submit"
                disabled={!isValid || isLoading}
                className="flex-1 gap-2"
              >
                <Send className="h-4 w-4" />
                {isLoading ? 'A criar...' : 'Criar Campanha'}
              </Button>
            </div>
          </form>
        </div>

        {/* Preview Panel */}
        {showPreview && (
          <div className="w-[500px] border-l bg-muted/30 flex flex-col">
            <div className="p-4 border-b bg-background">
              <h3 className="font-medium">Preview do Email</h3>
              <p className="text-xs text-muted-foreground mt-1">
                <strong>Assunto:</strong> {formData.subject || '(sem assunto)'}
              </p>
            </div>
            <ScrollArea className="flex-1">
              <div className="p-4">
                <div
                  className="bg-white rounded-lg shadow-sm"
                  dangerouslySetInnerHTML={{
                    __html: html
                      .replace(/\{\{primeiro_nome\}\}/g, 'João')
                      .replace(/\{\{nome_cliente\}\}/g, 'João Silva')
                      .replace(/\{\{empresa_nome\}\}/g, 'Minha Empresa')
                      .replace(/\{\{subject\}\}/g, formData.subject || 'Assunto'),
                  }}
                />
              </div>
            </ScrollArea>
          </div>
        )}
      </div>
    </div>
  );
}
