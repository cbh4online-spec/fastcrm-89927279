import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useEvent, useEventRSVPs, useInviteToEvent, useUpdateRSVP, useUpdateEvent } from "@/hooks/useEvents";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useCoreObjectFields, useCreateObjectField } from "@/hooks/useCoreObjectFields";
import { AttioAttributePicker, type AttributeField } from "./AttioAttributePicker";
import { format } from "date-fns";
import { pt } from "date-fns/locale";
import {
  ArrowLeft, CalendarDays, MapPin, Users, UserPlus, ExternalLink,
  DollarSign, Mail, Phone, User
} from "lucide-react";

const RSVP_STATUS: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  invited: { label: "Convidado", variant: "secondary" },
  confirmed: { label: "Confirmado", variant: "default" },
  declined: { label: "Recusado", variant: "destructive" },
  attended: { label: "Presente", variant: "outline" },
};

export default function EventDetailPage() {
  const { eventId } = useParams<{ eventId: string }>();
  const navigate = useNavigate();
  const { currentWorkspace } = useWorkspace();
  const { data: event, isLoading } = useEvent(eventId);
  const { data: rsvps } = useEventRSVPs(eventId);
  const inviteMut = useInviteToEvent();
  const updateRsvp = useUpdateRSVP();
  const updateEvent = useUpdateEvent();

  // Custom fields via core_object_fields for "community_events"
  const { data: customFields } = useCoreObjectFields("community_events");
  const createField = useCreateObjectField();

  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteForm, setInviteForm] = useState({ name: "", email: "", phone: "" });

  const handleInvite = () => {
    if (!eventId || !currentWorkspace) return;
    inviteMut.mutate(
      {
        event_id: eventId,
        workspace_id: currentWorkspace.id,
        name: inviteForm.name,
        email: inviteForm.email,
        phone: inviteForm.phone,
        status: "invited",
        contact_id: null,
        notes: null,
        eventTitle: event?.title,
        eventDate: event?.starts_at,
        eventLocation: event?.location,
        eventLink: event?.link,
      },
      { onSuccess: () => { setInviteOpen(false); setInviteForm({ name: "", email: "", phone: "" }); } }
    );
  };

  const handleCreateAttribute = (name: string, fieldType: string) => {
    createField.mutate({
      object_id: "community_events",
      name,
      slug: name.toLowerCase().replace(/\s+/g, "_"),
      field_type: fieldType,
    });
  };

  const attrFields: AttributeField[] = (customFields || []).map((f) => ({
    id: f.id,
    name: f.name,
    field_type: f.field_type,
  }));

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="space-y-4">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-40 w-full" />
        </div>
      </DashboardLayout>
    );
  }

  if (!event) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center py-16">
          <p className="text-muted-foreground">Evento não encontrado</p>
          <Button variant="outline" className="mt-4" onClick={() => navigate("/dashboard/events")}>Voltar</Button>
        </div>
      </DashboardLayout>
    );
  }

  const counts = { invited: 0, confirmed: 0, declined: 0, attended: 0 };
  (rsvps || []).forEach((r) => { if (r.status in counts) counts[r.status as keyof typeof counts]++; });

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard/events")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-foreground">{event.title}</h1>
              <Badge variant={event.status === "published" ? "default" : "secondary"}>
                {event.status === "published" ? "Publicado" : event.status === "cancelled" ? "Cancelado" : "Rascunho"}
              </Badge>
            </div>
            {event.description && <p className="text-sm text-muted-foreground mt-1">{event.description}</p>}
          </div>
          <div className="flex gap-2">
            <AttioAttributePicker
              existingFields={attrFields}
              onCreateField={handleCreateAttribute}
            />
            {event.status === "draft" && (
              <Button size="sm" onClick={() => updateEvent.mutate({ id: event.id, status: "published" })}>
                Publicar
              </Button>
            )}
          </div>
        </div>

        {/* Info cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <CalendarDays className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Data</p>
                <p className="text-sm font-medium">{format(new Date(event.starts_at), "d MMM yyyy, HH:mm", { locale: pt })}</p>
              </div>
            </CardContent>
          </Card>
          {event.location && (
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <MapPin className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Local</p>
                  <p className="text-sm font-medium truncate">{event.location}</p>
                </div>
              </CardContent>
            </Card>
          )}
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <Users className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Convidados</p>
                <p className="text-sm font-medium">{(rsvps || []).length}{event.capacity ? ` / ${event.capacity}` : ""}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <DollarSign className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Preço</p>
                <p className="text-sm font-medium">{event.price && event.price > 0 ? `${event.price} ${event.currency}` : "Grátis"}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="rsvps">
          <TabsList>
            <TabsTrigger value="rsvps">RSVPs ({(rsvps || []).length})</TabsTrigger>
            <TabsTrigger value="details">Detalhes</TabsTrigger>
          </TabsList>

          <TabsContent value="rsvps" className="mt-4 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex gap-2">
                {Object.entries(counts).map(([k, v]) => (
                  <Badge key={k} variant="outline" className="text-xs gap-1">
                    {RSVP_STATUS[k]?.label}: {v}
                  </Badge>
                ))}
              </div>
              <Button size="sm" onClick={() => setInviteOpen(true)} className="gap-1.5">
                <UserPlus className="h-3.5 w-3.5" />
                Convidar
              </Button>
            </div>

            {!(rsvps || []).length ? (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  <Users className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                  <p>Ainda sem convidados</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-2">
                {rsvps!.map((r) => {
                  const st = RSVP_STATUS[r.status] || RSVP_STATUS.invited;
                  return (
                    <Card key={r.id}>
                      <CardContent className="p-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-full bg-accent flex items-center justify-center">
                            <User className="h-4 w-4 text-muted-foreground" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-foreground">{r.name || "Sem nome"}</p>
                            <div className="flex items-center gap-3 text-xs text-muted-foreground">
                              {r.email && <span className="flex items-center gap-1"><Mail className="h-3 w-3" />{r.email}</span>}
                              {r.phone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{r.phone}</span>}
                            </div>
                          </div>
                        </div>
                        <Select
                          value={r.status}
                          onValueChange={(v) => updateRsvp.mutate({ id: r.id, status: v, responded_at: new Date().toISOString() })}
                        >
                          <SelectTrigger className="w-[130px] h-8">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(RSVP_STATUS).map(([k, v]) => (
                              <SelectItem key={k} value={k}>{v.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          <TabsContent value="details" className="mt-4">
            <Card>
              <CardContent className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  {event.host_name && <div><span className="text-muted-foreground">Anfitrião:</span> {event.host_name}</div>}
                  {event.host_email && <div><span className="text-muted-foreground">Email:</span> {event.host_email}</div>}
                  {event.host_phone && <div><span className="text-muted-foreground">Telefone:</span> {event.host_phone}</div>}
                  {event.event_category && <div><span className="text-muted-foreground">Categoria:</span> {event.event_category}</div>}
                  {event.link && (
                    <div className="col-span-2">
                      <span className="text-muted-foreground">Link: </span>
                      <a href={event.link} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline inline-flex items-center gap-1">
                        {event.link} <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  )}
                  {event.tags && event.tags.length > 0 && (
                    <div className="col-span-2 flex items-center gap-2 flex-wrap">
                      <span className="text-muted-foreground">Tags:</span>
                      {event.tags.map((t) => <Badge key={t} variant="outline" className="text-xs">{t}</Badge>)}
                    </div>
                  )}
                </div>

                {/* Custom fields from metadata */}
                {event.metadata && Object.keys(event.metadata).length > 0 && (
                  <div className="border-t border-border pt-4 mt-4">
                    <h4 className="text-sm font-medium text-foreground mb-3">Atributos personalizados</h4>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      {Object.entries(event.metadata).map(([k, v]) => (
                        <div key={k}>
                          <span className="text-muted-foreground">{k}:</span> {String(v)}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Invite Dialog */}
      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Convidar para evento</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Nome</Label>
              <Input value={inviteForm.name} onChange={(e) => setInviteForm((p) => ({ ...p, name: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input type="email" value={inviteForm.email} onChange={(e) => setInviteForm((p) => ({ ...p, email: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Telefone</Label>
              <Input value={inviteForm.phone} onChange={(e) => setInviteForm((p) => ({ ...p, phone: e.target.value }))} />
            </div>
            <Button className="w-full" onClick={handleInvite} disabled={inviteMut.isPending}>
              {inviteMut.isPending ? "A convidar..." : "Enviar convite"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
