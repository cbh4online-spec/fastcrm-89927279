import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Plus, X } from "lucide-react";
import { BusinessContextUpdate } from "@/hooks/useBusinessContext";
import { TagInput } from "../TagInput";

interface Props {
  data: BusinessContextUpdate;
  onChange: (fields: BusinessContextUpdate) => void;
}

export function StepObjections({ data, onChange }: Props) {
  const scripts = (data.scripts as any[]) || [];

  const addScript = () => {
    onChange({ scripts: [...scripts, { name: "", content: "", stage: "" }] as any });
  };

  const updateScript = (i: number, field: string, value: string) => {
    const next = [...scripts];
    next[i] = { ...next[i], [field]: value };
    onChange({ scripts: next as any });
  };

  const removeScript = (i: number) => {
    onChange({ scripts: scripts.filter((_, idx) => idx !== i) as any });
  };

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <Label>Objeções Comuns</Label>
        <TagInput
          values={data.objections_common || []}
          onChange={(v) => onChange({ objections_common: v })}
          placeholder="Ex: Preço alto, Já uso outro CRM, Não tenho tempo..."
        />
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label>Scripts de Venda</Label>
          <Button type="button" variant="outline" size="sm" onClick={addScript} className="gap-1 text-xs">
            <Plus className="h-3 w-3" /> Adicionar Script
          </Button>
        </div>

        {scripts.length === 0 && (
          <p className="text-sm text-muted-foreground italic">Nenhum script adicionado.</p>
        )}

        {scripts.map((s, i) => (
          <div key={i} className="p-3 rounded-lg border border-border space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-xs text-muted-foreground">Script {i + 1}</span>
              <button type="button" onClick={() => removeScript(i)} className="text-muted-foreground hover:text-destructive">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Input placeholder="Nome" value={s.name} onChange={(e) => updateScript(i, "name", e.target.value)} />
              <Input placeholder="Etapa" value={s.stage} onChange={(e) => updateScript(i, "stage", e.target.value)} />
            </div>
            <Textarea placeholder="Conteúdo do script..." value={s.content} onChange={(e) => updateScript(i, "content", e.target.value)} rows={3} />
          </div>
        ))}
      </div>
    </div>
  );
}
