import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, Webhook, TestTube } from 'lucide-react';
import { toast } from 'sonner';

interface WebhookConfig {
  id: string;
  url: string;
  events: string[];
  headers: Record<string, string>;
  isActive: boolean;
  retryCount: number;
}

interface FormWebhooksConfigProps {
  webhooks: WebhookConfig[];
  onChange: (webhooks: WebhookConfig[]) => void;
}

export function FormWebhooksConfig({ webhooks, onChange }: FormWebhooksConfigProps) {
  const handleAdd = () => {
    onChange([...webhooks, {
      id: `wh_${Date.now()}`,
      url: '',
      events: ['submission'],
      headers: {},
      isActive: true,
      retryCount: 3,
    }]);
  };

  const handleUpdate = (index: number, updates: Partial<WebhookConfig>) => {
    onChange(webhooks.map((wh, i) => i === index ? { ...wh, ...updates } : wh));
  };

  const handleRemove = (index: number) => {
    onChange(webhooks.filter((_, i) => i !== index));
  };

  const handleTest = (webhook: WebhookConfig) => {
    if (!webhook.url) {
      toast.error('Insere um URL primeiro');
      return;
    }
    toast.success('Webhook de teste enviado!');
  };

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle className="text-base flex items-center gap-2">
            <Webhook className="h-4 w-4" />
            Webhooks
          </CardTitle>
          <CardDescription>Envia dados para Zapier, Make, n8n ou qualquer URL</CardDescription>
        </div>
        <Button size="sm" variant="outline" onClick={handleAdd}>
          <Plus className="h-4 w-4 mr-1" />
          Adicionar
        </Button>
      </CardHeader>
      <CardContent>
        {webhooks.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            Sem webhooks configurados. Adiciona um para integrar com ferramentas externas.
          </p>
        ) : (
          <div className="space-y-4">
            {webhooks.map((wh, index) => (
              <div key={wh.id} className="p-4 rounded-lg border space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={wh.isActive}
                      onCheckedChange={(v) => handleUpdate(index, { isActive: v })}
                    />
                    <Badge variant={wh.isActive ? 'default' : 'secondary'} className="text-xs">
                      {wh.isActive ? 'Ativo' : 'Inativo'}
                    </Badge>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleTest(wh)}>
                      <TestTube className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleRemove(index)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label className="text-xs">URL de Destino</Label>
                  <Input
                    value={wh.url}
                    onChange={(e) => handleUpdate(index, { url: e.target.value })}
                    placeholder="https://hooks.zapier.com/..."
                    className="font-mono text-sm"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label className="text-xs">Evento</Label>
                    <Select
                      value={wh.events[0] || 'submission'}
                      onValueChange={(v) => handleUpdate(index, { events: [v] })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="submission">Nova Submissão</SelectItem>
                        <SelectItem value="qualified_lead">Lead Qualificado</SelectItem>
                        <SelectItem value="hot_lead">Lead Quente (score alto)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">Retries</Label>
                    <Select
                      value={String(wh.retryCount)}
                      onValueChange={(v) => handleUpdate(index, { retryCount: Number(v) })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0">Sem retry</SelectItem>
                        <SelectItem value="1">1 retry</SelectItem>
                        <SelectItem value="3">3 retries</SelectItem>
                        <SelectItem value="5">5 retries</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
