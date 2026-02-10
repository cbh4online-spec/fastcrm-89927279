import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search } from "lucide-react";
import type { C2CCategory, C2CListingFilters } from "@/hooks/useC2CListings";

interface ListingFiltersProps {
  filters: C2CListingFilters;
  onFiltersChange: (filters: C2CListingFilters) => void;
  categories: C2CCategory[];
}

export function ListingFilters({ filters, onFiltersChange, categories }: ListingFiltersProps) {
  const update = (patch: Partial<C2CListingFilters>) =>
    onFiltersChange({ ...filters, ...patch });

  return (
    <div className="flex flex-wrap gap-3 items-center">
      <div className="relative flex-1 min-w-[200px]">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Pesquisar anúncios..."
          value={filters.search || ""}
          onChange={(e) => update({ search: e.target.value })}
          className="pl-10"
        />
      </div>

      <Select
        value={filters.category || "all"}
        onValueChange={(v) => update({ category: v === "all" ? undefined : v })}
      >
        <SelectTrigger className="w-[160px]">
          <SelectValue placeholder="Categoria" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todas</SelectItem>
          {categories.map((c) => (
            <SelectItem key={c.id} value={c.id}>
              {c.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={filters.condition || "all"}
        onValueChange={(v) => update({ condition: v === "all" ? undefined : v })}
      >
        <SelectTrigger className="w-[140px]">
          <SelectValue placeholder="Condição" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Qualquer</SelectItem>
          <SelectItem value="new">Novo</SelectItem>
          <SelectItem value="like_new">Como novo</SelectItem>
          <SelectItem value="used">Usado</SelectItem>
          <SelectItem value="for_parts">Para peças</SelectItem>
        </SelectContent>
      </Select>

      <Input
        type="number"
        placeholder="Min €"
        className="w-[100px]"
        value={filters.minPrice || ""}
        onChange={(e) => update({ minPrice: e.target.value ? Number(e.target.value) : undefined })}
      />
      <Input
        type="number"
        placeholder="Max €"
        className="w-[100px]"
        value={filters.maxPrice || ""}
        onChange={(e) => update({ maxPrice: e.target.value ? Number(e.target.value) : undefined })}
      />
    </div>
  );
}
