import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { StickyNote } from "lucide-react";
import { ENIContact } from "../ENIContactTypes";

interface NotesSectionProps {
  contact: ENIContact;
  isEditing: boolean;
  editedData: Partial<ENIContact>;
  onFieldChange: (field: keyof ENIContact, value: unknown) => void;
}

export function NotesSection({ 
  contact, 
  isEditing, 
  editedData, 
  onFieldChange 
}: NotesSectionProps) {
  const getValue = <K extends keyof ENIContact>(field: K): ENIContact[K] => {
    return isEditing && field in editedData ? editedData[field] as ENIContact[K] : contact[field];
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <StickyNote className="h-4 w-4 text-primary" />
          Notas & Observações
        </CardTitle>
        <CardDescription>
          Campo livre para informação não estruturada e contexto humano.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isEditing ? (
          <div className="space-y-2">
            <Label htmlFor="notes" className="sr-only">Notas</Label>
            <Textarea
              id="notes"
              value={getValue('notes') || ''}
              onChange={(e) => onFieldChange('notes', e.target.value)}
              placeholder="Adicione notas internas sobre este contacto..."
              className="min-h-[120px] resize-y"
            />
          </div>
        ) : (
          <div className="min-h-[60px]">
            {getValue('notes') ? (
              <p className="text-sm whitespace-pre-wrap">{getValue('notes')}</p>
            ) : (
              <p className="text-sm text-muted-foreground italic">
                Sem notas. Clique em Editar para adicionar observações.
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
