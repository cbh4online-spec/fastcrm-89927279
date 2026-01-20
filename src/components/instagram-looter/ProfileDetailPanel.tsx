import { useState, useEffect } from "react";
import { 
  X, Loader2, User, MapPin, Link as LinkIcon, Instagram, 
  Brain, Save, UserPlus, ExternalLink, CheckCircle2, AlertTriangle,
  Briefcase, Users, Image as ImageIcon
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { useInstagramLooter } from "@/hooks/useInstagramLooter";
import { CreateLeadModal } from "./CreateLeadModal";
import { toast } from "sonner";

interface ProfileDetailPanelProps {
  username: string;
  onClose: () => void;
}

interface ProfileData {
  username: string;
  full_name?: string;
  biography?: string;
  external_url?: string;
  profile_pic_url?: string;
  follower_count?: number;
  following_count?: number;
  media_count?: number;
  is_business_account?: boolean;
  is_verified?: boolean;
  category?: string;
}

interface AIInsight {
  is_individual: boolean;
  category_guess: string;
  specialty_guess: string;
  city_guess: string;
  works_at: string | null;
  contact_signals: string[];
  confidence: number;
  reasons: string[];
  red_flags: string[];
  lead_score: number;
  lead_score_breakdown: {
    activity: number;
    clarity: number;
    location: number;
    contact: number;
    communication: number;
  };
  posting_frequency: string;
}

export function ProfileDetailPanel({ username, onClose }: ProfileDetailPanelProps) {
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [aiInsight, setAiInsight] = useState<AIInsight | null>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showCreateLead, setShowCreateLead] = useState(false);
  const { getProfile, analyzeProfile, saveProfile } = useInstagramLooter();

  useEffect(() => {
    loadProfile();
  }, [username]);

  const loadProfile = async () => {
    setIsLoadingProfile(true);
    setAiInsight(null);
    try {
      const { profile: data } = await getProfile(username);
      setProfile(data);
    } catch (error) {
      toast.error("Erro ao carregar perfil");
    } finally {
      setIsLoadingProfile(false);
    }
  };

  const handleAnalyze = async () => {
    if (!profile) return;
    
    setIsAnalyzing(true);
    try {
      const insight = await analyzeProfile({
        username: profile.username,
        full_name: profile.full_name,
        biography: profile.biography,
        external_url: profile.external_url,
        followers_count: profile.follower_count,
        following_count: profile.following_count,
        media_count: profile.media_count,
        is_business: profile.is_business_account,
        is_verified: profile.is_verified,
        category: profile.category,
      });
      setAiInsight(insight);
      toast.success("Análise IA concluída");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro na análise");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSave = async () => {
    if (!profile) return;
    try {
      await saveProfile.mutateAsync(profile);
    } catch (error) {
      // Toast already shown by mutation
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 70) return "text-green-600";
    if (score >= 40) return "text-yellow-600";
    return "text-red-600";
  };

  const getScoreBg = (score: number) => {
    if (score >= 70) return "bg-green-500";
    if (score >= 40) return "bg-yellow-500";
    return "bg-red-500";
  };

  if (isLoadingProfile) {
    return (
      <Card className="h-fit sticky top-4">
        <CardContent className="py-12 text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
          <p className="text-sm text-muted-foreground mt-2">A carregar perfil...</p>
        </CardContent>
      </Card>
    );
  }

  if (!profile) {
    return (
      <Card className="h-fit sticky top-4">
        <CardContent className="py-12 text-center">
          <User className="h-8 w-8 mx-auto text-muted-foreground" />
          <p className="text-sm text-muted-foreground mt-2">Perfil não encontrado</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-fit sticky top-4">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Detalhe do Perfil</CardTitle>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Profile Header */}
        <div className="flex items-start gap-4">
          <Avatar className="h-16 w-16">
            <AvatarImage src={profile.profile_pic_url} alt={profile.username} />
            <AvatarFallback>
              {profile.username.substring(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-lg">@{profile.username}</h3>
            {profile.full_name && (
              <p className="text-muted-foreground">{profile.full_name}</p>
            )}
            {profile.is_verified && (
              <Badge variant="secondary" className="mt-1">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                Verificado
              </Badge>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-xl font-bold">
              {profile.follower_count?.toLocaleString() || "—"}
            </p>
            <p className="text-xs text-muted-foreground">Seguidores</p>
          </div>
          <div>
            <p className="text-xl font-bold">
              {profile.following_count?.toLocaleString() || "—"}
            </p>
            <p className="text-xs text-muted-foreground">Seguindo</p>
          </div>
          <div>
            <p className="text-xl font-bold">
              {profile.media_count?.toLocaleString() || "—"}
            </p>
            <p className="text-xs text-muted-foreground">Posts</p>
          </div>
        </div>

        {/* Bio */}
        {profile.biography && (
          <div>
            <p className="text-sm whitespace-pre-wrap">{profile.biography}</p>
          </div>
        )}

        {/* External Link */}
        {profile.external_url && (
          <a 
            href={profile.external_url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-sm text-primary hover:underline"
          >
            <LinkIcon className="h-4 w-4" />
            {profile.external_url.replace(/^https?:\/\//, "").split("/")[0]}
          </a>
        )}

        <Separator />

        {/* AI Insight Section */}
        {!aiInsight ? (
          <Button 
            onClick={handleAnalyze} 
            disabled={isAnalyzing}
            className="w-full"
            variant="default"
          >
            {isAnalyzing ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Brain className="h-4 w-4 mr-2" />
            )}
            Analisar com IA
          </Button>
        ) : (
          <div className="space-y-4">
            {/* Lead Score */}
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <p className="text-sm text-muted-foreground mb-1">Lead Score</p>
              <p className={`text-4xl font-bold ${getScoreColor(aiInsight.lead_score)}`}>
                {aiInsight.lead_score}
                <span className="text-lg text-muted-foreground">/100</span>
              </p>
              <div className="mt-2 space-y-1">
                {Object.entries(aiInsight.lead_score_breakdown).map(([key, value]) => (
                  <div key={key} className="flex items-center gap-2 text-xs">
                    <span className="w-24 text-right text-muted-foreground capitalize">
                      {key === "activity" ? "Atividade" :
                       key === "clarity" ? "Clareza" :
                       key === "location" ? "Localização" :
                       key === "contact" ? "Contacto" : "Comunicação"}
                    </span>
                    <Progress 
                      value={(value / (key === "location" || key === "contact" ? 15 : key === "communication" ? 20 : 25)) * 100} 
                      className="flex-1 h-1.5"
                    />
                    <span className="w-6 text-muted-foreground">{value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Classification */}
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="p-3 bg-muted/30 rounded-lg">
                <p className="text-xs text-muted-foreground mb-1">Categoria</p>
                <p className="font-medium">{aiInsight.category_guess}</p>
              </div>
              <div className="p-3 bg-muted/30 rounded-lg">
                <p className="text-xs text-muted-foreground mb-1">Especialidade</p>
                <p className="font-medium">{aiInsight.specialty_guess}</p>
              </div>
              <div className="p-3 bg-muted/30 rounded-lg">
                <p className="text-xs text-muted-foreground mb-1">Cidade</p>
                <p className="font-medium flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  {aiInsight.city_guess}
                </p>
              </div>
              <div className="p-3 bg-muted/30 rounded-lg">
                <p className="text-xs text-muted-foreground mb-1">Tipo</p>
                <p className="font-medium">
                  {aiInsight.is_individual ? "Profissional" : "Empresa/Clínica"}
                </p>
              </div>
            </div>

            {/* Contact Signals */}
            {aiInsight.contact_signals.length > 0 && (
              <div>
                <p className="text-xs text-muted-foreground mb-2">Sinais de Contacto</p>
                <div className="flex flex-wrap gap-1">
                  {aiInsight.contact_signals.map((signal, i) => (
                    <Badge key={i} variant="secondary" className="text-xs">
                      {signal}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Reasons */}
            {aiInsight.reasons.length > 0 && (
              <div>
                <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3 text-green-500" />
                  Pontos Positivos
                </p>
                <ul className="space-y-1">
                  {aiInsight.reasons.map((reason, i) => (
                    <li key={i} className="text-xs text-muted-foreground flex items-start gap-2">
                      <span className="text-green-500 mt-0.5">•</span>
                      {reason}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Red Flags */}
            {aiInsight.red_flags.length > 0 && (
              <div>
                <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3 text-amber-500" />
                  Alertas
                </p>
                <ul className="space-y-1">
                  {aiInsight.red_flags.map((flag, i) => (
                    <li key={i} className="text-xs text-muted-foreground flex items-start gap-2">
                      <span className="text-amber-500 mt-0.5">•</span>
                      {flag}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Confidence */}
            <div className="text-center text-xs text-muted-foreground">
              Confiança da análise: {Math.round(aiInsight.confidence * 100)}%
            </div>
          </div>
        )}

        <Separator />

        {/* Actions */}
        <div className="flex gap-2">
          <Button
            variant="outline"
            className="flex-1"
            onClick={handleSave}
            disabled={saveProfile.isPending}
          >
            <Save className="h-4 w-4 mr-2" />
            Guardar
          </Button>
          <Button
            variant="default"
            className="flex-1"
            onClick={() => setShowCreateLead(true)}
          >
            <UserPlus className="h-4 w-4 mr-2" />
            Criar Lead
          </Button>
        </div>

        {/* Instagram Link */}
        <Button variant="ghost" className="w-full" asChild>
          <a 
            href={`https://instagram.com/${profile.username}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            <Instagram className="h-4 w-4 mr-2" />
            Ver no Instagram
            <ExternalLink className="h-3 w-3 ml-2" />
          </a>
        </Button>

        {/* Create Lead Modal */}
        {profile && (
          <CreateLeadModal
            open={showCreateLead}
            onOpenChange={setShowCreateLead}
            profile={profile}
            insight={aiInsight}
            onSuccess={() => {
              toast.success("Lead criado - pode vê-lo na secção de Leads do CRM");
            }}
          />
        )}
      </CardContent>
    </Card>
  );
}
