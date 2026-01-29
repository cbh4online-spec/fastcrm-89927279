/**
 * Conversational Engine Module - Main Entry Point
 * Provides unified access to Vibe Profiles, Conversation Rules, and Autopilot Config
 */

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Palette, 
  Shield, 
  Bot, 
  Sparkles,
  Settings,
  MessageSquare,
  Zap
} from "lucide-react";
import { VibeProfilesTab } from "./VibeProfilesTab";
import { ConversationRulesTab } from "./ConversationRulesTab";
import { AutopilotConfigTab } from "./AutopilotConfigTab";
import { useVibeProfiles } from "@/hooks/useVibeProfiles";
import { useConversationRules } from "@/hooks/useConversationRules";
import { useAutopilotConfig } from "@/hooks/useAutopilotConfig";

export function ConversationalEngineModule() {
  const [activeTab, setActiveTab] = useState("vibe");
  
  const { profiles, defaultProfile } = useVibeProfiles();
  const { activeRulesCount } = useConversationRules();
  const { isActive: autopilotActive } = useAutopilotConfig();

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <MessageSquare className="h-6 w-6 text-primary" />
            Motor Conversacional
          </h1>
          <p className="text-muted-foreground mt-1">
            Configure o comportamento, regras e automação da IA conversacional
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="gap-1">
            <Palette className="h-3 w-3" />
            {profiles.length} Vibes
          </Badge>
          <Badge variant="outline" className="gap-1">
            <Shield className="h-3 w-3" />
            {activeRulesCount} Regras
          </Badge>
          <Badge 
            variant={autopilotActive ? "default" : "secondary"} 
            className="gap-1"
          >
            <Bot className="h-3 w-3" />
            {autopilotActive ? "Autopilot Ativo" : "Autopilot Inativo"}
          </Badge>
        </div>
      </div>

      {/* Overview Card */}
      <Card className="bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5 border-primary/20">
        <CardContent className="pt-4">
          <div className="flex items-start gap-3">
            <Sparkles className="h-5 w-5 text-primary mt-0.5" />
            <div>
              <h4 className="font-medium text-primary">Governança & Consistência</h4>
              <p className="text-sm text-muted-foreground mt-1">
                O motor conversacional garante que a IA responde de forma <strong>consistente</strong>, 
                respeitando o <strong>estilo definido</strong> (Vibe), as <strong>regras de negócio</strong> e 
                os <strong>limites de automação</strong>. Nenhuma resposta é enviada sem validação.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="vibe" className="gap-2">
            <Palette className="h-4 w-4" />
            <span className="hidden sm:inline">Perfis de Vibe</span>
            <span className="sm:hidden">Vibe</span>
          </TabsTrigger>
          <TabsTrigger value="rules" className="gap-2">
            <Shield className="h-4 w-4" />
            <span className="hidden sm:inline">Regras de Conversa</span>
            <span className="sm:hidden">Regras</span>
          </TabsTrigger>
          <TabsTrigger value="autopilot" className="gap-2">
            <Bot className="h-4 w-4" />
            <span className="hidden sm:inline">Auto-Pilot</span>
            <span className="sm:hidden">Auto</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="vibe" className="mt-6">
          <VibeProfilesTab />
        </TabsContent>

        <TabsContent value="rules" className="mt-6">
          <ConversationRulesTab />
        </TabsContent>

        <TabsContent value="autopilot" className="mt-6">
          <AutopilotConfigTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
