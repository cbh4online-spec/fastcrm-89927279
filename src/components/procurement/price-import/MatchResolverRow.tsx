import React, { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Search } from "lucide-react";

interface MatchResolverRowProps {
  rowId: string;
  productName: string;
  workspaceId: string;
  onMatch: (rowId: string, productId: string) => void;
}

export function MatchResolverRow({ rowId, productName, workspaceId, onMatch }: MatchResolverRowProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState(productName);
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const doSearch = async (q: string) => {
    if (q.length < 2) { setResults([]); return; }
    setLoading(true);
    const { data } = await supabase
      .from("products")
      .select("id, name, sku, barcode")
      .eq("workspace_id", workspaceId)
      .ilike("name", `%${q}%`)
      .limit(10);
    setResults(data || []);
    setLoading(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="h-7 text-xs gap-1">
          <Search className="h-3 w-3" /> Associar
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-3" align="end">
        <Input
          placeholder="Pesquisar produto..."
          value={search}
          onChange={e => { setSearch(e.target.value); doSearch(e.target.value); }}
          className="mb-2"
          autoFocus
        />
        {loading && <p className="text-xs text-muted-foreground">A pesquisar...</p>}
        <div className="max-h-48 overflow-auto space-y-1">
          {results.map(p => (
            <button
              key={p.id}
              onClick={() => { onMatch(rowId, p.id); setOpen(false); }}
              className="w-full text-left p-2 rounded hover:bg-accent text-sm"
            >
              <span className="font-medium">{p.name}</span>
              {p.sku && <span className="text-xs text-muted-foreground ml-2">SKU: {p.sku}</span>}
            </button>
          ))}
          {!loading && results.length === 0 && search.length >= 2 && (
            <p className="text-xs text-muted-foreground py-2">Nenhum produto encontrado</p>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
