import { ChangeEvent, useEffect, useRef, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Save, RotateCcw, Trash2, Upload, X, History, Database, Search, ChevronLeft, ChevronRight, Check, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { usePitchConfig } from '@/hooks/usePitchConfig';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { cn } from '@/lib/utils';
import { Checkbox } from '@/components/ui/checkbox';
import { PITCH_SLIDES, DEFAULT_ENABLED_SLIDE_IDS, OPTIONAL_MODULE_SLIDE_IDS, BASE_MODULE_SLIDE_IDS, VERTICAL_SLIDE_IDS, PACK_SLIDE_IDS } from './slides';
import { DEFAULT_MODULE_PRICES } from '@/lib/pitch/slideContent';
import { CURRENCIES, convertPriceString, intervalLabel, TIERS, PITCH_TIERS, getCurrencyMeta, listCurrencyCodes, registerCurrency, setCurrencyRate, type PitchCurrency, type PitchBillingInterval, type PitchTier } from '@/lib/pitch/pricing';
import { findMissingPrices } from '@/lib/pitch/validatePricing';
import { AlertTriangle, TrendingUp } from 'lucide-react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import { CurrencyManagerDialog } from './CurrencyManagerDialog';

type PitchConfig = ReturnType<typeof usePitchConfig>;

interface CrmRow {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  role?: string | null;
  company?: string | null;
  companyId?: string | null;
  industry?: string | null;
}

const PAGE_SIZE = 10;

export function PitchCustomizationPanel({ config }: { config?: PitchConfig }) {
  const fallback = usePitchConfig();
  const { tokens, updateToken, resetTokens, history, saveToHistory, loadFromHistory, removeFromHistory } = config ?? fallback;
  const { currentWorkspace } = useWorkspace();
  const [crmOpen, setCrmOpen] = useState(false);
  const [crmTab, setCrmTab] = useState<'contacts' | 'leads' | 'companies'>('contacts');
  const [crmSearch, setCrmSearch] = useState('');
  const [crmRows, setCrmRows] = useState<CrmRow[]>([]);
  const [crmLoading, setCrmLoading] = useState(false);
  const [crmPage, setCrmPage] = useState(0);
  const [crmTotal, setCrmTotal] = useState(0);
  const [crmPreview, setCrmPreview] = useState<CrmRow | null>(null);
  const debounceRef = useRef<number | null>(null);

  // Re-hydrate the runtime currency registry from token-stored custom
  // currencies and FX rate overrides whenever they change. Without this,
  // slides rendered before the dialog/screen is opened would fall back to
  // EUR / built-in default rates.
  useEffect(() => {
    (tokens.customCurrencies || []).forEach((c) => registerCurrency(c));
    Object.entries(tokens.customRates || {}).forEach(([code, rate]) => {
      setCurrencyRate(code, rate);
    });
  }, [tokens.customCurrencies, tokens.customRates]);

  const handleLogoUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 1.5 * 1024 * 1024) {
      toast.error('Logo demasiado grande (máx 1,5 MB).');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => updateToken('companyLogoUrl', reader.result as string);
    reader.readAsDataURL(file);
  };

  const loadCrm = async (tab: 'contacts' | 'leads' | 'companies', search: string, page: number) => {
    if (!currentWorkspace?.id) return;
    setCrmLoading(true);
    try {
      const wsId = currentWorkspace.id;
      const s = search.trim().replace(/[,()]/g, ' ');
      const from = page * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;
      let rows: CrmRow[] = [];
      let total = 0;
      if (tab === 'contacts') {
        let q = supabase.from('contacts')
          .select('id, first_name, last_name, email, phone, job_title, company_id', { count: 'exact' })
          .eq('workspace_id', wsId)
          .order('updated_at', { ascending: false })
          .range(from, to);
        if (s) q = q.or(`first_name.ilike.%${s}%,last_name.ilike.%${s}%,email.ilike.%${s}%`);
        const { data, error, count } = await q;
        if (error) throw error;
        total = count ?? 0;
        const ids = Array.from(new Set((data || []).map((r: any) => r.company_id).filter(Boolean)));
        const companyMap: Record<string, { name: string; industry?: string | null }> = {};
        if (ids.length) {
          const { data: comps } = await supabase.from('companies').select('id, name, industry').in('id', ids);
          (comps || []).forEach((c: any) => { companyMap[c.id] = { name: c.name, industry: c.industry }; });
        }
        rows = (data || []).map((r: any) => ({
          id: r.id,
          name: [r.first_name, r.last_name].filter(Boolean).join(' ') || r.email || '—',
          email: r.email,
          phone: r.phone,
          role: r.job_title,
          companyId: r.company_id,
          company: r.company_id ? companyMap[r.company_id]?.name : null,
          industry: r.company_id ? companyMap[r.company_id]?.industry : null,
        }));
      } else if (tab === 'leads') {
        let q = supabase.from('leads')
          .select('id, name, email, phone, company_name, position', { count: 'exact' })
          .eq('workspace_id', wsId)
          .order('updated_at', { ascending: false })
          .range(from, to);
        if (s) q = q.or(`name.ilike.%${s}%,email.ilike.%${s}%,company_name.ilike.%${s}%`);
        const { data, error, count } = await q;
        if (error) throw error;
        total = count ?? 0;
        rows = (data || []).map((r: any) => ({
          id: r.id,
          name: r.name || r.email || '—',
          email: r.email,
          phone: r.phone,
          role: r.position,
          company: r.company_name,
        }));
      } else {
        let q = supabase.from('companies')
          .select('id, name, email, phone, industry', { count: 'exact' })
          .eq('workspace_id', wsId)
          .order('updated_at', { ascending: false })
          .range(from, to);
        if (s) q = q.or(`name.ilike.%${s}%,email.ilike.%${s}%`);
        const { data, error, count } = await q;
        if (error) throw error;
        total = count ?? 0;
        rows = (data || []).map((r: any) => ({
          id: r.id, name: r.name, email: r.email, phone: r.phone, industry: r.industry,
        }));
      }
      setCrmRows(rows);
      setCrmTotal(total);
    } catch (e) {
      console.error('CRM load failed', e);
      toast.error('Erro ao carregar do CRM.');
    } finally {
      setCrmLoading(false);
    }
  };

  // Debounce search + reset to page 0 on tab/search change
  useEffect(() => {
    if (!crmOpen) return;
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(() => {
      setCrmPage(0);
      loadCrm(crmTab, crmSearch, 0);
    }, 250);
    return () => { if (debounceRef.current) window.clearTimeout(debounceRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [crmSearch, crmTab, crmOpen]);

  useEffect(() => {
    if (!crmOpen) return;
    loadCrm(crmTab, crmSearch, crmPage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [crmPage]);

  const applyCrmRow = (row: CrmRow) => {
    if (crmTab === 'companies') {
      updateToken('companyName', row.name || '');
      if (row.industry) updateToken('industry', row.industry);
    } else {
      updateToken('contactName', row.name || '');
      if (row.role) updateToken('contactRole', row.role);
      if (row.company) updateToken('companyName', row.company);
      if (row.industry) updateToken('industry', row.industry);
    }
    setCrmOpen(false);
    setCrmPreview(null);
    toast.success(`${row.name || 'Registo'} carregado do CRM.`);
  };

  const previewFields = (row: CrmRow): { label: string; value: string }[] => {
    const isCompany = crmTab === 'companies';
    const out: { label: string; value: string }[] = [];
    if (isCompany) {
      out.push({ label: 'Empresa', value: row.name || '—' });
      if (row.industry) out.push({ label: 'Setor', value: row.industry });
    } else {
      out.push({ label: 'Contacto', value: row.name || '—' });
      if (row.role) out.push({ label: 'Cargo', value: row.role });
      if (row.company) out.push({ label: 'Empresa', value: row.company });
      if (row.industry) out.push({ label: 'Setor', value: row.industry });
    }
    if (row.email) out.push({ label: 'Email', value: row.email });
    if (row.phone) out.push({ label: 'Telefone', value: row.phone });
    return out;
  };

  return (
    <ScrollArea className="h-full">
      <div className="p-5 space-y-6">
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">Cliente</h3>
            <Dialog open={crmOpen} onOpenChange={(o) => { setCrmOpen(o); if (!o) setCrmPreview(null); }}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="h-7 text-xs">
                  <Database className="h-3.5 w-3.5 mr-1" /> Carregar do CRM
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-3xl p-0 overflow-hidden">
                <DialogHeader className="px-5 pt-5 pb-3 border-b">
                  <DialogTitle>{crmPreview ? 'Pré-visualização' : 'Carregar dados do CRM'}</DialogTitle>
                </DialogHeader>

                {!crmPreview && (
                  <div className="px-5 pb-5">
                    <div className="flex gap-2 mb-3">
                      {(['contacts', 'leads', 'companies'] as const).map((t) => (
                        <Button key={t} size="sm" variant={crmTab === t ? 'default' : 'outline'} onClick={() => setCrmTab(t)}>
                          {t === 'contacts' ? 'Contactos' : t === 'leads' ? 'Leads' : 'Empresas'}
                        </Button>
                      ))}
                    </div>
                    <div className="relative">
                      <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        className="pl-9"
                        placeholder="Pesquisar por nome, email ou empresa…"
                        value={crmSearch}
                        onChange={(e) => setCrmSearch(e.target.value)}
                      />
                    </div>
                    <div className="min-h-[360px] max-h-[440px] overflow-y-auto mt-3 border rounded-md">
                      {crmLoading && <div className="text-sm text-muted-foreground p-4 text-center">A carregar…</div>}
                      {!crmLoading && crmRows.length === 0 && (
                        <div className="text-sm text-muted-foreground p-6 text-center">Sem resultados.</div>
                      )}
                      {!crmLoading && crmRows.map((r) => (
                        <button
                          key={r.id}
                          onClick={() => setCrmPreview(r)}
                          className="w-full text-left p-3 border-b last:border-b-0 hover:bg-muted/50 transition"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div className="min-w-0 flex-1">
                              <div className="font-medium text-sm truncate">{r.name || '—'}</div>
                              <div className="text-xs text-muted-foreground truncate">
                                {[r.role, r.company, r.email, r.phone].filter(Boolean).join(' · ') || '—'}
                              </div>
                            </div>
                            <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                          </div>
                        </button>
                      ))}
                    </div>
                    <div className="flex items-center justify-between mt-3 text-xs text-muted-foreground">
                      <div>
                        {crmTotal > 0
                          ? `A mostrar ${crmPage * PAGE_SIZE + 1}-${Math.min((crmPage + 1) * PAGE_SIZE, crmTotal)} de ${crmTotal}`
                          : '—'}
                      </div>
                      <div className="flex items-center gap-2">
                        <Button size="sm" variant="outline" disabled={crmPage === 0 || crmLoading} onClick={() => setCrmPage((p) => Math.max(0, p - 1))}>
                          <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <div className="font-mono tabular-nums">{crmPage + 1} / {Math.max(1, Math.ceil(crmTotal / PAGE_SIZE))}</div>
                        <Button size="sm" variant="outline" disabled={(crmPage + 1) * PAGE_SIZE >= crmTotal || crmLoading} onClick={() => setCrmPage((p) => p + 1)}>
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

                {crmPreview && (
                  <div className="px-5 pb-5">
                    <button onClick={() => setCrmPreview(null)} className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1 mb-3">
                      <ArrowLeft className="h-3.5 w-3.5" /> Voltar à lista
                    </button>
                    <div className="border rounded-md p-4 bg-muted/30">
                      <div className="text-xs uppercase tracking-wider text-muted-foreground mb-3">
                        Vai aplicar os seguintes campos
                      </div>
                      <dl className="grid grid-cols-[120px_1fr] gap-y-2 gap-x-4 text-sm">
                        {previewFields(crmPreview).map((f) => (
                          <div key={f.label} className="contents">
                            <dt className="text-muted-foreground">{f.label}</dt>
                            <dd className="font-medium truncate">{f.value}</dd>
                          </div>
                        ))}
                      </dl>
                    </div>
                    <div className="flex items-center justify-end gap-2 mt-4">
                      <Button variant="outline" size="sm" onClick={() => setCrmPreview(null)}>Cancelar</Button>
                      <Button size="sm" onClick={() => applyCrmRow(crmPreview)}>
                        <Check className="h-4 w-4 mr-2" /> Aplicar ao pitch
                      </Button>
                    </div>
                  </div>
                )}
              </DialogContent>
            </Dialog>
          </div>
          <div className="space-y-3">
            <div>
              <Label htmlFor="companyName">Empresa *</Label>
              <Input id="companyName" value={tokens.companyName} onChange={(e) => updateToken('companyName', e.target.value)} placeholder="Ex: Tech Solutions, Lda" />
            </div>
            <div>
              <Label htmlFor="companyLogo">Logo da empresa</Label>
              <div className="flex items-center gap-2 mt-1">
                {tokens.companyLogoUrl ? (
                  <div className="relative">
                    <img src={tokens.companyLogoUrl} alt="logo" className="h-12 w-24 object-contain rounded border bg-white" />
                    <button onClick={() => updateToken('companyLogoUrl', '')} className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-0.5">
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ) : (
                  <Label htmlFor="companyLogo" className="cursor-pointer flex items-center gap-2 px-3 py-2 border rounded-md text-sm hover:bg-muted">
                    <Upload className="h-4 w-4" /> Carregar
                    <Input id="companyLogo" type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
                  </Label>
                )}
              </div>
            </div>
            <div>
              <Label htmlFor="industry">Setor</Label>
              <Input id="industry" value={tokens.industry} onChange={(e) => updateToken('industry', e.target.value)} placeholder="Ex: Tecnologia, Retalho..." />
            </div>
            <div>
              <Label htmlFor="contactName">Nome do contacto</Label>
              <Input id="contactName" value={tokens.contactName} onChange={(e) => updateToken('contactName', e.target.value)} placeholder="Ex: Ana Ferreira" />
            </div>
            <div>
              <Label htmlFor="contactRole">Cargo</Label>
              <Input id="contactRole" value={tokens.contactRole} onChange={(e) => updateToken('contactRole', e.target.value)} placeholder="Ex: CEO, Director Comercial" />
            </div>
          </div>
        </div>

        <div>
          <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground mb-3">Reunião</h3>
          <div className="space-y-3">
            <div>
              <Label htmlFor="meetingDate">Data</Label>
              <Input id="meetingDate" type="date" value={tokens.meetingDate} onChange={(e) => updateToken('meetingDate', e.target.value)} />
            </div>
            <div>
              <Label htmlFor="tone">Tom</Label>
              <Select value={tokens.tone} onValueChange={(v) => updateToken('tone', v as 'tu' | 'voce')}>
                <SelectTrigger id="tone"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="voce">Você (formal)</SelectItem>
                  <SelectItem value="tu">Tu (informal)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">Módulos do pitch</h3>
            <div className="flex gap-1">
              <button
                type="button"
                onClick={() => updateToken('enabledSlides', undefined)}
                className="text-[10px] uppercase tracking-wider text-muted-foreground hover:text-foreground"
              >
                Core
              </button>
              <span className="text-[10px] text-muted-foreground">·</span>
              <button
                type="button"
                onClick={() => updateToken('enabledSlides', [...DEFAULT_ENABLED_SLIDE_IDS, ...OPTIONAL_MODULE_SLIDE_IDS])}
                className="text-[10px] uppercase tracking-wider text-muted-foreground hover:text-foreground"
              >
                Tudo
              </button>
              <span className="text-[10px] text-muted-foreground">·</span>
              <button
                type="button"
                onClick={() => updateToken('enabledSlides', PITCH_SLIDES.filter((s) => s.required).map((s) => s.id))}
                className="text-[10px] uppercase tracking-wider text-muted-foreground hover:text-foreground"
              >
                Mínimo
              </button>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mb-3">
            Capa e Próximos passos são obrigatórios. Módulos opcionais estão desligados por defeito.
          </p>

          <a
            href="/dashboard/pitch/compare"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 mb-3 text-[11px] font-medium text-primary hover:underline"
          >
            Abrir tabela de comparação completa →
          </a>

          {/* Tier + Moeda + intervalo de faturação — afecta todos os preços dos módulos */}
          <div className="space-y-2 mb-4 p-2.5 rounded-md border bg-muted/30">
            <div>
              <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Tier de pricing</Label>
              <div className="grid grid-cols-3 gap-1 mt-1">
                {PITCH_TIERS.map((t) => {
                  const meta = TIERS[t];
                  const active = (tokens.tier || 'grow') === t;
                  return (
                    <button
                      key={t}
                      type="button"
                      onClick={() => updateToken('tier', t)}
                      className={cn(
                        'rounded-md border px-2 py-1.5 text-xs font-medium transition text-center',
                        active
                          ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                          : 'bg-background hover:bg-muted border-border text-foreground'
                      )}
                      title={meta.description}
                    >
                      <div>{meta.shortLabel}</div>
                      <div className={cn('text-[9px] font-mono mt-0.5', active ? 'opacity-90' : 'text-muted-foreground')}>
                        ×{meta.multiplier}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <div className="flex items-center justify-between gap-1">
                  <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Moeda</Label>
                  <div className="flex items-center gap-0.5">
                    <a
                      href="/dashboard/pitch/exchange-rates"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center h-7 px-2 text-[10px] gap-1 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                      title="Ajustar taxas de câmbio"
                    >
                      <TrendingUp className="h-3 w-3" />
                      Taxas
                    </a>
                    <CurrencyManagerDialog
                      customCurrencies={tokens.customCurrencies || []}
                      onChange={(next) => updateToken('customCurrencies', next)}
                    />
                  </div>
                </div>
                <Select
                  value={tokens.currency || 'EUR'}
                  onValueChange={(v) => updateToken('currency', v as PitchCurrency)}
                >
                  <SelectTrigger className="h-8 text-xs mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {listCurrencyCodes().map((code) => {
                      const meta = getCurrencyMeta(code);
                      return (
                        <SelectItem key={code} value={code} className="text-xs">{meta.label}</SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Intervalo</Label>
                <Select
                  value={tokens.billingInterval || 'monthly'}
                  onValueChange={(v) => updateToken('billingInterval', v as PitchBillingInterval)}
                >
                  <SelectTrigger className="h-8 text-xs mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monthly" className="text-xs">Mensal</SelectItem>
                    <SelectItem value="annual" className="text-xs">Anual · 2 meses grátis</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="text-[10px] text-muted-foreground">
              Preços a {TIERS[tokens.tier || 'grow'].label} · {intervalLabel(tokens.billingInterval || 'monthly')}.
            </div>
          </div>

          {(() => {
            const missing = findMissingPrices(tokens);
            if (missing.length === 0) return null;
            return (
              <div className="mb-3 rounded-md border border-destructive/40 bg-destructive/5 p-2.5 text-xs">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-3.5 w-3.5 text-destructive mt-0.5 flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className="font-medium text-foreground">
                      {missing.length} módulo{missing.length === 1 ? '' : 's'} sem preço definido
                    </div>
                    <div className="mt-1 text-muted-foreground">
                      Define o preço no separador <strong>Slide atual</strong> antes de exportar para garantir cobertura comercial total.
                    </div>
                    <ul className="mt-1.5 space-y-0.5">
                      {missing.slice(0, 5).map((m) => (
                        <li key={m.id} className="truncate text-foreground">
                          • {m.title}
                        </li>
                      ))}
                      {missing.length > 5 && (
                        <li className="text-muted-foreground">
                          +{missing.length - 5} adicional{missing.length - 5 === 1 ? '' : 'is'}…
                        </li>
                      )}
                    </ul>
                  </div>
                </div>
              </div>
            );
          })()}

          <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-2">Slides core</div>
          <div className="space-y-1.5 mb-4">
            {PITCH_SLIDES.filter((s) => s.category === 'core').map((s) => {
              const enabledList = tokens.enabledSlides ?? DEFAULT_ENABLED_SLIDE_IDS;
              const isOn = s.required || enabledList.includes(s.id);
              return (
                <label
                  key={s.id}
                  className={cn(
                    'flex items-center gap-2 px-2 py-1.5 rounded-md text-sm cursor-pointer hover:bg-muted/50',
                    s.required && 'opacity-60 cursor-not-allowed'
                  )}
                >
                  <Checkbox
                    checked={isOn}
                    disabled={s.required}
                    onCheckedChange={(checked) => {
                      if (s.required) return;
                      const base = tokens.enabledSlides ?? DEFAULT_ENABLED_SLIDE_IDS;
                      const next = checked
                        ? Array.from(new Set([...base, s.id]))
                        : base.filter((id) => id !== s.id);
                      updateToken('enabledSlides', next);
                    }}
                  />
                  <span className="flex-1 truncate">{s.title}</span>
                  {s.required && <span className="text-[10px] uppercase text-muted-foreground">obrig.</span>}
                </label>
              );
            })}
          </div>

          {(['module', 'vertical', 'pack'] as const).map((cat) => {
            const ids = cat === 'module' ? BASE_MODULE_SLIDE_IDS : cat === 'vertical' ? VERTICAL_SLIDE_IDS : PACK_SLIDE_IDS;
            const heading = cat === 'module' ? 'Módulos opcionais' : cat === 'vertical' ? 'Verticais de mercado' : 'Packs funcionais';
            const hint = cat === 'module' ? 'deep-dives funcionais' : cat === 'vertical' ? 'pitch para um setor específico' : 'capacidades extra da plataforma';
            const enabledList = tokens.enabledSlides ?? DEFAULT_ENABLED_SLIDE_IDS;
            const allOn = ids.every((id) => enabledList.includes(id));
            return (
              <div key={cat} className="mb-4">
                <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-2 flex items-center justify-between gap-2">
                  <span className="flex items-center gap-2">
                    {heading}
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground normal-case tracking-normal">{hint}</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      const base = tokens.enabledSlides ?? DEFAULT_ENABLED_SLIDE_IDS;
                      const next = allOn
                        ? base.filter((id) => !ids.includes(id))
                        : Array.from(new Set([...base, ...ids]));
                      updateToken('enabledSlides', next);
                    }}
                    className="text-[10px] uppercase tracking-wider text-muted-foreground hover:text-foreground"
                  >
                    {allOn ? 'Desmarcar' : 'Marcar tudo'}
                  </button>
                </div>
                <div className="space-y-1.5">
                  {PITCH_SLIDES.filter((s) => s.category === cat).map((s) => {
                    const isOn = enabledList.includes(s.id);
                    const priceInfo = DEFAULT_MODULE_PRICES[s.id];
                    return (
                      <label
                        key={s.id}
                        className="flex items-center gap-2 px-2 py-1.5 rounded-md text-sm cursor-pointer hover:bg-muted/50"
                      >
                        <Checkbox
                          checked={isOn}
                          onCheckedChange={(checked) => {
                            const base = tokens.enabledSlides ?? DEFAULT_ENABLED_SLIDE_IDS;
                            const next = checked
                              ? Array.from(new Set([...base, s.id]))
                              : base.filter((id) => id !== s.id);
                            updateToken('enabledSlides', next);
                          }}
                        />
                        <span className="flex-1 truncate">{s.title}</span>
                        {priceInfo && (() => {
                          const cur = tokens.currency || 'EUR';
                          const itv = tokens.billingInterval || 'monthly';
                          const tr = tokens.tier || 'grow';
                          const displayPrice = convertPriceString(priceInfo.price, cur, itv, tr) || priceInfo.price;
                          const displayNote = convertPriceString(priceInfo.priceNote, cur, itv) || priceInfo.priceNote;
                          return (
                            <span
                              className={cn(
                                'text-[10px] font-mono tabular-nums px-1.5 py-0.5 rounded whitespace-nowrap',
                                isOn ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
                              )}
                              title={`${TIERS[tr].label} · ${displayNote ?? ''}`.trim()}
                            >
                              {displayPrice}
                            </span>
                          );
                        })()}
                      </label>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        <div>
          <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground mb-3">Apresentador</h3>
          <div className="space-y-3">
            <div>
              <Label htmlFor="presenterName">Nome</Label>
              <Input id="presenterName" value={tokens.presenterName} onChange={(e) => updateToken('presenterName', e.target.value)} />
            </div>
            <div>
              <Label htmlFor="presenterEmail">Email</Label>
              <Input id="presenterEmail" type="email" value={tokens.presenterEmail} onChange={(e) => updateToken('presenterEmail', e.target.value)} />
            </div>
            <div>
              <Label htmlFor="presenterPhone">Telefone</Label>
              <Input id="presenterPhone" value={tokens.presenterPhone} onChange={(e) => updateToken('presenterPhone', e.target.value)} placeholder="+351 ..." />
            </div>
          </div>
        </div>

        <div className="flex gap-2">
          <Button onClick={() => { saveToHistory(); toast.success('Cliente guardado no histórico.'); }} className="flex-1" size="sm">
            <Save className="h-4 w-4 mr-2" /> Guardar cliente
          </Button>
          <Button onClick={resetTokens} variant="outline" size="sm" title="Limpar">
            <RotateCcw className="h-4 w-4" />
          </Button>
        </div>

        {history.length > 0 && (
          <div>
            <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
              <History className="h-4 w-4" /> Histórico
            </h3>
            <div className="space-y-2">
              {history.map((h) => (
                <div key={h.savedAt} className="group flex items-center justify-between gap-2 p-2 rounded-md border hover:bg-muted/50">
                  <button onClick={() => loadFromHistory(h)} className="flex-1 text-left">
                    <div className="text-sm font-medium truncate">{h.companyName || '—'}</div>
                    <div className="text-xs text-muted-foreground truncate">{h.contactName || 'Sem contacto'}</div>
                  </button>
                  <button onClick={() => removeFromHistory(h.savedAt)} className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </ScrollArea>
  );
}
