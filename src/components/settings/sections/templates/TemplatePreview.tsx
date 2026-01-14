import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TemplateType } from '@/hooks/useTemplates';
import { Monitor, Smartphone, Mail, MessageCircle, Instagram, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TemplatePreviewProps {
  type: TemplateType;
  subject?: string;
  content: string;
  richContent?: any;
  device: 'desktop' | 'mobile';
  onDeviceChange: (device: 'desktop' | 'mobile') => void;
}

export function TemplatePreview({
  type,
  subject,
  content,
  richContent,
  device,
  onDeviceChange,
}: TemplatePreviewProps) {
  // Replace variables with example data
  const previewContent = content
    .replace(/\{\{lead\.name\}\}/g, 'João Silva')
    .replace(/\{\{lead\.email\}\}/g, 'joao@exemplo.com')
    .replace(/\{\{lead\.phone\}\}/g, '+351 912 345 678')
    .replace(/\{\{company\.name\}\}/g, 'Empresa ABC')
    .replace(/\{\{opportunity\.title\}\}/g, 'Proposta Comercial')
    .replace(/\{\{opportunity\.value\}\}/g, '5.000€')
    .replace(/\{\{user\.name\}\}/g, 'Maria Costa')
    .replace(/\{\{user\.email\}\}/g, 'maria@tuaempresa.com')
    .replace(/\{\{date\.today\}\}/g, new Date().toLocaleDateString('pt-PT'))
    .replace(/\{\{date\.tomorrow\}\}/g, new Date(Date.now() + 86400000).toLocaleDateString('pt-PT'));

  const previewSubject = subject
    ?.replace(/\{\{lead\.name\}\}/g, 'João Silva')
    .replace(/\{\{company\.name\}\}/g, 'Empresa ABC');

  const renderEmailPreview = () => (
    <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
      <div className="bg-muted px-4 py-3 border-b">
        <div className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">Para:</span>
          <span>joao@exemplo.com</span>
        </div>
        <div className="flex items-center gap-2 text-sm mt-1">
          <span className="text-muted-foreground">Assunto:</span>
          <span className="font-medium">{previewSubject || 'Sem assunto'}</span>
        </div>
      </div>
      <div className="p-4 whitespace-pre-wrap text-sm">
        {previewContent || <span className="text-muted-foreground italic">Conteúdo vazio</span>}
      </div>
    </div>
  );

  const renderWhatsAppPreview = () => (
    <div className="bg-[#e5ddd5] rounded-lg p-4 min-h-[300px]">
      <div className="bg-white rounded-lg p-3 shadow-sm max-w-[80%] ml-auto">
        <p className="text-sm whitespace-pre-wrap">
          {previewContent || <span className="text-muted-foreground italic">Conteúdo vazio</span>}
        </p>
        <div className="text-[10px] text-muted-foreground text-right mt-1">
          {new Date().toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>
    </div>
  );

  const renderInstagramPreview = () => (
    <div className="bg-background rounded-lg border overflow-hidden">
      <div className="bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500 px-4 py-2">
        <div className="flex items-center gap-2 text-white">
          <Instagram className="h-4 w-4" />
          <span className="font-medium text-sm">Direct</span>
        </div>
      </div>
      <div className="p-4 min-h-[250px]">
        <div className="bg-primary/10 rounded-2xl rounded-bl-sm p-3 max-w-[80%]">
          <p className="text-sm whitespace-pre-wrap">
            {previewContent || <span className="text-muted-foreground italic">Conteúdo vazio</span>}
          </p>
        </div>
      </div>
    </div>
  );

  const renderProposalPreview = () => (
    <div className="bg-white rounded-lg shadow-sm border p-6">
      <div className="border-b pb-4 mb-4">
        <h2 className="text-xl font-bold">Proposta Comercial</h2>
        <p className="text-sm text-muted-foreground">Para: Empresa ABC</p>
      </div>
      
      {richContent && richContent.length > 0 ? (
        <div className="space-y-4">
          {richContent.map((block: any) => {
            switch (block.type) {
              case 'text':
                return (
                  <p key={block.id} className="whitespace-pre-wrap">
                    {block.content.text}
                  </p>
                );
              case 'image':
                return block.content.url ? (
                  <img
                    key={block.id}
                    src={block.content.url}
                    alt={block.content.alt}
                    className="max-w-full rounded"
                  />
                ) : null;
              case 'button':
                return (
                  <div key={block.id} className="text-center">
                    <Button
                      style={{ backgroundColor: block.content.color }}
                    >
                      {block.content.text}
                    </Button>
                  </div>
                );
              case 'columns':
                return (
                  <div key={block.id} className="grid grid-cols-2 gap-4">
                    {block.content.columns.map((col: any, idx: number) => (
                      <div key={idx} className="p-3 bg-muted rounded">
                        {col.text}
                      </div>
                    ))}
                  </div>
                );
              case 'spacer':
                return <div key={block.id} style={{ height: block.content.height }} />;
              default:
                return null;
            }
          })}
        </div>
      ) : (
        <p className="whitespace-pre-wrap text-sm">
          {previewContent || <span className="text-muted-foreground italic">Conteúdo vazio</span>}
        </p>
      )}
    </div>
  );

  const renderSmsPreview = () => (
    <div className="bg-muted rounded-lg p-4 min-h-[200px]">
      <div className="bg-primary text-primary-foreground rounded-2xl rounded-br-sm p-3 max-w-[80%] ml-auto">
        <p className="text-sm whitespace-pre-wrap">
          {previewContent || <span className="opacity-70 italic">Conteúdo vazio</span>}
        </p>
      </div>
      <div className="text-xs text-muted-foreground text-right mt-2">
        {previewContent.length}/160 caracteres
        {previewContent.length > 160 && (
          <span className="text-amber-600 ml-2">
            ({Math.ceil(previewContent.length / 160)} SMS)
          </span>
        )}
      </div>
    </div>
  );

  const previewRenderers: Record<TemplateType, () => React.ReactNode> = {
    email: renderEmailPreview,
    whatsapp: renderWhatsAppPreview,
    instagram_dm: renderInstagramPreview,
    proposal: renderProposalPreview,
    sms: renderSmsPreview,
  };

  return (
    <div className="h-full flex flex-col">
      {/* Device Toggle */}
      <div className="flex items-center justify-center gap-2 p-4 border-b">
        <Button
          variant={device === 'desktop' ? 'default' : 'outline'}
          size="sm"
          onClick={() => onDeviceChange('desktop')}
        >
          <Monitor className="h-4 w-4 mr-2" />
          Desktop
        </Button>
        <Button
          variant={device === 'mobile' ? 'default' : 'outline'}
          size="sm"
          onClick={() => onDeviceChange('mobile')}
        >
          <Smartphone className="h-4 w-4 mr-2" />
          Mobile
        </Button>
      </div>

      {/* Preview Container */}
      <div className="flex-1 overflow-auto p-6 bg-muted/30">
        <div className="flex justify-center">
          <div
            className={cn(
              'transition-all',
              device === 'mobile' ? 'max-w-[375px]' : 'max-w-[600px]',
              'w-full'
            )}
          >
            <div className="mb-3 text-center">
              <Badge variant="outline" className="text-xs">
                Pré-visualização com dados de exemplo
              </Badge>
            </div>
            {previewRenderers[type]()}
          </div>
        </div>
      </div>
    </div>
  );
}
