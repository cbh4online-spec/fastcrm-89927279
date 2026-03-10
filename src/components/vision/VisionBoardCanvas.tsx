import { Card, CardContent } from "@/components/ui/card";
import { Plus, Image, Type } from "lucide-react";
import { Button } from "@/components/ui/button";
import { mockBoardItems } from "./mockData";

export function VisionBoardCanvas() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">Vision Board</h2>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="gap-2"><Image className="h-4 w-4" />Imagem</Button>
          <Button variant="outline" size="sm" className="gap-2"><Type className="h-4 w-4" />Texto</Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {mockBoardItems.map((item) => (
          <Card
            key={item.id}
            className="border-border/50 hover:border-violet-500/50 transition-colors cursor-pointer group"
            style={{ borderLeftColor: item.color, borderLeftWidth: 3 }}
          >
            <CardContent className="p-4 space-y-2">
              {item.type === "image" ? (
                <div className="w-full h-24 rounded-lg bg-muted/50 flex items-center justify-center">
                  <Image className="h-8 w-8 text-muted-foreground/50" />
                </div>
              ) : null}
              <h3 className="text-sm font-semibold text-foreground">{item.title}</h3>
              {item.content && <p className="text-xs text-muted-foreground">{item.content}</p>}
            </CardContent>
          </Card>
        ))}

        {/* Add new card */}
        <Card className="border-dashed border-border/50 hover:border-violet-500/50 transition-colors cursor-pointer">
          <CardContent className="p-4 h-full flex items-center justify-center min-h-[120px]">
            <div className="text-center space-y-1">
              <Plus className="h-6 w-6 text-muted-foreground mx-auto" />
              <p className="text-xs text-muted-foreground">Adicionar</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
