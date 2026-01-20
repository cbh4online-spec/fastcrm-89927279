import { useState } from "react";
import { FolderOpen, Plus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useInstagramLooter } from "@/hooks/useInstagramLooter";
import { toast } from "sonner";

export function Collections() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newCollectionName, setNewCollectionName] = useState("");
  const [newCollectionDesc, setNewCollectionDesc] = useState("");
  const { collections, createCollection, isLoading } = useInstagramLooter();

  const handleCreateCollection = async () => {
    if (!newCollectionName.trim()) {
      toast.error("Nome da coleção é obrigatório");
      return;
    }

    try {
      await createCollection.mutateAsync({
        name: newCollectionName,
        description: newCollectionDesc,
      });
      setIsCreateOpen(false);
      setNewCollectionName("");
      setNewCollectionDesc("");
    } catch (error) {
      // Error handled by mutation
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">As Minhas Coleções</h3>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Nova Coleção
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Criar Nova Coleção</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div>
                <Label htmlFor="name">Nome</Label>
                <Input
                  id="name"
                  placeholder="Ex: Dentistas Lisboa"
                  value={newCollectionName}
                  onChange={(e) => setNewCollectionName(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="description">Descrição (opcional)</Label>
                <Textarea
                  id="description"
                  placeholder="Descreva o propósito desta coleção..."
                  value={newCollectionDesc}
                  onChange={(e) => setNewCollectionDesc(e.target.value)}
                />
              </div>
              <Button 
                onClick={handleCreateCollection} 
                className="w-full"
                disabled={createCollection.isPending}
              >
                {createCollection.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : null}
                Criar Coleção
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Collections Grid */}
      {collections && collections.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {collections.map((collection: any) => (
            <Card 
              key={collection.id} 
              className="hover:shadow-md transition-shadow cursor-pointer"
              style={{ borderColor: collection.color }}
            >
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <FolderOpen 
                      className="h-5 w-5" 
                      style={{ color: collection.color }} 
                    />
                    {collection.name}
                  </span>
                  <Badge variant="secondary">
                    {collection.items_count} itens
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {collection.description || "Sem descrição"}
                </p>
                {collection.tags && collection.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-3">
                    {collection.tags.map((tag: string) => (
                      <Badge key={tag} variant="outline" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-16 text-center">
            <FolderOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Sem Coleções</h3>
            <p className="text-muted-foreground max-w-md mx-auto mb-4">
              Crie coleções para organizar os perfis e posts que encontrar.
            </p>
            <Button onClick={() => setIsCreateOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Criar Primeira Coleção
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
