import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Clock,
  Euro,
  MapPin,
  Video,
  Phone,
  MoreVertical,
  Edit,
  Trash2,
  Copy,
  Calendar,
  Users,
  Building2,
} from 'lucide-react';
import type { Service } from '@/hooks/useServices';

interface ServiceCardProps {
  service: Service;
  onEdit: (service: Service) => void;
  onDelete: (id: string) => void;
  onToggleStatus: (id: string, isActive: boolean) => void;
  onDuplicate?: (service: Service) => void;
}

export function ServiceCard({
  service,
  onEdit,
  onDelete,
  onToggleStatus,
  onDuplicate,
}: ServiceCardProps) {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);
    await onDelete(service.id);
    setIsDeleting(false);
  };

  const formatDuration = (minutes: number) => {
    if (minutes < 60) return `${minutes}min`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}min` : `${hours}h`;
  };

  const formatPrice = (price: number | null, currency: string) => {
    if (!price) return 'Gratuito';
    return new Intl.NumberFormat('pt-PT', {
      style: 'currency',
      currency: currency || 'EUR',
    }).format(price);
  };

  const getLocationIcons = () => {
    if (!service.locations || service.locations.length === 0) return null;
    
    const types = new Set(service.locations.map(l => l.location_type));
    const icons = [];
    
    if (types.has('physical') || types.has('client_location')) {
      icons.push(<MapPin key="physical" className="h-3.5 w-3.5" />);
    }
    if (types.has('online')) {
      icons.push(<Video key="online" className="h-3.5 w-3.5" />);
    }
    if (types.has('phone')) {
      icons.push(<Phone key="phone" className="h-3.5 w-3.5" />);
    }
    
    return icons;
  };

  return (
    <Card className={`transition-all hover:shadow-md ${!service.is_active ? 'opacity-60' : ''}`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <div
                className="w-3 h-3 rounded-full flex-shrink-0"
                style={{ backgroundColor: service.color || '#3B82F6' }}
              />
              <h3 className="font-medium text-foreground truncate">{service.name}</h3>
              {!service.is_active && (
                <Badge variant="secondary" className="text-xs">Inativo</Badge>
              )}
              {service.is_public && (
                <Badge variant="outline" className="text-xs">Público</Badge>
              )}
            </div>
            
            {service.description && (
              <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                {service.description}
              </p>
            )}

            <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" />
                {formatDuration(service.duration)}
              </span>
              
              <span className="flex items-center gap-1">
                <Euro className="h-3.5 w-3.5" />
                {formatPrice(service.price, service.currency)}
              </span>

              {getLocationIcons() && (
                <span className="flex items-center gap-1">
                  {getLocationIcons()}
                </span>
              )}

              {service.category && (
                <Badge 
                  variant="secondary" 
                  className="text-xs"
                  style={{ 
                    backgroundColor: `${service.category.color}20`,
                    color: service.category.color || undefined,
                  }}
                >
                  {service.category.name}
                </Badge>
              )}
            </div>

            {/* Booking rules summary */}
            <div className="flex flex-wrap items-center gap-2 mt-2 text-xs text-muted-foreground">
              {service.buffer_before > 0 && (
                <span>Buffer antes: {service.buffer_before}min</span>
              )}
              {service.buffer_after > 0 && (
                <span>Buffer depois: {service.buffer_after}min</span>
              )}
              {service.max_per_day && (
                <span>Máx/dia: {service.max_per_day}</span>
              )}
              {service.min_notice_hours > 0 && (
                <span>Aviso mín: {service.min_notice_hours}h</span>
              )}
            </div>

            {/* Assignments summary */}
            <div className="flex items-center gap-3 mt-2">
              {service.user_assignments && service.user_assignments.length > 0 && (
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Users className="h-3 w-3" />
                  {service.user_assignments.length} utilizador(es)
                </span>
              )}
              {service.team_assignments && service.team_assignments.length > 0 && (
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Building2 className="h-3 w-3" />
                  {service.team_assignments.length} equipa(s)
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Switch
              checked={service.is_active}
              onCheckedChange={(checked) => onToggleStatus(service.id, checked)}
              aria-label="Ativar/desativar serviço"
            />
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onEdit(service)}>
                  <Edit className="h-4 w-4 mr-2" />
                  Editar
                </DropdownMenuItem>
                {onDuplicate && (
                  <DropdownMenuItem onClick={() => onDuplicate(service)}>
                    <Copy className="h-4 w-4 mr-2" />
                    Duplicar
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem>
                  <Calendar className="h-4 w-4 mr-2" />
                  Ver marcações
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Eliminar
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
