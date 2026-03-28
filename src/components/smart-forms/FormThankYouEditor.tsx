import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { PartyPopper } from 'lucide-react';

interface ThankYouConfig {
  message: string;
  redirectUrl?: string;
  showCta: boolean;
  ctaText?: string;
  ctaUrl?: string;
  calendarUrl?: string;
}

interface FormThankYouEditorProps {
  config: ThankYouConfig;
  onChange: (config: ThankYouConfig) => void;
}

export function FormThankYouEditor({ config, onChange }: FormThankYouEditorProps) {
  const update = (updates: Partial<ThankYouConfig>) => {
    onChange({ ...config, ...updates });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <PartyPopper className="h-4 w-4" />
          Página de Sucesso
        </CardTitle>
        <CardDescription>Personaliza o que aparece após a submissão</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label className="text-xs">Mensagem de Sucesso</Label>
          <Textarea
            value={config.message}
            onChange={(e) => update({ message: e.target.value })}
            placeholder="Obrigado! Entraremos em contacto em breve."
            className="resize-none"
          />
        </div>

        <div className="space-y-2">
          <Label className="text-xs">URL de Redirecionamento (opcional)</Label>
          <Input
            value={config.redirectUrl || ''}
            onChange={(e) => update({ redirectUrl: e.target.value || undefined })}
            placeholder="https://site.com/obrigado"
          />
          <p className="text-xs text-muted-foreground">Se preenchido, redireciona após 3 segundos</p>
        </div>

        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label>Botão CTA Secundário</Label>
            <p className="text-xs text-muted-foreground">Ex: "Agendar reunião"</p>
          </div>
          <Switch
            checked={config.showCta}
            onCheckedChange={(v) => update({ showCta: v })}
          />
        </div>

        {config.showCta && (
          <div className="grid gap-3 sm:grid-cols-2 pl-4 border-l-2 border-primary/20">
            <div className="space-y-2">
              <Label className="text-xs">Texto do Botão</Label>
              <Input
                value={config.ctaText || ''}
                onChange={(e) => update({ ctaText: e.target.value })}
                placeholder="Agendar Reunião"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">URL do Botão</Label>
              <Input
                value={config.ctaUrl || ''}
                onChange={(e) => update({ ctaUrl: e.target.value })}
                placeholder="https://calendly.com/..."
              />
            </div>
          </div>
        )}

        <div className="space-y-2">
          <Label className="text-xs">Embed de Calendário (opcional)</Label>
          <Input
            value={config.calendarUrl || ''}
            onChange={(e) => update({ calendarUrl: e.target.value || undefined })}
            placeholder="https://calendly.com/nome/30min"
          />
          <p className="text-xs text-muted-foreground">Incorpora uma widget de agendamento na página de sucesso</p>
        </div>
      </CardContent>
    </Card>
  );
}
