import { useQuery } from "@tanstack/react-query";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { pt } from "date-fns/locale";
import { Search, Calendar, CheckCircle, XCircle, Loader2, RotateCcw } from "lucide-react";

interface ProspectingHistoryProps {
  onSelectSearch: (searchId: string) => void;
  onRepeatSearch?: (params: {
    profession: string;
    location: string;
    keywords: string;
    platforms: string[];
  }) => void;
}

export function ProspectingHistory({ onSelectSearch, onRepeatSearch }: ProspectingHistoryProps) {
  const { currentWorkspace } = useWorkspace();

  const { data: searches = [], isLoading } = useQuery({
    queryKey: ["prospecting-searches", currentWorkspace?.id],
    queryFn: async () => {
      if (!currentWorkspace?.id) return [];
      const { data, error } = await supabase
        .from("professional_prospecting_searches")
        .select("*")
        .eq("workspace_id", currentWorkspace.id)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    },
    enabled: !!currentWorkspace?.id,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (searches.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Search className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">Sem pesquisas</h3>
          <p className="text-muted-foreground">As suas pesquisas aparecerão aqui</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {searches.map((search) => (
        <Card
          key={search.id}
          className="cursor-pointer hover:bg-muted/50 transition-colors"
          onClick={() => onSelectSearch(search.id)}
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-medium">{search.profession}</h3>
                  {search.location && (
                    <span className="text-muted-foreground">• {search.location}</span>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                  <Calendar className="w-3 h-3" />
                  {format(new Date(search.created_at), "dd MMM yyyy, HH:mm", { locale: pt })}
                </div>
              </div>
              <div className="flex items-center gap-3">
                {onRepeatSearch && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1"
                    onClick={(e) => {
                      e.stopPropagation();
                      onRepeatSearch({
                        profession: search.profession || "",
                        location: search.location || "",
                        keywords: (search as any).keywords || "",
                        platforms: (search as any).platforms || ["instagram", "facebook"],
                      });
                    }}
                  >
                    <RotateCcw className="w-3 h-3" />
                    Repetir
                  </Button>
                )}
                <Badge variant="secondary">{search.results_count || 0} perfis</Badge>
                {search.status === "completed" ? (
                  <CheckCircle className="w-5 h-5 text-green-500" />
                ) : search.status === "failed" ? (
                  <XCircle className="w-5 h-5 text-red-500" />
                ) : (
                  <Loader2 className="w-5 h-5 animate-spin" />
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
