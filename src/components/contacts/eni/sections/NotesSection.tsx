import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText } from "lucide-react";
import { ENIContact } from "../ENIContactTypes";
import { InlineEditableField } from "@/components/custom-fields/InlineEditableField";
import { useTranslation } from "react-i18next";

interface NotesSectionProps {
  contact: ENIContact;
  onFieldChange: (field: keyof ENIContact, value: unknown) => Promise<void>;
}

export function NotesSection({ 
  contact, 
  onFieldChange,
}: NotesSectionProps) {
  const { t } = useTranslation('crm');

  return (
    <Card className="border-border/50 bg-gradient-to-br from-card to-card/80 shadow-sm hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <div className="p-1.5 rounded-md bg-slate-500/10">
            <FileText className="h-4 w-4 text-slate-500" />
          </div>
          {t('notesObservations')}
        </CardTitle>
        <CardDescription>{t('notesDesc')}</CardDescription>
      </CardHeader>
      <CardContent>
        <InlineEditableField
          label=""
          fieldId="notes"
          fieldType="textarea"
          value={contact.notes || ''}
          onChange={(value) => onFieldChange('notes', value)}
          placeholder={t('notesPlaceholder')}
        />
      </CardContent>
    </Card>
  );
}
