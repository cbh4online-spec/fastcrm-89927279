import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Zap, Plus, Trash2, ArrowRight, Clock } from 'lucide-react';
import { useCampaignTriggers } from '@/hooks/useCampaignTriggers';
import { Badge } from '@/components/ui/badge';

interface Props {
  campaignId: string;
}

const EVENT_LABELS: Record<string, string> = {
  opened: 'Abre o email',
  clicked: 'Clica em qualquer link',
  not_opened: 'Não abre',
  not_clicked: 'Não clica',
  bounced: 'Bounce',
  converted: 'Converte (gera oportunidade)',
};

const ACTION_LABELS: Record<string, string> = {
  enroll_sequence: 'Inscrever em sequência',
  send_campaign: 'Enviar outra campanha',
  add_tag: 'Adicionar tag',
  webhook: 'Webhook',
  update_score: 'Atualizar score',
  create_task: 'Criar tarefa comercial',
  update_lifecycle: 'Mudar lifecycle stage',
  start_journey: 'Iniciar jornada lifecycle',
};

export function TriggerBuilder({ campaignId }: Props) {
  const { triggers, createTrigger, updateTrigger, deleteTrigger, isLoading } = useCampaignTriggers(campaignId);
  const [showModal, setShowModal] = useState(false);
  const [event, setEvent] = useState('opened');
  const [waitHours, setWaitHours] = useState(48);
  const [actionType, setActionType] = useState('add_tag');
  const [actionValue, setActionValue] = useState('');

  const handleCreate = () => {
    const payload: any = {};
    if (actionType === 'add_tag') payload.tag = actionValue;
    if (actionType === 'send_campaign') payload.campaign_id = actionValue;
    if (actionType === 'webhook') payload.url = actionValue;

    createTrigger.mutate({
      trigger_event: event,
      wait_hours: waitHours,
      action_type: actionType,
      action_payload: payload,
    }, {
      onSuccess: () => {
        setShowModal(false);
        setActionValue('');
      },
    });
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Zap className="h-4 w-4 text-primary" />
            Automação
          </CardTitle>
          <Dialog open={showModal} onOpenChange={setShowModal}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline">
                <Plus className="h-3 w-3 mr-1" /> Adicionar trigger
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Novo Trigger</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Quando alguém...</Label>
                  <Select value={event} onValueChange={setEvent}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(EVENT_LABELS).map(([k, v]) => (
                        <SelectItem key={k} value={k}>{v}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Aguardar (horas)</Label>
                  <Input type="number" value={waitHours} onChange={(e) => setWaitHours(Number(e.target.value))} min={1} />
                </div>

                <div className="space-y-2">
                  <Label>Ação</Label>
                  <Select value={actionType} onValueChange={setActionType}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(ACTION_LABELS).map(([k, v]) => (
                        <SelectItem key={k} value={k}>{v}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>
                    {actionType === 'add_tag' ? 'Nome da tag' :
                     actionType === 'send_campaign' ? 'ID da campanha' :
                     actionType === 'webhook' ? 'URL do webhook' :
                     actionType === 'update_score' ? 'Pontos (ex: +5 ou -10)' :
                     actionType === 'create_task' ? 'Descrição da tarefa' :
                     actionType === 'update_lifecycle' ? 'Novo stage (ex: qualified, customer)' :
                     actionType === 'start_journey' ? 'ID da jornada (ex: welcome-series)' : 'Valor'}
                  </Label>
                  <Input value={actionValue} onChange={(e) => setActionValue(e.target.value)} />
                </div>

                <div className="p-3 bg-muted/50 rounded-lg text-sm text-muted-foreground">
                  Se um contacto <strong>{EVENT_LABELS[event]?.toLowerCase()}</strong>
                  <ArrowRight className="inline h-3 w-3 mx-1" />
                  aguarda <strong>{waitHours}h</strong>
                  <ArrowRight className="inline h-3 w-3 mx-1" />
                  <strong>{ACTION_LABELS[actionType]?.toLowerCase()}</strong>
                </div>

                <Button onClick={handleCreate} disabled={!actionValue || createTrigger.isPending} className="w-full">
                  Guardar trigger
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {triggers.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            Sem automações configuradas
          </p>
        ) : (
          <div className="space-y-2">
            {triggers.map((t) => (
              <div key={t.id} className="flex items-center gap-3 p-3 rounded-lg border text-sm">
                <div className="flex-1 flex items-center gap-2 flex-wrap">
                  <Badge variant="outline">{EVENT_LABELS[t.trigger_event] || t.trigger_event}</Badge>
                  <ArrowRight className="h-3 w-3 text-muted-foreground" />
                  <span className="flex items-center gap-1 text-muted-foreground">
                    <Clock className="h-3 w-3" /> {t.wait_hours}h
                  </span>
                  <ArrowRight className="h-3 w-3 text-muted-foreground" />
                  <Badge variant="secondary">{ACTION_LABELS[t.action_type] || t.action_type}</Badge>
                </div>
                <Switch
                  checked={t.is_active}
                  onCheckedChange={(v) => updateTrigger.mutate({ id: t.id, is_active: v })}
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-destructive"
                  onClick={() => deleteTrigger.mutate(t.id)}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
