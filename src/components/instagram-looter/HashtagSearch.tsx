import { useState } from "react";
import { Hash, Loader2, Image as ImageIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useInstagramLooter } from "@/hooks/useInstagramLooter";
import { toast } from "sonner";

export function HashtagSearch() {
  const [hashtag, setHashtag] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const { isLoading, searchHashtag } = useInstagramLooter();

  const handleSearch = async () => {
    const cleanHashtag = hashtag.trim().replace("#", "");
    if (!cleanHashtag) {
      toast.error("Digite uma hashtag");
      return;
    }

    try {
      const response = await searchHashtag(cleanHashtag);
      setResults(response.results);
      setHasSearched(true);
      
      if (response.results.length === 0) {
        toast.info("Nenhum post encontrado com esta hashtag");
      } else {
        toast.success(`${response.results.length} posts encontrados`);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro na pesquisa");
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  return (
    <div className="space-y-6">
      {/* Search Input */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Hash className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Digite uma hashtag (ex: dentista, cabeleireiro)"
                value={hashtag}
                onChange={(e) => setHashtag(e.target.value)}
                onKeyPress={handleKeyPress}
                className="pl-10"
              />
            </div>
            <Button onClick={handleSearch} disabled={isLoading}>
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Hash className="h-4 w-4 mr-2" />
              )}
              Pesquisar
            </Button>
          </div>

          {/* Popular hashtags */}
          <div className="flex flex-wrap gap-2 mt-4">
            {["dentista", "ortodontia", "cabeleireiro", "estetica", "clinicadentaria", "hairstylist"].map((tag) => (
              <Badge 
                key={tag}
                variant="outline" 
                className="cursor-pointer hover:bg-accent"
                onClick={() => setHashtag(tag)}
              >
                #{tag}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      {hasSearched && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">
            Posts com #{hashtag.replace("#", "")} ({results.length})
          </h3>

          {results.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Hash className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">Nenhum post encontrado</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
              {results.map((post: any, index: number) => (
                <Card 
                  key={post.id || index} 
                  className="overflow-hidden hover:shadow-md transition-shadow cursor-pointer"
                >
                  <a 
                    href={post.link || `https://instagram.com/p/${post.code}`} 
                    target="_blank" 
                    rel="noopener noreferrer"
                  >
                    <div className="aspect-square relative bg-muted">
                      {post.thumbnail_url || post.display_url ? (
                        <img
                          src={post.thumbnail_url || post.display_url}
                          alt="Post"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <ImageIcon className="h-8 w-8 text-muted-foreground" />
                        </div>
                      )}
                      {post.is_video && (
                        <Badge className="absolute top-2 right-2">Vídeo</Badge>
                      )}
                    </div>
                    <CardContent className="p-3">
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {post.caption?.text || post.caption || "Sem legenda"}
                      </p>
                      <div className="flex gap-3 mt-2 text-xs text-muted-foreground">
                        <span>❤️ {post.like_count?.toLocaleString() || 0}</span>
                        <span>💬 {post.comment_count?.toLocaleString() || 0}</span>
                      </div>
                    </CardContent>
                  </a>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Empty state */}
      {!hasSearched && (
        <Card>
          <CardContent className="py-16 text-center">
            <Hash className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Pesquisa por Hashtag</h3>
            <p className="text-muted-foreground max-w-md mx-auto">
              Encontre posts e perfis através de hashtags relevantes para o seu nicho.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
