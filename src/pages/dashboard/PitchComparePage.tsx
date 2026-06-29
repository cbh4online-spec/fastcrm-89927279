import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Check, Search, Sparkles, X } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { OwnerOnlyRoute } from '@/components/auth/OwnerOnlyRoute';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import {
  COMPARABLE_MODULES,
  CATEGORY_LABELS,
  type ComparableModule,
  type ModuleCategory,
} from '@/lib/pitch/moduleCatalog';
import {
  CURRENCIES,
  TIERS,
  PITCH_TIERS,
  formatPrice,
  intervalLabel,
  getCurrencyMeta,
  listCurrencyCodes,
  type PitchCurrency,
  type PitchBillingInterval,
  type PitchTier,
} from '@/lib/pitch/pricing';

type CategoryFilter = 'all' | ModuleCategory;

const BUNDLE_DISCOUNTS: Array<{ count: number; pct: number; label: string }> = [
  { count: 3, pct: 10, label: '3 módulos · −10%' },
  { count: 5, pct: 15, label: '5 módulos · −15%' },
  { count: 8, pct: 20, label: '8+ módulos · −20%' },
];

function getDiscount(count: number): { pct: number; label: string | null } {
  let pct = 0;
  let label: string | null = null;
  for (const tier of BUNDLE_DISCOUNTS) {
    if (count >= tier.count) {
      pct = tier.pct;
      label = tier.label;
    }
  }
  return { pct, label };
}

export default function PitchComparePage() {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<CategoryFilter>('all');
  const [tier, setTier] = useState<PitchTier>('grow');
  const [currency, setCurrency] = useState<PitchCurrency>('EUR');
  const [interval, setInterval] = useState<PitchBillingInterval>('monthly');
  const [selected, setSelected] = useState<Set<string>>(new Set());

  useEffect(() => {
    document.title = 'Comparar módulos — FastCRM';
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return COMPARABLE_MODULES.filter((m) => {
      if (category !== 'all' && m.category !== category) return false;
      if (!q) return true;
      return (
        m.title.toLowerCase().includes(q) ||
        m.note.toLowerCase().includes(q) ||
        m.tags.some((t) => t.toLowerCase().includes(q))
      );
    });
  }, [search, category]);

  const computeMonthly = (m: ComparableModule): number => {
    const meta = getCurrencyMeta(currency);
    const intervalMult = interval === 'annual' ? 10 : 1;
    return m.basePriceEur * meta.rate * TIERS[tier].multiplier * intervalMult;
  };

  const formatModulePrice = (m: ComparableModule): string => {
    if (m.basePriceEur === 0) return '—';
    const value = computeMonthly(m);
    return formatPrice(value, currency);
  };

  const intervalSuffix = interval === 'annual' ? '/ano' : '/mês';

  const selectedModules = useMemo(
    () => COMPARABLE_MODULES.filter((m) => selected.has(m.id)),
    [selected]
  );

  const subtotal = selectedModules.reduce((acc, m) => acc + computeMonthly(m), 0);
  const { pct, label } = getDiscount(selectedModules.length);
  const discountValue = subtotal * (pct / 100);
  const total = subtotal - discountValue;

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const clearSelection = () => setSelected(new Set());

  return (
    <DashboardLayout>
      <OwnerOnlyRoute>
    <div className="container mx-auto max-w-7xl px-4 py-6 md:py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="space-y-1">
          <Button asChild variant="ghost" size="sm" className="-ml-2 mb-1 h-7 px-2 text-muted-foreground">
            <Link to="/dashboard/pitch">
              <ArrowLeft className="h-3.5 w-3.5 mr-1.5" />
              Voltar à apresentação
            </Link>
          </Button>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">
              Comparar módulos
            </h1>
            <Badge variant="secondary" className="text-[10px] uppercase tracking-wider">
              {COMPARABLE_MODULES.length} disponíveis
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground max-w-2xl">
            Veja preços, limites e notas de cada módulo opcional, vertical e pack funcional.
            Selecione vários para construir um bundle com desconto progressivo.
          </p>
        </div>
      </div>

      {/* Controls */}
      <Card className="p-4 bg-card/60 border">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
          <div className="md:col-span-5 space-y-1">
            <label className="text-[10px] uppercase tracking-wider text-muted-foreground">
              Pesquisar
            </label>
            <div className="relative">
              <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Pesquisar por nome, tag ou descrição…"
                className="pl-9"
              />
            </div>
          </div>

          <div className="md:col-span-2 space-y-1">
            <label className="text-[10px] uppercase tracking-wider text-muted-foreground">
              Tier
            </label>
            <Select value={tier} onValueChange={(v) => setTier(v as PitchTier)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {PITCH_TIERS.map((t) => (
                  <SelectItem key={t} value={t}>
                    {TIERS[t].label} · ×{TIERS[t].multiplier}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="md:col-span-2 space-y-1">
            <label className="text-[10px] uppercase tracking-wider text-muted-foreground">
              Moeda
            </label>
            <Select value={currency} onValueChange={(v) => setCurrency(v as PitchCurrency)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {listCurrencyCodes().map((c) => (
                  <SelectItem key={c} value={c}>{getCurrencyMeta(c).label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="md:col-span-3 space-y-1">
            <label className="text-[10px] uppercase tracking-wider text-muted-foreground">
              Intervalo
            </label>
            <Select value={interval} onValueChange={(v) => setInterval(v as PitchBillingInterval)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="monthly">{intervalLabel('monthly')}</SelectItem>
                <SelectItem value="annual">{intervalLabel('annual')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="mt-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <Tabs value={category} onValueChange={(v) => setCategory(v as CategoryFilter)}>
            <TabsList>
              <TabsTrigger value="all">Todos</TabsTrigger>
              <TabsTrigger value="module">{CATEGORY_LABELS.module}</TabsTrigger>
              <TabsTrigger value="vertical">{CATEGORY_LABELS.vertical}</TabsTrigger>
              <TabsTrigger value="pack">{CATEGORY_LABELS.pack}</TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="text-xs text-muted-foreground">
            A mostrar <span className="font-medium text-foreground">{filtered.length}</span> de{' '}
            {COMPARABLE_MODULES.length} módulos
          </div>
        </div>
      </Card>

      {/* Bundle bar (sticky resumo) */}
      {selected.size > 0 && (
        <Card className="p-4 bg-primary/5 border-primary/20 sticky top-2 z-20 backdrop-blur-sm">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div className="flex items-center gap-3 flex-wrap">
              <Sparkles className="h-4 w-4 text-primary" />
              <div className="text-sm">
                <span className="font-medium">Bundle: {selected.size} módulo{selected.size > 1 ? 's' : ''}</span>
                {label && (
                  <Badge variant="outline" className="ml-2 border-primary/40 text-primary">
                    {label}
                  </Badge>
                )}
              </div>
              <div className="flex flex-wrap gap-1">
                {selectedModules.slice(0, 4).map((m) => (
                  <Badge key={m.id} variant="secondary" className="text-[10px]">
                    {m.title}
                  </Badge>
                ))}
                {selectedModules.length > 4 && (
                  <Badge variant="secondary" className="text-[10px]">
                    +{selectedModules.length - 4}
                  </Badge>
                )}
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="text-right">
                {pct > 0 && (
                  <div className="text-xs text-muted-foreground line-through">
                    {formatPrice(subtotal, currency)} {intervalSuffix}
                  </div>
                )}
                <div className="text-lg font-semibold tabular-nums">
                  {formatPrice(total, currency)}{' '}
                  <span className="text-xs font-normal text-muted-foreground">
                    {intervalSuffix} · {TIERS[tier].label}
                  </span>
                </div>
                {pct > 0 && (
                  <div className="text-[11px] text-primary">
                    Poupa {formatPrice(discountValue, currency)} ({pct}%)
                  </div>
                )}
              </div>
              <Button variant="ghost" size="sm" onClick={clearSelection}>
                <X className="h-4 w-4 mr-1" /> Limpar
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Tabela de comparação */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40">
                <TableHead className="w-10"></TableHead>
                <TableHead className="min-w-[220px]">Módulo</TableHead>
                <TableHead className="min-w-[260px]">Notas</TableHead>
                <TableHead className="text-right whitespace-nowrap">
                  Preço · {TIERS[tier].label}
                </TableHead>
                <TableHead className="min-w-[160px]">Limite Grow</TableHead>
                <TableHead className="min-w-[160px]">Limite Pro</TableHead>
                <TableHead className="min-w-[180px]">Limite Enterprise</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-10 text-muted-foreground text-sm">
                    Nenhum módulo corresponde aos filtros.
                  </TableCell>
                </TableRow>
              )}
              {filtered.map((m) => {
                const isSel = selected.has(m.id);
                return (
                  <TableRow
                    key={m.id}
                    className={cn(
                      'cursor-pointer transition-colors',
                      isSel && 'bg-primary/5 hover:bg-primary/10'
                    )}
                    onClick={() => toggle(m.id)}
                  >
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <Checkbox checked={isSel} onCheckedChange={() => toggle(m.id)} />
                    </TableCell>
                    <TableCell className="align-top">
                      <div className="font-medium leading-tight">{m.title}</div>
                      <div className="mt-1 flex flex-wrap gap-1">
                        <Badge variant="outline" className="text-[10px]">
                          {CATEGORY_LABELS[m.category]}
                        </Badge>
                        {m.tags.slice(0, 2).map((t) => (
                          <span
                            key={t}
                            className="text-[10px] text-muted-foreground"
                          >
                            #{t}
                          </span>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="align-top text-sm text-muted-foreground">
                      {m.note}
                      {m.priceNote && (
                        <div className="text-[11px] mt-1 text-muted-foreground/80 italic">
                          {m.priceNote}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-right align-top whitespace-nowrap">
                      <div className="font-semibold tabular-nums">
                        {formatModulePrice(m)}
                      </div>
                      {m.basePriceEur > 0 && (
                        <div className="text-[10px] text-muted-foreground">
                          {intervalSuffix}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="align-top text-xs">
                      <LimitCell value={m.limits.grow} active={tier === 'grow'} />
                    </TableCell>
                    <TableCell className="align-top text-xs">
                      <LimitCell value={m.limits.pro} active={tier === 'pro'} />
                    </TableCell>
                    <TableCell className="align-top text-xs">
                      <LimitCell value={m.limits.enterprise} active={tier === 'enterprise'} />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Tiers de bundle */}
      <Card className="p-5 bg-gradient-to-br from-card to-card/50">
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-semibold uppercase tracking-wider">
            Descontos por bundle
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {BUNDLE_DISCOUNTS.map((d) => {
            const reached = selectedModules.length >= d.count;
            return (
              <div
                key={d.count}
                className={cn(
                  'rounded-lg border p-4 transition-colors',
                  reached
                    ? 'border-primary/50 bg-primary/5'
                    : 'border-border bg-muted/20'
                )}
              >
                <div className="flex items-center justify-between">
                  <div className="text-2xl font-semibold tabular-nums">
                    −{d.pct}%
                  </div>
                  {reached && <Check className="h-4 w-4 text-primary" />}
                </div>
                <div className="text-sm font-medium mt-1">{d.label}</div>
                <div className="text-xs text-muted-foreground mt-1">
                  Aplicado automaticamente ao subscrever {d.count}+ módulos opcionais.
                </div>
              </div>
            );
          })}
        </div>
        <p className="text-[11px] text-muted-foreground mt-4">
          Preços indicativos para discurso comercial. Valores convertidos com taxas estáticas
          e multiplicador de tier — para proposta vinculativa, gere o pitch e exporte o PPTX.
        </p>
      </Card>
    </div>
      </OwnerOnlyRoute>
    </DashboardLayout>
  );
}

function LimitCell({ value, active }: { value: string; active: boolean }) {
  return (
    <span
      className={cn(
        'inline-block px-2 py-1 rounded-md',
        active
          ? 'bg-primary/10 text-foreground font-medium'
          : 'text-muted-foreground'
      )}
    >
      {value}
    </span>
  );
}
