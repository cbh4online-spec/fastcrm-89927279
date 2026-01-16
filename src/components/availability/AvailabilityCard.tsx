import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Clock,
  MoreHorizontal,
  Pencil,
  Trash2,
  Star,
  StarOff,
  Power,
  PowerOff,
  Calendar,
  Globe,
} from 'lucide-react';
import type { UserAvailability } from '@/hooks/useAvailability';

const DAY_NAMES_SHORT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

interface AvailabilityCardProps {
  availability: UserAvailability;
  onEdit: (availability: UserAvailability) => void;
  onDelete: (id: string) => void;
  onToggleDefault: (id: string, isDefault: boolean) => void;
  onToggleActive: (id: string, isActive: boolean) => void;
}

export function AvailabilityCard({
  availability,
  onEdit,
  onDelete,
  onToggleDefault,
  onToggleActive,
}: AvailabilityCardProps) {
  const slots = availability.slots || [];
  const exceptions = availability.exceptions || [];
  const calendarAssignments = availability.calendar_assignments || [];

  // Group slots by day
  const slotsByDay = slots.reduce((acc, slot) => {
    if (!acc[slot.day_of_week]) {
      acc[slot.day_of_week] = [];
    }
    acc[slot.day_of_week].push(slot);
    return acc;
  }, {} as Record<number, typeof slots>);

  // Get active days
  const activeDays = Object.keys(slotsByDay).map(Number).sort();

  return (
    <Card className={`transition-all ${!availability.is_active ? 'opacity-60' : ''}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold">{availability.name}</h3>
              {availability.is_default && (
                <Badge variant="secondary" className="gap-1">
                  <Star className="h-3 w-3" />
                  Principal
                </Badge>
              )}
              {!availability.is_active && (
                <Badge variant="outline" className="text-muted-foreground">
                  Inativo
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <Globe className="h-3.5 w-3.5" />
              {availability.timezone}
            </div>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEdit(availability)}>
                <Pencil className="mr-2 h-4 w-4" />
                Editar
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => onToggleDefault(availability.id, !availability.is_default)}
              >
                {availability.is_default ? (
                  <>
                    <StarOff className="mr-2 h-4 w-4" />
                    Remover como principal
                  </>
                ) : (
                  <>
                    <Star className="mr-2 h-4 w-4" />
                    Definir como principal
                  </>
                )}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => onToggleActive(availability.id, !availability.is_active)}
              >
                {availability.is_active ? (
                  <>
                    <PowerOff className="mr-2 h-4 w-4" />
                    Desativar
                  </>
                ) : (
                  <>
                    <Power className="mr-2 h-4 w-4" />
                    Ativar
                  </>
                )}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => onDelete(availability.id)}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Eliminar
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Weekly Schedule */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Clock className="h-4 w-4" />
            Horário Semanal
          </div>
          
          {activeDays.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum horário definido</p>
          ) : (
            <div className="grid gap-1">
              {activeDays.map(day => (
                <div key={day} className="flex items-center gap-2 text-sm">
                  <span className="w-12 font-medium">{DAY_NAMES_SHORT[day]}</span>
                  <div className="flex flex-wrap gap-1">
                    {slotsByDay[day]
                      .sort((a, b) => a.start_time.localeCompare(b.start_time))
                      .map(slot => (
                        <Badge key={slot.id} variant="outline" className="font-mono text-xs">
                          {slot.start_time.slice(0, 5)} - {slot.end_time.slice(0, 5)}
                        </Badge>
                      ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Calendar Assignments */}
        {calendarAssignments.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Calendar className="h-4 w-4" />
              Calendários Associados
            </div>
            <div className="flex flex-wrap gap-1">
              {calendarAssignments.map(assignment => (
                <Badge
                  key={assignment.id}
                  variant="secondary"
                  style={{
                    backgroundColor: assignment.calendar?.color ? `${assignment.calendar.color}20` : undefined,
                    borderColor: assignment.calendar?.color,
                  }}
                >
                  {assignment.calendar?.name || 'Calendário'}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Exceptions Summary */}
        {exceptions.length > 0 && (
          <div className="text-sm text-muted-foreground">
            {exceptions.length} exceção(ões) configurada(s)
          </div>
        )}
      </CardContent>
    </Card>
  );
}
