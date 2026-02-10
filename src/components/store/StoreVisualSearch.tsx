import { useState, useRef } from "react";
import { Camera, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface StoreVisualSearchProps {
  onSearchTerms: (terms: string) => void;
}

export function StoreVisualSearch({ onSearchTerms }: StoreVisualSearchProps) {
  const [isLoading, setIsLoading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Por favor selecione uma imagem");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Imagem demasiado grande (máx. 5MB)");
      return;
    }

    setIsLoading(true);
    try {
      const reader = new FileReader();
      const base64 = await new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const { data, error } = await supabase.functions.invoke("store-visual-search", {
        body: { image: base64 },
      });

      if (error) throw error;
      if (data?.searchTerms) {
        onSearchTerms(data.searchTerms);
        toast.success("Pesquisa visual concluída!");
      } else {
        toast.error("Não foi possível analisar a imagem");
      }
    } catch (err) {
      console.error("Visual search error:", err);
      toast.error("Erro na pesquisa visual");
    } finally {
      setIsLoading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  return (
    <>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
        }}
      />
      <Button
        variant="ghost"
        size="icon"
        type="button"
        className="h-9 w-9"
        disabled={isLoading}
        onClick={() => fileRef.current?.click()}
        title="Pesquisa visual por imagem"
      >
        {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
      </Button>
    </>
  );
}
