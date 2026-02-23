import { useParams, Link } from "react-router-dom";
import { ClientLayout } from "@/components/client-portal/ClientLayout";
import { useClientAuth } from "@/hooks/client-portal/useClientAuth";
import { usePathology } from "@/hooks/client-portal/usePathologies";
import { useProtocolRecommendations } from "@/hooks/client-portal/useAIRecommendations";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight, Stethoscope, Sparkles, Loader2, Info, Package } from "lucide-react";

export default function ClientDiagnosisDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const { clientUser } = useClientAuth();
  const { data: pathology, isLoading } = usePathology(slug, clientUser?.workspace_id);
  const { data: aiRecommendations = [], isLoading: aiLoading } = useProtocolRecommendations(
    pathology?.id,
    clientUser?.workspace_id
  );

  if (isLoading) {
    return (
      <ClientLayout>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </ClientLayout>
    );
  }

  if (!pathology) {
    return (
      <ClientLayout>
        <div className="text-center py-12">
          <p className="text-muted-foreground">Patologia não encontrada.</p>
          <Link to="/client/diagnosis">
            <Button className="mt-4">Voltar ao Diagnóstico</Button>
          </Link>
        </div>
      </ClientLayout>
    );
  }

  return (
    <ClientLayout>
      <div className="space-y-6">
        {/* Back */}
        <Link to="/client/diagnosis">
          <Button variant="ghost" size="sm" className="gap-2">
            <ArrowLeft className="h-4 w-4" /> Voltar
          </Button>
        </Link>

        {/* Header */}
        <div className="flex flex-col md:flex-row gap-6">
          {pathology.image_url && (
            <div className="w-full md:w-64 h-48 rounded-lg overflow-hidden shrink-0">
              <img src={pathology.image_url} alt={pathology.name} className="w-full h-full object-cover" />
            </div>
          )}
          <div className="space-y-3">
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Stethoscope className="h-6 w-6 text-primary" />
              {pathology.name}
            </h1>
            {pathology.description && (
              <p className="text-muted-foreground">{pathology.description}</p>
            )}
            {(pathology.tags || []).length > 0 && (
              <div className="flex flex-wrap gap-2">
                {pathology.tags.map((tag) => (
                  <Badge key={tag} variant="secondary">{tag}</Badge>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Guardrail */}
        <div className="flex items-start gap-3 p-4 rounded-lg border bg-muted/50">
          <Info className="h-5 w-5 text-primary mt-0.5 shrink-0" />
          <p className="text-sm text-muted-foreground">
            Recomendação técnica para a situação selecionada. Confirme sempre com o protocolo do profissional responsável.
          </p>
        </div>

        {/* Protocols */}
        <div>
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Package className="h-5 w-5" />
            Protocolos Disponíveis ({pathology.protocols.length})
          </h2>

          {pathology.protocols.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                Nenhum protocolo associado a esta patologia.
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {pathology.protocols.map((link) => (
                <Link key={link.id} to={`/client/protocol/${link.protocol.id}`}>
                  <Card className="hover:border-primary/50 hover:shadow-md transition-all cursor-pointer h-full group">
                    {link.protocol.image_url && (
                      <div className="aspect-video w-full overflow-hidden rounded-t-lg">
                        <img
                          src={link.protocol.image_url}
                          alt={link.protocol.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      </div>
                    )}
                    <CardHeader>
                      <CardTitle className="text-base flex items-center justify-between">
                        {link.protocol.name}
                        <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary" />
                      </CardTitle>
                      {link.protocol.short_description && (
                        <CardDescription>{link.protocol.short_description}</CardDescription>
                      )}
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center gap-2">
                        {link.protocol.discount_percentage > 0 && (
                          <Badge variant="secondary" className="text-xs">
                            -{link.protocol.discount_percentage}% no kit
                          </Badge>
                        )}
                        {link.notes && (
                          <span className="text-xs text-muted-foreground">{link.notes}</span>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* AI Recommendations */}
        {aiRecommendations.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Protocolos Recomendados pela IA
            </h2>
            <div className="grid gap-3">
              {aiRecommendations.map((rec, i) => (
                <Card key={i} className="border-primary/20 bg-primary/5">
                  <CardContent className="flex items-center justify-between py-4">
                    <div>
                      <p className="font-medium">{rec.protocol_name}</p>
                      <p className="text-sm text-muted-foreground">{rec.reason}</p>
                    </div>
                    <Badge variant={rec.priority === "alta" ? "default" : "secondary"}>
                      {rec.priority}
                    </Badge>
                  </CardContent>
                </Card>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-2 italic">
              Recomendação gerada por IA — confirme com protocolo profissional.
            </p>
          </div>
        )}

        {aiLoading && (
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <Loader2 className="h-4 w-4 animate-spin" />
            A gerar recomendações...
          </div>
        )}
      </div>
    </ClientLayout>
  );
}
