import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useCampaignTriggers, type CampaignTrigger } from '@/hooks/useCampaignTriggers';
import { useEmailSequences } from '@/hooks/useEmailSequences';
import { useMarketingCampaigns } from '@/hooks/useMarketingCampaigns';
import {
  Plus,
  Trash2,
  ArrowRight,
  Clock,
  Zap,
  Mail,
  MousePointerClick,
  EyeOff,
  AlertTriangle,
  Loader2,
} from 'lucide-react';

interface Props {
  campaignId: string;
}

const EVENT_LABELS: Record<string, { label: string; icon: React.ReactNode }> = {
  opened: { label: 'Abre o email', icon: <Mail className="h-4 w-4" /> },
  clicked: { label: 'Clica em qualquer link', icon: <MousePointerClick className="h-4 w-4" /> },
  not_opened: { label: 'Não abre em X horas', icon: <EyeOff className="h-4 w-4" /> },
  not_clicked: { label: 'Não clica em X horas', icon: <EyeOff className="h-4 w-4" /> },
  bounced: { label: 'Email faz bounce', icon: <AlertTriangle className="h-4 w-4" /> },
};

const ACTION_LABELS: Record<string, string> = {
  enroll_sequence: 'Inscrever em sequência',
  send_campaign: 'Enviar outra campanha',
  add_tag: 'Adicionar tag',
};

export function CampaignTriggerBuilder({ campaignId }: Props) {
  const { triggers, isLoading, createTrigger, updateTrigger, deleteTrigger } =
    useCampaignTriggers(campaignId);
  const sequencesQuery = useEmailSequences();
  const campaignsQuery = useMarketingCampaigns({ status: 'draft' });
  const sequences = sequencesQuery.data || [];
  const draftCampaigns = campaignsQuery.data || [];

  const [showForm, setShowForm] = useState(false);
  const [event, setEvent] = useState<string>('opened');
  const [waitValue, setWaitValue] = useState(48);
  const [waitUnit, setWaitUnit] = useState<'hours' | 'days'>('hours');
  const [actionType, setActionType] = useState<string>('enroll_sequence');
  const [actionPayload, setActionPayload] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);

  const waitHours = waitUnit === 'days' ? waitValue * 24 : waitValue;

  const getPreviewText = () => {
    const eventText = EVENT_LABELS[event]?.label || event;
    const waitText = waitUnit === 'days' ? `${waitValue} dias` : `${waitValue}h`;
    const actionText = ACTION_LABELS[actionType] || actionType;
    let detail = '';
    if (actionType === 'enroll_sequence' && actionPayload.sequence_id) {
      const seq = sequences?.find((s: any) => s.id === actionPayload.sequence_id);
      detail = seq ? ` "${seq.name}"` : '';
    } else if (actionType === 'send_campaign' && actionPayload.campaign_id) {
      const camp = draftCampaigns?.find((c: any) => c.id === actionPayload.campaign_id);
      detail = camp ? ` "${camp.name}"` : '';
    } else if (actionType === 'add_tag' && actionPayload.tag) {
      detail = ` "${actionPayload.tag}"`;
    }
    return `Se alguém ${eventText} → aguarda ${waitText} → ${actionText}${detail}`;
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await createTrigger.mutateAsync({
        trigger_event: event,
        wait_hours: waitHours,
        action_type: actionType,
        action_payload: actionPayload,
      });
      setShowForm(false);
      resetForm();
    } finally {
      setIsSaving(false);
    }
  };

  const resetForm = () => {
    setEvent('opened');
    setWaitValue(48);
    setWaitUnit('hours');
    setActionType('enroll_sequence');
    setActionPayload({});
  };

  const formatWait = (hours: number) => {
    if (hours >= 24 && hours % 24 === 0) return `${hours / 24} dias`;
    return `${hours}h`;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <Zap className="h-4 w-4 text-amber-500" />
          Triggers de Automação
        </h3>
        <p className="text-xs text-muted-foreground mt-0.5">
          Define o que acontece após alguém interagir (ou não) com este email
        </p>
      </div>

      {/* Existing triggers */}
      {triggers.length > 0 && (
        <div className="space-y-2">
          {triggers.map((trigger: CampaignTrigger) => (
            <div
              key={trigger.id}
              className="flex items-center gap-3 rounded-lg border bg-card p-3"
            >
              <div className="flex items-center gap-2 flex-1 min-w-0 text-sm">
                <Badge variant="secondary" className="shrink-0">
                  {EVENT_LABELS[trigger.trigger_event]?.label || trigger.trigger_event}
                </Badge>
                <ArrowRight className="h-3 w-3 text-muted-foreground shrink-0" />
                <span className="text-muted-foreground shrink-0">
                  <Clock className="h-3 w-3 inline mr-1" />
                  {formatWait(trigger.wait_hours)}
                </span>
                <ArrowRight className="h-3 w-3 text-muted-foreground shrink-0" />
                <Badge variant="outline" className="shrink-0">
                  {ACTION_LABELS[trigger.action_type] || trigger.action_type}
                </Badge>
              </div>

              <Switch
                checked={trigger.is_active}
                onCheckedChange={(checked) =>
                  updateTrigger.mutate({ id: trigger.id, is_active: checked })
                }
              />

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Eliminar trigger?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Esta ação não pode ser desfeita.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={() => deleteTrigger.mutate(trigger.id)}>
                      Eliminar
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          ))}
        </div>
      )}

      {/* Add trigger form */}
      {showForm ? (
        <div className="rounded-lg border bg-card p-4 space-y-5">
          {/* Step 1: Event */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              1. Quando alguém...
            </Label>
            <RadioGroup value={event} onValueChange={setEvent} className="grid gap-2">
              {Object.entries(EVENT_LABELS).map(([key, { label, icon }]) => (
                <label
                  key={key}
                  className="flex items-center gap-3 rounded-md border p-3 cursor-pointer hover:bg-accent/50 transition-colors has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-primary/5"
                >
                  <RadioGroupItem value={key} />
                  {icon}
                  <span className="text-sm">{label}</span>
                </label>
              ))}
            </RadioGroup>
          </div>

          {/* Step 2: Wait */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              2. Aguardar
            </Label>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                min={1}
                max={waitUnit === 'hours' ? 168 : 7}
                value={waitValue}
                onChange={(e) => setWaitValue(Number(e.target.value))}
                className="w-20"
              />
              <Select value={waitUnit} onValueChange={(v) => setWaitUnit(v as 'hours' | 'days')}>
                <SelectTrigger className="w-28">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="hours">Horas</SelectItem>
                  <SelectItem value="days">Dias</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Step 3: Action */}
          <div className="space-y-3">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              3. Então...
            </Label>
            <RadioGroup value={actionType} onValueChange={(v) => { setActionType(v); setActionPayload({}); }}>
              <label className="flex items-center gap-3 rounded-md border p-3 cursor-pointer hover:bg-accent/50 transition-colors has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-primary/5">
                <RadioGroupItem value="enroll_sequence" />
                <span className="text-sm">Inscrever em sequência</span>
              </label>
              <label className="flex items-center gap-3 rounded-md border p-3 cursor-pointer hover:bg-accent/50 transition-colors has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-primary/5">
                <RadioGroupItem value="send_campaign" />
                <span className="text-sm">Enviar outra campanha</span>
              </label>
              <label className="flex items-center gap-3 rounded-md border p-3 cursor-pointer hover:bg-accent/50 transition-colors has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-primary/5">
                <RadioGroupItem value="add_tag" />
                <span className="text-sm">Adicionar tag</span>
              </label>
            </RadioGroup>

            {/* Action config */}
            {actionType === 'enroll_sequence' && (
              <Select
                value={actionPayload.sequence_id || ''}
                onValueChange={(v) => setActionPayload({ sequence_id: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar sequência..." />
                </SelectTrigger>
                <SelectContent>
                  {(sequences || []).map((seq: any) => (
                    <SelectItem key={seq.id} value={seq.id}>
                      {seq.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {actionType === 'send_campaign' && (
              <Select
                value={actionPayload.campaign_id || ''}
                onValueChange={(v) => setActionPayload({ campaign_id: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar campanha..." />
                </SelectTrigger>
                <SelectContent>
                  {(campaigns || []).filter((c: any) => c.id !== campaignId).map((c: any) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {actionType === 'add_tag' && (
              <Input
                placeholder="Nome da tag..."
                value={actionPayload.tag || ''}
                onChange={(e) => setActionPayload({ tag: e.target.value })}
              />
            )}
          </div>

          {/* Preview */}
          <div className="rounded-md bg-amber-500/10 border border-amber-500/20 p-3">
            <p className="text-sm text-amber-700 dark:text-amber-400">{getPreviewText()}</p>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <Button onClick={handleSave} disabled={isSaving} size="sm">
              {isSaving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              Guardar trigger
            </Button>
            <Button variant="ghost" size="sm" onClick={() => { setShowForm(false); resetForm(); }}>
              Cancelar
            </Button>
          </div>
        </div>
      ) : (
        <Button variant="outline" size="sm" onClick={() => setShowForm(true)}>
          <Plus className="h-4 w-4 mr-1" />
          Adicionar trigger
        </Button>
      )}
    </div>
  );
}
