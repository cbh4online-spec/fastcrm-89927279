/**
 * Knowledge Bases Tab - Quick access to knowledge bases
 */

import { useKnowledgeBase } from "@/hooks/useKnowledgeBase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { BookOpen, FileText, ExternalLink, Plus } from "lucide-react";
import { Link } from "react-router-dom";
import { KNOWLEDGE_BASE_TYPES } from "@/types/knowledge-base";

interface KnowledgeBasesTabProps {
  searchValue: string;
}

export function KnowledgeBasesTab({ searchValue }: KnowledgeBasesTabProps) {
  const { knowledgeBases, isLoading } = useKnowledgeBase();

  const filteredBases = knowledgeBases.filter(kb =>
    kb.name.toLowerCase().includes(searchValue.toLowerCase()) ||
    kb.description?.toLowerCase().includes(searchValue.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map(i => (
          <Skeleton key={i} className="h-32" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with link */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Acesso rápido às bases de conhecimento. Para gestão completa, use o módulo dedicado.
        </p>
        <Link to="/dashboard/knowledge-base">
          <Button variant="outline" size="sm">
            <ExternalLink className="h-4 w-4 mr-2" />
            Abrir Módulo Completo
          </Button>
        </Link>
      </div>

      {/* Empty State */}
      {knowledgeBases.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <div className="h-16 w-16 rounded-full bg-blue-500/10 flex items-center justify-center mb-4">
              <BookOpen className="h-8 w-8 text-blue-500" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Nenhuma base de conhecimento</h3>
            <p className="text-sm text-muted-foreground mb-6 max-w-md">
              Bases de conhecimento fornecem contexto e informações aos agentes IA.
            </p>
            <Link to="/dashboard/knowledge-base">
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Criar Base
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredBases.map(kb => {
            const typeConfig = KNOWLEDGE_BASE_TYPES[kb.type as keyof typeof KNOWLEDGE_BASE_TYPES];
            return (
              <Link key={kb.id} to={`/dashboard/knowledge-base?selected=${kb.id}`}>
                <Card className="hover:border-primary/30 transition-colors cursor-pointer h-full">
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                        <BookOpen className="h-5 w-5 text-blue-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-base truncate">{kb.name}</CardTitle>
                        <p className="text-xs text-muted-foreground">{typeConfig?.label || kb.type}</p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {kb.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {kb.description}
                      </p>
                    )}
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="gap-1">
                        <FileText className="h-3 w-3" />
                        {kb.entriesCount || 0} entradas
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
