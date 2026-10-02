import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Settings, Save, Mail, Shield } from 'lucide-react';
import { useMarketingSettings, useUpdateMarketingSettings } from '@/hooks/useMarketingSettings';
import { toast } from 'sonner';
import { SenderDomainSettings, DEFAULT_SENDER_DOMAIN, SENDER_DOMAIN_RE, SENDER_PREFIX_RE } from './SenderDomainSettings';
import { FooterAIAssistant, FooterAudit } from './FooterAIAssistant';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function MarketingSettingsPanel() {
  const { data: settings, isLoading } = useMarketingSettings();
  const updateSettings = useUpdateMarketingSettings();

  const [formData, setFormData] = useState({
    isEnabled: true,
    monthlyEmailLimit: 1000,
    activeContactsLimit: 500,
    activeCampaignsLimit: 5,
    defaultFromName: '',
    defaultReplyTo: '',
    unsubscribePageUrl: '',
    customFooter: '',
    senderDomain: DEFAULT_SENDER_DOMAIN,
    senderPrefix: 'news',
    customDomains: [] as string[],
  });

  useEffect(() => {
    if (settings) {
      setFormData({
        isEnabled: settings.isEnabled,
        monthlyEmailLimit: settings.monthlyEmailLimit,
        activeContactsLimit: settings.activeContactsLimit,
        activeCampaignsLimit: settings.activeCampaignsLimit,
        defaultFromName: settings.defaultFromName || '',
        defaultReplyTo: settings.defaultReplyTo || '',
        unsubscribePageUrl: settings.unsubscribePageUrl || '',
        customFooter: settings.customFooter || '',
        senderDomain: settings.senderDomain || DEFAULT_SENDER_DOMAIN,
        senderPrefix: settings.senderPrefix || 'news',
        customDomains: settings.customDomains || [],
      });
    }
  }, [settings]);

  const replyInvalid = !!formData.defaultReplyTo && !EMAIL_RE.test(formData.defaultReplyTo);

  const handleSave = async () => {
    if (!SENDER_DOMAIN_RE.test(formData.senderDomain)) return void toast.error('Domínio de envio inválido');
    if (!SENDER_PREFIX_RE.test(formData.senderPrefix)) return void toast.error('Prefixo do remetente inválido');
    if (replyInvalid) return void toast.error('Email de resposta inválido');
    try {
      await updateSettings.mutateAsync({
        ...formData,
        senderDomain: formData.senderDomain === DEFAULT_SENDER_DOMAIN ? null : formData.senderDomain,
        customDomains: formData.customDomains.filter((d) => SENDER_DOMAIN_RE.test(d)),
      });
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('Não foi possível guardar as definições');
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto" />
          <p className="mt-4 text-muted-foreground">A carregar definições...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* General Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Definições Gerais
          </CardTitle>
          <CardDescription>
            Configurações gerais do módulo de email marketing
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Módulo Ativo</Label>
              <p className="text-sm text-muted-foreground">
                Ativa ou desativa o módulo de email marketing
              </p>
            </div>
            <Switch
              checked={formData.isEnabled}
              onCheckedChange={(checked) => setFormData({ ...formData, isEnabled: checked })}
            />
          </div>

          <Separator />

          <div className="grid gap-4 md:grid-cols-3">
            <div className="grid gap-2">
              <Label htmlFor="emailLimit">Limite Emails/Mês</Label>
              <Input
                id="emailLimit"
                type="number"
                value={formData.monthlyEmailLimit}
                onChange={(e) => setFormData({ ...formData, monthlyEmailLimit: parseInt(e.target.value) || 0 })}
              />
              <p className="text-xs text-muted-foreground">
                Número máximo de emails por mês
              </p>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="contactsLimit">Limite Contactos Ativos</Label>
              <Input
                id="contactsLimit"
                type="number"
                value={formData.activeContactsLimit}
                onChange={(e) => setFormData({ ...formData, activeContactsLimit: parseInt(e.target.value) || 0 })}
              />
              <p className="text-xs text-muted-foreground">
                Número máximo de contactos subscritos
              </p>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="campaignsLimit">Limite Campanhas</Label>
              <Input
                id="campaignsLimit"
                type="number"
                value={formData.activeCampaignsLimit}
                onChange={(e) => setFormData({ ...formData, activeCampaignsLimit: parseInt(e.target.value) || 0 })}
              />
              <p className="text-xs text-muted-foreground">
                Número máximo de campanhas ativas
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sender Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Definições de Envio
          </CardTitle>
          <CardDescription>
            Configurações padrão para o envio de emails
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="fromName">Nome do Remetente</Label>
              <Input
                id="fromName"
                placeholder="Ex: myMIA Hub"
                maxLength={80}
                value={formData.defaultFromName}
                onChange={(e) => setFormData({ ...formData, defaultFromName: e.target.value })}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="replyTo">Email de Resposta (Reply-To)</Label>
              <Input
                id="replyTo"
                type="email"
                placeholder="contacto@empresa.com"
                value={formData.defaultReplyTo}
                onChange={(e) => setFormData({ ...formData, defaultReplyTo: e.target.value.trim() })}
              />
              {replyInvalid && <p className="text-xs text-destructive">Email inválido</p>}
            </div>
          </div>

          <Separator />

          <SenderDomainSettings
            domain={formData.senderDomain}
            prefix={formData.senderPrefix}
            customDomains={formData.customDomains}
            onChange={(v) => setFormData((f) => ({
              ...f,
              ...(v.domain !== undefined && { senderDomain: v.domain }),
              ...(v.prefix !== undefined && { senderPrefix: v.prefix }),
              ...(v.customDomains !== undefined && { customDomains: v.customDomains }),
            }))}
          />

          <div className="rounded-md border bg-muted/50 p-3 space-y-1 text-sm">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Pré-visualização</p>
            <p><span className="text-muted-foreground">De:</span> <code className="font-mono text-xs">{formData.defaultFromName || 'FastCRM'} &lt;{formData.senderPrefix || 'news'}@{formData.senderDomain || DEFAULT_SENDER_DOMAIN}&gt;</code></p>
            <p><span className="text-muted-foreground">Responder a:</span> <code className="font-mono text-xs">{formData.defaultReplyTo || 'não definido'}</code></p>
          </div>
        </CardContent>
      </Card>

      {/* Compliance Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Compliance & RGPD
          </CardTitle>
          <CardDescription>
            Configurações de conformidade legal e tracking
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Tracking Info Banner */}
          <div className="bg-muted/50 border rounded-lg p-4 space-y-3">
            <p className="text-sm font-medium">Tracking Automático</p>
            <div className="grid gap-2 text-xs text-muted-foreground">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 bg-green-500 rounded-full" />
                <span><strong>Click tracking:</strong> <code className="bg-background px-1 py-0.5 rounded font-mono">r.fastcrm.metodopare.ai</code></span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 bg-green-500 rounded-full" />
                <span><strong>Open tracking:</strong> <code className="bg-background px-1 py-0.5 rounded font-mono">u.fastcrm.metodopare.ai</code></span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 bg-green-500 rounded-full" />
                <span><strong>Unsubscribe:</strong> <code className="bg-background px-1 py-0.5 rounded font-mono">u.fastcrm.metodopare.ai/unsub/</code></span>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Todos os links são automaticamente rastreados. O footer de unsubscribe é injetado automaticamente.
            </p>
          </div>

          <Separator />

          <div className="grid gap-2">
            <Label htmlFor="unsubscribeUrl">URL de Cancelamento Personalizada (opcional)</Label>
            <Input
              id="unsubscribeUrl"
              placeholder="https://u.fastcrm.metodopare.ai/unsub/{token}"
              value={formData.unsubscribePageUrl}
              onChange={(e) => setFormData({ ...formData, unsubscribePageUrl: e.target.value })}
              disabled
            />
            <p className="text-xs text-muted-foreground">
              ✓ A página de unsubscribe padrão é gerida automaticamente pelo sistema
            </p>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="footer">Rodapé Personalizado (adicional)</Label>
            <FooterAIAssistant
              current={formData.customFooter}
              onApply={(customFooter) => setFormData((f) => ({ ...f, customFooter }))}
            />
            <Textarea
              id="footer"
              placeholder="Texto adicional para o rodapé dos emails..."
              value={formData.customFooter}
              onChange={(e) => setFormData({ ...formData, customFooter: e.target.value })}
              rows={4}
              maxLength={1500}
            />
            <p className="text-xs text-muted-foreground">
              Este texto será adicionado antes do footer obrigatório (morada + link unsubscribe)
            </p>
            <FooterAudit footer={formData.customFooter} />
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={updateSettings.isPending}>
          <Save className="h-4 w-4 mr-2" />
          {updateSettings.isPending ? 'A guardar...' : 'Guardar Definições'}
        </Button>
      </div>
    </div>
  );
}
