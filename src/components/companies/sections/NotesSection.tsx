import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { InlineEditableField } from "@/components/custom-fields/InlineEditableField";
import { Company } from "@/hooks/useCompanies";
import { FileText, StickyNote } from "lucide-react";

interface NotesSectionProps {
  company: Company;
  onFieldChange: (field: keyof Company, value: unknown) => Promise<void>;
}

export function NotesSection({ company, onFieldChange }: NotesSectionProps) {
  return (
    <Card className="overflow-hidden border-0 shadow-lg bg-gradient-to-br from-card to-card/95">
      <CardHeader className="pb-3 bg-gradient-to-r from-amber-500/10 via-transparent to-transparent">
        <CardTitle className="text-base font-semibold flex items-center gap-3">
          <div className="p-2 rounded-lg bg-amber-500/20 text-amber-600 dark:text-amber-400">
            <StickyNote className="w-4 h-4" />
          </div>
          Notas
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="divide-y divide-border/50">
          <InlineEditableField
            label="Notas"
            fieldId="notes"
            fieldType="textarea"
            value={company.notes}
            onChange={(val) => onFieldChange("notes", val)}
            icon={<FileText className="w-4 h-4" />}
            placeholder="Adicionar observações sobre a empresa..."
          />
        </div>
      </CardContent>
    </Card>
  );
}
