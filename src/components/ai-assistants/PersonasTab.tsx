/**
 * Personas Tab - Library of reusable AI personas
 */

import { useState } from "react";
import { useKnowledgeBase } from "@/hooks/useKnowledgeBase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Users, Edit, Trash2, Volume2 } from "lucide-react";
import { PERSONA_TYPES, TONE_OPTIONS } from "@/types/knowledge-base";

interface PersonasTabProps {
  searchValue: string;
}

export function PersonasTab({ searchValue }: PersonasTabProps) {
  const { personas, isLoading, createPersona, updatePersona, deletePersona } = useKnowledgeBase();
  
  const [showCreate, setShowCreate] = useState(false);
  const [editingPersona, setEditingPersona] = useState<typeof personas[0] | null>(null);
  const [deletingPersona, setDeletingPersona] = useState<typeof personas[0] | null>(null);

  // Form state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [personaType, setPersonaType] = useState("atendimento");
  const [tone, setTone] = useState("empático");

  // Filter
  const filteredPersonas = personas.filter(p =>
    p.name.toLowerCase().includes(searchValue.toLowerCase()) ||
    p.description?.toLowerCase().includes(searchValue.toLowerCase())
  );

  const resetForm = () => {
    setName("");
    setDescription("");
    setPersonaType("atendimento");
    setTone("empático");
  };

  const handleCreate = async () => {
    if (!name.trim()) return;
    const typeConfig = PERSONA_TYPES[personaType as keyof typeof PERSONA_TYPES];
    await createPersona({
      name,
      description,
      personaType: personaType as any,
      toneOfVoice: tone as any,
      systemPrompt: typeConfig?.defaultPrompt
    });
    setShowCreate(false);
    resetForm();
  };

  const handleEdit = (persona: typeof personas[0]) => {
    setEditingPersona(persona);
    setName(persona.name);
    setDescription(persona.description || "");
    setPersonaType(persona.personaType);
    setTone(persona.toneOfVoice);
  };

  const handleUpdate = async () => {
    if (!editingPersona || !name.trim()) return;
    await updatePersona(editingPersona.id, {
      name,
      description,
      personaType: personaType as any,
      toneOfVoice: tone as any
    });
    setEditingPersona(null);
    resetForm();
  };

  const handleDelete = async () => {
    if (!deletingPersona) return;
    await deletePersona(deletingPersona.id);
    setDeletingPersona(null);
  };

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map(i => (
          <Skeleton key={i} className="h-40" />
        ))}
      </div>
    );
  }

  const PersonaForm = ({ isEdit = false }: { isEdit?: boolean }) => (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Nome *</Label>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ex: Consultor Comercial"
        />
      </div>
      <div className="space-y-2">
        <Label>Descrição</Label>
        <Textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Descreva o papel desta persona..."
          rows={2}
        />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label>Tipo</Label>
          <Select value={personaType} onValueChange={setPersonaType}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(PERSONA_TYPES).map(([key, config]) => (
                <SelectItem key={key} value={key}>{config.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Tom de Voz</Label>
          <Select value={tone} onValueChange={setTone}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(TONE_OPTIONS).map(([key, label]) => (
                <SelectItem key={key} value={key}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="flex justify-end gap-3 pt-4">
        <Button variant="outline" onClick={() => {
          isEdit ? setEditingPersona(null) : setShowCreate(false);
          resetForm();
        }}>
          Cancelar
        </Button>
        <Button onClick={isEdit ? handleUpdate : handleCreate} disabled={!name.trim()}>
          {isEdit ? "Guardar" : "Criar"}
        </Button>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Create Button */}
      <div className="flex justify-end">
        <Button onClick={() => setShowCreate(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Nova Persona
        </Button>
      </div>

      {/* Empty State */}
      {personas.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <div className="h-16 w-16 rounded-full bg-purple-500/10 flex items-center justify-center mb-4">
              <Users className="h-8 w-8 text-purple-500" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Nenhuma persona criada</h3>
            <p className="text-sm text-muted-foreground mb-6 max-w-md">
              Personas definem a personalidade e tom de voz dos agentes IA.
            </p>
            <Button onClick={() => setShowCreate(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Criar Primeira Persona
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredPersonas.map(persona => {
            const typeConfig = PERSONA_TYPES[persona.personaType as keyof typeof PERSONA_TYPES];
            return (
              <Card key={persona.id} className="hover:border-primary/30 transition-colors">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                        <Users className="h-5 w-5 text-purple-500" />
                      </div>
                      <div>
                        <CardTitle className="text-base">{persona.name}</CardTitle>
                        <p className="text-xs text-muted-foreground">{typeConfig?.label}</p>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(persona)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => setDeletingPersona(persona)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {persona.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {persona.description}
                    </p>
                  )}
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="gap-1">
                      <Volume2 className="h-3 w-3" />
                      {persona.toneOfVoice}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova Persona</DialogTitle>
          </DialogHeader>
          <PersonaForm />
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editingPersona} onOpenChange={() => { setEditingPersona(null); resetForm(); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Persona</DialogTitle>
          </DialogHeader>
          <PersonaForm isEdit />
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deletingPersona} onOpenChange={() => setDeletingPersona(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar persona?</AlertDialogTitle>
            <AlertDialogDescription>
              A persona "{deletingPersona?.name}" será eliminada. Agentes que a usam perderão esta associação.
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
