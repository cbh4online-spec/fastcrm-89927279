import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { InlineEditableField } from "@/components/custom-fields/InlineEditableField";
import { Lead } from "@/hooks/useLeads";
import { Tag } from "lucide-react";

interface TagsSectionProps {
  lead: Lead;
  onFieldChange: (field: keyof Lead, value: unknown) => Promise<void>;
}

export function TagsSection({ lead, onFieldChange }: TagsSectionProps) {
  return (
    <Card className="overflow-hidden border-0 shadow-lg bg-gradient-to-br from-card to-card/95">
      <CardHeader className="pb-3 bg-gradient-to-r from-purple-500/10 via-transparent to-transparent">
        <CardTitle className="text-base font-semibold flex items-center gap-3">
          <div className="p-2 rounded-lg bg-purple-500/20 text-purple-600 dark:text-purple-400">
            <Tag className="w-4 h-4" />
          </div>
          Etiquetas
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="divide-y divide-border/50">
          <InlineEditableField
            label="Tags"
            fieldId="tags"
            fieldType="tags"
            value={lead.tags}
            onChange={(val) => onFieldChange("tags", val)}
            icon={<Tag className="w-4 h-4" />}
            placeholder="Adicionar etiquetas separadas por vírgula..."
          />
        </div>
      </CardContent>
    </Card>
  );
}
