import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Award, Star, Gem, Crown, Target } from "lucide-react";

const TIERS = [
  { name: "Bronze", min: 1, icon: Award, color: "text-amber-700 bg-amber-100", desc: "Primeira venda" },
  { name: "Prata", min: 5, icon: Star, color: "text-gray-500 bg-gray-100", desc: "5 vendas" },
  { name: "Ouro", min: 20, icon: Target, color: "text-yellow-600 bg-yellow-100", desc: "20 vendas" },
  { name: "Diamante", min: 50, icon: Gem, color: "text-blue-500 bg-blue-100", desc: "50 vendas" },
  { name: "Elite", min: 100, icon: Crown, color: "text-purple-600 bg-purple-100", desc: "100 vendas" },
];

interface Props {
  totalConversions: number;
}

export function AffiliateAchievements({ totalConversions }: Props) {
  const currentTierIdx = TIERS.reduce((best, t, i) => totalConversions >= t.min ? i : best, -1);
  const nextTier = TIERS[currentTierIdx + 1];
  const progress = nextTier ? Math.min(100, (totalConversions / nextTier.min) * 100) : 100;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Award className="h-5 w-5 text-primary" /> Conquistas
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-3">
          {TIERS.map((t, i) => {
            const unlocked = i <= currentTierIdx;
            return (
              <div key={t.name} className={`flex flex-col items-center gap-1 p-3 rounded-xl border transition-all ${unlocked ? "border-primary/30 bg-primary/5" : "border-border/50 opacity-40"}`}>
                <div className={`h-10 w-10 rounded-full flex items-center justify-center ${unlocked ? t.color : "bg-muted text-muted-foreground"}`}>
                  <t.icon className="h-5 w-5" />
                </div>
                <span className="text-xs font-bold">{t.name}</span>
                <span className="text-[10px] text-muted-foreground">{t.desc}</span>
              </div>
            );
          })}
        </div>
        {nextTier && (
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Próximo: <span className="font-bold text-foreground">{nextTier.name}</span></span>
              <span className="text-muted-foreground">{totalConversions}/{nextTier.min}</span>
            </div>
            <div className="h-2 rounded-full bg-muted overflow-hidden">
              <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${progress}%` }} />
            </div>
          </div>
        )}
        {!nextTier && (
          <Badge className="w-full justify-center py-2 bg-primary/10 text-primary border-primary/20">
            <Crown className="h-4 w-4 mr-1.5" /> Nível máximo atingido!
          </Badge>
        )}
      </CardContent>
    </Card>
  );
}