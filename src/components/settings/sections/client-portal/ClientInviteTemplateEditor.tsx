import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { 
  Save, 
  RotateCcw, 
  Eye, 
  Mail, 
  Palette, 
  Type, 
  Link as LinkIcon, 
  List,
  Plus,
  X,
  Loader2,
  Image as ImageIcon,
  Upload
} from "lucide-react";

interface EmailTemplate {
  id?: string;
  workspace_id: string;
  template_type: string;
  logo_url: string | null;
  primary_color: string;
  secondary_color: string;
  header_title: string;
  greeting_template: string;
  intro_text: string;
  features_title: string;
  features_list: string[];
  button_text: string;
  footer_text: string;
  custom_portal_url: string | null;
}

const defaultTemplate: Omit<EmailTemplate, "id" | "workspace_id"> = {
  template_type: "client_invitation",
  logo_url: null,
  primary_color: "#6366f1",
  secondary_color: "#8b5cf6",
  header_title: "Portal de Clientes",
  greeting_template: "Olá {{client_name}}!",
  intro_text: "Foi convidado(a) para aceder ao Portal de Clientes de {{workspace_name}}.",
  features_title: "No portal, poderá:",
  features_list: [
    "Fazer encomendas de forma rápida e fácil",
    "Consultar o histórico de encomendas",
    "Acompanhar o estado das suas encomendas",
    "Gerir os seus dados de facturação"
  ],
  button_text: "Aceder ao Portal",
  footer_text: "Este email foi enviado automaticamente por {{workspace_name}}.",
  custom_portal_url: null,
};

export function ClientInviteTemplateEditor() {
  const { currentWorkspace } = useWorkspace();
  const queryClient = useQueryClient();
  const [template, setTemplate] = useState<EmailTemplate | null>(null);
  const [newFeature, setNewFeature] = useState("");
  const [showPreview, setShowPreview] = useState(false);

  // Fetch existing template
  const { data: existingTemplate, isLoading } = useQuery({
    queryKey: ["client-invite-template", currentWorkspace?.id],
    queryFn: async () => {
      if (!currentWorkspace?.id) return null;
      
      const { data, error } = await supabase
        .from("workspace_email_templates")
        .select("*")
        .eq("workspace_id", currentWorkspace.id)
        .eq("template_type", "client_invitation")
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
    enabled: !!currentWorkspace?.id,
  });

  // Initialize template state
  useEffect(() => {
    if (existingTemplate) {
      // Convert Json[] to string[]
      const featuresList = Array.isArray(existingTemplate.features_list) 
        ? (existingTemplate.features_list as unknown[]).map(item => String(item))
        : defaultTemplate.features_list;
      
      setTemplate({
        ...existingTemplate,
        features_list: featuresList,
      });
    } else if (currentWorkspace?.id && !isLoading) {
      setTemplate({
        ...defaultTemplate,
        workspace_id: currentWorkspace.id,
      });
    }
  }, [existingTemplate, currentWorkspace?.id, isLoading]);

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async (data: EmailTemplate) => {
      if (!currentWorkspace?.id) throw new Error("Workspace não encontrado");

      const payload = {
        workspace_id: currentWorkspace.id,
        template_type: "client_invitation",
        logo_url: data.logo_url,
        primary_color: data.primary_color,
        secondary_color: data.secondary_color,
        header_title: data.header_title,
        greeting_template: data.greeting_template,
        intro_text: data.intro_text,
        features_title: data.features_title,
        features_list: data.features_list,
        button_text: data.button_text,
        footer_text: data.footer_text,
        custom_portal_url: data.custom_portal_url || null,
      };

      if (data.id) {
        const { error } = await supabase
          .from("workspace_email_templates")
          .update(payload)
          .eq("id", data.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("workspace_email_templates")
          .insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("Template guardado com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["client-invite-template"] });
    },
    onError: (error) => {
      toast.error("Erro ao guardar template: " + error.message);
    },
  });

  const handleSave = () => {
    if (template) {
      saveMutation.mutate(template);
    }
  };

  const handleReset = () => {
    if (currentWorkspace?.id) {
      setTemplate({
        ...defaultTemplate,
        workspace_id: currentWorkspace.id,
        id: template?.id,
      });
    }
  };

  const addFeature = () => {
    if (newFeature.trim() && template) {
      setTemplate({
        ...template,
        features_list: [...template.features_list, newFeature.trim()],
      });
      setNewFeature("");
    }
  };

  const removeFeature = (index: number) => {
    if (template) {
      setTemplate({
        ...template,
        features_list: template.features_list.filter((_, i) => i !== index),
      });
    }
  };

  const updateField = <K extends keyof EmailTemplate>(field: K, value: EmailTemplate[K]) => {
    if (template) {
      setTemplate({ ...template, [field]: value });
    }
  };

  if (isLoading || !template) {
    return (
      <Card>
        <CardContent className="py-8 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                Template de Convite para Portal
              </CardTitle>
              <CardDescription>
                Personalize o email enviado quando convida clientes B2B para o portal
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setShowPreview(!showPreview)}
              >
                <Eye className="h-4 w-4 mr-2" />
                {showPreview ? "Ocultar" : "Pré-visualizar"}
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={handleReset}
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Repor
              </Button>
              <Button 
                size="sm"
                onClick={handleSave}
                disabled={saveMutation.isPending}
              >
                {saveMutation.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                Guardar
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Branding Section */}
          <div className="space-y-4">
            <h3 className="font-medium flex items-center gap-2">
              <Palette className="h-4 w-4" />
              Branding
            </h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="logo_url">URL do Logótipo</Label>
                <div className="flex gap-2">
                  <Input
                    id="logo_url"
                    placeholder="https://exemplo.pt/logo.png"
                    value={template.logo_url || ""}
                    onChange={(e) => updateField("logo_url", e.target.value || null)}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Deixe vazio para usar o título em texto
                </p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="primary_color">Cor Principal</Label>
                  <div className="flex gap-2">
                    <Input
                      type="color"
                      id="primary_color"
                      value={template.primary_color}
                      onChange={(e) => updateField("primary_color", e.target.value)}
                      className="w-12 h-10 p-1 cursor-pointer"
                    />
                    <Input
                      value={template.primary_color}
                      onChange={(e) => updateField("primary_color", e.target.value)}
                      className="flex-1"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="secondary_color">Cor Secundária</Label>
                  <div className="flex gap-2">
                    <Input
                      type="color"
                      id="secondary_color"
                      value={template.secondary_color}
                      onChange={(e) => updateField("secondary_color", e.target.value)}
                      className="w-12 h-10 p-1 cursor-pointer"
                    />
                    <Input
                      value={template.secondary_color}
                      onChange={(e) => updateField("secondary_color", e.target.value)}
                      className="flex-1"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <Separator />

          {/* Content Section */}
          <div className="space-y-4">
            <h3 className="font-medium flex items-center gap-2">
              <Type className="h-4 w-4" />
              Conteúdo do Email
            </h3>
            <div className="grid gap-4">
              <div className="space-y-2">
                <Label htmlFor="header_title">Título do Cabeçalho</Label>
                <Input
                  id="header_title"
                  value={template.header_title}
                  onChange={(e) => updateField("header_title", e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="greeting_template">Saudação</Label>
                <Input
                  id="greeting_template"
                  value={template.greeting_template}
                  onChange={(e) => updateField("greeting_template", e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Use {"{{client_name}}"} para inserir o nome do cliente
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="intro_text">Texto de Introdução</Label>
                <Textarea
                  id="intro_text"
                  value={template.intro_text}
                  onChange={(e) => updateField("intro_text", e.target.value)}
                  rows={2}
                />
                <p className="text-xs text-muted-foreground">
                  Use {"{{workspace_name}}"} para inserir o nome da empresa
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="features_title">Título das Funcionalidades</Label>
                <Input
                  id="features_title"
                  value={template.features_title}
                  onChange={(e) => updateField("features_title", e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>Lista de Funcionalidades</Label>
                <div className="space-y-2">
                  {template.features_list.map((feature, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <Badge variant="outline" className="flex-1 justify-start py-2 px-3 font-normal">
                        <List className="h-3 w-3 mr-2 shrink-0" />
                        {feature}
                      </Badge>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 shrink-0"
                        onClick={() => removeFeature(index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  <div className="flex gap-2">
                    <Input
                      placeholder="Nova funcionalidade..."
                      value={newFeature}
                      onChange={(e) => setNewFeature(e.target.value)}
                      onKeyPress={(e) => e.key === "Enter" && addFeature()}
                    />
                    <Button variant="outline" onClick={addFeature} disabled={!newFeature.trim()}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="button_text">Texto do Botão</Label>
                <Input
                  id="button_text"
                  value={template.button_text}
                  onChange={(e) => updateField("button_text", e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="footer_text">Texto do Rodapé</Label>
                <Textarea
                  id="footer_text"
                  value={template.footer_text}
                  onChange={(e) => updateField("footer_text", e.target.value)}
                  rows={2}
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Portal URL Section */}
          <div className="space-y-4">
            <h3 className="font-medium flex items-center gap-2">
              <LinkIcon className="h-4 w-4" />
              Configuração do Portal
            </h3>
            <div className="space-y-2">
              <Label htmlFor="custom_portal_url">URL Personalizado do Portal (opcional)</Label>
              <Input
                id="custom_portal_url"
                placeholder="https://portal.suaempresa.pt/client/login"
                value={template.custom_portal_url || ""}
                onChange={(e) => updateField("custom_portal_url", e.target.value || null)}
              />
              <p className="text-xs text-muted-foreground">
                Deixe vazio para usar o URL padrão do sistema
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Preview Section */}
      {showPreview && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Pré-visualização do Email</CardTitle>
            <CardDescription>
              Assim ficará o email enviado aos clientes
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="border rounded-lg overflow-hidden">
              <EmailPreview template={template} workspaceName={currentWorkspace?.name || "Sua Empresa"} />
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function EmailPreview({ template, workspaceName }: { template: EmailTemplate; workspaceName: string }) {
  const replaceVariables = (text: string) => {
    return text
      .replace(/\{\{client_name\}\}/g, "João Silva")
      .replace(/\{\{workspace_name\}\}/g, workspaceName);
  };

  return (
    <div style={{ backgroundColor: "#f4f4f5", padding: "40px 20px" }}>
      <div style={{ 
        maxWidth: "600px", 
        margin: "0 auto", 
        backgroundColor: "#ffffff", 
        borderRadius: "12px",
        boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
        overflow: "hidden"
      }}>
        {/* Header */}
        <div style={{ 
          padding: "40px 40px 20px",
          textAlign: "center",
          background: `linear-gradient(135deg, ${template.primary_color} 0%, ${template.secondary_color} 100%)`,
          color: "#ffffff"
        }}>
          {template.logo_url ? (
            <img 
              src={template.logo_url} 
              alt="Logo" 
              style={{ maxHeight: "60px", marginBottom: "10px" }}
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = "none";
              }}
            />
          ) : null}
          <h1 style={{ margin: 0, fontSize: "28px", fontWeight: 700 }}>
            {template.header_title}
          </h1>
          <p style={{ margin: "10px 0 0", opacity: 0.9, fontSize: "16px" }}>
            {workspaceName}
          </p>
        </div>

        {/* Body */}
        <div style={{ padding: "40px" }}>
          <h2 style={{ 
            margin: "0 0 20px", 
            color: "#18181b", 
            fontSize: "22px", 
            fontWeight: 600 
          }}>
            {replaceVariables(template.greeting_template)}
          </h2>

          <p style={{ 
            margin: "0 0 20px", 
            color: "#52525b", 
            fontSize: "16px", 
            lineHeight: 1.6 
          }}>
            {replaceVariables(template.intro_text)}
          </p>

          {/* Credentials Preview */}
          <div style={{
            backgroundColor: "#f9fafb",
            borderRadius: "8px",
            padding: "20px",
            margin: "30px 0",
            borderLeft: `4px solid ${template.primary_color}`
          }}>
            <h3 style={{ margin: "0 0 15px", color: "#18181b", fontSize: "16px", fontWeight: 600 }}>
              🔐 Credenciais de Acesso
            </h3>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <tbody>
                <tr>
                  <td style={{ padding: "8px 0", color: "#52525b", fontSize: "14px", width: "140px" }}>Email:</td>
                  <td style={{ padding: "8px 0", color: "#18181b", fontSize: "14px", fontWeight: 600 }}>cliente@exemplo.pt</td>
                </tr>
                <tr>
                  <td style={{ padding: "8px 0", color: "#52525b", fontSize: "14px" }}>Palavra-passe:</td>
                  <td style={{ padding: "8px 0", color: "#18181b", fontSize: "14px", fontWeight: 600, fontFamily: "monospace" }}>AbCd1234XyZw</td>
                </tr>
              </tbody>
            </table>
            <p style={{ margin: "15px 0 0", color: "#dc2626", fontSize: "13px", fontWeight: 500 }}>
              ⚠️ IMPORTANTE: Por razões de segurança, será solicitado que altere a sua palavra-passe no primeiro acesso.
            </p>
          </div>

          <p style={{ 
            margin: "0 0 30px", 
            color: "#52525b", 
            fontSize: "16px", 
            lineHeight: 1.6 
          }}>
            {template.features_title}
          </p>

          <ul style={{ 
            margin: "0 0 30px", 
            paddingLeft: "20px", 
            color: "#52525b", 
            fontSize: "16px", 
            lineHeight: 1.8 
          }}>
            {template.features_list.map((feature, index) => (
              <li key={index}>{feature}</li>
            ))}
          </ul>

          <div style={{ textAlign: "center", padding: "20px 0" }}>
            <a 
              href="#"
              style={{
                display: "inline-block",
                padding: "16px 40px",
                background: `linear-gradient(135deg, ${template.primary_color} 0%, ${template.secondary_color} 100%)`,
                color: "#ffffff",
                textDecoration: "none",
                fontSize: "16px",
                fontWeight: 600,
                borderRadius: "8px",
                boxShadow: `0 4px 14px ${template.primary_color}66`
              }}
            >
              {template.button_text}
            </a>
          </div>
        </div>

        {/* Footer */}
        <div style={{ 
          padding: "30px 40px", 
          backgroundColor: "#f9fafb", 
          borderTop: "1px solid #e4e4e7",
          textAlign: "center"
        }}>
          <p style={{ margin: 0, color: "#a1a1aa", fontSize: "13px", lineHeight: 1.6 }}>
            {replaceVariables(template.footer_text)}
            <br />
            Se não esperava este convite, pode ignorar este email.
          </p>
        </div>
      </div>
    </div>
  );
}
