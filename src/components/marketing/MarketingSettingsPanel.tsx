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
      });
    }
  }, [settings]);

  const handleSave = async () => {
    try {
      await updateSettings.mutateAsync(formData);
    } catch (error) {
      console.error('Error saving settings:', error);
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
              <Label htmlFor="fromName">Nome do Remetente Padrão</Label>
              <Input
                id="fromName"
                placeholder="Ex: João da Empresa"
                value={formData.defaultFromName}
                onChange={(e) => setFormData({ ...formData, defaultFromName: e.target.value })}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="replyTo">Email de Resposta Padrão</Label>
              <Input
                id="replyTo"
                type="email"
                placeholder="responder@empresa.com"
                value={formData.defaultReplyTo}
                onChange={(e) => setFormData({ ...formData, defaultReplyTo: e.target.value })}
              />
            </div>
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
            Configurações de conformidade legal
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="unsubscribeUrl">URL de Cancelamento de Subscrição</Label>
            <Input
              id="unsubscribeUrl"
              placeholder="https://empresa.com/unsubscribe"
              value={formData.unsubscribePageUrl}
              onChange={(e) => setFormData({ ...formData, unsubscribePageUrl: e.target.value })}
            />
            <p className="text-xs text-muted-foreground">
              Deixa vazio para usar a página padrão do sistema
            </p>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="footer">Rodapé Personalizado</Label>
            <Textarea
              id="footer"
              placeholder="Texto adicional para o rodapé dos emails..."
              value={formData.customFooter}
              onChange={(e) => setFormData({ ...formData, customFooter: e.target.value })}
              rows={4}
            />
            <p className="text-xs text-muted-foreground">
              Este texto será adicionado automaticamente ao final de todos os emails
            </p>
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
