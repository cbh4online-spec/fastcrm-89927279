import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Image, Type, X, Loader2, Sparkles, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useVisionBoardItems, useCreateBoardItem, useDeleteBoardItem } from "@/hooks/useVision";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Props {
  visionId: string;
}

export function VisionBoardCanvas({ visionId }: Props) {
  const { data: items = [], isLoading } = useVisionBoardItems(visionId);
  const createItem = useCreateBoardItem();
  const deleteItem = useDeleteBoardItem();
  const [open, setOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newContent, setNewContent] = useState("");
  const [newType, setNewType] = useState<"text" | "image">("text");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null);

  const handleGenerateImage = async () => {
    if (!newTitle.trim()) {
      toast.error("Adiciona um título para gerar a imagem.");
      return;
    }

    setIsGenerating(true);
    setGeneratedImageUrl(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const workspaceId = session?.user?.app_metadata?.workspace_id;

      const { data, error } = await supabase.functions.invoke("vision-generate-image", {
        body: {
          title: newTitle,
          description: newContent || undefined,
          workspaceId: workspaceId || "default",
        },
      });

      if (error) throw error;
      if (data?.error) {
        if (data.error.includes("Rate limit")) {
          toast.error("Limite de pedidos atingido. Tenta novamente em breve.");
        } else if (data.error.includes("Credits")) {
          toast.error("Créditos esgotados. Adiciona créditos para continuar.");
        } else {
          toast.error(data.error);
        }
        return;
      }

      if (data?.url) {
        setGeneratedImageUrl(data.url);
        toast.success("Imagem gerada com sucesso!");
      }
    } catch (err) {
      console.error("Image generation error:", err);
      toast.error("Erro ao gerar imagem. Tenta novamente.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCreate = () => {
    createItem.mutate(
      {
        vision_id: visionId,
        type: newType,
        title: newTitle,
        content: newContent,
        image_url: newType === "image" ? generatedImageUrl || undefined : undefined,
      },
      {
        onSuccess: () => {
          setOpen(false);
          setNewTitle("");
          setNewContent("");
          setGeneratedImageUrl(null);
        },
      }
    );
  };

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (!isOpen) {
      setNewTitle("");
      setNewContent("");
      setGeneratedImageUrl(null);
      setNewType("text");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">Vision Board</h2>
        <Dialog open={open} onOpenChange={handleOpenChange}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2">
              <Plus className="h-4 w-4" />
              Adicionar
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Novo Item</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="flex gap-2">
                <Button
                  variant={newType === "text" ? "default" : "outline"}
                  size="sm"
                  onClick={() => { setNewType("text"); setGeneratedImageUrl(null); }}
                  className="gap-1"
                >
                  <Type className="h-4 w-4" />
                  Texto
                </Button>
                <Button
                  variant={newType === "image" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setNewType("image")}
                  className="gap-1"
                >
                  <Image className="h-4 w-4" />
                  Imagem
                </Button>
              </div>

              <Input
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="Título..."
                className="bg-background"
              />
              <Textarea
                value={newContent}
                onChange={(e) => setNewContent(e.target.value)}
                placeholder="Descrição..."
                className="bg-background"
              />

              {newType === "image" && (
                <div className="space-y-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleGenerateImage}
                    disabled={isGenerating || !newTitle.trim()}
                    className="w-full gap-2 border-primary/30 hover:border-primary/60 hover:bg-primary/5"
                  >
                    {isGenerating ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        A gerar imagem com IA...
                      </>
                    ) : (
                      <>
                        <Wand2 className="h-4 w-4" />
                        Gerar imagem com IA
                        <Sparkles className="h-3 w-3 text-primary" />
                      </>
                    )}
                  </Button>

                  {generatedImageUrl && (
                    <div className="relative rounded-lg overflow-hidden border border-border">
                      <img
                        src={generatedImageUrl}
                        alt="Imagem gerada"
                        className="w-full h-48 object-cover"
                      />
                      <div className="absolute top-2 right-2">
                        <Button
                          variant="secondary"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => setGeneratedImageUrl(null)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                      <div className="absolute bottom-2 left-2 flex items-center gap-1 px-2 py-1 rounded-full bg-background/80 backdrop-blur-sm text-xs text-muted-foreground">
                        <Sparkles className="h-3 w-3" />
                        Gerada com IA
                      </div>
                    </div>
                  )}
                </div>
              )}

              <Button
                onClick={handleCreate}
                disabled={!newTitle.trim() || createItem.isPending}
                className="w-full gap-2"
              >
                {createItem.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4" />
                )}
                Criar
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">A carregar...</div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {items.map((item) => (
            <Card
              key={item.id}
              className="border-border/50 hover:border-violet-500/50 transition-colors cursor-pointer group relative"
              style={{ borderLeftColor: item.color || "#8B5CF6", borderLeftWidth: 3 }}
            >
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 h-6 w-6"
                onClick={() => deleteItem.mutate(item.id)}
              >
                <X className="h-3 w-3" />
              </Button>
              <CardContent className="p-4 space-y-2">
                {item.type === "image" && (
                  <div className="w-full h-24 rounded-lg bg-muted/50 flex items-center justify-center overflow-hidden">
                    {item.image_url ? (
                      <img
                        src={item.image_url}
                        alt={item.title || ""}
                        className="w-full h-full object-cover rounded-lg"
                      />
                    ) : (
                      <Image className="h-8 w-8 text-muted-foreground/50" />
                    )}
                  </div>
                )}
                <h3 className="text-sm font-semibold text-foreground">{item.title}</h3>
                {item.content && (
                  <p className="text-xs text-muted-foreground">{item.content}</p>
                )}
              </CardContent>
            </Card>
          ))}

          {items.length === 0 && (
            <Card className="border-dashed border-border/50 col-span-full">
              <CardContent className="p-8 text-center">
                <p className="text-sm text-muted-foreground">
                  Board vazio. Adiciona o teu primeiro item!
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
