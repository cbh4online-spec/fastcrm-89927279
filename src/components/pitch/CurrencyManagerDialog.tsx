import { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, Settings2, Globe } from 'lucide-react';
import { toast } from 'sonner';
import {
  BUILT_IN_CURRENCIES,
  CURRENCIES,
  registerCurrency,
  unregisterCurrency,
  isBuiltInCurrency,
  type CurrencyMeta,
} from '@/lib/pitch/pricing';

interface Props {
  /** Custom currencies stored in the pitch tokens. */
  customCurrencies: CurrencyMeta[];
  /** Persist new list back to the tokens (also updates the runtime registry). */
  onChange: (next: CurrencyMeta[]) => void;
}

const EMPTY_FORM: CurrencyMeta = {
  code: '',
  symbol: '',
  rate: 1,
  locale: 'en-US',
  symbolPosition: 'before',
  label: '',
};

const SUGGESTED_LOCALES = [
  { value: 'pt-PT', label: 'Português (Portugal)' },
  { value: 'pt-BR', label: 'Português (Brasil)' },
  { value: 'en-US', label: 'English (US)' },
  { value: 'en-GB', label: 'English (UK)' },
  { value: 'en-CA', label: 'English (Canada)' },
  { value: 'en-AU', label: 'English (Australia)' },
  { value: 'es-ES', label: 'Español' },
  { value: 'fr-FR', label: 'Français' },
  { value: 'de-DE', label: 'Deutsch' },
  { value: 'ja-JP', label: '日本語' },
  { value: 'zh-CN', label: '中文 (简体)' },
];

export function CurrencyManagerDialog({ customCurrencies, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<CurrencyMeta>(EMPTY_FORM);

  // Make sure tokens-stored currencies are present in the runtime registry
  // every time the dialog opens.
  useEffect(() => {
    customCurrencies.forEach((c) => registerCurrency(c));
  }, [customCurrencies]);

  const builtIns = useMemo(() => Object.values(BUILT_IN_CURRENCIES), []);

  const resetForm = () => setForm(EMPTY_FORM);

  const handleAdd = () => {
    const code = form.code.trim().toUpperCase();
    if (!code || code.length < 2 || code.length > 5) {
      toast.error('Código inválido (2–5 letras, ex: CAD, AUD, JPY).');
      return;
    }
    if (isBuiltInCurrency(code)) {
      toast.error(`${code} já é uma moeda nativa e não pode ser substituída.`);
      return;
    }
    if (!form.symbol.trim()) {
      toast.error('Símbolo obrigatório (ex: $, ¥, A$).');
      return;
    }
    if (!form.label.trim()) {
      toast.error('Nome obrigatório (ex: "Canadian Dollar (CA$)").');
      return;
    }
    if (!isFinite(form.rate) || form.rate <= 0) {
      toast.error('Taxa em relação ao EUR deve ser um número positivo.');
      return;
    }
    try {
      // Validate locale by attempting to format with it.
      new Intl.NumberFormat(form.locale).format(1);
    } catch {
      toast.error(`Locale inválido: "${form.locale}".`);
      return;
    }

    const meta: CurrencyMeta = { ...form, code };
    registerCurrency(meta);
    const filtered = customCurrencies.filter((c) => c.code.toUpperCase() !== code);
    onChange([...filtered, meta]);
    toast.success(`Moeda ${code} adicionada.`);
    resetForm();
  };

  const handleRemove = (code: string) => {
    if (isBuiltInCurrency(code)) return;
    unregisterCurrency(code);
    onChange(customCurrencies.filter((c) => c.code.toUpperCase() !== code.toUpperCase()));
    toast.success(`Moeda ${code} removida.`);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="h-7 px-2 text-[10px] gap-1">
          <Settings2 className="h-3 w-3" />
          Gerir moedas
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Globe className="h-4 w-4" />
            Gerir moedas
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          {/* Built-in currencies (read only) */}
          <section>
            <Label className="text-xs text-muted-foreground">Moedas nativas (não editáveis)</Label>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {builtIns.map((c) => (
                <div key={c.code} className="flex items-center justify-between rounded-md border bg-muted/30 px-3 py-2 text-xs">
                  <div>
                    <div className="font-medium">{c.code} <span className="text-muted-foreground">· {c.symbol}</span></div>
                    <div className="text-[10px] text-muted-foreground">{c.label} · 1 EUR = {c.rate}</div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Custom currencies */}
          <section>
            <Label className="text-xs text-muted-foreground">Moedas personalizadas</Label>
            {customCurrencies.length === 0 ? (
              <div className="mt-2 rounded-md border border-dashed p-3 text-xs text-muted-foreground">
                Nenhuma moeda personalizada. Adicione abaixo (ex: CAD, AUD, JPY).
              </div>
            ) : (
              <div className="mt-2 space-y-1.5">
                {customCurrencies.map((c) => (
                  <div key={c.code} className="flex items-center justify-between rounded-md border px-3 py-2 text-xs">
                    <div className="min-w-0 flex-1">
                      <div className="font-medium">
                        {c.code} <span className="text-muted-foreground">· {c.symbol}</span>
                      </div>
                      <div className="text-[10px] text-muted-foreground truncate">
                        {c.label} · 1 EUR = {c.rate} · {c.locale} · símbolo {c.symbolPosition === 'before' ? 'antes' : 'depois'}
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                      onClick={() => handleRemove(c.code)}
                      aria-label={`Remover ${c.code}`}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Add new */}
          <section className="rounded-md border bg-muted/30 p-3">
            <Label className="text-xs font-medium">Adicionar nova moeda</Label>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <div>
                <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Código (ISO)</Label>
                <Input
                  value={form.code}
                  onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase().slice(0, 5) })}
                  placeholder="CAD"
                  className="h-8 text-xs mt-1"
                  maxLength={5}
                />
              </div>
              <div>
                <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Símbolo</Label>
                <Input
                  value={form.symbol}
                  onChange={(e) => setForm({ ...form, symbol: e.target.value.slice(0, 4) })}
                  placeholder="CA$"
                  className="h-8 text-xs mt-1"
                  maxLength={4}
                />
              </div>
              <div className="col-span-2">
                <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Nome a apresentar</Label>
                <Input
                  value={form.label}
                  onChange={(e) => setForm({ ...form, label: e.target.value.slice(0, 60) })}
                  placeholder="Canadian Dollar (CA$)"
                  className="h-8 text-xs mt-1"
                  maxLength={60}
                />
              </div>
              <div>
                <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Taxa por 1 EUR</Label>
                <Input
                  type="number"
                  step="0.0001"
                  min="0"
                  value={form.rate}
                  onChange={(e) => setForm({ ...form, rate: parseFloat(e.target.value) || 0 })}
                  placeholder="1.45"
                  className="h-8 text-xs mt-1"
                />
                <div className="text-[9px] text-muted-foreground mt-1">Quanto custa 1 EUR nesta moeda.</div>
              </div>
              <div>
                <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Posição do símbolo</Label>
                <Select
                  value={form.symbolPosition}
                  onValueChange={(v) => setForm({ ...form, symbolPosition: v as 'before' | 'after' })}
                >
                  <SelectTrigger className="h-8 text-xs mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="before" className="text-xs">Antes do número (€100)</SelectItem>
                    <SelectItem value="after" className="text-xs">Depois do número (100 kr)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2">
                <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Locale (formato numérico)</Label>
                <Select
                  value={form.locale}
                  onValueChange={(v) => setForm({ ...form, locale: v })}
                >
                  <SelectTrigger className="h-8 text-xs mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {SUGGESTED_LOCALES.map((l) => (
                      <SelectItem key={l.value} value={l.value} className="text-xs">
                        {l.label} <span className="text-muted-foreground">· {l.value}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="mt-3 flex justify-end gap-2">
              <Button type="button" variant="ghost" size="sm" onClick={resetForm}>Limpar</Button>
              <Button type="button" size="sm" onClick={handleAdd} className="gap-1">
                <Plus className="h-3.5 w-3.5" />
                Adicionar moeda
              </Button>
            </div>
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}
