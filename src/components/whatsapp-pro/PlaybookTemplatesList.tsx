/**
 * Lista os templates da biblioteca comercial (playbook) do Conversion Engine.
 * Permite copiar qualquer template do playbook para os templates do workspace.
 */
import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, Copy, Clock, Target } from "lucide-react";
import { useWhatsAppPlaybook } from "@/hooks/useWhatsAppPlaybook";
import { useUpsertWhatsAppTemplate } from "@/hooks/useWhatsAppTemplates";
import { TEMPLATE_FAMILY_LABELS, EXECUTION_MODE_LABELS, type TemplateFamily } from "@/lib/whatsapp/engine/families";

function formatTiming(min: number | null, max: number | null): string | null {
  if (min == null && max == null) return null;
  const fmt = (m: number) => (m < 60 ? `${m} min` : m < 1440 ? `${Math.round(m / 60)} h` : `${Math.round(m / 1440)} d`);
  if (min != null && max != null) return `${fmt(min)} – ${fmt(max)}`;
  return fmt((min ?? max) as number);
}

export function PlaybookTemplatesList() {
  const { data: playbook, isLoading } = useWhatsAppPlaybook();
  const upsert = useUpsertWhatsAppTemplate();
  const [search, setSearch] = useState("");
  const [family, setFamily] = useState<TemplateFamily | "all">("all");

  const families = useMemo(() => {
    const set = new Set<TemplateFamily>();
    for (const t of playbook ?? []) set.add(t.family);
    return Array.from(set);
  }, [playbook]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (playbook ?? []).filter((t) => {
      if (family !== "all" && t.family !== family) return false;
      if (!q) return true;
      return (
        t.name.toLowerCase().includes(q) ||
        t.code.toLowerCase().includes(q) ||
        t.message_body.toLowerCase().includes(q)
      );
    });
  }, [playbook, search, family]);

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-48 rounded-lg" />)}
      </div>
    );
  }

  if (!playbook?.length) {
    return (
      <Card>
        <CardContent className="p-12 text-center text-muted-foreground">
          A biblioteca comercial ainda não está instalada neste workspace. Use “Instalar em falta” acima.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[220px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Pesquisar código, nome ou texto…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="flex flex-wrap gap-1">
          <Button size="sm" variant={family === "all" ? "secondary" : "ghost"} onClick={() => setFamily("all")}>
            Todas ({playbook.length})
          </Button>
          {families.map((f) => (
            <Button key={f} size="sm" variant={family === f ? "secondary" : "ghost"} onClick={() => setFamily(f)}>
              {TEMPLATE_FAMILY_LABELS[f] ?? f}
            </Button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((t) => {
          const timing = formatTiming(t.timing_min_minutes, t.timing_max_minutes);
          return (
            <Card key={t.id} className="flex flex-col">
              <CardContent className="p-4 flex-1 flex flex-col gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="font-mono text-[10px]">{t.code}</Badge>
                    <Badge variant="secondary" className="text-[10px]">{TEMPLATE_FAMILY_LABELS[t.family] ?? t.family}</Badge>
                  </div>
                  <h3 className="font-semibold mt-2 truncate">{t.name}</h3>
                  {t.objective && <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{t.objective}</p>}
                </div>

                <p className="text-sm whitespace-pre-wrap line-clamp-5 bg-muted/40 rounded-md p-2">{t.message_body}</p>

                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground mt-auto">
                  {timing && <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" />{timing}</span>}
                  {t.primary_kpi && <span className="inline-flex items-center gap-1"><Target className="h-3 w-3" />{t.primary_kpi}</span>}
                  <Badge variant="outline" className="text-[10px]">{EXECUTION_MODE_LABELS[t.execution_mode] ?? t.execution_mode}</Badge>
                </div>

                <Button
                  size="sm"
                  variant="outline"
                  disabled={upsert.isPending}
                  onClick={() =>
                    upsert.mutate({
                      name: `${t.code} — ${t.name}`,
                      language: "pt_PT",
                      body: t.message_body,
                      category: "general",
                      country: "PT",
                      status: "draft",
                      tags: ["playbook", t.family],
                    })
                  }
                >
                  <Copy className="h-4 w-4 mr-2" /> Copiar para os meus templates
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
