/**
 * Vibe Profiles Tab - Manage design/style profiles for AI responses
 */

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Plus, 
  Palette, 
  Pencil, 
  Trash2, 
  Star,
  Check,
  Languages,
  MessageSquare,
  Sparkles
} from "lucide-react";
import { useVibeProfiles } from "@/hooks/useVibeProfiles";
import { VibeProfileForm } from "./VibeProfileForm";
import type { VibeProfile } from "@/types/conversational-engine";
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

export function VibeProfilesTab() {
  const { profiles, isLoading, createProfile, updateProfile, deleteProfile, setDefault } = useVibeProfiles();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingProfile, setEditingProfile] = useState<VibeProfile | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleSave = async (data: Partial<VibeProfile>) => {
    if (editingProfile) {
      await updateProfile({ id: editingProfile.id, ...data });
    } else {
      await createProfile(data as any);
    }
    setIsFormOpen(false);
    setEditingProfile(null);
  };

  const handleEdit = (profile: VibeProfile) => {
    setEditingProfile(profile);
    setIsFormOpen(true);
  };

  const handleDelete = async () => {
    if (deletingId) {
      await deleteProfile(deletingId);
      setDeletingId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-48" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Skeleton className="h-40" />
          <Skeleton className="h-40" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Perfis de Vibe</h3>
          <p className="text-sm text-muted-foreground">
            Define o tom, formalidade e estilo das respostas da IA
          </p>
        </div>
        <Button onClick={() => setIsFormOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Novo Perfil
        </Button>
      </div>

      {/* Empty State */}
      {profiles.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Palette className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
            <h3 className="font-semibold text-lg mb-2">Nenhum perfil de vibe</h3>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              Os perfis de vibe definem como a IA comunica: tom, formalidade, uso de emojis, 
              comprimento das respostas e muito mais.
            </p>
            <Button onClick={() => setIsFormOpen(true)} size="lg">
              <Sparkles className="h-4 w-4 mr-2" />
              Criar Primeiro Perfil
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {profiles.map((profile) => (
            <Card 
              key={profile.id} 
              className={profile.is_default ? "border-primary" : ""}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <Palette className="h-5 w-5 text-primary" />
                    <CardTitle className="text-base">{profile.name}</CardTitle>
                    {profile.is_default && (
                      <Badge variant="default" className="gap-1">
                        <Star className="h-3 w-3" />
                        Padrão
                      </Badge>
                    )}
                  </div>
                  <Badge variant={profile.is_active ? "default" : "secondary"}>
                    {profile.is_active ? "Ativo" : "Inativo"}
                  </Badge>
                </div>
                {profile.description && (
                  <CardDescription className="mt-1">
                    {profile.description}
                  </CardDescription>
                )}
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Key Settings */}
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="flex items-center gap-2">
                    <Languages className="h-4 w-4 text-muted-foreground" />
                    <span>{profile.language_code?.toUpperCase()}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MessageSquare className="h-4 w-4 text-muted-foreground" />
                    <span>{profile.formality}</span>
                  </div>
                </div>

                {/* Tags */}
                <div className="flex flex-wrap gap-1">
                  <Badge variant="outline" className="text-xs">
                    Tom: {profile.tone}
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    {profile.response_length}
                  </Badge>
                  {!profile.use_emojis && (
                    <Badge variant="outline" className="text-xs">
                      Sem emojis
                    </Badge>
                  )}
                  {profile.avoid_sales_language && (
                    <Badge variant="outline" className="text-xs">
                      Não comercial
                    </Badge>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 pt-2 border-t">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleEdit(profile)}
                  >
                    <Pencil className="h-4 w-4 mr-1" />
                    Editar
                  </Button>
                  {!profile.is_default && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setDefault(profile.id)}
                    >
                      <Star className="h-4 w-4 mr-1" />
                      Definir Padrão
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive ml-auto"
                    onClick={() => setDeletingId(profile.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Form Dialog */}
      <Dialog open={isFormOpen} onOpenChange={(open) => {
        setIsFormOpen(open);
        if (!open) setEditingProfile(null);
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingProfile ? "Editar Perfil de Vibe" : "Novo Perfil de Vibe"}
            </DialogTitle>
            <DialogDescription>
              Configure o estilo de comunicação da IA
            </DialogDescription>
          </DialogHeader>
          <VibeProfileForm
            profile={editingProfile}
            onSave={handleSave}
            onCancel={() => {
              setIsFormOpen(false);
              setEditingProfile(null);
            }}
          />
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deletingId} onOpenChange={() => setDeletingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar Perfil de Vibe?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O perfil será permanentemente eliminado.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
