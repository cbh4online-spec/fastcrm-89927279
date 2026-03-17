import { useState, useRef, useEffect, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DynamicTableCell } from "./DynamicTableCell";
import { cn } from "@/lib/utils";
import { Pencil } from "lucide-react";

// Columns that should NOT be editable (AI-generated, computed, or read-only)
const NON_EDITABLE_COLUMNS = new Set([
  "temperature", "score", "type", "next_action", "insight", "sla",
  "ai_analyzed_at", "ai_lead_type", "automation", "conversion_prob",
  "contacts_count", "opportunities_count", "social_presence",
  "icp_fit", "estimated_arr", "buying_signal", "growth_stage", "expansion_prob",
  "created_at", "updated_at", "lead_type", "google_rating",
  "icp_fit_score", "engagement_score", "pare_score",
  "priority_level", "company_status", "lead_status",
]);

// Columns that use a select dropdown instead of free text
const SELECT_COLUMNS: Record<string, string[]> = {
  status: ["new", "in_progress", "completed", "contacted", "qualified", "proposal", "lost"],
  source: [],  // free text — allow any value
  client_status: ["prospect", "lead", "active", "churned", "inactive"],
  abc_category: ["A", "B", "C"],
};

interface InlineEditableTableCellProps {
  columnId: string;
  entity: Record<string, any>;
  entityType: "contact" | "lead" | "company";
  onUpdate?: (entityId: string, field: string, value: unknown) => void;
}

export function InlineEditableTableCell({ columnId, entity, entityType, onUpdate }: InlineEditableTableCellProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const isEditable = !NON_EDITABLE_COLUMNS.has(columnId) && !!onUpdate;

  const getFieldKey = useCallback(() => {
    // Map display column IDs to actual DB field names
    switch (columnId) {
      case "temperature": return "ai_temperature";
      case "score": return entityType === "contact" ? "contact_score" : entityType === "lead" ? "lead_score" : "company_score";
      default: return columnId;
    }
  }, [columnId, entityType]);

  const getCurrentValue = useCallback(() => {
    const key = getFieldKey();
    return entity[key] ?? "";
  }, [entity, getFieldKey]);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  const startEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isEditable) return;
    setDraft(String(getCurrentValue()));
    setEditing(true);
  };

  const commit = () => {
    setEditing(false);
    const fieldKey = getFieldKey();
    const currentVal = String(getCurrentValue());
    if (draft !== currentVal) {
      onUpdate?.(entity.id, fieldKey, draft || null);
    }
  };

  const cancel = () => {
    setEditing(false);
    setDraft("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") { e.preventDefault(); commit(); }
    if (e.key === "Escape") { e.preventDefault(); cancel(); }
  };

  // Select-based columns
  if (editing && SELECT_COLUMNS[columnId] && SELECT_COLUMNS[columnId].length > 0) {
    return (
      <div onClick={(e) => e.stopPropagation()}>
        <Select
          value={draft}
          onValueChange={(v) => {
            setDraft(v);
            setEditing(false);
            const fieldKey = getFieldKey();
            onUpdate?.(entity.id, fieldKey, v || null);
          }}
          open={true}
          onOpenChange={(open) => { if (!open) cancel(); }}
        >
          <SelectTrigger className="h-7 text-xs border-primary/30 bg-background min-w-[100px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-popover z-50">
            {SELECT_COLUMNS[columnId].map(opt => (
              <SelectItem key={opt} value={opt}>{opt}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    );
  }

  // Text-based edit mode
  if (editing) {
    return (
      <div onClick={(e) => e.stopPropagation()}>
        <Input
          ref={inputRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={handleKeyDown}
          className="h-7 text-xs min-w-[120px] border-primary/30"
        />
      </div>
    );
  }

  // Display mode — wrap DynamicTableCell with edit affordance
  if (!isEditable) {
    return <DynamicTableCell columnId={columnId} entity={entity} entityType={entityType} />;
  }

  return (
    <div
      className="group/cell cursor-pointer inline-flex items-center gap-1 rounded px-1 -mx-1 hover:bg-muted/60 transition-colors min-h-[28px]"
      onClick={startEdit}
      title="Clique para editar"
    >
      <DynamicTableCell columnId={columnId} entity={entity} entityType={entityType} />
      <Pencil className="h-3 w-3 text-muted-foreground/30 opacity-0 group-hover/cell:opacity-100 transition-opacity shrink-0" />
    </div>
  );
}
