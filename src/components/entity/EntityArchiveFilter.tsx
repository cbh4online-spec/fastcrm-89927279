import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export type EntityArchiveState = "active" | "archived" | "all";

interface EntityArchiveFilterProps {
  value: EntityArchiveState;
  onChange: (value: EntityArchiveState) => void;
  className?: string;
}

/** Seletor de estado de arquivo partilhado pelas listagens de contactos, empresas e leads. */
export function EntityArchiveFilter({ value, onChange, className }: EntityArchiveFilterProps) {
  return (
    <Select value={value} onValueChange={(v) => onChange(v as EntityArchiveState)}>
      <SelectTrigger className={className ?? "h-9 w-[150px]"} aria-label="Estado de arquivo">
        <SelectValue placeholder="Estado" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="active">Ativos</SelectItem>
        <SelectItem value="archived">Arquivados</SelectItem>
        <SelectItem value="all">Todos</SelectItem>
      </SelectContent>
    </Select>
  );
}
