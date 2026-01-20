import { useState } from "react";
import { FolderOpen, Plus, Loader2, Trash2, MoreVertical, Pencil } from "lucide-react";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useInstagramLooter } from "@/hooks/useInstagramLooter";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CollectionDetail } from "./CollectionDetail";

export function Collections() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newCollectionName, setNewCollectionName] = useState("");
  const [newCollectionDesc, setNewCollectionDesc] = useState("");
  const [selectedCollection, setSelectedCollection] = useState<any>(null);
  const [collectionToDelete, setCollectionToDelete] = useState<string | null>(null);
  const { collections, createCollection, isLoading } = useInstagramLooter();
  const queryClient = useQueryClient();

  // Delete collection mutation
  const deleteCollection = useMutation({
    mutationFn: async (collectionId: string) => {
      const { error } = await supabase
        .from("ig_collections")
        .delete()
        .eq("id", collectionId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ig-collections"] });
      toast.success("Coleção eliminada");
      setCollectionToDelete(null);
    },
    onError: (error) => {
      toast.error(`Erro ao eliminar coleção: ${error.message}`);
    },
  });

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

  // If a collection is selected, show its details
  if (selectedCollection) {
    return (
      <CollectionDetail
        collection={selectedCollection}
        onBack={() => setSelectedCollection(null)}
      />
    );
  }

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
              className="hover:shadow-md transition-shadow cursor-pointer group"
              style={{ borderColor: collection.color }}
            >
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center justify-between">
                  <span 
                    className="flex items-center gap-2 flex-1"
                    onClick={() => setSelectedCollection(collection)}
                  >
                    <FolderOpen 
                      className="h-5 w-5" 
                      style={{ color: collection.color }} 
                    />
                    {collection.name}
                  </span>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">
                      {collection.items_count || 0} itens
                    </Badge>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          className="opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setSelectedCollection(collection)}>
                          <FolderOpen className="h-4 w-4 mr-2" />
                          Abrir
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          className="text-destructive"
                          onClick={() => setCollectionToDelete(collection.id)}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Eliminar
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent onClick={() => setSelectedCollection(collection)}>
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

      {/* Delete Confirmation */}
      <AlertDialog open={!!collectionToDelete} onOpenChange={() => setCollectionToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar Coleção</AlertDialogTitle>
            <AlertDialogDescription>
              Tens a certeza que queres eliminar esta coleção? Todos os itens serão removidos. Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => collectionToDelete && deleteCollection.mutate(collectionToDelete)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteCollection.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
