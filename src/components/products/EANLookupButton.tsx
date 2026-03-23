import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface EANLookupButtonProps {
  barcode: string;
  onResult: (data: {
    name?: string;
    brand?: string;
    imageUrl?: string;
    category?: string;
  }) => void;
}

export function EANLookupButton({ barcode, onResult }: EANLookupButtonProps) {
  const [loading, setLoading] = useState(false);

  const handleLookup = async () => {
    if (!barcode?.trim()) {
      toast.error("Sem código de barras para pesquisar");
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke(
        "barcode-external-lookup",
        { body: { barcode: barcode.trim() } }
      );

      if (error) throw error;

      if (data?.found) {
        onResult({
          name: data.name || undefined,
          brand: data.brand || undefined,
          imageUrl: data.image_url || undefined,
          category: data.category || undefined,
        });
        toast.success("Produto encontrado via EAN!");
      } else {
        toast.info("Produto não encontrado nas bases externas");
      }
    } catch (err) {
      console.error("EAN lookup error:", err);
      toast.error("Erro na pesquisa EAN");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      variant="outline"
      size="sm"
      className="h-7 text-xs gap-1"
      onClick={handleLookup}
      disabled={loading || !barcode?.trim()}
    >
      {loading ? (
        <Loader2 className="h-3 w-3 animate-spin" />
      ) : (
        <Search className="h-3 w-3" />
      )}
      Pesquisar EAN
    </Button>
  );
}
