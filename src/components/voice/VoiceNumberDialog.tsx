/**
 * Voice Number Dialog (Fase 1P.3)
 */
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useUpsertVoiceNumber, useVoiceProviders, type VoiceNumber } from "@/hooks/useVoiceHub";
import { normalizePhoneNumber } from "@/integrations/voice/utils/phone";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initial?: VoiceNumber | null;
}

export function VoiceNumberDialog({ open, onOpenChange, initial }: Props) {
  const upsert = useUpsertVoiceNumber();
  const { data: providers } = useVoiceProviders();
  const [form, setForm] = useState({
    number: "",
    display_name: "",
    country: "PT",
    country_code: "+351",
    number_type: "mobile",
    inbound_enabled: true,
    outbound_enabled: true,
    recording_enabled: false,
    transcription_enabled: false,
    is_primary: false,
    status: "active",
    provider_instance_id: "",
  });

  useEffect(() => {
    if (initial) {
      setForm({
        number: initial.number,
        display_name: initial.display_name ?? "",
        country: initial.country,
        country_code: initial.country_code,
        number_type: initial.number_type ?? "mobile",
        inbound_enabled: initial.inbound_enabled,
        outbound_enabled: initial.outbound_enabled,
        recording_enabled: initial.recording_enabled,
        transcription_enabled: initial.transcription_enabled,
        is_primary: initial.is_primary,
        status: initial.status,
        provider_instance_id: initial.provider_instance_id ?? "",
      });
    } else {
      setForm({
        number: "", display_name: "", country: "PT", country_code: "+351",
        number_type: "mobile", inbound_enabled: true, outbound_enabled: true,
        recording_enabled: false, transcription_enabled: false, is_primary: false,
        status: "active", provider_instance_id: "",
      });
    }
  }, [initial, open]);

  const handleSave = async () => {
    const normalized = normalizePhoneNumber(form.number, form.country);
    await upsert.mutateAsync({
      id: initial?.id,
      ...form,
      normalized_number: normalized,
      provider_instance_id: form.provider_instance_id || null,
    } as never);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{initial ? "Editar Número" : "Novo Número"} VoiceHub</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2 space-y-2">
            <Label>Número</Label>
            <Input value={form.number} onChange={(e) => setForm({ ...form, number: e.target.value })} placeholder="+351 21 000 0000" />
          </div>
          <div className="col-span-2 space-y-2">
            <Label>Nome de exibição</Label>
            <Input value={form.display_name} onChange={(e) => setForm({ ...form, display_name: e.target.value })} placeholder="Linha Comercial" />
          </div>
          <div className="space-y-2">
            <Label>País</Label>
            <Input value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value.toUpperCase() })} maxLength={2} />
          </div>
          <div className="space-y-2">
            <Label>Indicativo</Label>
            <Input value={form.country_code} onChange={(e) => setForm({ ...form, country_code: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>Tipo</Label>
            <Select value={form.number_type} onValueChange={(v) => setForm({ ...form, number_type: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="fixed">Fixo</SelectItem>
                <SelectItem value="mobile">Móvel</SelectItem>
                <SelectItem value="toll_free">Toll-free</SelectItem>
                <SelectItem value="virtual">Virtual</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Provider</Label>
            <Select value={form.provider_instance_id || "none"} onValueChange={(v) => setForm({ ...form, provider_instance_id: v === "none" ? "" : v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sem provider</SelectItem>
                {(providers ?? []).map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.display_name || p.provider_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between col-span-2 border-t pt-3">
            <Label>Recebe chamadas</Label>
            <Switch checked={form.inbound_enabled} onCheckedChange={(v) => setForm({ ...form, inbound_enabled: v })} />
          </div>
          <div className="flex items-center justify-between col-span-2">
            <Label>Faz chamadas</Label>
            <Switch checked={form.outbound_enabled} onCheckedChange={(v) => setForm({ ...form, outbound_enabled: v })} />
          </div>
          <div className="flex items-center justify-between col-span-2">
            <Label>Gravar chamadas</Label>
            <Switch checked={form.recording_enabled} onCheckedChange={(v) => setForm({ ...form, recording_enabled: v })} />
          </div>
          <div className="flex items-center justify-between col-span-2">
            <Label>Transcrever</Label>
            <Switch checked={form.transcription_enabled} onCheckedChange={(v) => setForm({ ...form, transcription_enabled: v })} />
          </div>
          <div className="flex items-center justify-between col-span-2">
            <Label>Número principal</Label>
            <Switch checked={form.is_primary} onCheckedChange={(v) => setForm({ ...form, is_primary: v })} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSave} disabled={upsert.isPending || !form.number}>
            {upsert.isPending ? "A guardar..." : "Guardar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
