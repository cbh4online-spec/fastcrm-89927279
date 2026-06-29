import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, RotateCcw, Save, Info, TrendingUp, Globe } from 'lucide-react';
import { toast } from 'sonner';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { OwnerOnlyRoute } from '@/components/auth/OwnerOnlyRoute';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { usePitchConfig } from '@/hooks/usePitchConfig';
import {
  BUILT_IN_CURRENCIES,
  CURRENCIES,
  formatPrice,
  getCurrencyMeta,
  getDefaultRate,
  isBuiltInCurrency,
  listCurrencyCodes,
  registerCurrency,
  resetCurrencyRate,
  setCurrencyRate,
} from '@/lib/pitch/pricing';

const PREVIEW_AMOUNT_EUR = 100;

export default function PitchExchangeRatesPage() {
  const { tokens, updateToken } = usePitchConfig();

  // Re-hydrate runtime registry from tokens whenever this screen mounts.
  useEffect(() => {
    (tokens.customCurrencies || []).forEach((c) => registerCurrency(c));
    Object.entries(tokens.customRates || {}).forEach(([code, rate]) => {
      setCurrencyRate(code, rate);
    });
  }, [tokens.customCurrencies, tokens.customRates]);

  // Local draft so the user can tweak values without persisting on every keystroke.
  const [draft, setDraft] = useState<Record<string, string>>(() => {
    const seed: Record<string, string> = {};
    for (const code of listCurrencyCodes()) {
      if (code === 'EUR') continue;
      seed[code] = String(getCurrencyMeta(code).rate);
    }
    return seed;
  });

  const [dirty, setDirty] = useState(false);

  const codes = useMemo(() => listCurrencyCodes().filter((c) => c !== 'EUR'), [tokens.customCurrencies]);

  const handleChange = (code: string, value: string) => {
    setDraft((prev) => ({ ...prev, [code]: value }));
    setDirty(true);
  };

  const handleResetOne = (code: string) => {
    if (isBuiltInCurrency(code)) {
      const def = BUILT_IN_CURRENCIES[code].rate;
      setDraft((prev) => ({ ...prev, [code]: String(def) }));
      setDirty(true);
    } else {
      // Custom currencies don't have a default — keep the saved one.
      const current = getCurrencyMeta(code).rate;
      setDraft((prev) => ({ ...prev, [code]: String(current) }));
    }
  };

  const handleResetAll = () => {
    const next: Record<string, string> = {};
    for (const code of codes) {
      next[code] = String(isBuiltInCurrency(code) ? BUILT_IN_CURRENCIES[code].rate : getCurrencyMeta(code).rate);
    }
    setDraft(next);
    setDirty(true);
  };

  const handleSave = () => {
    const overrides: Record<string, number> = {};
    let hasError = false;
    for (const [code, raw] of Object.entries(draft)) {
      const value = parseFloat((raw || '').replace(',', '.'));
      if (!isFinite(value) || value <= 0) {
        toast.error(`Taxa inválida para ${code} (deve ser um número positivo).`);
        hasError = true;
        continue;
      }
      // Apply to runtime registry immediately.
      setCurrencyRate(code, value);
      // Only persist when it differs from the built-in default (keeps the
      // tokens lean and lets future default updates flow through).
      if (isBuiltInCurrency(code)) {
        if (value !== BUILT_IN_CURRENCIES[code].rate) {
          overrides[code] = value;
        }
      } else {
        // Custom currencies always have their rate stored on the token-side
        // CurrencyMeta, but we also keep it in customRates for resilience.
        overrides[code] = value;
      }
    }
    if (hasError) return;
    updateToken('customRates', overrides);
    setDirty(false);
    toast.success('Taxas de câmbio atualizadas. Aplicadas a todos os slides.');
  };

  const fullReset = () => {
    // Reset registry built-ins to defaults.
    Object.keys(BUILT_IN_CURRENCIES).forEach(resetCurrencyRate);
    // Refresh draft from registry.
    const next: Record<string, string> = {};
    for (const code of listCurrencyCodes()) {
      if (code === 'EUR') continue;
      next[code] = String(getCurrencyMeta(code).rate);
    }
    setDraft(next);
    updateToken('customRates', {});
    setDirty(false);
    toast.success('Taxas restauradas para os valores predefinidos.');
  };

  return (
    <DashboardLayout>
      <OwnerOnlyRoute>
    <div className="container max-w-4xl py-8 space-y-6">
      <div className="space-y-1">
        <Button asChild variant="ghost" size="sm" className="-ml-2 mb-1 h-7 px-2 text-muted-foreground">
          <Link to="/dashboard/pitch">
            <ArrowLeft className="h-3.5 w-3.5 mr-1.5" />
            Voltar à apresentação
          </Link>
        </Button>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <TrendingUp className="h-6 w-6" />
              Taxas de câmbio
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Ajuste a taxa indicativa que converte preços em EUR para outras moedas no pitch e na exportação PPTX.
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleResetAll}>
              <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
              Repor predefinido
            </Button>
            <Button size="sm" onClick={handleSave} disabled={!dirty}>
              <Save className="h-3.5 w-3.5 mr-1.5" />
              Guardar alterações
            </Button>
          </div>
        </div>
      </div>

      <Card className="border-primary/30 bg-primary/5">
        <CardContent className="pt-4 pb-4">
          <div className="flex gap-3 text-sm">
            <Info className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-medium text-foreground">Sobre estas taxas</p>
              <p className="text-muted-foreground">
                As taxas servem apenas para apresentar valores indicativos durante a conversa comercial — não são taxas de
                transação. Cada utilizador tem o seu próprio conjunto de overrides; os valores predefinidos podem ser
                restaurados a qualquer momento.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Globe className="h-4 w-4" />
            Moeda base
          </CardTitle>
          <CardDescription>Todos os preços são definidos em EUR. A base não é editável.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between rounded-md border bg-muted/40 p-3">
            <div>
              <div className="font-medium">EUR · Euro</div>
              <div className="text-xs text-muted-foreground">Base de referência (1 EUR = 1 EUR)</div>
            </div>
            <Badge variant="secondary" className="text-xs">Fixo</Badge>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Conversões EUR → outras moedas</CardTitle>
          <CardDescription>
            Indique quanto vale 1 EUR em cada moeda. A pré-visualização mostra o valor convertido para
            <span className="font-medium text-foreground"> {formatPrice(PREVIEW_AMOUNT_EUR, 'EUR')}</span>.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {codes.length === 0 && (
            <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground text-center">
              Nenhuma moeda disponível além do EUR. Adicione moedas em "Gerir moedas" no painel do pitch.
            </div>
          )}

          {codes.map((code) => {
            const meta = getCurrencyMeta(code);
            const built = isBuiltInCurrency(code);
            const rawValue = draft[code] ?? String(meta.rate);
            const numeric = parseFloat((rawValue || '').replace(',', '.'));
            const isValid = isFinite(numeric) && numeric > 0;
            const previewValue = isValid ? PREVIEW_AMOUNT_EUR * numeric : 0;
            const defaultRate = built ? BUILT_IN_CURRENCIES[code].rate : null;
            const isOverridden = built && defaultRate !== null && Math.abs(numeric - defaultRate) > 1e-9;

            return (
              <div
                key={code}
                className="grid grid-cols-12 gap-3 items-center rounded-md border p-3 hover:bg-muted/30 transition-colors"
              >
                <div className="col-span-3">
                  <div className="font-semibold text-sm flex items-center gap-2">
                    {code}
                    {built ? (
                      <Badge variant="outline" className="h-4 px-1.5 text-[9px] uppercase">Nativa</Badge>
                    ) : (
                      <Badge variant="secondary" className="h-4 px-1.5 text-[9px] uppercase">Custom</Badge>
                    )}
                    {isOverridden && (
                      <Badge variant="default" className="h-4 px-1.5 text-[9px] uppercase">Modificado</Badge>
                    )}
                  </div>
                  <div className="text-[11px] text-muted-foreground">{meta.label}</div>
                </div>

                <div className="col-span-4">
                  <Label htmlFor={`rate-${code}`} className="sr-only">Taxa para {code}</Label>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground whitespace-nowrap">1 EUR =</span>
                    <Input
                      id={`rate-${code}`}
                      type="number"
                      step="0.0001"
                      min="0.0001"
                      value={rawValue}
                      onChange={(e) => handleChange(code, e.target.value)}
                      className="h-8 text-sm"
                      aria-invalid={!isValid}
                    />
                    <span className="text-xs font-medium whitespace-nowrap">{meta.symbol}</span>
                  </div>
                  {built && defaultRate !== null && (
                    <div className="text-[10px] text-muted-foreground mt-1">Predefinido: {defaultRate}</div>
                  )}
                </div>

                <div className="col-span-4 text-right">
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    {formatPrice(PREVIEW_AMOUNT_EUR, 'EUR')} →
                  </div>
                  <div className={`text-sm font-mono ${isValid ? '' : 'text-destructive'}`}>
                    {isValid
                      ? (meta.symbolPosition === 'before'
                        ? `${meta.symbol}${previewValue.toFixed(2)}`
                        : `${previewValue.toFixed(2)} ${meta.symbol}`)
                      : 'Inválido'}
                  </div>
                </div>

                <div className="col-span-1 flex justify-end">
                  {built && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => handleResetOne(code)}
                      title="Repor valor predefinido"
                      disabled={!isOverridden}
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <Separator />

      <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
        <p>
          Para repor todas as taxas nativas (EUR/USD/GBP/BRL) ao estado original e limpar overrides:
        </p>
        <Button variant="ghost" size="sm" onClick={fullReset} className="text-destructive hover:text-destructive">
          Repor tudo ao estado de fábrica
        </Button>
      </div>
    </div>
      </OwnerOnlyRoute>
    </DashboardLayout>
  );
}
