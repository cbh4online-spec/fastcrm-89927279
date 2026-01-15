import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
import {
  ArrowLeft,
  Edit2,
  Save,
  X,
  Sparkles,
  FileText,
  Plus,
  MoreHorizontal,
  Trash2,
  Clock,
  Flame,
  ThermometerSun,
  Snowflake,
  Copy,
  ExternalLink,
} from 'lucide-react';
import { EntityType, Entity } from '@/types/entity';
import { cn } from '@/lib/utils';

interface EntityDetailHeaderProps {
  entityType: EntityType;
  entity: Entity;
  isEditing: boolean;
  editedName: string;
  onEditedNameChange: (name: string) => void;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onSave: () => void;
  onDelete: () => void;
  onGenerateSuggestions: () => void;
  onOpenTemplates: () => void;
  onCreateTask: () => void;
  isSaving?: boolean;
  isGeneratingSuggestions?: boolean;
  backPath: string;
  statusBadge?: React.ReactNode;
  extraBadges?: React.ReactNode;
}

const TEMPERATURE_CONFIG = {
  hot: { icon: Flame, color: 'text-red-500', bg: 'bg-red-100 dark:bg-red-900/30', label: 'Quente' },
  warm: { icon: ThermometerSun, color: 'text-amber-500', bg: 'bg-amber-100 dark:bg-amber-900/30', label: 'Morno' },
  cold: { icon: Snowflake, color: 'text-blue-500', bg: 'bg-blue-100 dark:bg-blue-900/30', label: 'Frio' },
};

const AVATAR_COLORS: Record<EntityType, string> = {
  lead: 'from-primary/80 to-primary',
  contact: 'from-emerald-500/80 to-emerald-600',
  company: 'from-blue-500/80 to-blue-600',
};

function getTimeAgo(date: Date): string {
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  
  if (diffInSeconds < 60) return 'agora mesmo';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} min`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} horas`;
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)} dias`;
  
  return date.toLocaleDateString('pt-PT');
}

export function EntityDetailHeader({
  entityType,
  entity,
  isEditing,
  editedName,
  onEditedNameChange,
  onStartEdit,
  onCancelEdit,
  onSave,
  onDelete,
  onGenerateSuggestions,
  onOpenTemplates,
  onCreateTask,
  isSaving,
  isGeneratingSuggestions,
  backPath,
  statusBadge,
  extraBadges,
}: EntityDetailHeaderProps) {
  const navigate = useNavigate();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const initials = entity.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const temperature = entity.ai_temperature as keyof typeof TEMPERATURE_CONFIG | undefined;
  const tempConfig = temperature ? TEMPERATURE_CONFIG[temperature] : null;
  const TempIcon = tempConfig?.icon;

  const score = entity.lead_score || entity.contact_score || entity.company_score;

  const handleCopyEmail = () => {
    if (entity.email) {
      navigator.clipboard.writeText(entity.email);
    }
  };

  const entityLabels: Record<EntityType, string> = {
    lead: 'Lead',
    contact: 'Contacto',
    company: 'Empresa',
  };

  return (
    <div className="bg-background border-b px-6 py-4">
      <div className="flex items-center justify-between gap-4">
        {/* Left side - Avatar and Info */}
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(backPath)}
            className="shrink-0"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          
          <Avatar className="h-14 w-14 text-lg">
            <AvatarFallback className={cn(
              'font-semibold text-white bg-gradient-to-br',
              AVATAR_COLORS[entityType]
            )}>
              {initials}
            </AvatarFallback>
          </Avatar>
          
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              {isEditing ? (
                <Input
                  value={editedName}
                  onChange={(e) => onEditedNameChange(e.target.value)}
                  className="text-xl font-semibold h-auto py-1 px-2 w-64"
                  autoFocus
                />
              ) : (
                <h1 className="text-xl font-semibold text-foreground">{entity.name}</h1>
              )}
              
              {/* Temperature Badge */}
              {tempConfig && TempIcon && (
                <div className={cn('flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium', tempConfig.bg)}>
                  <TempIcon className={cn('h-3 w-3', tempConfig.color)} />
                  <span className={tempConfig.color}>{tempConfig.label}</span>
                </div>
              )}

              {/* Score Badge */}
              {score !== null && score !== undefined && (
                <Badge variant="outline" className="font-medium">
                  {score} pts
                </Badge>
              )}
              
              {statusBadge}
              {extraBadges}
            </div>
            
            <p className="text-sm text-muted-foreground mt-0.5 flex items-center gap-2">
              <Clock className="w-3.5 h-3.5" />
              Atualizado há {getTimeAgo(new Date(entity.updated_at))}
            </p>
          </div>
        </div>

        {/* Right side - Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap justify-end">
          {isEditing ? (
            <>
              <Button variant="outline" onClick={onCancelEdit}>
                <X className="w-4 h-4 mr-2" />
                Cancelar
              </Button>
              <Button onClick={onSave} disabled={isSaving}>
                <Save className="w-4 h-4 mr-2" />
                {isSaving ? 'A guardar...' : 'Guardar'}
              </Button>
            </>
          ) : (
            <>
              <Button 
                variant="outline" 
                onClick={onGenerateSuggestions}
                disabled={isGeneratingSuggestions}
                className="gap-2"
              >
                <Sparkles className="w-4 h-4" />
                {isGeneratingSuggestions ? 'A analisar...' : 'Sugestões IA'}
              </Button>
              
              <Button variant="default" onClick={onOpenTemplates} className="gap-2">
                <FileText className="w-4 h-4" />
                Templates
              </Button>
              
              <Button variant="outline" onClick={onStartEdit}>
                <Edit2 className="w-4 h-4 mr-2" />
                Editar
              </Button>
              
              <Button variant="outline" onClick={onCreateTask} className="gap-2">
                <Plus className="w-4 h-4" />
                Nova Tarefa
              </Button>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="icon">
                    <MoreHorizontal className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {entity.email && (
                    <>
                      <DropdownMenuItem onClick={handleCopyEmail}>
                        <Copy className="w-4 h-4 mr-2" />
                        Copiar Email
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <a href={`mailto:${entity.email}`}>
                          <ExternalLink className="w-4 h-4 mr-2" />
                          Enviar Email
                        </a>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                    </>
                  )}
                  <DropdownMenuItem 
                    className="text-destructive focus:text-destructive"
                    onClick={() => setDeleteDialogOpen(true)}
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Eliminar {entityLabels[entityType]}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          )}
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar {entityLabels[entityType]}?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem a certeza que deseja eliminar "{entity.name}"? Esta ação não pode ser revertida.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => {
                onDelete();
                setDeleteDialogOpen(false);
              }} 
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
