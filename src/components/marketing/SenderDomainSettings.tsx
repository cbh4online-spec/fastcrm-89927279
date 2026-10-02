import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RefreshCw, Plus, X } from 'lucide-react';
import { toast } from 'sonner';
import { useMarketingSettings, useUpdateMarketingSettings } from '@/hooks/useMarketingSettings';

const DEFAULT_DOMAIN = 'm.fastcrm.metodopare.ai';
const DOMAIN_RE = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/;
const PREFIX_RE = /^[a-z0-9._-]{1,40}$/;

interface ResendDomain { name: string; status: string; region?: string }

export function SenderDomainSettings({ fromName }: { fromName: string }) {
  const { data: settings } = useMarketingSettings();
  const update = useUpdateMarketingSettings();
  const [domain, setDomain] = useState(DEFAULT_DOMAIN);
  const [prefix, setPrefix] = useState('news');
  const [custom, setCustom] = useState<string[]>([]);
  const [newDomain, setNewDomain] = useState('');

  useEffect(() => {
    if (!settings) return;
    setDomain(settings.senderDomain || DEFAULT_DOMAIN);
    setPrefix(settings.senderPrefix || 'news');
    setCustom(settings.customDomains || []);
  }, [settings]);

  const remote = useQuery({
    queryKey: ['resend-domains'],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('resend-domains');
      if (error) throw error;
      return data as { domains: ResendDomain[]; restricted: boolean; error?: string };
    },
    staleTime: 5 * 60_000,
  });

  const options = useMemo(() => {
    const map = new Map<string, string>();
    map.set(DEFAULT_DOMAIN, 'verified');
    remote.data?.domains?.forEach((d) => map.set(d.name, d.status));
    custom.forEach((d) => { if (!map.has(d)) map.set(d, 'manual'); });
    return Array.from(map.entries());
  }, [remote.data, custom]);

  const addDomain = () => {
    const d = newDomain.trim().toLowerCase();
    if (!DOMAIN_RE.test(d)) return toast.error('Domínio inválido (ex.: mymia.world)');
    if (!custom.includes(d)) setCustom([...custom, d]);
    setDomain(d);
    setNewDomain('');
  };

  const save = async () => {
    const p = prefix.trim().toLowerCase();
    if (!PREFIX_RE.test(p)) return toast.error('Prefixo inválido (só letras, números, ponto, hífen)');
    await update.mutateAsync({
      senderDomain: domain === DEFAULT_DOMAIN ? null : domain,
      senderPrefix: p,
      customDomains: custom,
    });
  };

  const statusLabel = (s: string) =>
    s === 'verified' ? 'Verificado' : s === 'manual' ? 'Adicionado manualmente' : s === 'pending' ? 'Pendente' : s;

  return (
    <div className="rounded-lg border p-4 space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-sm font-medium">Domínio de Envio</p>
          <p className="text-xs text-muted-foreground">Escolha um dos domínios validados na sua conta Resend.</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => remote.refetch()} disabled={remote.isFetching}>
          <RefreshCw className={`h-4 w-4 mr-2 ${remote.isFetching ? 'animate-spin' : ''}`} />
          Sincronizar
        </Button>
      </div>

      {remote.data?.restricted && (
        <p className="text-xs text-muted-foreground rounded-md bg-muted p-3">
          A chave Resend ligada só permite enviar. Para listar automaticamente os domínios, crie no Resend uma chave
          com "Full access" e volte a ligar o conector. Entretanto pode adicionar os domínios manualmente.
        </p>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <div className="grid gap-2">
          <Label>Domínio</Label>
          <Select value={domain} onValueChange={setDomain}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {options.map(([name, status]) => (
                <SelectItem key={name} value={name}>
                  {name} — {name === DEFAULT_DOMAIN ? 'Plataforma' : statusLabel(status)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="senderPrefix">Prefixo do remetente</Label>
          <Input id="senderPrefix" value={prefix} maxLength={40} onChange={(e) => setPrefix(e.target.value)} placeholder="news" />
        </div>
      </div>

      <div className="grid gap-2">
        <Label htmlFor="newDomain">Adicionar domínio validado no Resend</Label>
        <div className="flex gap-2">
          <Input id="newDomain" value={newDomain} onChange={(e) => setNewDomain(e.target.value)} placeholder="mymia.world" />
          <Button variant="outline" onClick={addDomain} aria-label="Adicionar domínio"><Plus className="h-4 w-4" /></Button>
        </div>
        {custom.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {custom.map((d) => (
              <Badge key={d} variant="secondary" className="gap-1">
                {d}
                <button aria-label={`Remover ${d}`} onClick={() => { setCustom(custom.filter((x) => x !== d)); if (domain === d) setDomain(DEFAULT_DOMAIN); }}>
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
        )}
      </div>

      <div className="flex items-center justify-between gap-2 rounded-md bg-muted p-3">
        <p className="text-sm">
          Os destinatários veem: <code className="font-mono text-xs">{fromName || 'Nome'} &lt;{prefix || 'news'}@{domain}&gt;</code>
        </p>
        <Button size="sm" onClick={save} disabled={update.isPending}>Guardar domínio</Button>
      </div>
    </div>
  );
}
