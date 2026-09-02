/**
 * Painel da biblioteca comercial (playbook) do Conversion Engine.
 * Permite instalar/atualizar os templates LEAD_NEW_* e QUALIFY_* no workspace
 * e mostra a cobertura por família.
 */
import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { BookOpen, Download, RefreshCw } from "lucide-react";
import { useWhatsAppPlaybook, useSeedWhatsAppPlaybook } from "@/hooks/useWhatsAppPlaybook";
import { PLAYBOOK_SEEDS } from "@/lib/whatsapp/engine/seeds";
import { TEMPLATE_FAMILY_LABELS, type TemplateFamily } from "@/lib/whatsapp/engine/families";

export function PlaybookLibraryPanel() {
  const { data: playbook, isLoading } = useWhatsAppPlaybook();
  const seed = useSeedWhatsAppPlaybook();

  const byFamily = useMemo(() => {
    const map = new Map<string, number>();
    for (const t of playbook ?? []) map.set(t.family, (map.get(t.family) ?? 0) + 1);
    return map;
  }, [playbook]);

  const installed = playbook?.length ?? 0;
  const available = PLAYBOOK_SEEDS.length;

  return (
    <Card>
      <CardHeader className="pb-3 flex-row items-center justify-between space-y-0">
        <CardTitle className="text-base flex items-center gap-2">
          <BookOpen className="h-4 w-4" /> Biblioteca comercial (playbook)
        </CardTitle>
        <div className="flex gap-2">
          <Button size="sm" onClick={() => seed.mutate({})} disabled={seed.isPending}>
            <Download className="h-4 w-4 mr-2" /> Instalar em falta
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => seed.mutate({ overwrite: true })}
            disabled={seed.isPending}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${seed.isPending ? "animate-spin" : ""}`} />
            Repor versão oficial
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading ? (
          <Skeleton className="h-10 w-full" />
        ) : (
          <>
            <p className="text-sm text-muted-foreground">
              {installed} de {available} templates do playbook instalados neste workspace. São a
              base das recomendações de Próxima Melhor Ação.
            </p>
            <div className="flex flex-wrap gap-2">
              {(Object.keys(TEMPLATE_FAMILY_LABELS) as TemplateFamily[]).map((f) => {
                const count = byFamily.get(f) ?? 0;
                return (
                  <Badge key={f} variant={count ? "secondary" : "outline"}>
                    {TEMPLATE_FAMILY_LABELS[f]}: {count}
                  </Badge>
                );
              })}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
