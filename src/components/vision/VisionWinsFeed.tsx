import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trophy, Plus, PartyPopper, Star, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useVisionWins, useCreateWin, useCelebrateWin } from "@/hooks/useVision";
import { useSendDuoNotification } from "@/hooks/useVisionDuo";

interface Props {
  visionId: string;
}

const impactColors: Record<string, string> = {
  high: "text-amber-500 bg-amber-500/10",
  medium: "text-blue-500 bg-blue-500/10",
  low: "text-muted-foreground bg-muted/50",
};

export function VisionWinsFeed({ visionId }: Props) {
  const { data: wins = [], isLoading } = useVisionWins(visionId);
  const createWin = useCreateWin();
  const celebrateWin = useCelebrateWin();
  const sendDuoNotification = useSendDuoNotification();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("revenue");
  const [impact, setImpact] = useState("medium");

  const handleCreate = () => {
    if (!title.trim()) return;
    createWin.mutate({ vision_id: visionId, title, description, category, impact_level: impact }, {
      onSuccess: () => { setOpen(false); setTitle(""); setDescription(""); },
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <Trophy className="h-5 w-5 text-amber-500" />Vitórias
        </h2>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button size="sm" className="gap-2"><Plus className="h-4 w-4" />Registar Vitória</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Nova Vitória 🎉</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2"><Label className="text-xs">Título *</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="O que conquistaste?" className="bg-background" /></div>
              <div className="space-y-2"><Label className="text-xs">Descrição</Label><Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Detalhes..." className="bg-background" /></div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs">Categoria</Label>
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger className="bg-background"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="revenue">Receita</SelectItem>
                      <SelectItem value="marketing">Marketing</SelectItem>
                      <SelectItem value="brand">Marca</SelectItem>
                      <SelectItem value="habit">Hábito</SelectItem>
                      <SelectItem value="other">Outro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Impacto</Label>
                  <Select value={impact} onValueChange={setImpact}>
                    <SelectTrigger className="bg-background"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="high">Alto</SelectItem>
                      <SelectItem value="medium">Médio</SelectItem>
                      <SelectItem value="low">Baixo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button onClick={handleCreate} disabled={!title.trim() || createWin.isPending} className="w-full gap-2">
                {createWin.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trophy className="h-4 w-4" />}Registar
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">A carregar...</div>
      ) : wins.length === 0 ? (
        <Card className="border-dashed border-border/50"><CardContent className="p-8 text-center"><p className="text-sm text-muted-foreground">Ainda sem vitórias registadas.</p></CardContent></Card>
      ) : (
        <div className="space-y-3">
          {wins.map((win) => (
            <Card key={win.id} className="border-border/50 hover:border-amber-500/30 transition-colors">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${impactColors[win.impact_level || "medium"]}`}>
                      {win.celebrated ? <PartyPopper className="h-4 w-4" /> : <Star className="h-4 w-4" />}
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-foreground">{win.title}</h3>
                      {win.description && <p className="text-xs text-muted-foreground mt-0.5">{win.description}</p>}
                      <div className="flex items-center gap-2 mt-2">
                        {win.category && <Badge variant="outline" className="text-[10px] capitalize">{win.category}</Badge>}
                        <span className="text-[10px] text-muted-foreground">{win.date}</span>
                      </div>
                    </div>
                  </div>
                  {!win.celebrated && (
                    <Button variant="ghost" size="sm" className="text-xs gap-1" onClick={() => celebrateWin.mutate(win.id)}>
                      <PartyPopper className="h-3 w-3" />Celebrar
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
