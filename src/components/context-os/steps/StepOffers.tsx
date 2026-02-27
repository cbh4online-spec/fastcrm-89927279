import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus, X } from "lucide-react";
import { BusinessContextUpdate } from "@/hooks/useBusinessContext";

const PRICING_MODELS = [
  { value: "recurring", label: "Recorrente" },
  { value: "one_time", label: "Único" },
  { value: "hybrid", label: "Híbrido" },
  { value: "usage_based", label: "Por Consumo" },
];

interface Props {
  data: BusinessContextUpdate;
  onChange: (fields: BusinessContextUpdate) => void;
}

export function StepOffers({ data, onChange }: Props) {
  const offers = (data.offers as any[]) || [];

  const addOffer = () => {
    onChange({ offers: [...offers, { name: "", price: "", type: "", description: "" }] as any });
  };

  const updateOffer = (i: number, field: string, value: string) => {
    const next = [...offers];
    next[i] = { ...next[i], [field]: value };
    onChange({ offers: next as any });
  };

  const removeOffer = (i: number) => {
    onChange({ offers: offers.filter((_, idx) => idx !== i) as any });
  };

  return (
    <div className="space-y-5">
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label>Ofertas</Label>
          <Button type="button" variant="outline" size="sm" onClick={addOffer} className="gap-1 text-xs">
            <Plus className="h-3 w-3" /> Adicionar
          </Button>
        </div>

        {offers.length === 0 && (
          <p className="text-sm text-muted-foreground italic">Nenhuma oferta adicionada. Clique em "Adicionar".</p>
        )}

        {offers.map((offer, i) => (
          <div key={i} className="p-3 rounded-lg border border-border space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-xs text-muted-foreground">Oferta {i + 1}</span>
              <button type="button" onClick={() => removeOffer(i)} className="text-muted-foreground hover:text-destructive">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Input placeholder="Nome" value={offer.name} onChange={(e) => updateOffer(i, "name", e.target.value)} />
              <Input placeholder="Preço" value={offer.price} onChange={(e) => updateOffer(i, "price", e.target.value)} />
            </div>
            <Input placeholder="Descrição curta" value={offer.description} onChange={(e) => updateOffer(i, "description", e.target.value)} />
          </div>
        ))}
      </div>

      <div className="space-y-2">
        <Label>Modelo de Pricing</Label>
        <div className="flex gap-2 flex-wrap">
          {PRICING_MODELS.map((m) => (
            <button
              key={m.value}
              type="button"
              onClick={() => onChange({ pricing_model: m.value })}
              className={`px-3 py-1.5 rounded-lg border text-sm transition-colors ${
                data.pricing_model === m.value ? "border-gold bg-gold/10 text-gold" : "border-border hover:border-gold/30"
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Label>Ticket Médio (€)</Label>
        <Input
          type="number"
          value={data.average_ticket ?? ""}
          onChange={(e) => onChange({ average_ticket: e.target.value ? Number(e.target.value) : null })}
          placeholder="Ex: 2500"
        />
      </div>
    </div>
  );
}
