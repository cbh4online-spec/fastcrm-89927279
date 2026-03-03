import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Star, Clock, Trophy } from "lucide-react";

interface Suggestion {
  supplier_id: string;
  supplier_name: string;
  score: number;
  unit_price: number;
  lead_time: number | null;
  reason: string;
}

interface Props {
  suggestions: Suggestion[];
  aiExplanation?: string | null;
  onChoose: (supplierId: string, unitPrice: number) => void;
  onSetDefault?: (supplierId: string) => void;
}

export function SupplierSuggestionCard({ suggestions, aiExplanation, onChoose, onSetDefault }: Props) {
  const { t } = useTranslation("procurement");

  if (!suggestions.length) {
    return (
      <Card className="border-dashed">
        <CardContent className="p-3 text-sm text-muted-foreground">
          {t("noSuggestionsAvailable")}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-2">
      {suggestions.map((s, i) => (
        <Card key={s.supplier_id} className={i === 0 ? "border-primary/50 bg-primary/5" : ""}>
          <CardContent className="p-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  {i === 0 && <Badge variant="default" className="text-xs"><Trophy className="h-3 w-3 mr-1" />{t("recommended")}</Badge>}
                  <span className="font-medium text-sm truncate">{s.supplier_name}</span>
                </div>
                <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                  <span>€{s.unit_price.toFixed(2)}</span>
                  {s.lead_time !== null && <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{s.lead_time}d</span>}
                  <span className="flex items-center gap-1"><Star className="h-3 w-3" />{s.score}/100</span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">{s.reason}</p>
              </div>
              <div className="flex flex-col gap-1">
                <Button size="sm" variant={i === 0 ? "default" : "outline"} onClick={() => onChoose(s.supplier_id, s.unit_price)}>
                  {t("chooseThis")}
                </Button>
                {onSetDefault && (
                  <Button size="sm" variant="ghost" className="text-xs" onClick={() => onSetDefault(s.supplier_id)}>
                    {t("setAsDefault")}
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
      {aiExplanation && (
        <p className="text-xs text-muted-foreground italic px-1">🤖 {aiExplanation}</p>
      )}
    </div>
  );
}
