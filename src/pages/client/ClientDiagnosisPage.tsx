import { useState } from "react";
import { Link } from "react-router-dom";
import { ClientLayout } from "@/components/client-portal/ClientLayout";
import { useClientAuth } from "@/hooks/client-portal/useClientAuth";
import { usePathologies } from "@/hooks/client-portal/usePathologies";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Search, Stethoscope, ArrowRight, Loader2, Info } from "lucide-react";

export default function ClientDiagnosisPage() {
  const { clientUser } = useClientAuth();
  const { data: pathologies = [], isLoading } = usePathologies(clientUser?.workspace_id);
  const [search, setSearch] = useState("");
  const [selectedTag, setSelectedTag] = useState<string | null>(null);

  // Get unique tags
  const allTags = [...new Set(pathologies.flatMap((p) => p.tags || []))].sort();

  // Filter
  const filtered = pathologies.filter((p) => {
    if (search && !p.name.toLowerCase().includes(search.toLowerCase())) return false;
    if (selectedTag && !(p.tags || []).includes(selectedTag)) return false;
    return true;
  });

  return (
    <ClientLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Stethoscope className="h-6 w-6 text-primary" />
            Comprar por Diagnóstico
          </h1>
          <p className="text-muted-foreground mt-1">
            Selecione a patologia ou situação para ver os protocolos recomendados
          </p>
        </div>

        {/* Guardrail */}
        <div className="flex items-start gap-3 p-4 rounded-lg border bg-muted/50">
          <Info className="h-5 w-5 text-primary mt-0.5 shrink-0" />
          <p className="text-sm text-muted-foreground">
            As recomendações apresentadas são de carácter técnico-profissional. Confirme sempre com o protocolo do profissional responsável.
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Pesquisar patologia..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          {allTags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              <Button
                variant={selectedTag === null ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedTag(null)}
              >
                Todas
              </Button>
              {allTags.map((tag) => (
                <Button
                  key={tag}
                  variant={selectedTag === tag ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedTag(selectedTag === tag ? null : tag)}
                >
                  {tag}
                </Button>
              ))}
            </div>
          )}
        </div>

        {/* Grid */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Stethoscope className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Nenhuma patologia encontrada.</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((pathology) => (
              <Link key={pathology.id} to={`/client/diagnosis/${pathology.slug}`}>
                <Card className="hover:border-primary/50 hover:shadow-md transition-all cursor-pointer h-full group">
                  {pathology.image_url && (
                    <div className="aspect-video w-full overflow-hidden rounded-t-lg">
                      <img
                        src={pathology.image_url}
                        alt={pathology.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    </div>
                  )}
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg flex items-center justify-between">
                      {pathology.name}
                      <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {pathology.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {pathology.description}
                      </p>
                    )}
                    <div className="flex items-center gap-2 flex-wrap">
                      {(pathology.tags || []).slice(0, 3).map((tag) => (
                        <Badge key={tag} variant="secondary" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                      {(pathology.protocol_count || 0) > 0 && (
                        <Badge variant="outline" className="text-xs">
                          {pathology.protocol_count} protocolo{pathology.protocol_count !== 1 ? "s" : ""}
                        </Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </ClientLayout>
  );
}
