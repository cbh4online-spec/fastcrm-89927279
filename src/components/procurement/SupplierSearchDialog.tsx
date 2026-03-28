import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Search, Loader2, Plus, Globe, Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface SupplierSearchDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onImport: (supplier: any) => Promise<void>;
}

interface SearchResult {
  name: string;
  website: string;
  description: string;
  country: string;
  product_categories: string[];
  email: string;
  phone: string;
}

export function SupplierSearchDialog({ open, onOpenChange, onImport }: SupplierSearchDialogProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [importing, setImporting] = useState<string | null>(null);

  const handleSearch = async () => {
    if (!query.trim()) return;
    setSearching(true);
    setResults([]);
    try {
      const { data, error } = await supabase.functions.invoke("supplier-web-search", {
        body: { query: query.trim() },
      });
      if (error) throw error;
      if (data?.error) {
        toast.error(data.error);
      }
      setResults(data?.suppliers || []);
      if (!data?.error && !data?.suppliers?.length) {
        toast.info("Nenhum fornecedor encontrado. Tente termos diferentes.");
      }
    } catch (err: any) {
      console.error("Search error:", err);
      toast.error("Erro na pesquisa. Verifique a sua ligação e tente novamente.");
    } finally {
      setSearching(false);
    }
  };

  const handleImport = async (result: SearchResult) => {
    setImporting(result.name);
    try {
      await onImport({
        name: result.name,
        website: result.website,
        email: result.email || "",
        phone: result.phone || "",
        country: result.country || "",
        product_categories: result.product_categories || [],
        notes: result.description || "",
        status: "active",
        category: "general",
      });
      toast.success(`${result.name} importado com sucesso!`);
    } catch {
      toast.error("Erro ao importar fornecedor.");
    } finally {
      setImporting(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Pesquisar Fornecedores
          </DialogTitle>
        </DialogHeader>

        <div className="flex gap-2">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Ex: fornecedor de parafusos em Portugal"
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          />
          <Button onClick={handleSearch} disabled={searching || !query.trim()}>
            {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
          </Button>
        </div>

        {searching && (
          <div className="flex flex-col items-center py-8 text-muted-foreground">
            <Loader2 className="h-8 w-8 animate-spin mb-2" />
            <p className="text-sm">A pesquisar fornecedores na web...</p>
          </div>
        )}

        {results.length > 0 && (
          <div className="space-y-3 mt-2">
            <p className="text-sm text-muted-foreground">{results.length} resultado(s) encontrado(s)</p>
            {results.map((r, i) => (
              <Card key={i} className="p-4 space-y-2">
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-semibold">{r.name}</h4>
                    {r.website && (
                      <a href={r.website.startsWith("http") ? r.website : `https://${r.website}`} target="_blank" rel="noopener noreferrer" className="text-sm text-primary flex items-center gap-1">
                        <Globe className="h-3 w-3" />{r.website}
                      </a>
                    )}
                  </div>
                  <Button
                    size="sm"
                    onClick={() => handleImport(r)}
                    disabled={importing === r.name}
                  >
                    {importing === r.name ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4 mr-1" />}
                    Importar
                  </Button>
                </div>
                {r.description && <p className="text-sm text-muted-foreground">{r.description}</p>}
                <div className="flex flex-wrap gap-1">
                  {r.country && <Badge variant="outline">{r.country}</Badge>}
                  {r.product_categories?.map((c) => (
                    <Badge key={c} variant="secondary">{c}</Badge>
                  ))}
                </div>
              </Card>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
