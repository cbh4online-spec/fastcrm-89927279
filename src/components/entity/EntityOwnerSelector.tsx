import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Check, ChevronsUpDown, UserX, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useWorkspaceMembers, WorkspaceMember } from '@/hooks/useWorkspaceMembers';
import { useWorkspaceInstance } from '@/contexts/WorkspaceInstanceContext';
import { EntityType } from '@/types/entity';
import { toast } from 'sonner';

interface EntityOwnerSelectorProps {
  entityType: EntityType;
  entityId: string;
  currentAssignedTo: string | null | undefined;
  currentAssignedProfile?: {
    full_name: string | null;
    email: string | null;
    avatar_url: string | null;
  } | null;
  compact?: boolean;
}

function getInitials(name: string | null | undefined): string {
  if (!name) return '?';
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

export function EntityOwnerSelector({
  entityType,
  entityId,
  currentAssignedTo,
  currentAssignedProfile,
  compact = false,
}: EntityOwnerSelectorProps) {
  const [open, setOpen] = useState(false);
  const { data: members, isLoading } = useWorkspaceMembers();
  const { workspaceClient } = useWorkspaceInstance();
  const queryClient = useQueryClient();

  const handleSelect = async (userId: string | null) => {
    setOpen(false);

    let error: any = null;
    if (entityType === 'lead') {
      ({ error } = await workspaceClient.from('leads').update({ assigned_to: userId }).eq('id', entityId));
    } else if (entityType === 'contact') {
      ({ error } = await workspaceClient.from('contacts').update({ assigned_to: userId }).eq('id', entityId));
    } else {
      ({ error } = await workspaceClient.from('companies').update({ assigned_to: userId }).eq('id', entityId));
    }

    if (error) {
      toast.error('Erro ao atribuir gestor');
      console.error('Error updating assigned_to:', error);
      return;
    }

    toast.success(userId ? 'Gestor atribuído' : 'Gestor removido');
    queryClient.invalidateQueries({ queryKey: [entityType] });
    queryClient.invalidateQueries({ queryKey: [`${entityType}s`] });
    queryClient.invalidateQueries({ queryKey: ['entity-for-insights'] });
  };

  const assignedName = currentAssignedProfile?.full_name;
  const assignedEmail = currentAssignedProfile?.email;

  if (compact) {
    return (
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button className="flex items-center gap-1.5 text-sm hover:opacity-80 transition-opacity">
            {currentAssignedTo && assignedName ? (
              <>
                <Avatar className="h-5 w-5">
                  <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                    {getInitials(assignedName)}
                  </AvatarFallback>
                </Avatar>
                <span className="font-medium truncate max-w-[100px]">{assignedName}</span>
              </>
            ) : (
              <span className="text-muted-foreground">Sem gestor</span>
            )}
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-56 p-1" align="start">
          <MemberList
            members={members}
            isLoading={isLoading}
            currentAssignedTo={currentAssignedTo}
            onSelect={handleSelect}
          />
        </PopoverContent>
      </Popover>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" className="w-full justify-between h-auto py-2">
          {currentAssignedTo && assignedName ? (
            <div className="flex items-center gap-2">
              <Avatar className="h-6 w-6">
                <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                  {getInitials(assignedName)}
                </AvatarFallback>
              </Avatar>
              <div className="text-left">
                <p className="text-sm font-medium">{assignedName}</p>
                {assignedEmail && <p className="text-xs text-muted-foreground">{assignedEmail}</p>}
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-muted-foreground">
              <User className="h-4 w-4" />
              <span className="text-sm">Atribuir gestor...</span>
            </div>
          )}
          <ChevronsUpDown className="h-4 w-4 opacity-50 shrink-0" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-1" align="start">
        <MemberList
          members={members}
          isLoading={isLoading}
          currentAssignedTo={currentAssignedTo}
          onSelect={handleSelect}
        />
      </PopoverContent>
    </Popover>
  );
}

function MemberList({
  members,
  isLoading,
  currentAssignedTo,
  onSelect,
}: {
  members: WorkspaceMember[] | undefined;
  isLoading: boolean;
  currentAssignedTo: string | null | undefined;
  onSelect: (userId: string | null) => void;
}) {
  if (isLoading) {
    return <p className="text-sm text-muted-foreground p-2">A carregar...</p>;
  }

  return (
    <div className="max-h-60 overflow-auto">
      {/* Remove option */}
      <button
        onClick={() => onSelect(null)}
        className={cn(
          'flex items-center gap-2 w-full px-2 py-1.5 text-sm rounded-sm hover:bg-accent transition-colors',
          !currentAssignedTo && 'bg-accent'
        )}
      >
        <UserX className="h-4 w-4 text-muted-foreground" />
        <span>Sem gestor</span>
        {!currentAssignedTo && <Check className="h-3 w-3 ml-auto" />}
      </button>

      {members?.map((member) => {
        const isSelected = member.user_id === currentAssignedTo;
        const name = member.profile?.full_name || member.profile?.email || 'Utilizador';
        return (
          <button
            key={member.id}
            onClick={() => onSelect(member.user_id)}
            className={cn(
              'flex items-center gap-2 w-full px-2 py-1.5 text-sm rounded-sm hover:bg-accent transition-colors',
              isSelected && 'bg-accent'
            )}
          >
            <Avatar className="h-5 w-5">
              <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                {getInitials(name)}
              </AvatarFallback>
            </Avatar>
            <span className="truncate">{name}</span>
            {isSelected && <Check className="h-3 w-3 ml-auto shrink-0" />}
          </button>
        );
      })}
    </div>
  );
}
