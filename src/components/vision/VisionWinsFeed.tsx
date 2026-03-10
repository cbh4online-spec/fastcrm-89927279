import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Trophy, Plus, PartyPopper, Star } from "lucide-react";
import { mockWins } from "./mockData";

const impactColors: Record<string, string> = {
  high: "text-amber-500 bg-amber-500/10",
  medium: "text-blue-500 bg-blue-500/10",
  low: "text-muted-foreground bg-muted/50",
};

export function VisionWinsFeed() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <Trophy className="h-5 w-5 text-amber-500" />Vitórias
        </h2>
        <Button size="sm" className="gap-2"><Plus className="h-4 w-4" />Registar Vitória</Button>
      </div>

      <div className="space-y-3">
        {mockWins.map((win) => (
          <Card key={win.id} className="border-border/50 hover:border-amber-500/30 transition-colors">
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${impactColors[win.impact_level]}`}>
                    {win.celebrated ? <PartyPopper className="h-4 w-4" /> : <Star className="h-4 w-4" />}
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">{win.title}</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">{win.description}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge variant="outline" className="text-[10px] capitalize">{win.category}</Badge>
                      <span className="text-[10px] text-muted-foreground">{win.date}</span>
                    </div>
                  </div>
                </div>
                {!win.celebrated && (
                  <Button variant="ghost" size="sm" className="text-xs gap-1">
                    <PartyPopper className="h-3 w-3" />Celebrar
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
