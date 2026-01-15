import { useState } from "react";
import { useAIProfiles } from "@/hooks/useAIProfiles";
import { useKnowledgeBase } from "@/hooks/useKnowledgeBase";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Brain, 
  Plus, 
  TrendingUp, 
  Headphones, 
  Heart, 
  GraduationCap,
  Sparkles,
  Settings,
  BarChart3,
  Shield,
  AlertTriangle
} from "lucide-react";
import { AIProfileCard } from "./AIProfileCard";
import { AIProfileForm } from "./AIProfileForm";
import { AIProfileMetrics } from "./AIProfileMetrics";
import type { AIProfile } from "@/types/ai-profiles";
import { PROFILE_TYPES } from "@/types/ai-profiles";

export function AIProfilesModule() {
  const { 
    profiles, 
    isLoading, 
    createDefaultProfiles, 
    createProfile,
    updateProfile,
    deleteProfile,
    toggleActive
  } = useAIProfiles();
  const { knowledgeBases } = useKnowledgeBase();
  
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingProfile, setEditingProfile] = useState<AIProfile | null>(null);
  const [activeTab, setActiveTab] = useState("profiles");

  const handleCreateDefaults = async () => {
    await createDefaultProfiles();
  };

  const handleSave = async (data: Partial<AIProfile>) => {
    if (editingProfile) {
      await updateProfile(editingProfile.id, data);
    } else {
      await createProfile(data);
    }
    setIsCreateOpen(false);
    setEditingProfile(null);
  };

  const handleEdit = (profile: AIProfile) => {
    setEditingProfile(profile);
    setIsCreateOpen(true);
  };

  const handleDelete = async (id: string) => {
    await deleteProfile(id);
  };

  const handleToggleActive = async (id: string, isActive: boolean) => {
    await toggleActive(id, isActive);
  };

  const getProfileIcon = (type: string) => {
    switch (type) {
      case 'vendas': return TrendingUp;
      case 'suporte': return Headphones;
      case 'clinica': return Heart;
      case 'formacao': return GraduationCap;
      default: return Brain;
    }
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Skeleton className="h-48" />
          <Skeleton className="h-48" />
          <Skeleton className="h-48" />
          <Skeleton className="h-48" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Brain className="h-6 w-6 text-primary" />
            Perfis de IA
          </h1>
          <p className="text-muted-foreground mt-1">
            Define como a IA se comporta em cada contexto de negócio
          </p>
        </div>
        <div className="flex gap-2">
          {profiles.length === 0 && (
            <Button onClick={handleCreateDefaults} variant="outline">
              <Sparkles className="h-4 w-4 mr-2" />
              Criar Perfis Base
            </Button>
          )}
          <Button onClick={() => setIsCreateOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Novo Perfil
          </Button>
        </div>
      </div>

      {/* Info Card */}
      <Card className="bg-primary/5 border-primary/20">
        <CardContent className="pt-4">
          <div className="flex items-start gap-3">
            <Shield className="h-5 w-5 text-primary mt-0.5" />
            <div>
              <h4 className="font-medium text-primary">Governança & Segurança</h4>
              <p className="text-sm text-muted-foreground mt-1">
                Cada perfil define <strong>como</strong>, <strong>para quem</strong> e <strong>com que limites</strong> a IA responde. 
                A IA nunca responde de forma genérica — cada resposta respeita o perfil ativo e o conhecimento validado.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="profiles" className="gap-2">
            <Settings className="h-4 w-4" />
            Perfis
          </TabsTrigger>
          <TabsTrigger value="metrics" className="gap-2">
            <BarChart3 className="h-4 w-4" />
            Métricas
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profiles" className="mt-6">
          {profiles.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Brain className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                <h3 className="font-semibold text-lg mb-2">Nenhum perfil configurado</h3>
                <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                  Os perfis de IA definem o comportamento contextual. 
                  Cria os perfis base para começar.
                </p>
                <Button onClick={handleCreateDefaults} size="lg">
                  <Sparkles className="h-4 w-4 mr-2" />
                  Criar Perfis Base
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {profiles.map((profile) => (
                <AIProfileCard
                  key={profile.id}
                  profile={profile}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  onToggleActive={handleToggleActive}
                  icon={getProfileIcon(profile.profileType)}
                />
              ))}
            </div>
          )}

          {/* Profile Types Reference */}
          {profiles.length > 0 && (
            <Card className="mt-6">
              <CardHeader>
                <CardTitle className="text-base">Tipos de Perfil Disponíveis</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {Object.entries(PROFILE_TYPES).map(([key, config]) => {
                    const Icon = getProfileIcon(key);
                    const hasProfile = profiles.some(p => p.profileType === key);
                    return (
                      <div 
                        key={key}
                        className={`p-3 rounded-lg border ${hasProfile ? 'border-primary/30 bg-primary/5' : 'border-border'}`}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <Icon className="h-4 w-4" />
                          <span className="font-medium text-sm">{config.label}</span>
                          {hasProfile && (
                            <Badge variant="secondary" className="ml-auto text-xs">Ativo</Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">{config.description}</p>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="metrics" className="mt-6">
          <AIProfileMetrics profiles={profiles} />
        </TabsContent>
      </Tabs>

      {/* Create/Edit Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={(open) => {
        setIsCreateOpen(open);
        if (!open) setEditingProfile(null);
      }}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingProfile ? 'Editar Perfil de IA' : 'Novo Perfil de IA'}
            </DialogTitle>
            <DialogDescription>
              Define como a IA se comporta neste contexto específico
            </DialogDescription>
          </DialogHeader>
          <AIProfileForm
            profile={editingProfile}
            knowledgeBases={knowledgeBases}
            onSave={handleSave}
            onCancel={() => {
              setIsCreateOpen(false);
              setEditingProfile(null);
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
