import { useContextVersions, computeFieldDiff, ContextBlockVersion } from "@/hooks/useContextVersions";
import { FIELD_LABELS } from "@/hooks/useContextBlocks";
import { Loader2, Clock, ChevronDown, ChevronUp, ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { format } from "date-fns";
import { pt } from "date-fns/locale";

interface Props {
  blockId: string;
}

export function ContextVersionsTab({ blockId }: Props) {
  const { data: versions, isLoading } = useContextVersions(blockId);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-5 w-5 animate-spin text-gold" />
      </div>
    );
  }

  if (!versions || versions.length === 0) {
    return (
      <div className="text-center py-8 text-sm text-muted-foreground">
        Nenhuma versão guardada ainda. As versões são criadas quando guarda campos.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {versions.map((v, idx) => {
        const prevVersion = versions[idx + 1]; // older version
        const isExpanded = expandedId === v.id;
        const diffs = prevVersion
          ? computeFieldDiff(prevVersion.snapshot_fields, v.snapshot_fields)
          : [];

        return (
          <div
            key={v.id}
            className={cn(
              "rounded-lg border p-3 transition-colors",
              "border-border/50 bg-muted/10",
              isExpanded && "border-gold/30 bg-gold/5"
            )}
          >
            <button
              className="w-full flex items-center justify-between text-left"
              onClick={() => setExpandedId(isExpanded ? null : v.id)}
            >
              <div className="flex items-center gap-2">
                <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-sm font-medium">v{v.version_number}</span>
                <span className="text-xs text-muted-foreground">
                  {format(new Date(v.created_at), "d MMM yyyy, HH:mm", { locale: pt })}
                </span>
                {v.change_summary && (
                  <Badge variant="secondary" className="text-[10px]">{v.change_summary}</Badge>
                )}
              </div>
              {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>

            {isExpanded && (
              <div className="mt-3 space-y-2 border-t border-border/30 pt-3">
                {diffs.length > 0 ? (
                  diffs.map((d, i) => (
                    <div key={i} className="flex items-start gap-2 text-xs">
                      <span className="font-medium text-foreground min-w-[120px]">
                        {FIELD_LABELS[d.field] || d.field}
                      </span>
                      <span className="text-destructive line-through truncate max-w-[150px]">
                        {formatValue(d.old)}
                      </span>
                      <ArrowRight className="h-3 w-3 text-muted-foreground flex-shrink-0 mt-0.5" />
                      <span className="text-green-500 truncate max-w-[150px]">
                        {formatValue(d.new)}
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="text-xs text-muted-foreground">
                    {prevVersion ? "Sem alterações de campos" : "Versão inicial"}
                  </div>
                )}

                {/* Rich text diff */}
                {prevVersion && v.snapshot_rich_text !== prevVersion.snapshot_rich_text && (
                  <div className="text-xs mt-2 p-2 rounded bg-muted/20">
                    <span className="font-medium text-foreground">Resumo</span> alterado
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function formatValue(val: any): string {
  if (val === null || val === undefined) return "—";
  if (Array.isArray(val)) return val.join(", ") || "—";
  if (typeof val === "object") return JSON.stringify(val);
  return String(val);
}
