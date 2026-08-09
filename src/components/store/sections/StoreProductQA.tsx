import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { MessageCircleQuestion } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

const askSchema = z.object({
  question: z.string().trim().min(5, "A pergunta é demasiado curta").max(500, "Máximo de 500 caracteres"),
  asker_name: z.string().trim().max(60, "Máximo de 60 caracteres").optional().or(z.literal("")),
});

interface StoreProductQAProps {
  productId: string;
  workspaceId: string;
}

/** Perguntas e respostas públicas do produto. Novas perguntas ficam por moderar. */
export function StoreProductQA({ productId, workspaceId }: StoreProductQAProps) {
  const qc = useQueryClient();
  const [question, setQuestion] = useState("");
  const [name, setName] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const { data: qa = [], isLoading } = useQuery({
    queryKey: ["store-product-qa", productId],
    enabled: !!productId,
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("product_qa")
        .select("id, question, answer, asker_name, created_at")
        .eq("product_id", productId)
        .eq("is_approved", true)
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return (data || []) as Array<{
        id: string;
        question: string;
        answer: string | null;
        asker_name: string | null;
        created_at: string;
      }>;
    },
  });

  const ask = useMutation({
    mutationFn: async () => {
      const parsed = askSchema.safeParse({ question, asker_name: name });
      if (!parsed.success) {
        const fieldErrors: Record<string, string> = {};
        parsed.error.issues.forEach((i) => (fieldErrors[String(i.path[0])] = i.message));
        setErrors(fieldErrors);
        throw new Error("Verifique os campos assinalados");
      }
      setErrors({});
      const { error } = await (supabase as any).from("product_qa").insert({
        product_id: productId,
        workspace_id: workspaceId,
        question: parsed.data.question,
        asker_name: parsed.data.asker_name || null,
        answer: null,
        is_approved: false,
        source: "customer",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setQuestion("");
      setName("");
      toast.success("Pergunta enviada. Será publicada após revisão.");
      qc.invalidateQueries({ queryKey: ["store-product-qa", productId] });
    },
    onError: (e: Error) => toast.error(e.message || "Não foi possível enviar a pergunta"),
  });

  return (
    <section className="mt-12" aria-labelledby="qa-heading">
      <h2 id="qa-heading" className="mb-6 flex items-center gap-2 text-xl font-semibold">
        <MessageCircleQuestion className="h-5 w-5 text-primary" aria-hidden="true" />
        Perguntas e respostas
      </h2>

      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      ) : qa.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Ainda não há perguntas sobre este produto. Seja o primeiro a perguntar.
        </p>
      ) : (
        <ul className="space-y-4">
          {qa.map((item) => (
            <li key={item.id} className="rounded-xl border p-4">
              <p className="text-sm font-medium">{item.question}</p>
              {item.answer ? (
                <p className="mt-2 text-sm text-muted-foreground">
                  <span className="font-medium text-foreground">Resposta: </span>
                  {item.answer}
                </p>
              ) : (
                <p className="mt-2 text-xs text-muted-foreground">Ainda sem resposta.</p>
              )}
            </li>
          ))}
        </ul>
      )}

      <form
        className="mt-6 space-y-3 rounded-2xl border p-4"
        onSubmit={(e) => {
          e.preventDefault();
          ask.mutate();
        }}
      >
        <div className="space-y-1.5">
          <Label htmlFor="qa-question">A sua pergunta</Label>
          <Textarea
            id="qa-question"
            value={question}
            maxLength={500}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Ex.: este produto é compatível com…?"
            aria-invalid={!!errors.question}
          />
          {errors.question && <p className="text-xs text-destructive">{errors.question}</p>}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="qa-name">Nome (opcional)</Label>
          <Input
            id="qa-name"
            value={name}
            maxLength={60}
            onChange={(e) => setName(e.target.value)}
            placeholder="Como quer ser identificado"
            aria-invalid={!!errors.asker_name}
          />
          {errors.asker_name && <p className="text-xs text-destructive">{errors.asker_name}</p>}
        </div>
        <Button type="submit" disabled={ask.isPending}>
          {ask.isPending ? "A enviar…" : "Enviar pergunta"}
        </Button>
      </form>
    </section>
  );
}
