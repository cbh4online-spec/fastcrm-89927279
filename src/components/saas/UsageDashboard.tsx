import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Users, 
  Contact, 
  Building2, 
  Target, 
  Copy, 
  Zap,
  Mail,
  MessageCircle,
  Instagram,
  Brain,
  TrendingUp,
  BarChart3
} from "lucide-react";
import { useSaasManagement } from "@/hooks/useSaasManagement";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { UsageProgressBar } from "./UsageProgressBar";
import { cn } from "@/lib/utils";

interface UsageDashboardProps {
  className?: string;
}

const iconMap: Record<string, React.ReactNode> = {
  leads: <Users className="w-4 h-4" />,
  contacts: <Contact className="w-4 h-4" />,
  companies: <Building2 className="w-4 h-4" />,
  opportunities: <Target className="w-4 h-4" />,
  templates: <Copy className="w-4 h-4" />,
  automations: <Zap className="w-4 h-4" />,
  emails: <Mail className="w-4 h-4" />,
  whatsapp: <MessageCircle className="w-4 h-4" />,
  instagram: <Instagram className="w-4 h-4" />,
  ai_calls: <Brain className="w-4 h-4" />,
  users: <Users className="w-4 h-4" />,
};

export function UsageDashboard({ className }: UsageDashboardProps) {
  const { usage, isLoading, getPlanLimit, isPlanFeatureEnabled } = useSaasManagement();
  const { plan } = useSubscription();

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64 mt-2" />
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  const entityUsage = [
    { key: "leads", label: "Leads", current: usage?.leads_count ?? 0, limitKey: "max_leads" },
    { key: "contacts", label: "Contactos", current: usage?.contacts_count ?? 0, limitKey: "max_contacts" },
    { key: "companies", label: "Empresas", current: usage?.companies_count ?? 0, limitKey: "max_companies" },
    { key: "opportunities", label: "Oportunidades", current: usage?.opportunities_count ?? 0, limitKey: "max_opportunities" },
    { key: "templates", label: "Templates", current: usage?.templates_count ?? 0, limitKey: "max_templates" },
    { key: "automations", label: "Automações", current: usage?.automations_count ?? 0, limitKey: "max_automations" },
  ];

  const communicationUsage = [
    { key: "emails", label: "Emails/mês", current: usage?.emails_sent ?? 0, limitKey: "max_emails_month" },
    { key: "whatsapp", label: "WhatsApp/mês", current: usage?.whatsapp_sent ?? 0, limitKey: "max_whatsapp_month" },
    { key: "instagram", label: "Instagram/mês", current: usage?.instagram_sent ?? 0, limitKey: "max_instagram_month" },
  ];

  const aiUsage = [
    { key: "ai_calls", label: "Chamadas IA/mês", current: usage?.ai_calls_used ?? 0, limitKey: "max_ai_calls" },
  ];

  const membersLimit = getPlanLimit(plan, "max_users") ?? 1;

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-primary" />
          <CardTitle>Utilização do Plano</CardTitle>
        </div>
        <CardDescription>
          Consumo atual vs limites do seu plano {plan.charAt(0).toUpperCase() + plan.slice(1)}
        </CardDescription>
      </CardHeader>

      <CardContent>
        <Tabs defaultValue="entities" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="entities" className="gap-1">
              <Users className="w-3.5 h-3.5" />
              Entidades
            </TabsTrigger>
            <TabsTrigger value="communication" className="gap-1">
              <Mail className="w-3.5 h-3.5" />
              Comunicação
            </TabsTrigger>
            <TabsTrigger value="ai" className="gap-1">
              <Brain className="w-3.5 h-3.5" />
              IA
            </TabsTrigger>
          </TabsList>

          <TabsContent value="entities" className="space-y-4 mt-4">
            {/* Team members */}
            <UsageProgressBar
              label="Utilizadores"
              current={usage?.members_count ?? 0}
              limit={membersLimit}
              icon={iconMap.users}
            />
            
            {entityUsage.map((item) => {
              const limit = getPlanLimit(plan, item.limitKey) ?? 0;
              return (
                <UsageProgressBar
                  key={item.key}
                  label={item.label}
                  current={item.current}
                  limit={limit}
                  icon={iconMap[item.key]}
                />
              );
            })}
          </TabsContent>

          <TabsContent value="communication" className="space-y-4 mt-4">
            {communicationUsage.map((item) => {
              const limit = getPlanLimit(plan, item.limitKey) ?? 0;
              const isEnabled = limit !== 0;
              
              if (!isEnabled && plan === "free") {
                return (
                  <div 
                    key={item.key}
                    className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 opacity-50"
                  >
                    {iconMap[item.key]}
                    <span className="text-sm text-muted-foreground">
                      {item.label} - Não disponível no plano Free
                    </span>
                  </div>
                );
              }

              return (
                <UsageProgressBar
                  key={item.key}
                  label={item.label}
                  current={item.current}
                  limit={limit}
                  icon={iconMap[item.key]}
                />
              );
            })}
          </TabsContent>

          <TabsContent value="ai" className="space-y-4 mt-4">
            {isPlanFeatureEnabled(plan, "ai_suggestions_enabled") || isPlanFeatureEnabled(plan, "ai_insights_enabled") ? (
              aiUsage.map((item) => {
                const limit = getPlanLimit(plan, item.limitKey) ?? 0;
                return (
                  <UsageProgressBar
                    key={item.key}
                    label={item.label}
                    current={item.current}
                    limit={limit}
                    icon={iconMap[item.key]}
                  />
                );
              })
            ) : (
              <div className="text-center py-8">
                <Brain className="w-12 h-12 text-muted-foreground/50 mx-auto mb-3" />
                <p className="text-muted-foreground">
                  Funcionalidades de IA não disponíveis no plano atual.
                </p>
                <p className="text-sm text-muted-foreground">
                  Faça upgrade para Pro ou Agency para aceder.
                </p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
