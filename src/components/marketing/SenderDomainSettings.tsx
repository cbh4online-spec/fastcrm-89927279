import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RefreshCw } from 'lucide-react';

export const DEFAULT_SENDER_DOMAIN = 'm.fastcrm.metodopare.ai';
export const SENDER_DOMAIN_RE = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/;
export const SENDER_PREFIX_RE = /^[a-z0-9._-]{1,40}$/;
const CUSTOM = '__custom__';

interface ResendDomain { name: string; status: string; region?: string }

interface Props {
  domain: string;
  prefix: string;
  customDomains: string[];
  onChange: (v: { domain?: string; prefix?: string; customDomains?: string[] }) => void;
}

export function SenderDomainSettings({ domain, prefix, customDomains, onChange }: Props) {
  const remote = useQuery({
    queryKey: ['resend-domains'],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('resend-domains');
      if (error) throw error;
      return data as { domains: ResendDomain[]; restricted: boolean; error?: string };
    },
    staleTime: 5 * 60_000,
    retry: false,
  });

  const options = useMemo(() => {
    const map = new Map<string, string>();
    map.set(DEFAULT_SENDER_DOMAIN, 'platform');
    remote.data?.domains?.forEach((d) => map.set(d.name.toLowerCase(), d.status));
    customDomains.forEach((d) => { if (!map.has(d)) map.set(d, 'manual'); });
    return Array.from(map.entries());
  }, [remote.data, customDomains]);

  const isKnown = options.some(([n]) => n === domain);
  const [customMode, setCustomMode] = useState(false);
  const showCustom = customMode || !isKnown;

  const statusLabel = (s: string) =>
    s === 'platform' ? 'Plataforma' : s === 'verified' ? 'Verificado' : s === 'manual' ? 'Adicionado por si' : s === 'pending' ? 'Pendente' : s;

  const domainInvalid = !!domain && !SENDER_DOMAIN_RE.test(domain);
  const prefixInvalid = !!prefix && !SENDER_PREFIX_RE.test(prefix);
  const selectedStatus = options.find(([n]) => n === domain)?.[1];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <Label>Endereço de envio</Label>
        <Button type="button" variant="ghost" size="sm" onClick={() => remote.refetch()} disabled={remote.isFetching}>
          <RefreshCw className={`h-4 w-4 mr-2 ${remote.isFetching ? 'animate-spin' : ''}`} />
          Sincronizar com Resend
        </Button>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-start">
        <div className="sm:w-48">
          <Input
            aria-label="Prefixo do remetente"
            value={prefix}
            maxLength={40}
            placeholder="news"
            onChange={(e) => onChange({ prefix: e.target.value.trim().toLowerCase() })}
          />
          <p className="mt-1 text-xs text-muted-foreground">Prefixo</p>
        </div>
        <span className="hidden sm:block pt-2 text-muted-foreground">@</span>
        <div className="flex-1 space-y-2">
          <Select
            value={showCustom ? CUSTOM : domain}
            onValueChange={(v) => {
              if (v === CUSTOM) { setCustomMode(true); onChange({ domain: '' }); }
              else { setCustomMode(false); onChange({ domain: v }); }
            }}
          >
            <SelectTrigger aria-label="Domínio de envio"><SelectValue /></SelectTrigger>
            <SelectContent>
              {options.map(([name, status]) => (
                <SelectItem key={name} value={name}>{name} — {statusLabel(status)}</SelectItem>
              ))}
              <SelectItem value={CUSTOM}>Outro domínio validado no Resend…</SelectItem>
            </SelectContent>
          </Select>
          {showCustom && (
            <Input
              aria-label="Domínio personalizado"
              autoFocus
              value={domain}
              placeholder="mymia.world"
              onChange={(e) => {
                const d = e.target.value.trim().toLowerCase();
                const next = customDomains.filter((x) => x !== domain);
                onChange({ domain: d, customDomains: SENDER_DOMAIN_RE.test(d) ? [...next, d] : next });
              }}
            />
          )}
          <p className="text-xs text-muted-foreground">
            Domínio{selectedStatus && !showCustom ? ` · ${statusLabel(selectedStatus)}` : ''}
          </p>
        </div>
      </div>

      {(domainInvalid || prefixInvalid) && (
        <p className="text-xs text-destructive">
          {domainInvalid ? 'Domínio inválido (ex.: mymia.world). ' : ''}
          {prefixInvalid ? 'Prefixo inválido: use só letras minúsculas, números, ponto, hífen ou _.' : ''}
        </p>
      )}

      {remote.data?.restricted && (
        <p className="text-xs text-muted-foreground rounded-md bg-muted p-3">
          A chave Resend ligada só permite enviar, por isso não conseguimos listar os seus domínios. Escolha
          "Outro domínio" e escreva o domínio já verificado no Resend. Para a lista automática, crie no Resend uma
          chave com "Full access" e volte a ligar o conector.
        </p>
      )}
    </div>
  );
}
