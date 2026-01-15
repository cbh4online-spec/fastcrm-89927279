import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { 
  MoreHorizontal, 
  Edit, 
  Trash2, 
  MessageSquare,
  ShieldCheck,
  ShieldAlert,
  BookOpen,
  LucideIcon
} from "lucide-react";
import { useState } from "react";
import type { AIProfile } from "@/types/ai-profiles";
import { PROFILE_TYPES, TONE_OPTIONS, DETAIL_LEVELS } from "@/types/ai-profiles";

interface AIProfileCardProps {
  profile: AIProfile;
  icon: LucideIcon;
  onEdit: (profile: AIProfile) => void;
  onDelete: (id: string) => void;
  onToggleActive: (id: string, isActive: boolean) => void;
}

export function AIProfileCard({ 
  profile, 
  icon: Icon,
  onEdit, 
  onDelete, 
  onToggleActive 
}: AIProfileCardProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const typeConfig = PROFILE_TYPES[profile.profileType];
  const toneConfig = TONE_OPTIONS[profile.toneOfVoice];
  const detailConfig = DETAIL_LEVELS[profile.detailLevel];

  return (
    <>
      <Card className={`relative overflow-hidden transition-all ${!profile.isActive ? 'opacity-60' : ''}`}>
        {/* Type indicator bar */}
        <div className={`absolute top-0 left-0 right-0 h-1 ${
          profile.profileType === 'vendas' ? 'bg-green-500' :
          profile.profileType === 'suporte' ? 'bg-blue-500' :
          profile.profileType === 'clinica' ? 'bg-pink-500' :
          'bg-purple-500'
        }`} />

        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${typeConfig?.color || 'bg-muted'}`}>
                <Icon className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-semibold">{profile.name}</h3>
                <Badge variant="outline" className="mt-1 text-xs">
                  {typeConfig?.label || profile.profileType}
                </Badge>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Switch
                checked={profile.isActive}
                onCheckedChange={(checked) => onToggleActive(profile.id, checked)}
              />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => onEdit(profile)}>
                    <Edit className="h-4 w-4 mr-2" />
                    Editar
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    onClick={() => setShowDeleteDialog(true)}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Eliminar
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {profile.description && (
            <p className="text-sm text-muted-foreground">{profile.description}</p>
          )}

          {/* Tone & Detail */}
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary" className="text-xs">
              <MessageSquare className="h-3 w-3 mr-1" />
              {toneConfig?.label || profile.toneOfVoice}
            </Badge>
            <Badge variant="secondary" className="text-xs">
              Detalhe: {detailConfig?.label || profile.detailLevel}
            </Badge>
          </div>

          {/* Limits */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs">
              {profile.limits.canRespondAutomatically ? (
                <>
                  <ShieldCheck className="h-3.5 w-3.5 text-green-500" />
                  <span className="text-muted-foreground">Responde automaticamente</span>
                </>
              ) : (
                <>
                  <ShieldAlert className="h-3.5 w-3.5 text-amber-500" />
                  <span className="text-muted-foreground">Requer confirmação humana</span>
                </>
              )}
            </div>
            {profile.limits.refuseOutsideKnowledge && (
              <div className="flex items-center gap-2 text-xs">
                <BookOpen className="h-3.5 w-3.5 text-blue-500" />
                <span className="text-muted-foreground">Só responde com base no conhecimento</span>
              </div>
            )}
          </div>

          {/* Knowledge bases */}
          {profile.allowedKnowledgeBases.length > 0 && (
            <div className="pt-2 border-t">
              <p className="text-xs text-muted-foreground">
                {profile.allowedKnowledgeBases.length} base(s) de conhecimento associada(s)
              </p>
            </div>
          )}

          {/* Fallback message preview */}
          {profile.fallbackMessage && (
            <div className="pt-2 border-t">
              <p className="text-xs text-muted-foreground mb-1">Mensagem de fallback:</p>
              <p className="text-xs italic bg-muted/50 rounded p-2">
                "{profile.fallbackMessage.slice(0, 80)}..."
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar perfil?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser revertida. O perfil "{profile.name}" será eliminado permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => onDelete(profile.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
