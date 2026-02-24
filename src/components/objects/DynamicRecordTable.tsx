import { CoreObjectField } from "@/hooks/useCoreObjectFields";
import { ObjectRecord } from "@/hooks/useCustomObjects";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Trash2, Check, X } from "lucide-react";

interface Props {
  fields: CoreObjectField[];
  records: ObjectRecord[];
  visibleFields?: string[] | null;
  onDeleteRecord: (id: string) => void;
}

export function DynamicRecordTable({ fields, records, visibleFields, onDeleteRecord }: Props) {
  const displayFields = visibleFields
    ? fields.filter((f) => visibleFields.includes(f.slug))
    : fields;

  // Fallback columns when no fields defined
  if (displayFields.length === 0) {
    return (
      <div className="rounded-lg border bg-card">
        {records.map((record) => (
          <div key={record.id} className="flex items-center justify-between px-4 py-3 border-b last:border-0 hover:bg-muted/50">
            <div>
              <p className="text-sm font-medium">{(record.data as any)?.name || "Sem título"}</p>
              {(record.data as any)?.notes && (
                <p className="text-xs text-muted-foreground truncate max-w-[300px]">{(record.data as any).notes}</p>
              )}
            </div>
            <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => onDeleteRecord(record.id)}>
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        ))}
      </div>
    );
  }

  const renderCell = (field: CoreObjectField, value: unknown) => {
    if (value === null || value === undefined) return <span className="text-muted-foreground">—</span>;

    switch (field.field_type) {
      case "boolean":
        return value ? <Check className="h-4 w-4 text-green-600" /> : <X className="h-4 w-4 text-muted-foreground" />;
      case "select":
        return <Badge variant="secondary" className="text-xs">{String(value)}</Badge>;
      case "url":
        return <a href={String(value)} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline text-xs truncate max-w-[200px] block">{String(value)}</a>;
      case "email":
        return <a href={`mailto:${value}`} className="text-primary hover:underline text-xs">{String(value)}</a>;
      default:
        return <span className="text-sm truncate max-w-[200px] block">{String(value)}</span>;
    }
  };

  return (
    <div className="rounded-lg border bg-card overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-muted/50">
            {displayFields.map((f) => (
              <th key={f.id} className="px-4 py-2 text-left font-medium text-muted-foreground">{f.name}</th>
            ))}
            <th className="px-4 py-2 w-10"></th>
          </tr>
        </thead>
        <tbody>
          {records.map((record) => (
            <tr key={record.id} className="border-b last:border-0 hover:bg-muted/30">
              {displayFields.map((f) => (
                <td key={f.id} className="px-4 py-2.5">
                  {renderCell(f, (record.data as Record<string, unknown>)[f.slug])}
                </td>
              ))}
              <td className="px-4 py-2.5">
                <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => onDeleteRecord(record.id)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
