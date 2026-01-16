import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText } from "lucide-react";
import { ENIContact } from "../ENIContactTypes";
import { InlineEditableField } from "@/components/custom-fields/InlineEditableField";

interface NotesSectionProps {
  contact: ENIContact;
  onFieldChange: (field: keyof ENIContact, value: unknown) => Promise<void>;
}

export function NotesSection({ 
  contact, 
  onFieldChange,
}: NotesSectionProps) {
  return (
    <Card className="border-border/50 bg-gradient-to-br from-card to-card/80 shadow-sm hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <div className="p-1.5 rounded-md bg-slate-500/10">
            <FileText className="h-4 w-4 text-slate-500" />
          </div>
          Notas & Observações
        </CardTitle>
        <CardDescription>Notas internas e contexto do cliente.</CardDescription>
      </CardHeader>
      <CardContent>
        <InlineEditableField
          label=""
          fieldId="notes"
          fieldType="textarea"
          value={contact.notes || ''}
          onChange={(value) => onFieldChange('notes', value)}
          placeholder="Adicione notas, contexto ou observações importantes sobre este cliente..."
        />
      </CardContent>
    </Card>
  );
}
