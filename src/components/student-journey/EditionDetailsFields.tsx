import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EDITION_STATUSES, EDITION_STATUS_LABEL, SJ_CITIES, type EditionStatus } from "@/lib/studentJourney/editions";

export interface EditionDraft {
  edition_code: string;
  city: string;
  location: string;
  trainer_name: string;
  reserved_seats: string;
  price: string;
  edition_status: EditionStatus;
  dates_confirmed: boolean;
}

export const emptyEditionDraft = (): EditionDraft => ({
  edition_code: "", city: "", location: "", trainer_name: "",
  reserved_seats: "0", price: "", edition_status: "planned", dates_confirmed: false,
});

export function editionDraftFrom(c: any): EditionDraft {
  return {
    edition_code: c?.edition_code ?? "",
    city: c?.city ?? "",
    location: c?.location ?? "",
    trainer_name: c?.trainer_name ?? "",
    reserved_seats: String(c?.reserved_seats ?? 0),
    price: c?.price != null ? String(c.price) : "",
    edition_status: (c?.edition_status ?? "planned") as EditionStatus,
    dates_confirmed: !!c?.dates_confirmed,
  };
}

/** Valida e converte para o formato gravado. Devolve erro em pt-PT ou o payload. */
export function editionPayload(d: EditionDraft): { error: string } | { value: Record<string, unknown> } {
  const reserved = Number(d.reserved_seats || 0);
  if (!Number.isInteger(reserved) || reserved < 0) return { error: "Lugares reservados tem de ser um número inteiro igual ou superior a 0" };
  const price = d.price.trim() === "" ? null : Number(d.price.replace(",", "."));
  if (price != null && (!Number.isFinite(price) || price < 0)) return { error: "Preço inválido" };
  return {
    value: {
      edition_code: d.edition_code.trim().slice(0, 40) || null,
      city: d.city || null,
      location: d.location.trim().slice(0, 200) || null,
      trainer_name: d.trainer_name.trim().slice(0, 120) || null,
      reserved_seats: reserved,
      price,
      edition_status: d.edition_status,
      dates_confirmed: d.dates_confirmed,
    },
  };
}

export function EditionDetailsFields({ value, onChange }: { value: EditionDraft; onChange: (v: EditionDraft) => void }) {
  const set = <K extends keyof EditionDraft>(k: K, v: EditionDraft[K]) => onChange({ ...value, [k]: v });
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <div className="grid gap-2">
        <Label htmlFor="ed-code">Código da edição</Label>
        <Input id="ed-code" value={value.edition_code} maxLength={40} onChange={(e) => set("edition_code", e.target.value)} placeholder="Ex: BAS-PRT-2026-01" />
      </div>
      <div className="grid gap-2">
        <Label>Estado da edição</Label>
        <Select value={value.edition_status} onValueChange={(v) => set("edition_status", v as EditionStatus)}>
          <SelectTrigger aria-label="Estado da edição"><SelectValue /></SelectTrigger>
          <SelectContent>
            {EDITION_STATUSES.map((s) => <SelectItem key={s} value={s}>{EDITION_STATUS_LABEL[s]}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="grid gap-2">
        <Label>Cidade</Label>
        <Select value={value.city || "none"} onValueChange={(v) => set("city", v === "none" ? "" : v)}>
          <SelectTrigger aria-label="Cidade"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Sem cidade</SelectItem>
            {SJ_CITIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="ed-loc">Local</Label>
        <Input id="ed-loc" value={value.location} maxLength={200} onChange={(e) => set("location", e.target.value)} placeholder="Morada ou sala" />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="ed-trainer">Formador</Label>
        <Input id="ed-trainer" value={value.trainer_name} maxLength={120} onChange={(e) => set("trainer_name", e.target.value)} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="grid gap-2">
          <Label htmlFor="ed-res">Lugares reservados</Label>
          <Input id="ed-res" type="number" min={0} step={1} value={value.reserved_seats} onChange={(e) => set("reserved_seats", e.target.value)} />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="ed-price">Preço (€)</Label>
          <Input id="ed-price" inputMode="decimal" value={value.price} onChange={(e) => set("price", e.target.value)} />
        </div>
      </div>
      <div className="flex items-center justify-between rounded-md border p-3 sm:col-span-2">
        <Label htmlFor="ed-dates">Datas confirmadas</Label>
        <Switch id="ed-dates" checked={value.dates_confirmed} onCheckedChange={(v) => set("dates_confirmed", v)} />
      </div>
    </div>
  );
}
