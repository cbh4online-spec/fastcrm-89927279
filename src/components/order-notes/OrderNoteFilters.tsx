import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, X } from "lucide-react";
import type { OrderNoteStatus } from "@/types/order-note";

interface OrderNoteFiltersProps {
  onFiltersChange: (filters: {
    status?: OrderNoteStatus | "all";
    search?: string;
  }) => void;
}

export function OrderNoteFilters({ onFiltersChange }: OrderNoteFiltersProps) {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<OrderNoteStatus | "all">("all");

  const handleSearchChange = (value: string) => {
    setSearch(value);
    onFiltersChange({ status, search: value });
  };

  const handleStatusChange = (value: OrderNoteStatus | "all") => {
    setStatus(value);
    onFiltersChange({ status: value, search });
  };

  const clearFilters = () => {
    setSearch("");
    setStatus("all");
    onFiltersChange({ status: "all", search: "" });
  };

  const hasActiveFilters = search || status !== "all";

  return (
    <div className="flex flex-col sm:flex-row gap-3">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Pesquisar por número de encomenda..."
          value={search}
          onChange={(e) => handleSearchChange(e.target.value)}
          className="pl-9"
        />
      </div>

      <Select value={status} onValueChange={handleStatusChange}>
        <SelectTrigger className="w-full sm:w-[200px]">
          <SelectValue placeholder="Estado" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos os estados</SelectItem>
          <SelectItem value="draft">Rascunho</SelectItem>
          <SelectItem value="submitted">Enviado</SelectItem>
          <SelectItem value="awaiting_approval">Aguardando Aprovação</SelectItem>
          <SelectItem value="approved">Aprovado</SelectItem>
          <SelectItem value="rejected">Rejeitado</SelectItem>
          <SelectItem value="in_preparation">Em Preparação</SelectItem>
          <SelectItem value="invoiced">Faturado</SelectItem>
          <SelectItem value="cancelled">Cancelado</SelectItem>
        </SelectContent>
      </Select>

      {hasActiveFilters && (
        <Button variant="ghost" size="icon" onClick={clearFilters}>
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}
