import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface ClosedCaseProps {
  context: string;
  action: string;
  result: string;
  metric: string;
  author?: string;
  date?: string;
}

export function ClosedCaseTemplate({ context, action, result, metric, author, date }: ClosedCaseProps) {
  return (
    <Card className="border-border/50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Caso Fechado</CardTitle>
          {date && <span className="text-xs text-muted-foreground">{date}</span>}
        </div>
        {author && (
          <Badge variant="outline" className="w-fit text-xs">
            {author}
          </Badge>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Contexto</p>
          <p className="text-sm text-foreground">{context}</p>
        </div>
        <div className="space-y-1">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Acao</p>
          <p className="text-sm text-foreground">{action}</p>
        </div>
        <div className="space-y-1">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Resultado</p>
          <p className="text-sm text-foreground">{result}</p>
        </div>
        <div className="rounded-lg bg-muted/50 p-3">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Metrica</p>
          <p className="text-lg font-bold text-foreground">{metric}</p>
        </div>
      </CardContent>
    </Card>
  );
}
