import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Calculator, Copy, MessageCircle, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import {
  SAVINGS_ITEMS,
  DEFAULT_QUANTITIES,
  calcSavings,
  formatEuro,
  renderSavingsMessage,
  sanitizeName,
  validateName,
  NAME_MAX_LENGTH,
  type SavingsQuantities,
} from "@/utils/leadchef/savingsCalculator";
import { buildWhatsAppHref } from "@/utils/leadchef/contact";
import { LeadChefMessagePreview } from "./LeadChefMessagePreview";

interface Props {
  leadId: string;
  phone?: string | null;
}

const storageKey = (leadId: string) => `leadchef:savings:${leadId}`;
const namesStorageKey = (leadId: string) => `leadchef:savings-names:${leadId}`;
const agentNameGlobalKey = "leadchef:savings:agent-name";

interface NamesState {
  agentName: string;
  babyName: string;
}

function loadQuantities(leadId: string): SavingsQuantities {
  try {
    const raw = localStorage.getItem(storageKey(leadId));
    if (!raw) return { ...DEFAULT_QUANTITIES };
    const parsed = JSON.parse(raw);
    return {
      boioes: Number(parsed.boioes ?? DEFAULT_QUANTITIES.boioes),
      papas: Number(parsed.papas ?? DEFAULT_QUANTITIES.papas),
      sopas: Number(parsed.sopas ?? DEFAULT_QUANTITIES.sopas),
    };
  } catch {
    return { ...DEFAULT_QUANTITIES };
  }
}

function loadNames(leadId: string): NamesState {
  try {
    const raw = localStorage.getItem(namesStorageKey(leadId));
    const parsed = raw ? JSON.parse(raw) : {};
    const agentFallback = localStorage.getItem(agentNameGlobalKey) ?? "";
    return {
      agentName: String(parsed.agentName ?? agentFallback ?? ""),
      babyName: String(parsed.babyName ?? ""),
    };
  } catch {
    return { agentName: "", babyName: "" };
  }
}

export function LeadChefSavingsCalculatorCard({ leadId, phone }: Props) {
  const [qty, setQty] = useState<SavingsQuantities>(() => loadQuantities(leadId));
  const [names, setNames] = useState<NamesState>(() => loadNames(leadId));
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    setQty(loadQuantities(leadId));
    setNames(loadNames(leadId));
  }, [leadId]);

  useEffect(() => {
    try {
      localStorage.setItem(storageKey(leadId), JSON.stringify(qty));
    } catch {
      // ignore
    }
  }, [leadId, qty]);

  useEffect(() => {
    try {
      localStorage.setItem(namesStorageKey(leadId), JSON.stringify(names));
      if (names.agentName.trim()) {
        localStorage.setItem(agentNameGlobalKey, names.agentName.trim());
      }
    } catch {
      // ignore
    }
  }, [leadId, names]);

  const result = useMemo(() => calcSavings(qty), [qty]);
  const message = useMemo(
    () => renderSavingsMessage(result, { agentName: names.agentName, babyName: names.babyName }),
    [result, names.agentName, names.babyName],
  );

  const hasAny = result.totalMonthly > 0;

  const setItem = (k: keyof SavingsQuantities, v: string) => {
    const n = Math.max(0, Math.floor(Number(v) || 0));
    setQty((p) => ({ ...p, [k]: n }));
  };

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(message);
      toast.success("Mensagem copiada.");
    } catch {
      toast.error("Não foi possível copiar.");
    }
  };

  const onWhatsApp = () => {
    if (!phone) {
      toast.error("Lead sem telefone.");
      return;
    }
    if (!hasAny) {
      toast.error("Define pelo menos uma quantidade.");
      return;
    }
    const href = buildWhatsAppHref(phone, message);
    window.open(href, "_blank", "noopener,noreferrer");
  };

  const onReset = () => setQty({ ...DEFAULT_QUANTITIES });

  return (
    <Card className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Calculator className="h-4 w-4 text-emerald-600" />
          <h2 className="text-sm font-semibold">Calculadora de poupança</h2>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onReset}
          className="h-7 px-2 text-xs text-muted-foreground"
        >
          <RotateCcw className="h-3 w-3 mr-1" /> Repor
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {(["agentName", "babyName"] as const).map((field) => {
          const isAgent = field === "agentName";
          const id = isAgent ? "sav-agent-name" : "sav-baby-name";
          const label = isAgent ? "O meu primeiro nome" : "Nome do bebé";
          const placeholder = isAgent ? "Ex: Ana" : "Ex: Maria";
          const value = names[field];
          const validation = validateName(value);
          const error = validation.ok === false ? validation.error : null;
          return (
            <div key={field}>
              <Label htmlFor={id} className="text-xs">{label}</Label>
              <Input
                id={id}
                type="text"
                autoComplete={isAgent ? "given-name" : "off"}
                placeholder={placeholder}
                value={value}
                maxLength={NAME_MAX_LENGTH}
                aria-invalid={!!error}
                aria-describedby={error ? `${id}-error` : undefined}
                onChange={(e) =>
                  setNames((p) => ({ ...p, [field]: sanitizeName(e.target.value) }))
                }
                className="mt-1 h-9 text-sm"
              />
              {error ? (
                <p id={`${id}-error`} className="mt-1 text-[10px] text-red-600">{error}</p>
              ) : (
                <p className="mt-1 text-[10px] text-muted-foreground">
                  {value.length}/{NAME_MAX_LENGTH}
                </p>
              )}
            </div>
          );
        })}
      </div>

      <div className="space-y-3">
        {SAVINGS_ITEMS.map((item) => {
          const line = result.lines.find((l) => l.item.key === item.key)!;
          return (
            <div
              key={item.key}
              className="flex items-end gap-3 border-b border-slate-100 pb-3 last:border-0 last:pb-0"
            >
              <div className="flex-1 min-w-0">
                <Label htmlFor={`sav-${item.key}`} className="text-xs flex items-center gap-1">
                  <span>{item.emoji}</span>
                  <span className="truncate">{item.label}</span>
                </Label>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  Compra {formatEuro(item.marketPrice)} · Bimby {formatEuro(item.bimbyPrice)} ·
                  poupa {formatEuro(line.unitSaving)}/un
                </p>
              </div>
              <Input
                id={`sav-${item.key}`}
                type="number"
                inputMode="numeric"
                min={0}
                value={qty[item.key]}
                onChange={(e) => setItem(item.key, e.target.value)}
                className="w-16 text-right tabular-nums"
              />
              <div className="text-right w-20">
                <div className="text-[10px] text-muted-foreground">/ mês</div>
                <div className="text-sm font-semibold tabular-nums text-emerald-600">
                  {formatEuro(line.monthly)}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="rounded-xl bg-emerald-50 border border-emerald-100 px-3 py-2 flex items-baseline justify-between">
        <div>
          <div className="text-[11px] uppercase tracking-wide text-emerald-700 font-medium">
            Total poupado
          </div>
          <div className="text-xs text-emerald-700/70">
            {formatEuro(result.totalYearly)} / ano
          </div>
        </div>
        <div className="text-2xl font-bold tabular-nums text-emerald-700">
          {formatEuro(result.totalMonthly)}
          <span className="text-xs font-normal text-emerald-700/70 ml-1">/ mês</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={onCopy}
          disabled={!hasAny}
        >
          <Copy className="h-4 w-4 mr-1.5" /> Copiar
        </Button>
        <Button
          type="button"
          onClick={onWhatsApp}
          disabled={!hasAny || !phone}
          className="bg-emerald-600 hover:bg-emerald-700 text-white"
        >
          <MessageCircle className="h-4 w-4 mr-1.5" /> WhatsApp
        </Button>
      </div>

      <button
        type="button"
        onClick={() => setShowPreview((s) => !s)}
        className="text-[11px] text-emerald-700 hover:underline"
      >
        {showPreview ? "Ocultar pré-visualização" : "Ver mensagem completa"}
      </button>

      {showPreview && <LeadChefMessagePreview text={message} />}
    </Card>
  );
}
