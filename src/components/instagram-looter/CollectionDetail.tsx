import { useState } from "react";
import { 
  ArrowLeft, 
  Trash2, 
  ExternalLink, 
  Users, 
  Heart, 
  MessageCircle,
  Image,
  MoreVertical,
  Tag,
  StickyNote,
  Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

interface CollectionDetailProps {
  collection: {
    id: string;
    name: string;
    description: string | null;
    color: string | null;
    icon: string | null;
    tags: string[] | null;
    items_count: number | null;
    created_at: string;
  };
  onBack: () => void;
  onProfileSelect?: (profile: any) => void;
}

interface CollectionItem {
  id: string;
  item_type: string;
  notes: string | null;
  tags: string[] | null;
  created_at: string;
  profile_id: string | null;
  media_id: string | null;
  profile?: {
    id: string;
    username: string;
    full_name: string | null;
    profile_pic_url: string | null;
    followers_count: number | null;
    following_count: number | null;
    media_count: number | null;
    is_verified: boolean | null;
    biography: string | null;
  } | null;
  media?: {
    id: string;
    media_type: string | null;
    caption: string | null;
    thumbnail_url: string | null;
    likes_count: number | null;
    comments_count: number | null;
  } | null;
}

export function CollectionDetail({ collection, onBack, onProfileSelect }: CollectionDetailProps) {
  const queryClient = useQueryClient();
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("all");

  // Fetch collection items
  const { data: items, isLoading } = useQuery({
    queryKey: ["ig-collection-items", collection.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ig_collection_items")
        .select(`
          id,
          item_type,
          notes,
          tags,
          created_at,
          profile_id,
          media_id,
          profile:ig_profiles(
            id,
            username,
            full_name,
            profile_pic_url,
            followers_count,
            following_count,
            media_count,
            is_verified,
            biography
          ),
          media:ig_media(
            id,
            media_type,
            caption,
            thumbnail_url,
            likes_count,
            comments_count
          )
        `)
        .eq("collection_id", collection.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data || []) as CollectionItem[];
    },
  });

  // Delete item mutation
  const deleteItem = useMutation({
    mutationFn: async (itemId: string) => {
      const { error } = await supabase
        .from("ig_collection_items")
        .delete()
        .eq("id", itemId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ig-collection-items", collection.id] });
      queryClient.invalidateQueries({ queryKey: ["ig-collections"] });
      toast.success("Item removido da coleção");
      setItemToDelete(null);
    },
    onError: (error) => {
      toast.error(`Erro ao remover item: ${error.message}`);
    },
  });

  const filteredItems = items?.filter(item => {
    if (activeTab === "all") return true;
    return item.item_type === activeTab;
  }) || [];

  const profileCount = items?.filter(i => i.item_type === "profile").length || 0;
  const mediaCount = items?.filter(i => i.item_type === "media").length || 0;

  const formatNumber = (num: number | null) => {
    if (!num) return "0";
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <span 
              className="w-3 h-3 rounded-full" 
              style={{ backgroundColor: collection.color || "#6366f1" }}
            />
            {collection.name}
          </h2>
          {collection.description && (
            <p className="text-sm text-muted-foreground mt-1">
              {collection.description}
            </p>
          )}
        </div>
        <Badge variant="outline">{collection.items_count || 0} itens</Badge>
      </div>

      {/* Tags */}
      {collection.tags && collection.tags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {collection.tags.map(tag => (
            <Badge key={tag} variant="secondary" className="text-xs">
              <Tag className="h-3 w-3 mr-1" />
              {tag}
            </Badge>
          ))}
        </div>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="all">
            Todos ({items?.length || 0})
          </TabsTrigger>
          <TabsTrigger value="profile">
            <Users className="h-4 w-4 mr-1" />
            Perfis ({profileCount})
          </TabsTrigger>
          <TabsTrigger value="media">
            <Image className="h-4 w-4 mr-1" />
            Media ({mediaCount})
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredItems.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Image className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Coleção Vazia</h3>
                <p className="text-muted-foreground text-sm">
                  Adicione perfis ou posts a esta coleção a partir das pesquisas.
                </p>
              </CardContent>
            </Card>
          ) : (
            <ScrollArea className="h-[500px]">
              <div className="grid gap-3">
                {filteredItems.map((item) => (
                  <Card key={item.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      {item.item_type === "profile" && item.profile ? (
                        <div className="flex items-start gap-4">
                          <Avatar 
                            className="h-14 w-14 cursor-pointer hover:ring-2 ring-primary transition-all"
                            onClick={() => onProfileSelect?.(item.profile)}
                          >
                            <AvatarImage src={item.profile.profile_pic_url || ""} />
                            <AvatarFallback>
                              {item.profile.username.charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span 
                                className="font-semibold hover:underline cursor-pointer"
                                onClick={() => onProfileSelect?.(item.profile)}
                              >
                                @{item.profile.username}
                              </span>
                              {item.profile.is_verified && (
                                <Badge variant="secondary" className="text-xs">
                                  ✓ Verificado
                                </Badge>
                              )}
                            </div>
                            
                            {item.profile.full_name && (
                              <p className="text-sm text-muted-foreground">
                                {item.profile.full_name}
                              </p>
                            )}
                            
                            <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Users className="h-3 w-3" />
                                {formatNumber(item.profile.followers_count)} seguidores
                              </span>
                              <span className="flex items-center gap-1">
                                <Image className="h-3 w-3" />
                                {formatNumber(item.profile.media_count)} posts
                              </span>
                            </div>

                            {item.notes && (
                              <div className="mt-2 p-2 bg-muted/50 rounded text-xs">
                                <StickyNote className="h-3 w-3 inline mr-1" />
                                {item.notes}
                              </div>
                            )}

                            {item.tags && item.tags.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-2">
                                {item.tags.map(tag => (
                                  <Badge key={tag} variant="outline" className="text-xs">
                                    {tag}
                                  </Badge>
                                ))}
                              </div>
                            )}
                          </div>

                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() => window.open(`https://instagram.com/${item.profile?.username}`, "_blank")}
                              >
                                <ExternalLink className="h-4 w-4 mr-2" />
                                Abrir no Instagram
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={() => setItemToDelete(item.id)}
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Remover da Coleção
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      ) : item.item_type === "media" && item.media ? (
                        <div className="flex items-start gap-4">
                          <div className="w-20 h-20 bg-muted rounded overflow-hidden flex-shrink-0">
                            {item.media.thumbnail_url ? (
                              <img 
                                src={item.media.thumbnail_url} 
                                alt="Media" 
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <Image className="h-8 w-8 text-muted-foreground" />
                              </div>
                            )}
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <p className="text-sm line-clamp-2">
                              {item.media.caption || "Sem legenda"}
                            </p>
                            
                            <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Heart className="h-3 w-3" />
                                {formatNumber(item.media.likes_count)}
                              </span>
                              <span className="flex items-center gap-1">
                                <MessageCircle className="h-3 w-3" />
                                {formatNumber(item.media.comments_count)}
                              </span>
                              <Badge variant="outline" className="text-xs">
                                {item.media.media_type || "post"}
                              </Badge>
                            </div>

                            {item.notes && (
                              <div className="mt-2 p-2 bg-muted/50 rounded text-xs">
                                <StickyNote className="h-3 w-3 inline mr-1" />
                                {item.notes}
                              </div>
                            )}
                          </div>

                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={() => setItemToDelete(item.id)}
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Remover da Coleção
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      ) : null}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          )}
        </TabsContent>
      </Tabs>

      {/* Delete Confirmation */}
      <AlertDialog open={!!itemToDelete} onOpenChange={() => setItemToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover Item</AlertDialogTitle>
            <AlertDialogDescription>
              Tens a certeza que queres remover este item da coleção? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => itemToDelete && deleteItem.mutate(itemToDelete)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteItem.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
