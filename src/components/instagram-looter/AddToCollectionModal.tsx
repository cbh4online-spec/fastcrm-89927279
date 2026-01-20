import { useState } from "react";
import { FolderPlus, Plus, Check, Loader2, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { useInstagramLooter } from "@/hooks/useInstagramLooter";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { toast } from "sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";

interface AddToCollectionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  itemType: "profile" | "media";
  profileId?: string;
  mediaId?: string;
  itemName: string;
}

export function AddToCollectionModal({
  open,
  onOpenChange,
  itemType,
  profileId,
  mediaId,
  itemName,
}: AddToCollectionModalProps) {
  const { collections, createCollection, refetchCollections } = useInstagramLooter();
  const { currentWorkspace } = useWorkspace();
  const queryClient = useQueryClient();
  
  const [showNewCollection, setShowNewCollection] = useState(false);
  const [newCollectionName, setNewCollectionName] = useState("");
  const [newCollectionDesc, setNewCollectionDesc] = useState("");
  const [notes, setNotes] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [selectedCollectionId, setSelectedCollectionId] = useState<string | null>(null);

  // Add to collection mutation
  const addToCollection = useMutation({
    mutationFn: async (collectionId: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("ig_collection_items")
        .insert({
          collection_id: collectionId,
          item_type: itemType,
          profile_id: itemType === "profile" ? profileId : null,
          media_id: itemType === "media" ? mediaId : null,
          notes: notes || null,
          tags: tags.length > 0 ? tags : null,
          added_by: user.id,
        })
        .select()
        .single();

      if (error) {
        if (error.code === "23505") {
          throw new Error("Este item já está nesta coleção");
        }
        throw error;
      }
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ig-collections"] });
      queryClient.invalidateQueries({ queryKey: ["ig-collection-items"] });
      toast.success("Adicionado à coleção!");
      handleClose();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handleCreateAndAdd = async () => {
    if (!newCollectionName.trim()) {
      toast.error("Nome da coleção é obrigatório");
      return;
    }

    try {
      const result = await createCollection.mutateAsync({
        name: newCollectionName,
        description: newCollectionDesc,
      });
      
      await addToCollection.mutateAsync(result.id);
    } catch (error) {
      // Error handled by mutations
    }
  };

  const handleAddTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()]);
      setTagInput("");
    }
  };

  const handleRemoveTag = (tag: string) => {
    setTags(tags.filter(t => t !== tag));
  };

  const handleClose = () => {
    setShowNewCollection(false);
    setNewCollectionName("");
    setNewCollectionDesc("");
    setNotes("");
    setTags([]);
    setTagInput("");
    setSelectedCollectionId(null);
    onOpenChange(false);
  };

  const isLoading = createCollection.isPending || addToCollection.isPending;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FolderPlus className="h-5 w-5" />
            Adicionar à Coleção
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Item being added */}
          <div className="p-3 bg-muted/50 rounded-lg">
            <p className="text-sm text-muted-foreground">
              A adicionar: <span className="font-medium text-foreground">{itemName}</span>
            </p>
          </div>

          {/* Notes */}
          <div>
            <Label htmlFor="notes">Notas (opcional)</Label>
            <Textarea
              id="notes"
              placeholder="Adicionar notas sobre este item..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="mt-1.5"
              rows={2}
            />
          </div>

          {/* Tags */}
          <div>
            <Label>Tags (opcional)</Label>
            <div className="flex gap-2 mt-1.5">
              <Input
                placeholder="Adicionar tag..."
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), handleAddTag())}
              />
              <Button variant="outline" size="icon" onClick={handleAddTag}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {tags.map(tag => (
                  <Badge 
                    key={tag} 
                    variant="secondary"
                    className="cursor-pointer hover:bg-destructive/20"
                    onClick={() => handleRemoveTag(tag)}
                  >
                    <Tag className="h-3 w-3 mr-1" />
                    {tag}
                    <span className="ml-1">×</span>
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {!showNewCollection ? (
            <>
              {/* Collection list */}
              <div>
                <Label>Escolher Coleção</Label>
                <ScrollArea className="h-48 mt-1.5 border rounded-lg">
                  {collections && collections.length > 0 ? (
                    <div className="p-2 space-y-1">
                      {collections.map((collection: any) => (
                        <button
                          key={collection.id}
                          onClick={() => setSelectedCollectionId(collection.id)}
                          className={`w-full flex items-center gap-3 p-3 rounded-lg text-left transition-colors ${
                            selectedCollectionId === collection.id
                              ? "bg-primary/10 border border-primary"
                              : "hover:bg-muted"
                          }`}
                        >
                          <span 
                            className="w-3 h-3 rounded-full flex-shrink-0"
                            style={{ backgroundColor: collection.color || "#6366f1" }}
                          />
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">{collection.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {collection.items_count || 0} itens
                            </p>
                          </div>
                          {selectedCollectionId === collection.id && (
                            <Check className="h-4 w-4 text-primary" />
                          )}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="p-8 text-center text-muted-foreground text-sm">
                      Nenhuma coleção encontrada
                    </div>
                  )}
                </ScrollArea>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setShowNewCollection(true)}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Nova Coleção
                </Button>
                <Button
                  className="flex-1"
                  disabled={!selectedCollectionId || isLoading}
                  onClick={() => selectedCollectionId && addToCollection.mutate(selectedCollectionId)}
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : null}
                  Adicionar
                </Button>
              </div>
            </>
          ) : (
            <>
              {/* Create new collection */}
              <div className="space-y-3">
                <div>
                  <Label htmlFor="collectionName">Nome da Coleção</Label>
                  <Input
                    id="collectionName"
                    placeholder="Ex: Dentistas Lisboa"
                    value={newCollectionName}
                    onChange={(e) => setNewCollectionName(e.target.value)}
                    className="mt-1.5"
                  />
                </div>
                <div>
                  <Label htmlFor="collectionDesc">Descrição (opcional)</Label>
                  <Textarea
                    id="collectionDesc"
                    placeholder="Descreva o propósito desta coleção..."
                    value={newCollectionDesc}
                    onChange={(e) => setNewCollectionDesc(e.target.value)}
                    className="mt-1.5"
                    rows={2}
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setShowNewCollection(false)}
                >
                  Voltar
                </Button>
                <Button
                  className="flex-1"
                  disabled={!newCollectionName.trim() || isLoading}
                  onClick={handleCreateAndAdd}
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : null}
                  Criar e Adicionar
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
