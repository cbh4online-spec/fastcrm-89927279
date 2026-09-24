import { IXCard } from "@/components/entity/ix/IXCard";
import { InlineEditableField } from "@/components/custom-fields/InlineEditableField";
import { Lead } from "@/hooks/useLeads";
import { Tag } from "lucide-react";

interface TagsSectionProps {
  lead: Lead;
  onFieldChange: (field: keyof Lead, value: unknown) => Promise<void>;
}

export function TagsSection({ lead, onFieldChange }: TagsSectionProps) {
  return (
    <IXCard title="Etiquetas">
      <InlineEditableField
        label="Tags"
        fieldId="tags"
        fieldType="tags"
        value={lead.tags}
        onChange={(val) => onFieldChange("tags", val)}
        icon={<Tag className="w-4 h-4" />}
        placeholder="Adicionar etiquetas separadas por vírgula..."
      />
    </IXCard>
  );
}
