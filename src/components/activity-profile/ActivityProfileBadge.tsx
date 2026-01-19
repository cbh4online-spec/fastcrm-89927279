import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Check, ChevronDown, Briefcase } from 'lucide-react';
import { useActivityProfiles, useSetEntityActivityProfile } from '@/hooks/useActivityProfiles';
import { ActivityProfile, PROFILE_TYPE_LABELS, PROFILE_TYPE_ICONS } from '@/types/activityProfile';
import { cn } from '@/lib/utils';

interface ActivityProfileBadgeProps {
  entityType: 'contact' | 'company';
  entityId: string;
  currentProfileId?: string | null;
  currentProfile?: ActivityProfile | null;
  onProfileChange?: (profileId: string | null) => void;
  readOnly?: boolean;
  className?: string;
}

const iconMap: Record<string, React.ReactNode> = {
  '🎓': <span className="text-sm">🎓</span>,
  '📦': <span className="text-sm">📦</span>,
  '💰': <span className="text-sm">💰</span>,
  '📱': <span className="text-sm">📱</span>,
  '📋': <span className="text-sm">📋</span>,
  '⚖️': <span className="text-sm">⚖️</span>,
  '🔧': <span className="text-sm">🔧</span>,
};

export function ActivityProfileBadge({
  entityType,
  entityId,
  currentProfileId,
  currentProfile,
  onProfileChange,
  readOnly = false,
  className,
}: ActivityProfileBadgeProps) {
  const { data: profiles = [] } = useActivityProfiles();
  const setProfile = useSetEntityActivityProfile();
  const [open, setOpen] = useState(false);

  const selectedProfile = currentProfile || profiles.find(p => p.id === currentProfileId);
  
  const handleSelectProfile = async (profileId: string | null) => {
    try {
      await setProfile.mutateAsync({
        entityType,
        entityId,
        profileId,
      });
      onProfileChange?.(profileId);
      setOpen(false);
    } catch (error) {
      console.error('Error setting profile:', error);
    }
  };

  if (readOnly) {
    if (!selectedProfile) return null;
    
    return (
      <Badge
        variant="outline"
        className={cn(
          'gap-1 text-xs font-medium',
          className
        )}
        style={{
          backgroundColor: selectedProfile.color ? `${selectedProfile.color}15` : undefined,
          borderColor: selectedProfile.color ? `${selectedProfile.color}40` : undefined,
          color: selectedProfile.color || undefined,
        }}
      >
        {selectedProfile.icon && iconMap[selectedProfile.icon]}
        {selectedProfile.name}
      </Badge>
    );
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn(
            'h-7 gap-1.5 text-xs font-medium',
            className
          )}
          style={selectedProfile ? {
            backgroundColor: `${selectedProfile.color}15`,
            borderColor: `${selectedProfile.color}40`,
            color: selectedProfile.color || undefined,
          } : undefined}
        >
          {selectedProfile ? (
            <>
              {selectedProfile.icon && iconMap[selectedProfile.icon]}
              {selectedProfile.name}
            </>
          ) : (
            <>
              <Briefcase className="h-3 w-3" />
              Perfil de Atividade
            </>
          )}
          <ChevronDown className="h-3 w-3 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        {selectedProfile && (
          <>
            <DropdownMenuItem onClick={() => handleSelectProfile(null)}>
              <span className="text-muted-foreground">Remover perfil</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
          </>
        )}
        {profiles.map((profile) => (
          <DropdownMenuItem
            key={profile.id}
            onClick={() => handleSelectProfile(profile.id)}
            className="gap-2"
          >
            <div
              className="w-3 h-3 rounded-full flex-shrink-0"
              style={{ backgroundColor: profile.color || '#6b7280' }}
            />
            <span className="flex-1">{profile.name}</span>
            {profile.id === currentProfileId && (
              <Check className="h-4 w-4 text-primary" />
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
