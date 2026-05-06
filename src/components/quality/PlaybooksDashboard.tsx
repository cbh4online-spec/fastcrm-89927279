import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { BookOpen } from "lucide-react";
import { usePlaybooks } from "@/hooks/useConversationQuality";

export function PlaybooksDashboard() {
  const { data: playbooks = [], isLoading } = usePlaybooks();
  const [category, setCategory] = useState<string>("all");

  const cats = Array.from(new Set(playbooks.map((p) => p.category)));
  const filtered = category === "all" ? playbooks : playbooks.filter((p) => p.category === category);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <BookOpen className="h-5 w-5" /> Playbooks
        </h2>
        <p className="text-sm text-muted-foreground">
          Guias de atendimento por tipo de conversa. Estrutura, perguntas, respostas e CTAs recomendados.
        </p>
      </div>

      <div className="flex flex-wrap gap-1.5">
        <Badge variant={category === "all" ? "default" : "outline"} className="cursor-pointer" onClick={() => setCategory("all")}>
          Todos ({playbooks.length})
        </Badge>
        {cats.map((c) => (
          <Badge key={c} variant={category === c ? "default" : "outline"} className="cursor-pointer" onClick={() => setCategory(c)}>
            {c}
          </Badge>
        ))}
      </div>

      {isLoading && <div className="text-sm text-muted-foreground">A carregar…</div>}
      {!isLoading && filtered.length === 0 && (
        <Card className="p-8 text-center text-sm text-muted-foreground">
          Ainda não existem playbooks. Crie guias a partir das melhores conversas da equipa.
        </Card>
      )}

      <Accordion type="multiple" className="space-y-2">
        {filtered.map((p) => (
          <AccordionItem key={p.id} value={p.id} className="border rounded-lg px-3">
            <AccordionTrigger className="hover:no-underline">
              <div className="flex items-center gap-2 text-left">
                <Badge variant="outline" className="text-[10px]">{p.category}</Badge>
                <span className="font-semibold text-sm">{p.name}</span>
                {p.is_template && <Badge variant="secondary" className="text-[10px]">Modelo</Badge>}
              </div>
            </AccordionTrigger>
            <AccordionContent className="space-y-3 text-sm pt-2">
              {p.description && <p className="text-muted-foreground">{p.description}</p>}
              {p.example_opening && (
                <Block title="Abertura sugerida">{p.example_opening}</Block>
              )}
              {(p.example_questions as any[])?.length > 0 && (
                <Block title="Perguntas a fazer">
                  <ul className="list-disc ml-4 space-y-0.5">
                    {(p.example_questions as any[]).map((q, i) => <li key={i}>{q}</li>)}
                  </ul>
                </Block>
              )}
              {(p.example_responses as any[])?.length > 0 && (
                <Block title="Respostas modelo">
                  <ul className="list-disc ml-4 space-y-0.5">
                    {(p.example_responses as any[]).map((r, i) => <li key={i}>{r}</li>)}
                  </ul>
                </Block>
              )}
              {p.closing_cta && <Block title="Próximo passo / CTA">{p.closing_cta}</Block>}
              <div className="grid md:grid-cols-2 gap-2">
                {(p.do_list as any[])?.length > 0 && (
                  <div className="rounded border-l-4 border-emerald-500 bg-emerald-500/5 p-2">
                    <div className="text-xs font-semibold text-emerald-700 mb-1">✓ Fazer</div>
                    <ul className="text-xs space-y-0.5">
                      {(p.do_list as any[]).map((d, i) => <li key={i}>• {d}</li>)}
                    </ul>
                  </div>
                )}
                {(p.dont_list as any[])?.length > 0 && (
                  <div className="rounded border-l-4 border-rose-500 bg-rose-500/5 p-2">
                    <div className="text-xs font-semibold text-rose-700 mb-1">✗ Evitar</div>
                    <ul className="text-xs space-y-0.5">
                      {(p.dont_list as any[]).map((d, i) => <li key={i}>• {d}</li>)}
                    </ul>
                  </div>
                )}
              </div>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded border p-2">
      <div className="text-xs font-semibold mb-1">{title}</div>
      <div className="text-xs">{children}</div>
    </div>
  );
}
