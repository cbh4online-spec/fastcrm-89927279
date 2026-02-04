import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { 
  Settings, 
  ExternalLink, 
  Palette, 
  Mail, 
  ShoppingBag, 
  Eye,
  Copy,
  Check,
  Globe,
  Image,
  FileText,
  Store,
  Users,
  Lock,
  Bell
} from "lucide-react";
import { useState } from "react";

export default function B2BPortalSettingsPage() {
  const { currentWorkspace } = useWorkspace();
  const queryClient = useQueryClient();
  const [copied, setCopied] = useState(false);

  // Get portal URL - dynamic based on current origin
  const portalUrl = currentWorkspace?.slug 
    ? `${window.location.origin}/client/login?workspace=${currentWorkspace.slug}`
    : `${window.location.origin}/client/login`;

  // Fetch workspace settings
  const { data: workspace } = useQuery({
    queryKey: ["workspace-portal-settings", currentWorkspace?.id],
    queryFn: async () => {
      if (!currentWorkspace?.id) return null;
      const { data, error } = await supabase
        .from("workspaces")
        .select("*")
        .eq("id", currentWorkspace.id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!currentWorkspace?.id,
  });

  // Fetch email templates
  const { data: emailTemplates = [] } = useQuery({
    queryKey: ["email-templates", currentWorkspace?.id],
    queryFn: async () => {
      if (!currentWorkspace?.id) return [];
      const { data, error } = await supabase
        .from("workspace_email_templates")
        .select("*")
        .eq("workspace_id", currentWorkspace.id);
      if (error) throw error;
      return data || [];
    },
    enabled: !!currentWorkspace?.id,
  });

  // Products count - static for now to avoid type issues
  const productsCount = 0;

  // Fetch clients count
  const { data: clientsCount = 0 } = useQuery<number>({
    queryKey: ["clients-count", currentWorkspace?.id],
    queryFn: async (): Promise<number> => {
      if (!currentWorkspace?.id) return 0;
      const { count, error } = await supabase
        .from("client_users")
        .select("id", { count: "exact", head: true })
        .eq("workspace_id", currentWorkspace.id);
      if (error) throw error;
      return count ?? 0;
    },
    enabled: !!currentWorkspace?.id,
  });

  const copyToClipboard = async () => {
    await navigator.clipboard.writeText(portalUrl);
    setCopied(true);
    toast.success("Link copiado!");
    setTimeout(() => setCopied(false), 2000);
  };

  const openPortal = () => {
    window.open(portalUrl, "_blank");
  };

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Store className="h-6 w-6" />
              Portal B2B
            </h1>
            <p className="text-muted-foreground">
              Configurar e personalizar o portal de clientes profissionais
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={copyToClipboard}>
              {copied ? <Check className="h-4 w-4 mr-2" /> : <Copy className="h-4 w-4 mr-2" />}
              Copiar Link
            </Button>
            <Button onClick={openPortal}>
              <ExternalLink className="h-4 w-4 mr-2" />
              Abrir Portal
            </Button>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-primary/10 rounded-lg">
                  <Users className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{clientsCount}</p>
                  <p className="text-sm text-muted-foreground">Clientes B2B</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-emerald-500/10 rounded-lg">
                  <ShoppingBag className="h-5 w-5 text-emerald-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{productsCount}</p>
                  <p className="text-sm text-muted-foreground">Produtos Ativos</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-sky-500/10 rounded-lg">
                  <Mail className="h-5 w-5 text-sky-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{emailTemplates.length}</p>
                  <p className="text-sm text-muted-foreground">Templates Email</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-orange-500/10 rounded-lg">
                  <Globe className="h-5 w-5 text-orange-600" />
                </div>
                <div>
                  <Badge variant="outline" className="text-emerald-600 border-emerald-600">
                    Ativo
                  </Badge>
                  <p className="text-sm text-muted-foreground">Estado do Portal</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Portal URL */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5" />
              Endereço do Portal
            </CardTitle>
            <CardDescription>
              Partilhe este link com os seus clientes profissionais
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Input 
                value={portalUrl} 
                readOnly 
                className="font-mono text-sm"
              />
              <Button variant="outline" size="icon" onClick={copyToClipboard}>
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
              <Button variant="outline" size="icon" onClick={openPortal}>
                <ExternalLink className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Settings Tabs */}
        <Tabs defaultValue="branding" className="space-y-4">
          <TabsList>
            <TabsTrigger value="branding" className="flex items-center gap-2">
              <Palette className="h-4 w-4" />
              Branding
            </TabsTrigger>
            <TabsTrigger value="catalog" className="flex items-center gap-2">
              <ShoppingBag className="h-4 w-4" />
              Catálogo
            </TabsTrigger>
            <TabsTrigger value="emails" className="flex items-center gap-2">
              <Mail className="h-4 w-4" />
              Emails
            </TabsTrigger>
            <TabsTrigger value="access" className="flex items-center gap-2">
              <Lock className="h-4 w-4" />
              Acessos
            </TabsTrigger>
          </TabsList>

          <TabsContent value="branding" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Identidade Visual</CardTitle>
                <CardDescription>
                  Personalize a aparência do portal para os seus clientes
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Logótipo</Label>
                    <div className="border-2 border-dashed rounded-lg p-6 text-center">
                      {workspace?.logo_url ? (
                        <img 
                          src={workspace.logo_url} 
                          alt="Logo" 
                          className="h-16 mx-auto object-contain"
                        />
                      ) : (
                        <div className="text-muted-foreground">
                          <Image className="h-8 w-8 mx-auto mb-2 opacity-50" />
                          <p className="text-sm">Nenhum logo definido</p>
                        </div>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Configure o logo nas Definições do Workspace
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label>Cor Principal</Label>
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-10 h-10 rounded-lg border"
                        style={{ backgroundColor: workspace?.primary_color || "#3b82f6" }}
                      />
                      <Input 
                        value={workspace?.primary_color || "#3b82f6"} 
                        readOnly
                        className="font-mono"
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Configure a cor nas Definições do Workspace
                    </p>
                  </div>
                </div>

                <Separator />

                <div className="space-y-2">
                  <Label>Nome do Portal</Label>
                  <Input 
                    value={workspace?.name || "FastCRM"} 
                    readOnly
                  />
                  <p className="text-xs text-muted-foreground">
                    O nome do workspace é usado como nome do portal
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="catalog" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Configuração do Catálogo</CardTitle>
                <CardDescription>
                  Gerir os produtos disponíveis no portal
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-4">
                    <ShoppingBag className="h-8 w-8 text-muted-foreground" />
                    <div>
                      <p className="font-medium">{productsCount} Produtos Ativos</p>
                      <p className="text-sm text-muted-foreground">
                        Disponíveis no catálogo do portal
                      </p>
                    </div>
                  </div>
                  <Button variant="outline" asChild>
                    <a href="/dashboard/products">
                      Gerir Produtos
                    </a>
                  </Button>
                </div>

                <Separator />

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Mostrar Preços</Label>
                      <p className="text-sm text-muted-foreground">
                        Exibir preços no catálogo público
                      </p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Permitir Encomendas</Label>
                      <p className="text-sm text-muted-foreground">
                        Clientes podem fazer encomendas online
                      </p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Favoritos</Label>
                      <p className="text-sm text-muted-foreground">
                        Clientes podem guardar produtos favoritos
                      </p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="emails" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Templates de Email</CardTitle>
                <CardDescription>
                  Personalizar emails enviados aos clientes
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {emailTemplates.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Mail className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Nenhum template de email configurado</p>
                    <p className="text-sm">Os emails usarão o template padrão</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {emailTemplates.map((template: any) => (
                      <div 
                        key={template.id}
                        className="flex items-center justify-between p-4 border rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          <FileText className="h-5 w-5 text-muted-foreground" />
                          <div>
                            <p className="font-medium">{template.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {template.template_type}
                            </p>
                          </div>
                        </div>
                        <Button variant="ghost" size="sm">
                          Editar
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="access" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Controlo de Acessos</CardTitle>
                <CardDescription>
                  Configurar permissões e segurança do portal
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Registo Público</Label>
                    <p className="text-sm text-muted-foreground">
                      Permitir que novos clientes se registem
                    </p>
                  </div>
                  <Switch />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Aprovação de Conta</Label>
                    <p className="text-sm text-muted-foreground">
                      Novos registos requerem aprovação manual
                    </p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Notificações de Login</Label>
                    <p className="text-sm text-muted-foreground">
                      Receber alerta quando clientes acedem ao portal
                    </p>
                  </div>
                  <Switch />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Clientes com Acesso</CardTitle>
                <CardDescription>
                  {clientsCount} clientes com acesso ao portal
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="outline" asChild>
                  <a href="/dashboard/client-users">
                    <Users className="h-4 w-4 mr-2" />
                    Gerir Clientes B2B
                  </a>
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
