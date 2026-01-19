import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { 
  BarChart3, Linkedin, Instagram, Facebook, Users, Target,
  RefreshCw, AlertCircle, ExternalLink, Star,
  CheckCircle2, UserPlus, Building2, ChevronDown, Sparkles,
  ClipboardPaste, HelpCircle, Zap, Globe
} from "lucide-react";
import { 
  useCompleteSocialData, 
  useHybridSocialAnalysis,
  useManualSocialAnalysis,
  useApplyDataSuggestions,
  CompleteSocialAnalysis,
  SuggestedContact,
} from "@/hooks/useCompleteSocialAnalysis";
import { formatDistanceToNow } from "date-fns";
import { pt } from "date-fns/locale";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface CompleteSocialAnalysisSectionProps {
  companyId: string;
  companyName: string;
  linkedinUrl?: string | null;
  instagramUrl?: string | null;
  facebookUrl?: string | null;
  currentCompanyData?: {
    industry?: string;
    website?: string;
    size?: string;
    employee_count?: number;
  };
  onCreateContact?: (contact: SuggestedContact) => void;
}

const maturityColors = {
  low: "bg-red-500/10 text-red-600 border-red-500/30",
  medium: "bg-yellow-500/10 text-yellow-600 border-yellow-500/30",
  high: "bg-green-500/10 text-green-600 border-green-500/30"
};

const severityColors = {
  low: "border-blue-500/30 bg-blue-500/5",
  medium: "border-yellow-500/30 bg-yellow-500/5",
  high: "border-red-500/30 bg-red-500/5"
};

const activityColors = {
  high: "text-green-600",
  medium: "text-yellow-600",
  low: "text-red-600",
  unknown: "text-muted-foreground"
};

const activityLabels = {
  high: "⚡ Alta",
  medium: "📊 Média",
  low: "🐢 Baixa",
  unknown: "?"
};

export function CompleteSocialAnalysisSection({
  companyId,
  companyName,
  linkedinUrl,
  instagramUrl,
  facebookUrl,
  currentCompanyData,
  onCreateContact
}: CompleteSocialAnalysisSectionProps) {
  const [liveAnalysis, setLiveAnalysis] = useState<CompleteSocialAnalysis | null>(null);
  const [isManualOpen, setIsManualOpen] = useState(false);
  const [linkedinText, setLinkedinText] = useState("");
  const [employeesText, setEmployeesText] = useState("");
  const [facebookText, setFacebookText] = useState("");
  const [instagramText, setInstagramText] = useState("");
  
  const { data: persistedData, isLoading } = useCompleteSocialData(companyId);
  const hybridMutation = useHybridSocialAnalysis();
  const manualMutation = useManualSocialAnalysis();
  const applyMutation = useApplyDataSuggestions();

  const hasSocialUrls = linkedinUrl || instagramUrl || facebookUrl;
  const analysis = liveAnalysis || persistedData;
  const hasInputText = linkedinText.trim() || employeesText.trim() || facebookText.trim() || instagramText.trim();
  const isAnalyzing = hybridMutation.isPending || manualMutation.isPending;

  // Automatic analysis using URLs
  const handleAutoAnalyze = async () => {
    const result = await hybridMutation.mutateAsync({
      companyId,
      companyName,
      linkedinUrl,
      facebookUrl,
      instagramUrl,
      currentCompanyData,
    });
    setLiveAnalysis(result);
  };

  // Manual analysis with pasted text
  const handleManualAnalyze = async () => {
    const result = await (hasInputText ? manualMutation : hybridMutation).mutateAsync({
      companyId,
      companyName,
      linkedinUrl,
      facebookUrl,
      instagramUrl,
      linkedinText: linkedinText.trim() || undefined,
      employeesText: employeesText.trim() || undefined,
      facebookText: facebookText.trim() || undefined,
      instagramText: instagramText.trim() || undefined,
      currentCompanyData,
    });
    setLiveAnalysis(result);
    setIsManualOpen(false);
    setLinkedinText("");
    setEmployeesText("");
    setFacebookText("");
    setInstagramText("");
  };

  const handleApplySuggestions = () => {
    if (!analysis?.dataSuggestions.length) return;
    applyMutation.mutate({ companyId, suggestions: analysis.dataSuggestions });
  };

  // No social URLs configured
  if (!hasSocialUrls) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-primary" />
            Análise de Redes Sociais
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <AlertCircle className="w-8 h-8 text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">Sem URLs de redes sociais configuradas.</p>
            <p className="text-xs text-muted-foreground mt-1">Adicione LinkedIn, Facebook ou Instagram à empresa.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Loading state
  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-primary" />
            Análise de Redes Sociais
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-12 w-full" />
        </CardContent>
      </Card>
    );
  }

  // Analyzing state
  if (isAnalyzing) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary animate-pulse" />
            A analisar com IA...
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary" />
              <span className="text-sm text-muted-foreground">A recolher dados das redes sociais...</span>
            </div>
            <div className="grid grid-cols-3 gap-2 text-xs text-muted-foreground">
              {linkedinUrl && (
                <div className="flex items-center gap-1">
                  <Linkedin className="w-3 h-3 text-[#0A66C2]" />
                  <span>LinkedIn</span>
                </div>
              )}
              {facebookUrl && (
                <div className="flex items-center gap-1">
                  <Facebook className="w-3 h-3 text-[#1877F2]" />
                  <span>Facebook</span>
                </div>
              )}
              {instagramUrl && (
                <div className="flex items-center gap-1">
                  <Instagram className="w-3 h-3 text-[#E4405F]" />
                  <span>Instagram</span>
                </div>
              )}
            </div>
          </div>
          <Skeleton className="h-24 w-full" />
        </CardContent>
      </Card>
    );
  }

  // No analysis yet - show auto-analyze button
  if (!analysis) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-primary" />
            Análise de Redes Sociais
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* URLs detected */}
          <div className="space-y-2">
            <span className="text-xs text-muted-foreground font-medium">URLs detectadas:</span>
            <div className="flex flex-wrap gap-2">
              {linkedinUrl && (
                <Badge variant="outline" className="gap-1 text-xs">
                  <Linkedin className="w-3 h-3 text-[#0A66C2]" />
                  LinkedIn
                  <CheckCircle2 className="w-3 h-3 text-green-500" />
                </Badge>
              )}
              {facebookUrl && (
                <Badge variant="outline" className="gap-1 text-xs">
                  <Facebook className="w-3 h-3 text-[#1877F2]" />
                  Facebook
                  <CheckCircle2 className="w-3 h-3 text-green-500" />
                </Badge>
              )}
              {instagramUrl && (
                <Badge variant="outline" className="gap-1 text-xs">
                  <Instagram className="w-3 h-3 text-[#E4405F]" />
                  Instagram
                  <CheckCircle2 className="w-3 h-3 text-green-500" />
                </Badge>
              )}
              {!linkedinUrl && (
                <Badge variant="outline" className="gap-1 text-xs text-muted-foreground">
                  <Linkedin className="w-3 h-3" />
                  LinkedIn
                  <AlertCircle className="w-3 h-3" />
                </Badge>
              )}
              {!facebookUrl && (
                <Badge variant="outline" className="gap-1 text-xs text-muted-foreground">
                  <Facebook className="w-3 h-3" />
                  Facebook
                  <AlertCircle className="w-3 h-3" />
                </Badge>
              )}
              {!instagramUrl && (
                <Badge variant="outline" className="gap-1 text-xs text-muted-foreground">
                  <Instagram className="w-3 h-3" />
                  Instagram
                  <AlertCircle className="w-3 h-3" />
                </Badge>
              )}
            </div>
          </div>

          {/* Auto analyze button */}
          <Button 
            onClick={handleAutoAnalyze} 
            className="w-full gap-2"
            size="lg"
          >
            <Zap className="w-4 h-4" />
            Analisar Automaticamente
          </Button>

          {/* Manual input collapsible */}
          <Collapsible open={isManualOpen} onOpenChange={setIsManualOpen}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="w-full gap-2 text-xs text-muted-foreground">
                <ClipboardPaste className="w-3 h-3" />
                Adicionar dados manualmente (opcional)
                <ChevronDown className={`w-3 h-3 transition-transform ${isManualOpen ? 'rotate-180' : ''}`} />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-4 pt-4">
              <p className="text-xs text-muted-foreground">
                Cole texto das páginas para enriquecer a análise com dados específicos.
              </p>
              <ManualInputForm
                linkedinUrl={linkedinUrl}
                facebookUrl={facebookUrl}
                instagramUrl={instagramUrl}
                linkedinText={linkedinText}
                setLinkedinText={setLinkedinText}
                employeesText={employeesText}
                setEmployeesText={setEmployeesText}
                facebookText={facebookText}
                setFacebookText={setFacebookText}
                instagramText={instagramText}
                setInstagramText={setInstagramText}
              />
              <Button 
                onClick={handleManualAnalyze} 
                className="w-full gap-2"
                variant="secondary"
              >
                <Sparkles className="w-4 h-4" />
                Analisar com Dados Manuais
              </Button>
            </CollapsibleContent>
          </Collapsible>
        </CardContent>
      </Card>
    );
  }

  // Has analysis - show results with option to update
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-primary" />
              Análise de Redes Sociais
            </CardTitle>
            {analysis.analyzedAt && (
              <Badge variant="outline" className="text-xs gap-1">
                <CheckCircle2 className="w-3 h-3 text-green-500" />
                {formatDistanceToNow(new Date(analysis.analyzedAt), { addSuffix: true, locale: pt })}
              </Badge>
            )}
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setIsManualOpen(!isManualOpen)}
          >
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Update Input Form (Collapsible) */}
        <Collapsible open={isManualOpen} onOpenChange={setIsManualOpen}>
          <CollapsibleContent className="space-y-4 pb-4 border-b">
            <ManualInputForm
              linkedinUrl={linkedinUrl}
              facebookUrl={facebookUrl}
              instagramUrl={instagramUrl}
              linkedinText={linkedinText}
              setLinkedinText={setLinkedinText}
              employeesText={employeesText}
              setEmployeesText={setEmployeesText}
              facebookText={facebookText}
              setFacebookText={setFacebookText}
              instagramText={instagramText}
              setInstagramText={setInstagramText}
            />
            <Button 
              onClick={handleManualAnalyze} 
              className="w-full gap-2"
              disabled={isAnalyzing}
            >
              <Sparkles className="w-4 h-4" />
              Atualizar Análise
            </Button>
          </CollapsibleContent>
        </Collapsible>

        {/* Digital Maturity */}
        <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
          <div>
            <span className="text-sm font-medium">Maturidade Digital</span>
            <p className="text-xs text-muted-foreground">{analysis.digitalMaturity.reason}</p>
          </div>
          <Badge variant="outline" className={maturityColors[analysis.digitalMaturity.level]}>
            {analysis.digitalMaturity.score}/100
          </Badge>
        </div>

        {/* Platform Stats */}
        <div className="grid grid-cols-3 gap-2">
          {analysis.linkedin && (
            <div className="bg-[#0A66C2]/10 rounded-lg p-3 text-center">
              <Linkedin className="w-5 h-5 text-[#0A66C2] mx-auto mb-1" />
              <div className="text-lg font-semibold">
                {analysis.linkedin.followersCount?.toLocaleString() || analysis.linkedin.employeeCount?.toLocaleString() || "?"}
              </div>
              <div className="text-[10px] text-muted-foreground">
                {analysis.linkedin.followersCount ? "seguidores" : "funcionários"}
              </div>
              <div className={`text-[10px] mt-1 ${activityColors[analysis.linkedin.activityLevel]}`}>
                {activityLabels[analysis.linkedin.activityLevel]}
              </div>
            </div>
          )}
          {analysis.facebook && (
            <div className="bg-[#1877F2]/10 rounded-lg p-3 text-center">
              <Facebook className="w-5 h-5 text-[#1877F2] mx-auto mb-1" />
              <div className="text-lg font-semibold">
                {analysis.facebook.followersCount?.toLocaleString() || "?"}
              </div>
              <div className="text-[10px] text-muted-foreground">seguidores</div>
              {analysis.facebook.rating && (
                <div className="flex items-center justify-center gap-1 mt-1">
                  <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                  <span className="text-[10px]">{analysis.facebook.rating}/5</span>
                </div>
              )}
            </div>
          )}
          {analysis.instagram && (
            <div className="bg-[#E4405F]/10 rounded-lg p-3 text-center">
              <Instagram className="w-5 h-5 text-[#E4405F] mx-auto mb-1" />
              <div className="text-lg font-semibold">
                {analysis.instagram.followersCount?.toLocaleString() || "?"}
              </div>
              <div className="text-[10px] text-muted-foreground">seguidores</div>
              <div className={`text-[10px] mt-1 ${activityColors[analysis.instagram.activityLevel]}`}>
                {activityLabels[analysis.instagram.activityLevel]}
              </div>
            </div>
          )}
        </div>

        {/* Suggested Contacts */}
        {analysis.suggestedContacts.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Users className="w-4 h-4 text-primary" />
                Funcionários Encontrados ({analysis.suggestedContacts.length})
              </div>
            </div>
            <div className="space-y-1.5 max-h-40 overflow-y-auto">
              {analysis.suggestedContacts.slice(0, 5).map((person, i) => (
                <div key={i} className="flex items-center justify-between bg-muted/50 rounded-md px-3 py-2">
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium truncate">{person.name}</div>
                    <div className="text-xs text-muted-foreground truncate">{person.role}</div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {person.linkedinUrl && (
                      <Button variant="ghost" size="sm" asChild className="h-7 w-7 p-0">
                        <a href={person.linkedinUrl} target="_blank" rel="noopener noreferrer">
                          <Linkedin className="w-3.5 h-3.5 text-[#0A66C2]" />
                        </a>
                      </Button>
                    )}
                    {onCreateContact && (
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => onCreateContact(person)}>
                        <UserPlus className="w-3.5 h-3.5 text-green-600" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Data Suggestions */}
        {analysis.dataSuggestions.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Building2 className="w-4 h-4 text-primary" />
              Sugestões de Atualização
            </div>
            <div className="space-y-1.5">
              {analysis.dataSuggestions.map((s, i) => (
                <div key={i} className="flex items-center justify-between text-xs bg-muted/50 rounded px-2 py-1.5">
                  <span className="text-muted-foreground">{s.field}:</span>
                  <span className="font-medium">{s.suggestedValue}</span>
                </div>
              ))}
            </div>
            <Button size="sm" variant="outline" className="w-full gap-2" onClick={handleApplySuggestions} disabled={applyMutation.isPending}>
              <CheckCircle2 className="w-3.5 h-3.5" />
              Aplicar Sugestões
            </Button>
          </div>
        )}

        {/* Sales Opportunities */}
        {analysis.salesOpportunities.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Target className="w-4 h-4 text-primary" />
              Oportunidades de Venda
            </div>
            <div className="space-y-2">
              {analysis.salesOpportunities.slice(0, 4).map((opp, i) => (
                <div key={i} className={`rounded-lg border p-3 ${severityColors[opp.severity]}`}>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="text-sm font-medium">{opp.title}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">{opp.description}</div>
                    </div>
                    <Badge variant="outline" className="shrink-0 text-[10px]">
                      {opp.service}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* External Links */}
        <div className="flex gap-3 text-xs">
          {linkedinUrl && (
            <a href={linkedinUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-muted-foreground hover:text-primary">
              <ExternalLink className="h-3 w-3" /> LinkedIn
            </a>
          )}
          {facebookUrl && (
            <a href={facebookUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-muted-foreground hover:text-primary">
              <ExternalLink className="h-3 w-3" /> Facebook
            </a>
          )}
          {instagramUrl && (
            <a href={instagramUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-muted-foreground hover:text-primary">
              <ExternalLink className="h-3 w-3" /> Instagram
            </a>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// Manual Input Form Component
interface ManualInputFormProps {
  linkedinUrl?: string | null;
  facebookUrl?: string | null;
  instagramUrl?: string | null;
  linkedinText: string;
  setLinkedinText: (v: string) => void;
  employeesText: string;
  setEmployeesText: (v: string) => void;
  facebookText: string;
  setFacebookText: (v: string) => void;
  instagramText: string;
  setInstagramText: (v: string) => void;
}

function ManualInputForm({
  linkedinUrl,
  facebookUrl,
  instagramUrl,
  linkedinText,
  setLinkedinText,
  employeesText,
  setEmployeesText,
  facebookText,
  setFacebookText,
  instagramText,
  setInstagramText,
}: ManualInputFormProps) {
  return (
    <TooltipProvider>
      <Tabs defaultValue="linkedin" className="w-full">
        <TabsList className="w-full grid grid-cols-3 h-8">
          {linkedinUrl && <TabsTrigger value="linkedin" className="text-xs gap-1"><Linkedin className="w-3 h-3" /> LinkedIn</TabsTrigger>}
          {facebookUrl && <TabsTrigger value="facebook" className="text-xs gap-1"><Facebook className="w-3 h-3" /> Facebook</TabsTrigger>}
          {instagramUrl && <TabsTrigger value="instagram" className="text-xs gap-1"><Instagram className="w-3 h-3" /> Instagram</TabsTrigger>}
        </TabsList>

        {linkedinUrl && (
          <TabsContent value="linkedin" className="space-y-3 mt-3">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium flex items-center gap-1.5">
                  <ClipboardPaste className="w-3 h-3" />
                  Sobre a Empresa
                </label>
                <div className="flex items-center gap-2">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <HelpCircle className="w-3.5 h-3.5 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent side="left" className="max-w-xs">
                      <p className="text-xs">Abra a página do LinkedIn → Clique em "Sobre" → Selecione e copie todo o texto da secção</p>
                    </TooltipContent>
                  </Tooltip>
                  <a 
                    href={linkedinUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-[10px] text-primary hover:underline flex items-center gap-0.5"
                  >
                    Abrir <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                </div>
              </div>
              <Textarea 
                placeholder="Cole aqui o texto da secção 'Sobre' do LinkedIn..."
                value={linkedinText}
                onChange={(e) => setLinkedinText(e.target.value)}
                className="min-h-[80px] text-xs resize-none"
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium flex items-center gap-1.5">
                  <Users className="w-3 h-3" />
                  Lista de Funcionários
                </label>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <HelpCircle className="w-3.5 h-3.5 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent side="left" className="max-w-xs">
                    <p className="text-xs">Vá a "Pessoas" no perfil → Selecione nomes e cargos → Cole aqui (formato: Nome - Cargo)</p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <Textarea 
                placeholder="Cole a lista de funcionários (nome e cargo)..."
                value={employeesText}
                onChange={(e) => setEmployeesText(e.target.value)}
                className="min-h-[80px] text-xs resize-none"
              />
            </div>
          </TabsContent>
        )}

        {facebookUrl && (
          <TabsContent value="facebook" className="space-y-3 mt-3">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium flex items-center gap-1.5">
                  <ClipboardPaste className="w-3 h-3" />
                  Sobre a Página
                </label>
                <div className="flex items-center gap-2">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <HelpCircle className="w-3.5 h-3.5 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent side="left" className="max-w-xs">
                      <p className="text-xs">Abra a página → Clique em "Sobre" → Copie toda a informação (seguidores, categoria, descrição)</p>
                    </TooltipContent>
                  </Tooltip>
                  <a 
                    href={facebookUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-[10px] text-primary hover:underline flex items-center gap-0.5"
                  >
                    Abrir <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                </div>
              </div>
              <Textarea 
                placeholder="Cole aqui informação da página do Facebook (seguidores, gostos, avaliação, descrição)..."
                value={facebookText}
                onChange={(e) => setFacebookText(e.target.value)}
                className="min-h-[100px] text-xs resize-none"
              />
            </div>
          </TabsContent>
        )}

        {instagramUrl && (
          <TabsContent value="instagram" className="space-y-3 mt-3">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium flex items-center gap-1.5">
                  <ClipboardPaste className="w-3 h-3" />
                  Perfil do Instagram
                </label>
                <div className="flex items-center gap-2">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <HelpCircle className="w-3.5 h-3.5 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent side="left" className="max-w-xs">
                      <p className="text-xs">Abra o perfil → Copie o número de seguidores, publicações, e a bio</p>
                    </TooltipContent>
                  </Tooltip>
                  <a 
                    href={instagramUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-[10px] text-primary hover:underline flex items-center gap-0.5"
                  >
                    Abrir <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                </div>
              </div>
              <Textarea 
                placeholder="Cole aqui dados do Instagram (seguidores, publicações, bio)..."
                value={instagramText}
                onChange={(e) => setInstagramText(e.target.value)}
                className="min-h-[100px] text-xs resize-none"
              />
            </div>
          </TabsContent>
        )}
      </Tabs>
    </TooltipProvider>
  );
}
