import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
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
  Brain,
  Settings,
  Users,
  Package
} from "lucide-react";
import { toast } from "sonner";
import jsPDF from "jspdf";

interface AuditMetrics {
  routes: number;
  tables: number;
  edgeFunctions: number;
  components: number;
  hooks: number;
  modules: number;
}

interface AuditModule {
  name: string;
  objective: string;
  components: string[];
  status: "implemented" | "partial" | "planned";
}

const AUDIT_MODULES: AuditModule[] = [
  {
    name: "CRM Core",
    objective: "Gestão de leads, contactos, empresas e oportunidades",
    components: ["LeadsList", "ContactsPage", "CompaniesPage", "OpportunitiesPage", "Pipeline"],
    status: "implemented"
  },
  {
    name: "Vendas & Faturação",
    objective: "Propostas, faturas e catálogo de produtos",
    components: ["ProposalsPage", "InvoicesPage", "ProductsPage", "PriceCalculator"],
    status: "implemented"
  },
  {
    name: "Automações",
    objective: "Motor de automação trigger-condition-action",
    components: ["AutomationBuilder", "AutomationRules", "AutomationLogs"],
    status: "implemented"
  },
  {
    name: "IA & Assistentes",
    objective: "Personas de IA, knowledge base e análise inteligente",
    components: ["AIPersonas", "KnowledgeBase", "AIChat", "AIFieldSuggestions"],
    status: "implemented"
  },
  {
    name: "Calendário & Agendamento",
    objective: "Gestão de calendários, eventos e disponibilidade",
    components: ["CalendarPage", "BookingPage", "AvailabilitySettings"],
    status: "implemented"
  },
  {
    name: "Comunicação",
    objective: "Email, WhatsApp, templates e inbox unificado",
    components: ["InboxPage", "EmailComposer", "WhatsAppIntegration", "Templates"],
    status: "implemented"
  },
  {
    name: "Intermediação de Crédito",
    objective: "Propostas de crédito, simulador e parcerias bancárias",
    components: ["CreditProposals", "CreditSimulator", "BankPartners"],
    status: "implemented"
  },
  {
    name: "SEO & Growth",
    objective: "Geração dinâmica de conteúdo SEO",
    components: ["KeywordsPage", "BlogPage", "GlossaryPage", "SitemapGenerator"],
    status: "implemented"
  },
  {
    name: "Marketplace de Módulos",
    objective: "Instalação e gestão de módulos adicionais",
    components: ["MarketplacePage", "ModuleInstaller", "WorkspaceModules"],
    status: "implemented"
  },
  {
    name: "Super Admin",
    objective: "Gestão global SaaS, workspaces e utilizadores",
    components: ["SuperAdmin", "WorkspacesSection", "UsersSection", "PlansSection"],
    status: "implemented"
  }
];

const AUDIT_METRICS: AuditMetrics = {
  routes: 65,
  tables: 100,
  edgeFunctions: 95,
  components: 500,
  hooks: 140,
  modules: 10
};

export function FunctionalAuditSection() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);

  const generatePDF = async () => {
    setIsGenerating(true);
    setProgress(0);

    try {
      const pdf = new jsPDF("p", "mm", "a4");
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 20;
      const contentWidth = pageWidth - margin * 2;
      let yPos = margin;

      const addNewPageIfNeeded = (requiredSpace: number = 30) => {
        if (yPos + requiredSpace > pageHeight - margin) {
          pdf.addPage();
          yPos = margin;
          return true;
        }
        return false;
      };

      const addTitle = (text: string, size: number = 16) => {
        addNewPageIfNeeded(20);
        pdf.setFontSize(size);
        pdf.setFont("helvetica", "bold");
        pdf.text(text, margin, yPos);
        yPos += size * 0.5 + 4;
      };

      const addText = (text: string, size: number = 10) => {
        pdf.setFontSize(size);
        pdf.setFont("helvetica", "normal");
        const lines = pdf.splitTextToSize(text, contentWidth);
        lines.forEach((line: string) => {
          addNewPageIfNeeded(8);
          pdf.text(line, margin, yPos);
          yPos += 5;
        });
      };

      const addBullet = (text: string) => {
        addNewPageIfNeeded(8);
        pdf.setFontSize(10);
        pdf.setFont("helvetica", "normal");
        const lines = pdf.splitTextToSize(text, contentWidth - 8);
        pdf.text("•", margin, yPos);
        lines.forEach((line: string, i: number) => {
          pdf.text(line, margin + 5, yPos + (i * 5));
        });
        yPos += lines.length * 5 + 2;
      };

      // Header
      setProgress(10);
      pdf.setFillColor(17, 24, 39);
      pdf.rect(0, 0, pageWidth, 45, "F");
      
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(24);
      pdf.setFont("helvetica", "bold");
      pdf.text("FastCRM", margin, 20);
      
      pdf.setFontSize(14);
      pdf.setFont("helvetica", "normal");
      pdf.text("Auditoria Funcional Completa", margin, 30);
      
      pdf.setFontSize(10);
      pdf.text(`Gerado em: ${new Date().toLocaleDateString("pt-PT")} às ${new Date().toLocaleTimeString("pt-PT")}`, margin, 38);
      
      pdf.setTextColor(0, 0, 0);
      yPos = 55;

      // Executive Summary
      setProgress(20);
      addTitle("1. Sumário Executivo", 16);
      yPos += 2;
      
      addText("Este documento apresenta a auditoria funcional completa do sistema FastCRM, uma plataforma de gestão empresarial com capacidades de CRM, automação, IA e gestão modular.");
      yPos += 5;

      // Metrics Grid
      addTitle("Métricas do Sistema", 12);
      yPos += 2;
      
      const metrics = [
        { label: "Rotas", value: AUDIT_METRICS.routes },
        { label: "Tabelas DB", value: AUDIT_METRICS.tables },
        { label: "Edge Functions", value: AUDIT_METRICS.edgeFunctions },
        { label: "Componentes", value: AUDIT_METRICS.components },
        { label: "Hooks", value: AUDIT_METRICS.hooks },
        { label: "Módulos", value: AUDIT_METRICS.modules }
      ];

      const colWidth = contentWidth / 3;
      metrics.forEach((metric, i) => {
        const col = i % 3;
        const row = Math.floor(i / 3);
        const x = margin + col * colWidth;
        const y = yPos + row * 15;
        
        pdf.setFontSize(18);
        pdf.setFont("helvetica", "bold");
        pdf.text(metric.value.toString(), x, y);
        
        pdf.setFontSize(9);
        pdf.setFont("helvetica", "normal");
        pdf.text(metric.label, x, y + 5);
      });
      yPos += 35;

      // Structure Section
      setProgress(40);
      addTitle("2. Estrutura Geral", 16);
      yPos += 2;

      addTitle("Áreas Públicas", 12);
      addBullet("Landing Page (/) - Página inicial com hero, features e pricing");
      addBullet("Blog (/blog) - Artigos gerados dinamicamente para SEO");
      addBullet("Glossário (/glossary) - Termos técnicos com definições");
      addBullet("Keywords (/keywords) - Páginas otimizadas para pesquisa");
      addBullet("Booking Público (/p/:slug) - Agendamento sem autenticação");
      yPos += 5;

      addTitle("Áreas Autenticadas", 12);
      addBullet("Dashboard (/dashboard) - Visão geral com KPIs e atividade recente");
      addBullet("CRM (/dashboard/crm/*) - Leads, Contactos, Empresas, Oportunidades");
      addBullet("Vendas (/dashboard/sales/*) - Propostas, Faturas, Produtos");
      addBullet("Calendário (/dashboard/calendar) - Eventos e agendamentos");
      addBullet("Inbox (/dashboard/inbox) - Comunicação unificada");
      addBullet("Marketplace (/dashboard/marketplace) - Módulos instaláveis");
      addBullet("Configurações (/dashboard/settings/*) - Perfil, workspace, integrações");
      yPos += 5;

      addTitle("Área Super Admin", 12);
      addBullet("Overview SaaS - Métricas globais de workspaces e utilizadores");
      addBullet("Gestão de Workspaces - Criar, editar, suspender workspaces");
      addBullet("Gestão de Utilizadores - Roles e permissões globais");
      addBullet("Planos e Limites - Configuração de pricing e features");
      addBullet("Billing - Subscrições, pagamentos, Stripe sync");
      addBullet("Logs e Auditoria - Ações administrativas");

      // Modules Section
      setProgress(60);
      pdf.addPage();
      yPos = margin;
      
      addTitle("3. Módulos Funcionais", 16);
      yPos += 5;

      AUDIT_MODULES.forEach((module, index) => {
        addNewPageIfNeeded(40);
        
        pdf.setFillColor(243, 244, 246);
        pdf.roundedRect(margin, yPos - 3, contentWidth, 35, 2, 2, "F");
        
        pdf.setFontSize(12);
        pdf.setFont("helvetica", "bold");
        pdf.text(`${index + 1}. ${module.name}`, margin + 5, yPos + 5);
        
        const statusColors: Record<string, [number, number, number]> = {
          implemented: [34, 197, 94],
          partial: [234, 179, 8],
          planned: [156, 163, 175]
        };
        const statusLabels: Record<string, string> = {
          implemented: "Implementado",
          partial: "Parcial",
          planned: "Planeado"
        };
        
        pdf.setFillColor(...statusColors[module.status]);
        pdf.roundedRect(pageWidth - margin - 30, yPos, 25, 8, 1, 1, "F");
        pdf.setFontSize(7);
        pdf.setTextColor(255, 255, 255);
        pdf.text(statusLabels[module.status], pageWidth - margin - 28, yPos + 5.5);
        pdf.setTextColor(0, 0, 0);
        
        pdf.setFontSize(9);
        pdf.setFont("helvetica", "normal");
        pdf.text(`Objetivo: ${module.objective}`, margin + 5, yPos + 14);
        
        pdf.setFontSize(8);
        pdf.text(`Componentes: ${module.components.join(", ")}`, margin + 5, yPos + 22);
        
        yPos += 42;
      });

      // Data Structure
      setProgress(75);
      pdf.addPage();
      yPos = margin;
      
      addTitle("4. Estrutura de Dados", 16);
      yPos += 5;

      addTitle("Entidades Principais", 12);
      const entities = [
        { name: "workspaces", desc: "Multi-tenancy base, isolamento de dados" },
        { name: "leads", desc: "Potenciais clientes com scoring AI" },
        { name: "contacts", desc: "Pessoas associadas a empresas" },
        { name: "companies", desc: "Organizações com enriquecimento automático" },
        { name: "opportunities", desc: "Negócios em pipeline com probabilidade" },
        { name: "proposals", desc: "Propostas comerciais com checkout Stripe" },
        { name: "invoices", desc: "Faturas com numeração sequencial" },
        { name: "products", desc: "Catálogo com variantes e preços" },
        { name: "credit_proposals", desc: "Propostas de crédito com análise IA" },
        { name: "automation_rules", desc: "Regras de automação configuráveis" },
        { name: "ai_personas", desc: "Assistentes IA personalizados" },
        { name: "marketplace_modules", desc: "Módulos instaláveis do marketplace" }
      ];

      entities.forEach(entity => {
        addBullet(`${entity.name}: ${entity.desc}`);
      });

      // Security Section
      setProgress(85);
      yPos += 10;
      addTitle("5. Segurança", 16);
      yPos += 2;

      addTitle("Row Level Security (RLS)", 12);
      addText("Todas as tabelas principais têm RLS ativo com isolamento por workspace_id. Políticas específicas para super admins permitem acesso cross-workspace.");
      yPos += 5;

      addTitle("Roles e Permissões", 12);
      addBullet("Owner: Acesso total ao workspace, pode eliminar");
      addBullet("Admin: Gestão completa exceto eliminação de workspace");
      addBullet("Agent: Operações CRM, sem configurações");
      addBullet("Viewer: Apenas leitura");
      addBullet("Agency: Gestão de workspaces de clientes");
      addBullet("Super Admin: Acesso global ao sistema");

      // Integrations
      setProgress(95);
      addNewPageIfNeeded(60);
      yPos += 10;
      addTitle("6. Integrações", 16);
      yPos += 2;

      const integrations = [
        "Stripe: Pagamentos, subscrições, checkout",
        "Instagram DM: Mensagens diretas via API",
        "Google Places: Enriquecimento de empresas",
        "Firecrawl: Web scraping para pesquisa",
        "OpenAI/Gemini: Modelos de IA via Lovable AI",
        "SMTP/Email: Envio de comunicações",
        "WhatsApp: Mensagens via API"
      ];

      integrations.forEach(integration => {
        addBullet(integration);
      });

      // Footer on last page
      pdf.setFontSize(8);
      pdf.setTextColor(128, 128, 128);
      pdf.text("FastCRM - Auditoria Funcional | Documento gerado automaticamente", margin, pageHeight - 10);
      pdf.text(`Página ${pdf.getNumberOfPages()}`, pageWidth - margin - 15, pageHeight - 10);

      setProgress(100);

      // Download
      pdf.save(`FastCRM_Auditoria_Funcional_${new Date().toISOString().split("T")[0]}.pdf`);
      toast.success("PDF gerado com sucesso!");

    } catch (error) {
      console.error("Error generating PDF:", error);
      toast.error("Erro ao gerar PDF");
    } finally {
      setIsGenerating(false);
      setProgress(0);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Auditoria Funcional</h1>
        <p className="text-muted-foreground">
          Gerar documentação técnica completa do sistema
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Route className="h-4 w-4 text-blue-500" />
              <span className="text-2xl font-bold">{AUDIT_METRICS.routes}+</span>
            </div>
            <p className="text-xs text-muted-foreground">Rotas</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Database className="h-4 w-4 text-green-500" />
              <span className="text-2xl font-bold">{AUDIT_METRICS.tables}+</span>
            </div>
            <p className="text-xs text-muted-foreground">Tabelas</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-amber-500" />
              <span className="text-2xl font-bold">{AUDIT_METRICS.edgeFunctions}+</span>
            </div>
            <p className="text-xs text-muted-foreground">Edge Functions</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Component className="h-4 w-4 text-purple-500" />
              <span className="text-2xl font-bold">{AUDIT_METRICS.components}+</span>
            </div>
            <p className="text-xs text-muted-foreground">Componentes</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Settings className="h-4 w-4 text-slate-500" />
              <span className="text-2xl font-bold">{AUDIT_METRICS.hooks}+</span>
            </div>
            <p className="text-xs text-muted-foreground">Hooks</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Package className="h-4 w-4 text-indigo-500" />
              <span className="text-2xl font-bold">{AUDIT_METRICS.modules}</span>
            </div>
            <p className="text-xs text-muted-foreground">Módulos</p>
          </CardContent>
        </Card>
      </div>

      {/* Generate PDF Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Gerar Relatório PDF
          </CardTitle>
          <CardDescription>
            Descarregar auditoria funcional completa em formato PDF
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
            disabled={isGenerating}
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
                Descarregar PDF
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Modules Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Módulos do Sistema
          </CardTitle>
          <CardDescription>
            Visão geral dos módulos funcionais implementados
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[400px] pr-4">
            <div className="space-y-4">
              {AUDIT_MODULES.map((module, index) => (
                <div key={module.name} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{index + 1}. {module.name}</span>
                        <Badge 
                          variant={module.status === "implemented" ? "default" : module.status === "partial" ? "secondary" : "outline"}
                        >
                          {module.status === "implemented" ? "Implementado" : module.status === "partial" ? "Parcial" : "Planeado"}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{module.objective}</p>
                    </div>
                    <CheckCircle2 className={`h-5 w-5 ${module.status === "implemented" ? "text-green-500" : "text-muted-foreground"}`} />
                  </div>
                  <Separator className="my-3" />
                  <div className="flex flex-wrap gap-1">
                    {module.components.map(comp => (
                      <Badge key={comp} variant="outline" className="text-xs">
                        {comp}
                      </Badge>
                    ))}
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
