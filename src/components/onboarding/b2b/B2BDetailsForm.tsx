import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { validateNif, formatNif } from "@/utils/nif";

export interface B2BDetails {
  name: string;
  company_name: string;
  tax_id: string;
  team_size: string;
  business_type: string;
  primary_objective: string;
  my_title: string;
}

const TEAM_SIZES = [
  { v: "solo", l: "Apenas eu" },
  { v: "2-5", l: "2 a 5 pessoas" },
  { v: "6-20", l: "6 a 20 pessoas" },
  { v: "21-50", l: "21 a 50 pessoas" },
  { v: "51-200", l: "51 a 200 pessoas" },
  { v: "200+", l: "Mais de 200 pessoas" },
];

const BUSINESS_TYPES = [
  "Serviços profissionais",
  "Comércio / retalho",
  "Indústria",
  "Saúde",
  "Educação / formação",
  "Hotelaria / restauração",
  "Imobiliário",
  "Construção",
  "Tecnologia / software",
  "Marketing / agência",
  "Outro",
];

const OBJECTIVES = [
  { v: "vender_mais", l: "Vender mais" },
  { v: "organizar_pipeline", l: "Organizar o pipeline" },
  { v: "automatizar", l: "Automatizar processos" },
  { v: "fidelizar", l: "Fidelizar clientes" },
];

interface Props {
  initial: B2BDetails;
  onBack: () => void;
  onNext: (v: B2BDetails) => void;
}

export function B2BDetailsForm({ initial, onBack, onNext }: Props) {
  const [v, setV] = useState<B2BDetails>(initial);
  const [nifError, setNifError] = useState<string | null>(null);

  const handleNext = () => {
    if (v.tax_id.trim() && !validateNif(v.tax_id)) {
      setNifError("NIF inválido");
      return;
    }
    setNifError(null);
    onNext(v);
  };

  const canContinue = v.name.trim().length >= 2;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="name">Nome da organização *</Label>
          <Input
            id="name"
            value={v.name}
            onChange={(e) => setV({ ...v, name: e.target.value, company_name: v.company_name || e.target.value })}
            placeholder="Ex.: Acme Lda."
            autoFocus
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="company_name">Designação legal</Label>
          <Input
            id="company_name"
            value={v.company_name}
            onChange={(e) => setV({ ...v, company_name: e.target.value })}
            placeholder="Acme Soluções, Lda."
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="tax_id">NIF (Portugal)</Label>
          <Input
            id="tax_id"
            value={v.tax_id}
            onChange={(e) => {
              setV({ ...v, tax_id: formatNif(e.target.value) });
              setNifError(null);
            }}
            placeholder="500 000 000"
            inputMode="numeric"
          />
          {nifError && <p className="text-xs text-destructive">{nifError}</p>}
        </div>

        <div className="space-y-2">
          <Label>Setor</Label>
          <Select value={v.business_type} onValueChange={(val) => setV({ ...v, business_type: val })}>
            <SelectTrigger><SelectValue placeholder="Seleciona um setor" /></SelectTrigger>
            <SelectContent>
              {BUSINESS_TYPES.map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Dimensão da equipa</Label>
          <Select value={v.team_size} onValueChange={(val) => setV({ ...v, team_size: val })}>
            <SelectTrigger><SelectValue placeholder="Quantas pessoas?" /></SelectTrigger>
            <SelectContent>
              {TEAM_SIZES.map((t) => <SelectItem key={t.v} value={t.v}>{t.l}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Objetivo principal</Label>
          <Select value={v.primary_objective} onValueChange={(val) => setV({ ...v, primary_objective: val })}>
            <SelectTrigger><SelectValue placeholder="O que queres atingir?" /></SelectTrigger>
            <SelectContent>
              {OBJECTIVES.map((o) => <SelectItem key={o.v} value={o.v}>{o.l}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="my_title">O meu cargo</Label>
          <Input
            id="my_title"
            value={v.my_title}
            onChange={(e) => setV({ ...v, my_title: e.target.value })}
            placeholder="Ex.: CEO, Diretor Comercial"
          />
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 pt-2">
        <Button type="button" variant="ghost" onClick={onBack}>
          <ArrowLeft className="w-4 h-4 mr-1" /> Voltar
        </Button>
        <Button type="button" onClick={handleNext} disabled={!canContinue}>
          Continuar <ArrowRight className="w-4 h-4 ml-1" />
        </Button>
      </div>
    </div>
  );
}
