import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BarChart3, CheckCircle2, XCircle, AlertTriangle } from "lucide-react";
import { type SectionData } from "./statsHelpers";

interface Props {
  sections: SectionData[];
  hasData: boolean;
}

export function StatsSectionsTab({ sections, hasData }: Props) {
  if (!hasData) {
    return (
      <Card className="border-white/[0.08] rounded-xl">
        <CardContent className="py-12">
          <div className="flex flex-col items-center text-center max-w-md mx-auto gap-4">
            {/* Stylized heatmap illustration */}
            <div className="grid grid-cols-5 gap-1 opacity-40 mb-2">
              {[90, 80, 60, 40, 20, 85, 70, 50, 30, 10, 75, 55, 35, 15, 5].map((v, i) => (
                <div
                  key={i}
                  className="w-8 h-5 rounded-sm"
                  style={{ backgroundColor: `hsla(${v > 60 ? 150 : v > 30 ? 40 : 0}, 70%, 50%, ${v / 100})` }}
                />
              ))}
            </div>
            <h3 className="font-semibold text-base">Heatmap de Secções</h3>
            <p className="text-sm text-muted-foreground">
              Os dados de secções aparecem após 10+ visitas com scroll tracking ativo. Esta funcionalidade mostra quais secções da tua landing page retêm mais atenção.
            </p>
            <div className="space-y-2 text-left w-full max-w-xs mt-2">
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                <span className="text-muted-foreground">Pixel instalado</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <XCircle className="h-4 w-4 text-red-400 shrink-0" />
                <span className="text-muted-foreground">Scroll tracking a acumular dados</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <XCircle className="h-4 w-4 text-red-400 shrink-0" />
                <span className="text-muted-foreground">Secções com ID definido</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const maxViews = Math.max(...sections.map(s => s.views), 1);

  return (
    <Card className="border-white/[0.08] rounded-xl">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-amber-400" />
          Heatmap de Secções (Scroll Depth)
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3 py-2">
          {sections.map((sec) => {
            const reachPct = (sec.views / maxViews) * 100;
            const heatColor = reachPct > 70 ? "bg-emerald-500/70" : reachPct > 30 ? "bg-amber-500/70" : "bg-red-500/50";

            return (
              <div key={sec.sectionKey} className="flex items-center gap-3">
                <span className="text-xs w-28 text-muted-foreground truncate">{sec.section}</span>
                <div className="flex-1 h-8 bg-muted/20 rounded-md overflow-hidden relative">
                  <div
                    className={`h-full rounded-md transition-all duration-500 ${heatColor} flex items-center px-2`}
                    style={{ width: `${Math.max(reachPct, 4)}%` }}
                  >
                    {reachPct > 20 && (
                      <span className="text-[10px] font-medium text-white/80">{Math.round(reachPct)}%</span>
                    )}
                  </div>
                </div>
                <span className="text-xs tabular-nums w-12 text-right font-medium">{sec.views}</span>
                {sec.dropOff !== null && sec.dropOff > 0 && (
                  <Badge
                    variant="outline"
                    className={`text-[10px] px-1.5 py-0 ${sec.isWorst ? "text-red-400 border-red-500/30 bg-red-500/10" : "text-amber-400 border-amber-500/30"}`}
                  >
                    -{sec.dropOff}%
                    {sec.isWorst && " ⚠"}
                  </Badge>
                )}
                {sec.isWorst && (
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-red-400 border-red-500/30 bg-red-500/10">
                    <AlertTriangle className="h-3 w-3 mr-0.5" />
                    Problema
                  </Badge>
                )}
              </div>
            );
          })}
          <p className="text-xs text-muted-foreground mt-3">
            Quedas elevadas entre secções indicam pontos de abandono. Foca-te em melhorar a secção com a badge "Problema".
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
