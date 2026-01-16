import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, Plus, Clock, AlertCircle } from 'lucide-react';
import { useAvailability, type UserAvailability, type CreateSlotData, type CreateExceptionData } from '@/hooks/useAvailability';
import { useCalendars } from '@/hooks/useCalendars';
import { AvailabilityCard } from './AvailabilityCard';
import { AvailabilityModal } from './AvailabilityModal';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

export function AvailabilityDashboard() {
  const {
    availabilities,
    isLoading,
    error,
    createAvailability,
    updateAvailability,
    deleteAvailability,
    updateSlots,
    addException,
    removeException,
    assignToCalendar,
    removeCalendarAssignment,
  } = useAvailability();

  const { calendars } = useCalendars();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedAvailability, setSelectedAvailability] = useState<UserAvailability | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const handleCreate = () => {
    setSelectedAvailability(null);
    setIsModalOpen(true);
  };

  const handleEdit = (availability: UserAvailability) => {
    setSelectedAvailability(availability);
    setIsModalOpen(true);
  };

  const handleSave = async (data: {
    name: string;
    timezone: string;
    is_default: boolean;
    slots: CreateSlotData[];
  }) => {
    if (selectedAvailability) {
      await updateAvailability(selectedAvailability.id, {
        name: data.name,
        timezone: data.timezone,
        is_default: data.is_default,
      });
      await updateSlots(selectedAvailability.id, data.slots);
    } else {
      const newAvailability = await createAvailability({
        name: data.name,
        timezone: data.timezone,
        is_default: data.is_default,
      });
      if (newAvailability) {
        await updateSlots(newAvailability.id, data.slots);
      }
    }
  };

  const handleUpdateSlots = async (availabilityId: string, slots: CreateSlotData[]) => {
    await updateSlots(availabilityId, slots);
  };

  const handleAddException = async (availabilityId: string, data: CreateExceptionData) => {
    await addException(availabilityId, data);
  };

  const handleRemoveException = async (exceptionId: string) => {
    await removeException(exceptionId);
  };

  const handleAssignCalendar = async (availabilityId: string, calendarId: string) => {
    await assignToCalendar(availabilityId, calendarId);
  };

  const handleRemoveCalendarAssignment = async (assignmentId: string) => {
    await removeCalendarAssignment(assignmentId);
  };

  const handleToggleDefault = async (id: string, isDefault: boolean) => {
    await updateAvailability(id, { is_default: isDefault });
  };

  const handleToggleActive = async (id: string, isActive: boolean) => {
    await updateAvailability(id, { is_active: isActive });
  };

  const handleConfirmDelete = async () => {
    if (deleteId) {
      await deleteAvailability(deleteId);
      setDeleteId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <AlertCircle className="h-12 w-12 text-destructive mb-4" />
          <p className="text-lg font-medium">Erro ao carregar disponibilidades</p>
          <p className="text-muted-foreground">{error}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Disponibilidade</h1>
          <p className="text-muted-foreground">
            Gerir os seus horários de trabalho e exceções
          </p>
        </div>
        <Button onClick={handleCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Nova Disponibilidade
        </Button>
      </div>

      {/* Content */}
      {availabilities.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Clock className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">Nenhuma disponibilidade configurada</h3>
            <p className="text-muted-foreground text-center mb-4">
              Configure os seus horários de trabalho para controlar quando pode ser marcado
            </p>
            <Button onClick={handleCreate}>
              <Plus className="mr-2 h-4 w-4" />
              Criar Disponibilidade
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {availabilities.map(availability => (
            <AvailabilityCard
              key={availability.id}
              availability={availability}
              onEdit={handleEdit}
              onDelete={setDeleteId}
              onToggleDefault={handleToggleDefault}
              onToggleActive={handleToggleActive}
            />
          ))}
        </div>
      )}

      {/* Modal */}
      <AvailabilityModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        availability={selectedAvailability}
        calendars={calendars}
        onSave={handleSave}
        onUpdateSlots={handleUpdateSlots}
        onAddException={handleAddException}
        onRemoveException={handleRemoveException}
        onAssignCalendar={handleAssignCalendar}
        onRemoveCalendarAssignment={handleRemoveCalendarAssignment}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar disponibilidade?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser revertida. Todos os horários e exceções associados serão eliminados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
