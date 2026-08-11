import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { IXCard } from "@/components/entity/ix/IXCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Info, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { toSlug } from "@/utils/slug";

const sb = supabase as any;

interface Props {
  productId: string;
  productName: string;
  storeSlug: string | null;
  currentSlug: string | null;
}

/** Edição do endereço público (slug) do produto na loja online. */
export function ProductStoreSlugCard({ productId, productName, storeSlug, currentSlug }: Props) {
  const qc = useQueryClient();
  const [value, setValue] = useState(currentSlug || toSlug(productName || ""));

  const save = useMutation({
    mutationFn: async (slug: string) => {
      const clean = toSlug(slug);
      if (!clean) throw new Error("Indique um endereço válido");
      const { data, error } = await sb
        .from("products")
        .update({ store_slug: clean })
        .eq("id", productId)
        .select("store_slug")
        .maybeSingle();
      if (error) {
        if (error.code === "23505") throw new Error("Já existe um produto com este endereço nesta loja");
        throw error;
      }
      return data?.store_slug as string;
    },
    onSuccess: (slug) => {
      setValue(slug);
      qc.invalidateQueries({ queryKey: ["products"] });
      toast.success("Endereço público atualizado");
    },
    onError: (e: any) => toast.error(e?.message || "Não foi possível guardar"),
  });

  const preview = `/store/${storeSlug || "a-sua-loja"}/product/${toSlug(value) || "…"}`;

  return (
    <IXCard
      title="Endereço público (SEO)"
      description="O endereço legível deste produto na loja online."
    >
      <div className="space-y-3">
        <div className="space-y-1.5">
          <Label htmlFor="store-slug">Slug</Label>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input
              id="store-slug"
              value={value}
              maxLength={120}
              onChange={(e) => setValue(e.target.value)}
              placeholder="nome-do-produto"
              className="min-w-0"
            />
            <Button
              onClick={() => save.mutate(value)}
              disabled={save.isPending || !toSlug(value) || toSlug(value) === currentSlug}
            >
              {save.isPending && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" aria-hidden="true" />}
              Guardar
            </Button>
          </div>
          <p className="text-xs text-muted-foreground break-all">{preview}</p>
        </div>

        <Alert>
          <Info className="h-4 w-4" aria-hidden="true" />
          <AlertDescription className="text-xs">
            Alterar o endereço muda o URL público. Os endereços antigos com o identificador técnico continuam a
            funcionar e reencaminham automaticamente, mas ligações partilhadas com o slug anterior deixam de abrir.
          </AlertDescription>
        </Alert>
      </div>
    </IXCard>
  );
}
