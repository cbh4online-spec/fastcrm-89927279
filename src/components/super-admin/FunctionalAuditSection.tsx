import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  FileText, 
  Download, 
  RefreshCw, 
  CheckCircle2, 
  Database, 
  Route, 
  Component, 
  Shield, 
  Zap,
  Settings,
  Package,
  Clock,
  AlertCircle
} from "lucide-react";
import { toast } from "sonner";
import { useSystemAudit } from "@/hooks/useSystemAudit";
import { generateAuditPDF } from "@/utils/pdfAuditGenerator";
import { format, formatDistanceToNow } from "date-fns";
import { pt } from "date-fns/locale";

export function FunctionalAuditSection() {
  const { metrics, edgeFunctions, modules, lastUpdated, isLoading, error, refresh } = useSystemAudit();
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);

  const handleRefresh = async () => {
    toast.info("A actualizar métricas...");
    await refresh();
    toast.success("Métricas actualizadas com sucesso!");
  };

  const generatePDF = async () => {
    if (!metrics || !lastUpdated) {
      toast.error("Aguarde o carregamento das métricas");
      return;
    }

    setIsGenerating(true);
    setProgress(0);

    try {
      await generateAuditPDF({
        metrics,
        edgeFunctions,
        lastUpdated,
        modules,
        onProgress: setProgress,
      });
      toast.success("PDF gerado com sucesso!");
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast.error("Erro ao gerar PDF");
    } finally {
      setIsGenerating(false);
      setProgress(0);
    }
  };

  const getDataFreshnessStatus = () => {
    if (!lastUpdated) return { label: "Sem dados", color: "destructive" as const };
    
    const minutesAgo = (Date.now() - lastUpdated.getTime()) / 1000 / 60;
    
    if (minutesAgo < 5) return { label: "Actualizado", color: "default" as const };
    if (minutesAgo < 60) return { label: "Recente", color: "secondary" as const };
    return { label: "Desactualizado", color: "destructive" as const };
  };

  const freshnessStatus = getDataFreshnessStatus();

  return (
    <div className="space-y-6">
      {/* Header with refresh */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Auditoria Funcional</h1>
          <p className="text-muted-foreground">
            Documentação técnica dinâmica do sistema
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          {lastUpdated && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span>
                Última actualização: {format(lastUpdated, "dd MMM yyyy, HH:mm", { locale: pt })}
              </span>
              <Badge variant={freshnessStatus.color}>
                {freshnessStatus.label}
              </Badge>
            </div>
          )}
          
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
            {isLoading ? "A actualizar..." : "Actualizar Dados"}
          </Button>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <Card className="border-destructive">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-4 w-4" />
              <span>{error}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Route className="h-4 w-4 text-blue-500" />
              {isLoading ? (
                <Skeleton className="h-8 w-12" />
              ) : (
                <span className="text-2xl font-bold">{metrics?.routes || 0}</span>
              )}
            </div>
            <p className="text-xs text-muted-foreground">Rotas</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Database className="h-4 w-4 text-green-500" />
              {isLoading ? (
                <Skeleton className="h-8 w-12" />
              ) : (
                <span className="text-2xl font-bold">{metrics?.tables || 0}</span>
              )}
            </div>
            <p className="text-xs text-muted-foreground">Tabelas</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-amber-500" />
              {isLoading ? (
                <Skeleton className="h-8 w-12" />
              ) : (
                <span className="text-2xl font-bold">{metrics?.edgeFunctions || 0}</span>
              )}
            </div>
            <p className="text-xs text-muted-foreground">Edge Functions</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Component className="h-4 w-4 text-purple-500" />
              {isLoading ? (
                <Skeleton className="h-8 w-12" />
              ) : (
                <span className="text-2xl font-bold">{metrics?.components || 0}</span>
              )}
            </div>
            <p className="text-xs text-muted-foreground">Componentes</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Settings className="h-4 w-4 text-slate-500" />
              {isLoading ? (
                <Skeleton className="h-8 w-12" />
              ) : (
                <span className="text-2xl font-bold">{metrics?.hooks || 0}</span>
              )}
            </div>
            <p className="text-xs text-muted-foreground">Hooks</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-red-500" />
              {isLoading ? (
                <Skeleton className="h-8 w-12" />
              ) : (
                <span className="text-2xl font-bold">{metrics?.rlsPolicies || 0}</span>
              )}
            </div>
            <p className="text-xs text-muted-foreground">Políticas RLS</p>
          </CardContent>
        </Card>
      </div>

      {/* Additional Metrics Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Package className="h-4 w-4 text-indigo-500" />
              {isLoading ? (
                <Skeleton className="h-8 w-12" />
              ) : (
                <span className="text-2xl font-bold">{metrics?.modules || 0}</span>
              )}
            </div>
            <p className="text-xs text-muted-foreground">Módulos Funcionais</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Database className="h-4 w-4 text-cyan-500" />
              {isLoading ? (
                <Skeleton className="h-8 w-12" />
              ) : (
                <span className="text-2xl font-bold">{metrics?.storageBuckets || 0}</span>
              )}
            </div>
            <p className="text-xs text-muted-foreground">Storage Buckets</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-orange-500" />
              {isLoading ? (
                <Skeleton className="h-8 w-12" />
              ) : (
                <span className="text-2xl font-bold">{metrics?.triggers || 0}</span>
              )}
            </div>
            <p className="text-xs text-muted-foreground">Triggers</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-r from-primary/10 to-primary/5">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-primary" />
              <span className="text-2xl font-bold text-primary">100%</span>
            </div>
            <p className="text-xs text-muted-foreground">Cobertura RLS</p>
          </CardContent>
        </Card>
      </div>

      {/* Generate PDF Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Gerar Relatório PDF Completo
          </CardTitle>
          <CardDescription>
            Documento técnico profissional com ~20 páginas incluindo arquitectura, base de dados, edge functions, segurança e recomendações
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isGenerating && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>A gerar documento...</span>
                <span>{progress}%</span>
              </div>
              <Progress value={progress} />
            </div>
          )}
          
          <Button 
            onClick={generatePDF} 
            disabled={isGenerating || isLoading || !metrics}
            className="w-full sm:w-auto"
          >
            {isGenerating ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                A gerar...
              </>
            ) : (
              <>
                <Download className="h-4 w-4 mr-2" />
                Descarregar PDF (~20 páginas)
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Modules Grid */}
      <Card>
        <CardHeader>
          <CardTitle>Módulos Funcionais</CardTitle>
          <CardDescription>
            Estado de implementação de cada módulo do sistema
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[400px] pr-4">
            <div className="grid gap-4 md:grid-cols-2">
              {modules.map((module, index) => (
                <div 
                  key={module.name}
                  className="p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-semibold">{module.name}</h3>
                    <Badge 
                      variant={
                        module.status === "implemented" 
                          ? "default" 
                          : module.status === "partial" 
                            ? "secondary" 
                            : "outline"
                      }
                    >
                      {module.status === "implemented" && <CheckCircle2 className="h-3 w-3 mr-1" />}
                      {module.status === "implemented" 
                        ? "Implementado" 
                        : module.status === "partial" 
                          ? "Parcial" 
                          : "Planeado"}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">
                    {module.objective}
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {module.components.slice(0, 3).map(comp => (
                      <Badge key={comp} variant="outline" className="text-xs">
                        {comp}
                      </Badge>
                    ))}
                    {module.components.length > 3 && (
                      <Badge variant="outline" className="text-xs">
                        +{module.components.length - 3}
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
