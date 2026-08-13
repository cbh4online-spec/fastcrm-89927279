import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Plus, Trash2 } from "lucide-react";
import type {
  OfferPreset,
  OfferSectorConfig,
  OfferStepItem,
} from "@/components/store/offer-page/offerPageTypes";

interface Props {
  preset: OfferPreset;
  value: OfferSectorConfig;
  onChange: (next: OfferSectorConfig) => void;
}

const MAX_ITEMS = 20;

/** Editor de conteúdo sectorial gravado em metadata.offer_page.sectorConfig. */
export function OfferSectorContentEditor({ preset, value, onChange }: Props) {
  const patch = (p: Partial<OfferSectorConfig>) => onChange({ ...value, ...p });

  const blocks: React.ReactNode[] = [];

  if (preset === "cosmetics") {
    blocks.push(
      <IngredientList
        key="ingredients"
        items={value.ingredients || []}
        onChange={(ingredients) => patch({ ingredients })}
      />,
      <StepList
        key="howToUse"
        title="Modo de utilização"
        placeholderTitle="Passo (ex.: Aplicar na pele limpa)"
        items={value.howToUse || []}
        onChange={(howToUse) => patch({ howToUse })}
      />,
    );
  }

  if (preset === "training") {
    blocks.push(
      <StepList
        key="program"
        title="Programa"
        placeholderTitle="Módulo (ex.: Fundamentos)"
        items={value.program || []}
        onChange={(program) => patch({ program })}
      />,
      <InstructorEditor
        key="instructor"
        value={value.instructor || {}}
        onChange={(instructor) => patch({ instructor })}
      />,
      <SessionList
        key="sessions"
        items={value.sessions || []}
        onChange={(sessions) => patch({ sessions })}
      />,
    );
  }

  if (preset === "security") {
    blocks.push(
      <StepList
        key="equipment"
        title="Equipamentos incluídos"
        placeholderTitle="Equipamento (ex.: Central de alarme)"
        items={value.equipment || []}
        onChange={(equipment) => patch({ equipment })}
      />,
      <StepList
        key="installation"
        title="Instalação"
        placeholderTitle="Passo (ex.: Visita técnica)"
        items={value.installation || []}
        onChange={(installation) => patch({ installation })}
        footer={
          <div className="space-y-1.5 pt-2">
            <Label className="text-xs">Nota de prazo</Label>
            <Input
              value={value.installationNote || ""}
              onChange={(e) => patch({ installationNote: e.target.value })}
              placeholder="Ex.: Instalação em 5 a 10 dias úteis"
              maxLength={200}
            />
          </div>
        }
      />,
    );
  }

  if (blocks.length === 0) {
    return (
      <Card className="p-4">
        <h4 className="font-medium">Conteúdo sectorial</h4>
        <p className="mt-1 text-sm text-muted-foreground">
          O preset selecionado não tem blocos sectoriais. Escolha Cosmética, Formação ou Segurança
          para preencher conteúdos específicos.
        </p>
      </Card>
    );
  }

  return <div className="space-y-4">{blocks}</div>;
}

/* ────────── blocos ────────── */

function IngredientList({
  items,
  onChange,
}: {
  items: { name: string; role?: string }[];
  onChange: (v: { name: string; role?: string }[]) => void;
}) {
  return (
    <Card className="p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="font-medium">Ingredientes ({items.length})</h4>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={items.length >= MAX_ITEMS}
          onClick={() => onChange([...items, { name: "", role: "" }])}
        >
          <Plus className="mr-1 h-3.5 w-3.5" />
          Adicionar
        </Button>
      </div>
      {items.length === 0 && (
        <p className="text-sm text-muted-foreground">Sem ingredientes — a secção não é apresentada.</p>
      )}
      {items.map((it, i) => (
        <div key={i} className="flex items-start gap-2">
          <Input
            className="flex-1"
            placeholder="Nome (ex.: Ácido hialurónico)"
            value={it.name}
            maxLength={80}
            onChange={(e) =>
              onChange(items.map((x, idx) => (idx === i ? { ...x, name: e.target.value } : x)))
            }
          />
          <Input
            className="flex-1"
            placeholder="Função (ex.: Hidratação profunda)"
            value={it.role || ""}
            maxLength={120}
            onChange={(e) =>
              onChange(items.map((x, idx) => (idx === i ? { ...x, role: e.target.value } : x)))
            }
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Remover ingrediente"
            onClick={() => onChange(items.filter((_, idx) => idx !== i))}
          >
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      ))}
    </Card>
  );
}

function StepList({
  title,
  placeholderTitle,
  items,
  onChange,
  footer,
}: {
  title: string;
  placeholderTitle: string;
  items: OfferStepItem[];
  onChange: (v: OfferStepItem[]) => void;
  footer?: React.ReactNode;
}) {
  return (
    <Card className="p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="font-medium">
          {title} ({items.length})
        </h4>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={items.length >= MAX_ITEMS}
          onClick={() => onChange([...items, { title: "", description: "" }])}
        >
          <Plus className="mr-1 h-3.5 w-3.5" />
          Adicionar
        </Button>
      </div>
      {items.length === 0 && (
        <p className="text-sm text-muted-foreground">Sem conteúdo — a secção não é apresentada.</p>
      )}
      {items.map((it, i) => (
        <div key={i} className="space-y-2 rounded-md border p-3">
          <div className="flex items-center gap-2">
            <Input
              className="flex-1"
              placeholder={placeholderTitle}
              value={it.title}
              maxLength={120}
              onChange={(e) =>
                onChange(items.map((x, idx) => (idx === i ? { ...x, title: e.target.value } : x)))
              }
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="Remover"
              onClick={() => onChange(items.filter((_, idx) => idx !== i))}
            >
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
          <Textarea
            placeholder="Descrição (opcional)"
            rows={2}
            maxLength={600}
            value={it.description || ""}
            onChange={(e) =>
              onChange(items.map((x, idx) => (idx === i ? { ...x, description: e.target.value } : x)))
            }
          />
        </div>
      ))}
      {footer}
    </Card>
  );
}

function InstructorEditor({
  value,
  onChange,
}: {
  value: { name?: string; bio?: string; photoUrl?: string };
  onChange: (v: { name?: string; bio?: string; photoUrl?: string }) => void;
}) {
  return (
    <Card className="p-4 space-y-3">
      <h4 className="font-medium">Formador</h4>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label className="text-xs">Nome</Label>
          <Input
            value={value.name || ""}
            maxLength={100}
            onChange={(e) => onChange({ ...value, name: e.target.value })}
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Foto (URL)</Label>
          <Input
            value={value.photoUrl || ""}
            maxLength={500}
            placeholder="https://..."
            onChange={(e) => onChange({ ...value, photoUrl: e.target.value })}
          />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">Bio curta</Label>
        <Textarea
          rows={3}
          maxLength={600}
          value={value.bio || ""}
          onChange={(e) => onChange({ ...value, bio: e.target.value })}
        />
      </div>
    </Card>
  );
}

function SessionList({
  items,
  onChange,
}: {
  items: { date?: string; time?: string; location?: string; seats?: string }[];
  onChange: (v: { date?: string; time?: string; location?: string; seats?: string }[]) => void;
}) {
  return (
    <Card className="p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="font-medium">Datas e sessões ({items.length})</h4>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={items.length >= MAX_ITEMS}
          onClick={() => onChange([...items, { date: "", time: "", location: "", seats: "" }])}
        >
          <Plus className="mr-1 h-3.5 w-3.5" />
          Adicionar
        </Button>
      </div>
      {items.length === 0 && (
        <p className="text-sm text-muted-foreground">Sem sessões — a secção não é apresentada.</p>
      )}
      {items.map((s, i) => (
        <div key={i} className="flex flex-wrap items-center gap-2 rounded-md border p-3">
          <Input
            className="w-40"
            placeholder="Data (ex.: 12 Set 2026)"
            value={s.date || ""}
            maxLength={40}
            onChange={(e) => onChange(items.map((x, idx) => (idx === i ? { ...x, date: e.target.value } : x)))}
          />
          <Input
            className="w-32"
            placeholder="Horário"
            value={s.time || ""}
            maxLength={40}
            onChange={(e) => onChange(items.map((x, idx) => (idx === i ? { ...x, time: e.target.value } : x)))}
          />
          <Input
            className="min-w-[10rem] flex-1"
            placeholder="Local / Online"
            value={s.location || ""}
            maxLength={120}
            onChange={(e) =>
              onChange(items.map((x, idx) => (idx === i ? { ...x, location: e.target.value } : x)))
            }
          />
          <Input
            className="w-28"
            placeholder="Vagas"
            value={s.seats || ""}
            maxLength={40}
            onChange={(e) => onChange(items.map((x, idx) => (idx === i ? { ...x, seats: e.target.value } : x)))}
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Remover sessão"
            onClick={() => onChange(items.filter((_, idx) => idx !== i))}
          >
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      ))}
    </Card>
  );
}
