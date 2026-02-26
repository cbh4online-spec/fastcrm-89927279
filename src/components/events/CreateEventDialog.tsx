import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useCreateEvent } from "@/hooks/useEvents";
import { useWorkspace } from "@/contexts/WorkspaceContext";

const CATEGORIES = [
  { value: "networking", label: "Networking" },
  { value: "jantar", label: "Jantar" },
  { value: "workshop", label: "Workshop" },
  { value: "webinar", label: "Webinar" },
  { value: "conferencia", label: "Conferência" },
  { value: "outro", label: "Outro" },
];

interface CreateEventDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

export function CreateEventDialog({ open, onOpenChange }: CreateEventDialogProps) {
  const { currentWorkspace } = useWorkspace();
  const createEvent = useCreateEvent(currentWorkspace?.id);

  const [form, setForm] = useState({
    title: "",
    description: "",
    event_category: "",
    starts_at: "",
    ends_at: "",
    location: "",
    location_url: "",
    capacity: "",
    price: "0",
    currency: "EUR",
    host_name: "",
    host_email: "",
    host_phone: "",
    link: "",
    tags: "",
    status: "draft" as string,
  });

  const set = (key: string, value: string) => setForm((p) => ({ ...p, [key]: value }));

  const handleSubmit = () => {
    if (!form.title || !form.starts_at) return;
    createEvent.mutate(
      {
        title: form.title,
        description: form.description || null,
        event_category: form.event_category || null,
        event_type: form.event_category || "event",
        starts_at: new Date(form.starts_at).toISOString(),
        ends_at: form.ends_at ? new Date(form.ends_at).toISOString() : null,
        location: form.location || null,
        location_url: form.location_url || null,
        capacity: form.capacity ? parseInt(form.capacity) : null,
        price: parseFloat(form.price) || 0,
        currency: form.currency,
        host_name: form.host_name || null,
        host_email: form.host_email || null,
        host_phone: form.host_phone || null,
        link: form.link || null,
        tags: form.tags ? form.tags.split(",").map((t) => t.trim()) : null,
        status: form.status,
      },
      {
        onSuccess: () => {
          onOpenChange(false);
          setForm({
            title: "", description: "", event_category: "", starts_at: "", ends_at: "",
            location: "", location_url: "", capacity: "", price: "0", currency: "EUR",
            host_name: "", host_email: "", host_phone: "", link: "", tags: "", status: "draft",
          });
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Criar Evento</DialogTitle>
        </DialogHeader>
        <ScrollArea className="max-h-[70vh] pr-2">
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Título *</Label>
              <Input value={form.title} onChange={(e) => set("title", e.target.value)} placeholder="Nome do evento" />
            </div>
            <div className="space-y-1.5">
              <Label>Descrição</Label>
              <Textarea value={form.description} onChange={(e) => set("description", e.target.value)} placeholder="Detalhes do evento" rows={3} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Categoria</Label>
                <Select value={form.event_category} onValueChange={(v) => set("event_category", v)}>
                  <SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => (
                      <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Status</Label>
                <Select value={form.status} onValueChange={(v) => set("status", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Rascunho</SelectItem>
                    <SelectItem value="published">Publicado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Data início *</Label>
                <Input type="datetime-local" value={form.starts_at} onChange={(e) => set("starts_at", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Data fim</Label>
                <Input type="datetime-local" value={form.ends_at} onChange={(e) => set("ends_at", e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Local</Label>
                <Input value={form.location} onChange={(e) => set("location", e.target.value)} placeholder="Local do evento" />
              </div>
              <div className="space-y-1.5">
                <Label>URL Mapa</Label>
                <Input value={form.location_url} onChange={(e) => set("location_url", e.target.value)} placeholder="Link Google Maps" />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label>Capacidade</Label>
                <Input type="number" value={form.capacity} onChange={(e) => set("capacity", e.target.value)} placeholder="0" />
              </div>
              <div className="space-y-1.5">
                <Label>Preço</Label>
                <Input type="number" value={form.price} onChange={(e) => set("price", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Moeda</Label>
                <Input value={form.currency} onChange={(e) => set("currency", e.target.value)} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Anfitrião</Label>
              <div className="grid grid-cols-3 gap-3">
                <Input value={form.host_name} onChange={(e) => set("host_name", e.target.value)} placeholder="Nome" />
                <Input value={form.host_email} onChange={(e) => set("host_email", e.target.value)} placeholder="Email" />
                <Input value={form.host_phone} onChange={(e) => set("host_phone", e.target.value)} placeholder="Telefone" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Link externo</Label>
                <Input value={form.link} onChange={(e) => set("link", e.target.value)} placeholder="https://..." />
              </div>
              <div className="space-y-1.5">
                <Label>Tags (separadas por vírgula)</Label>
                <Input value={form.tags} onChange={(e) => set("tags", e.target.value)} placeholder="vip, presencial" />
              </div>
            </div>
          </div>
        </ScrollArea>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={!form.title || !form.starts_at || createEvent.isPending}>
            {createEvent.isPending ? "A criar..." : "Criar Evento"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
