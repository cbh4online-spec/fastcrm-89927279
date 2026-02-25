import { CoreObjectField } from "@/hooks/useCoreObjectFields";
import { ObjectRecord } from "@/hooks/useCustomObjects";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Trash2, Check, X, Inbox } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  fields: CoreObjectField[];
  records: ObjectRecord[];
  visibleFields?: string[] | null;
  onDeleteRecord: (id: string) => void;
  onRecordClick?: (record: ObjectRecord) => void;
  selectedIds?: Set<string>;
  onSelectionChange?: (ids: Set<string>) => void;
}

export function DynamicRecordTable({ fields, records, visibleFields, onDeleteRecord, onRecordClick, selectedIds, onSelectionChange }: Props) {
  const displayFields = visibleFields
    ? fields.filter((f) => visibleFields.includes(f.slug))
    : fields;

  const selectable = !!onSelectionChange && !!selectedIds;

  const allSelected = selectable && records.length > 0 && records.every(r => selectedIds!.has(r.id));
  const someSelected = selectable && selectedIds!.size > 0 && !allSelected;

  const toggleSelectAll = () => {
    if (!onSelectionChange || !selectedIds) return;
    if (allSelected) {
      const n = new Set(selectedIds);
      records.forEach(r => n.delete(r.id));
      onSelectionChange(n);
    } else {
      const n = new Set(selectedIds);
      records.forEach(r => n.add(r.id));
      onSelectionChange(n);
    }
  };

  const toggleSelect = (id: string) => {
    if (!onSelectionChange || !selectedIds) return;
    const n = new Set(selectedIds);
    n.has(id) ? n.delete(id) : n.add(id);
    onSelectionChange(n);
  };

  // Empty state
  if (records.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-12 h-12 rounded-xl bg-muted/60 flex items-center justify-center mb-3">
          <Inbox className="h-6 w-6 text-muted-foreground/60" />
        </div>
        <p className="text-sm font-medium text-muted-foreground">Nenhum registo encontrado</p>
        <p className="text-xs text-muted-foreground/60 mt-1">Adicione o primeiro registo para começar</p>
      </div>
    );
  }

  // Fallback columns when no fields defined
  if (displayFields.length === 0) {
    return (
      <div className="rounded-lg border border-border/40 bg-card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="sticky top-0 z-10">
            <tr className="border-b border-border/40 bg-muted/30">
              {selectable && (
                <th className="w-10 px-3 py-2.5 text-left">
                  <Checkbox checked={allSelected} onCheckedChange={toggleSelectAll} />
                </th>
              )}
              <th className="px-3 py-2.5 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Nome</th>
              <th className="px-3 py-2.5 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Notas</th>
              <th className="w-12 px-3 py-2.5" />
            </tr>
          </thead>
          <tbody>
            {records.map((record) => (
              <tr
                key={record.id}
                className={cn(
                  "border-b border-border/20 last:border-0 hover:bg-muted/30 transition-colors",
                  onRecordClick && "cursor-pointer"
                )}
                onClick={() => onRecordClick?.(record)}
              >
                {selectable && (
                  <td className="px-3 py-2.5" onClick={(e) => e.stopPropagation()}>
                    <Checkbox checked={selectedIds!.has(record.id)} onCheckedChange={() => toggleSelect(record.id)} />
                  </td>
                )}
                <td className="px-3 py-2.5">
                  <span className="text-sm font-medium">{(record.data as any)?.name || "Sem título"}</span>
                </td>
                <td className="px-3 py-2.5">
                  <span className="text-xs text-muted-foreground truncate max-w-[300px] block">
                    {(record.data as any)?.notes || "—"}
                  </span>
                </td>
                <td className="px-3 py-2.5" onClick={(e) => e.stopPropagation()}>
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

  const renderCell = (field: CoreObjectField, value: unknown) => {
    if (value === null || value === undefined) return <span className="text-muted-foreground/50">—</span>;

    switch (field.field_type) {
      case "boolean":
        return value ? <Check className="h-4 w-4 text-green-600" /> : <X className="h-4 w-4 text-muted-foreground/40" />;
      case "select":
        return <Badge variant="secondary" className="text-[10px] font-medium">{String(value)}</Badge>;
      case "url":
        return <a href={String(value)} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline text-xs truncate max-w-[200px] block">{String(value)}</a>;
      case "email":
        return <a href={`mailto:${value}`} className="text-primary hover:underline text-xs">{String(value)}</a>;
      case "number":
        return <span className="text-sm tabular-nums">{Number(value).toLocaleString("pt-BR")}</span>;
      case "date":
        return <span className="text-sm text-muted-foreground">{new Date(String(value)).toLocaleDateString("pt-BR")}</span>;
      default:
        return <span className="text-sm truncate max-w-[200px] block">{String(value)}</span>;
    }
  };

  return (
    <div className="rounded-lg border border-border/40 bg-card overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="sticky top-0 z-10">
          <tr className="border-b border-border/40 bg-muted/30">
            {selectable && (
              <th className="w-10 px-3 py-2.5 text-left">
                <Checkbox
                  checked={allSelected}
                  ref={(el) => { if (el) (el as any).indeterminate = someSelected; }}
                  onCheckedChange={toggleSelectAll}
                />
              </th>
            )}
            {displayFields.map((f) => (
              <th key={f.id} className="px-3 py-2.5 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider whitespace-nowrap">
                {f.name}
              </th>
            ))}
            <th className="w-12 px-3 py-2.5" />
          </tr>
        </thead>
        <tbody>
          {records.map((record) => (
            <tr
              key={record.id}
              className={cn(
                "border-b border-border/20 last:border-0 hover:bg-muted/30 transition-colors",
                onRecordClick && "cursor-pointer",
                selectable && selectedIds!.has(record.id) && "bg-primary/5"
              )}
              onClick={() => onRecordClick?.(record)}
            >
              {selectable && (
                <td className="px-3 py-2.5" onClick={(e) => e.stopPropagation()}>
                  <Checkbox checked={selectedIds!.has(record.id)} onCheckedChange={() => toggleSelect(record.id)} />
                </td>
              )}
              {displayFields.map((f) => (
                <td key={f.id} className="px-3 py-2.5">
                  {renderCell(f, (record.data as Record<string, unknown>)[f.slug])}
                </td>
              ))}
              <td className="px-3 py-2.5" onClick={(e) => e.stopPropagation()}>
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
