import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { MapPin, Plus, Trash2, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useHRGeofenceZones,
  useCreateGeofenceZone,
  useUpdateGeofenceZone,
  useDeleteGeofenceZone,
  type GeofenceZone,
} from "@/hooks/hr/useHRGeofenceZones";

const zoneSchema = z.object({
  name: z.string().min(1, "Nome obrigatório").max(100),
  latitude: z.coerce.number().min(-90).max(90),
  longitude: z.coerce.number().min(-180).max(180),
  radius_meters: z.coerce.number().int().min(10, "Mínimo 10m").max(50000, "Máximo 50km"),
  address: z.string().max(255).optional(),
});

type ZoneFormValues = z.infer<typeof zoneSchema>;

export function GeofenceZonesTab() {
  const { data: zones, isLoading } = useHRGeofenceZones();
  const createZone = useCreateGeofenceZone();
  const updateZone = useUpdateGeofenceZone();
  const deleteZone = useDeleteGeofenceZone();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingZone, setEditingZone] = useState<GeofenceZone | null>(null);

  const form = useForm<ZoneFormValues>({
    resolver: zodResolver(zoneSchema),
    defaultValues: { name: "", latitude: 0, longitude: 0, radius_meters: 200, address: "" },
  });

  const openCreate = () => {
    setEditingZone(null);
    form.reset({ name: "", latitude: 0, longitude: 0, radius_meters: 200, address: "" });
    setDialogOpen(true);
  };

  const openEdit = (zone: GeofenceZone) => {
    setEditingZone(zone);
    form.reset({
      name: zone.name,
      latitude: zone.latitude,
      longitude: zone.longitude,
      radius_meters: zone.radius_meters,
      address: zone.address || "",
    });
    setDialogOpen(true);
  };

  const onSubmit = (values: ZoneFormValues) => {
    const payload = {
      name: values.name,
      latitude: values.latitude,
      longitude: values.longitude,
      radius_meters: values.radius_meters,
      address: values.address || undefined,
    };
    if (editingZone) {
      updateZone.mutate({ id: editingZone.id, ...payload } as any, { onSuccess: () => setDialogOpen(false) });
    } else {
      createZone.mutate(payload, { onSuccess: () => setDialogOpen(false) });
    }
  };

  const toggleActive = (zone: GeofenceZone) => {
    updateZone.mutate({ id: zone.id, is_active: !zone.is_active });
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div className="flex items-center gap-2">
          <MapPin className="h-5 w-5 text-primary" />
          <CardTitle className="text-lg">Zonas de Geofencing</CardTitle>
        </div>
        <Button size="sm" onClick={openCreate} className="gap-1.5">
          <Plus className="h-4 w-4" /> Adicionar Zona
        </Button>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground mb-4">
          Defina as localizações autorizadas para pica ponto. Os colaboradores que registarem entrada fora destas zonas geram automaticamente uma anomalia.
        </p>

        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => <Skeleton key={i} className="h-12 w-full" />)}
          </div>
        ) : !zones?.length ? (
          <div className="text-center py-8 text-muted-foreground">
            <MapPin className="h-10 w-10 mx-auto mb-2 opacity-40" />
            <p>Nenhuma zona configurada</p>
            <p className="text-xs mt-1">Adicione uma zona para activar o geofencing</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Endereço</TableHead>
                <TableHead className="text-right">Raio</TableHead>
                <TableHead className="text-center">Activa</TableHead>
                <TableHead className="text-right">Acções</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {zones.map((zone) => (
                <TableRow key={zone.id}>
                  <TableCell className="font-medium">{zone.name}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {zone.address || `${zone.latitude.toFixed(5)}, ${zone.longitude.toFixed(5)}`}
                  </TableCell>
                  <TableCell className="text-right">
                    <Badge variant="secondary">{zone.radius_meters}m</Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <Switch checked={zone.is_active} onCheckedChange={() => toggleActive(zone)} />
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(zone)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => deleteZone.mutate(zone.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingZone ? "Editar Zona" : "Nova Zona de Geofencing"}</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField control={form.control} name="name" render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome</FormLabel>
                  <FormControl><Input placeholder="Ex: Escritório Lisboa" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="address" render={({ field }) => (
                <FormItem>
                  <FormLabel>Endereço (opcional)</FormLabel>
                  <FormControl><Input placeholder="Ex: Rua Augusta 100, Lisboa" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="latitude" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Latitude</FormLabel>
                    <FormControl><Input type="number" step="any" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="longitude" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Longitude</FormLabel>
                    <FormControl><Input type="number" step="any" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
              <FormField control={form.control} name="radius_meters" render={({ field }) => (
                <FormItem>
                  <FormLabel>Raio (metros)</FormLabel>
                  <FormControl><Input type="number" min={10} max={50000} {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
                <Button type="submit" disabled={createZone.isPending || updateZone.isPending}>
                  {editingZone ? "Guardar" : "Criar"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
