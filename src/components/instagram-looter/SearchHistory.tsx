import { Clock, Search, Hash, MapPin, Compass, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatDistanceToNow } from "date-fns";
import { pt } from "date-fns/locale";

interface SearchHistoryItem {
  id: string;
  search_type: string;
  query: string;
  results_count: number;
  created_at: string;
}

interface SearchHistoryProps {
  searches: SearchHistoryItem[];
  onSelectSearch: (query: string) => void;
  onClose?: () => void;
}

const searchTypeIcons: Record<string, React.ReactNode> = {
  global: <Search className="h-3.5 w-3.5" />,
  hashtag: <Hash className="h-3.5 w-3.5" />,
  location: <MapPin className="h-3.5 w-3.5" />,
  explore: <Compass className="h-3.5 w-3.5" />,
};

const searchTypeLabels: Record<string, string> = {
  global: "Pesquisa",
  hashtag: "Hashtag",
  location: "Local",
  explore: "Explorar",
};

export function SearchHistory({ searches, onSelectSearch, onClose }: SearchHistoryProps) {
  if (!searches || searches.length === 0) {
    return null;
  }

  // Group by unique queries (remove duplicates keeping the latest)
  const uniqueSearches = searches.reduce((acc, search) => {
    const key = `${search.search_type}-${search.query.toLowerCase()}`;
    if (!acc.has(key)) {
      acc.set(key, search);
    }
    return acc;
  }, new Map<string, SearchHistoryItem>());

  const uniqueList = Array.from(uniqueSearches.values()).slice(0, 15);

  return (
    <Card className="border-dashed">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            Pesquisas Recentes
          </CardTitle>
          {onClose && (
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <ScrollArea className="h-[200px] pr-4">
          <div className="space-y-1">
            {uniqueList.map((search) => (
              <button
                key={search.id}
                onClick={() => onSelectSearch(search.query)}
                className="w-full flex items-center gap-3 p-2 rounded-lg text-left hover:bg-muted transition-colors group"
              >
                <div className="flex items-center justify-center w-7 h-7 rounded-full bg-muted group-hover:bg-background">
                  {searchTypeIcons[search.search_type] || <Search className="h-3.5 w-3.5" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{search.query}</p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                      {searchTypeLabels[search.search_type] || search.search_type}
                    </Badge>
                    <span>
                      {formatDistanceToNow(new Date(search.created_at), { 
                        addSuffix: true, 
                        locale: pt 
                      })}
                    </span>
                  </div>
                </div>
                {search.results_count > 0 && (
                  <span className="text-xs text-muted-foreground">
                    {search.results_count} resultados
                  </span>
                )}
              </button>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
