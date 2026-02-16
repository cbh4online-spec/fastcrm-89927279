import { useState } from "react";
import { Plus, Search, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useVerticalTrackingEvents, useCreateVerticalTrackingEvent, useDeleteVerticalTrackingEvent } from "@/hooks/useVerticalFunnelManager";

interface Props {
  templateId: string;
}

export function VerticalEventsTab({ templateId }: Props) {
  const { data: events = [] } = useVerticalTrackingEvents(templateId);
  const createEvent = useCreateVerticalTrackingEvent();
  const deleteEvent = useDeleteVerticalTrackingEvent();

  const [addOpen, setAddOpen] = useState(false);
  const [pixelId, setPixelId] = useState("");
  const [accessToken, setAccessToken] = useState("");
  const [trackingLevel, setTrackingLevel] = useState("standard");

  const handleAdd = async () => {
    if (!pixelId) return;
    await createEvent.mutateAsync({
      template_id: templateId,
      pixel_id: pixelId,
      access_token: accessToken || undefined,
      tracking_level: trackingLevel,
      events_tracked: ["PageView", "Lead", "Purchase"],
    });
    setAddOpen(false);
    setPixelId("");
    setAccessToken("");
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Envia eventos de tracking para Meta</p>
        <Button onClick={() => setAddOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Event
        </Button>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Pixel ID</TableHead>
              <TableHead>Access Token</TableHead>
              <TableHead>Tracking Level</TableHead>
              <TableHead>Events Being Tracked</TableHead>
              <TableHead className="w-[80px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {events.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-40">
                  <div className="flex flex-col items-center justify-center text-muted-foreground gap-3">
                    <Search className="h-10 w-10" />
                    <span className="font-medium">No Events Found</span>
                    <Button onClick={() => setAddOpen(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Event
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              events.map((evt) => (
                <TableRow key={evt.id}>
                  <TableCell className="font-mono text-sm">{evt.pixel_id}</TableCell>
                  <TableCell className="font-mono text-xs">{evt.access_token ? "••••••" : "-"}</TableCell>
                  <TableCell className="capitalize">{evt.tracking_level}</TableCell>
                  <TableCell>{evt.events_tracked?.join(", ") || "-"}</TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" onClick={() => deleteEvent.mutate({ id: evt.id, templateId })} className="text-destructive">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar Evento de Tracking</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Pixel ID</Label>
              <Input value={pixelId} onChange={(e) => setPixelId(e.target.value)} placeholder="Ex: 123456789" />
            </div>
            <div>
              <Label>Access Token (opcional)</Label>
              <Input value={accessToken} onChange={(e) => setAccessToken(e.target.value)} placeholder="Token de acesso" />
            </div>
            <div>
              <Label>Tracking Level</Label>
              <Select value={trackingLevel} onValueChange={setTrackingLevel}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="standard">Standard</SelectItem>
                  <SelectItem value="advanced">Advanced</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Cancelar</Button>
            <Button onClick={handleAdd} disabled={!pixelId}>Adicionar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
