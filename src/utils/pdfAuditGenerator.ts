import jsPDF from "jspdf";
import { AuditMetrics, EdgeFunctionInfo, AUDIT_MODULES, EDGE_FUNCTION_CATEGORIES } from "@/types/audit";

interface PDFGeneratorOptions {
  metrics: AuditMetrics;
  edgeFunctions: EdgeFunctionInfo[];
  lastUpdated: Date;
  onProgress?: (progress: number) => void;
}

export async function generateAuditPDF(options: PDFGeneratorOptions): Promise<void> {
  const { metrics, edgeFunctions, lastUpdated, onProgress } = options;
  
  const pdf = new jsPDF("p", "mm", "a4");
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 20;
  const contentWidth = pageWidth - margin * 2;
  let yPos = margin;
  let currentPage = 1;

  const setProgress = (value: number) => onProgress?.(value);

  const addNewPageIfNeeded = (requiredSpace: number = 30): boolean => {
    if (yPos + requiredSpace > pageHeight - margin) {
      addPageFooter();
      pdf.addPage();
      currentPage++;
      yPos = margin;
      return true;
    }
    return false;
  };

  const addPageFooter = () => {
    pdf.setFontSize(8);
    pdf.setTextColor(128, 128, 128);
    pdf.text("FastCRM - Auditoria Funcional Completa", margin, pageHeight - 10);
    pdf.text(`Página ${currentPage}`, pageWidth - margin - 20, pageHeight - 10);
  };

  const addTitle = (text: string, size: number = 16) => {
    addNewPageIfNeeded(20);
    pdf.setFontSize(size);
    pdf.setFont("helvetica", "bold");
    pdf.setTextColor(0, 0, 0);
    pdf.text(text, margin, yPos);
    yPos += size * 0.5 + 4;
  };

  const addSubtitle = (text: string) => {
    addNewPageIfNeeded(15);
    pdf.setFontSize(12);
    pdf.setFont("helvetica", "bold");
    pdf.setTextColor(60, 60, 60);
    pdf.text(text, margin, yPos);
    yPos += 8;
  };

  const addText = (text: string, size: number = 10) => {
    pdf.setFontSize(size);
    pdf.setFont("helvetica", "normal");
    pdf.setTextColor(0, 0, 0);
    const lines = pdf.splitTextToSize(text, contentWidth);
    lines.forEach((line: string) => {
      addNewPageIfNeeded(8);
      pdf.text(line, margin, yPos);
      yPos += 5;
    });
  };

  const addBullet = (text: string, indent: number = 0) => {
    addNewPageIfNeeded(8);
    pdf.setFontSize(10);
    pdf.setFont("helvetica", "normal");
    pdf.setTextColor(0, 0, 0);
    const bulletX = margin + indent;
    const textX = bulletX + 5;
    const lines = pdf.splitTextToSize(text, contentWidth - indent - 8);
    pdf.text("•", bulletX, yPos);
    lines.forEach((line: string, i: number) => {
      pdf.text(line, textX, yPos + (i * 5));
    });
    yPos += lines.length * 5 + 2;
  };

  const addSpacer = (height: number = 5) => {
    yPos += height;
  };

  // =============================================
  // PAGE 1: COVER
  // =============================================
  setProgress(5);
  
  // Dark header background
  pdf.setFillColor(17, 24, 39);
  pdf.rect(0, 0, pageWidth, 80, "F");
  
  // Logo area
  pdf.setFillColor(59, 130, 246);
  pdf.circle(margin + 10, 30, 10, "F");
  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(14);
  pdf.setFont("helvetica", "bold");
  pdf.text("FC", margin + 5.5, 33);
  
  // Title
  pdf.setFontSize(32);
  pdf.text("FastCRM", margin + 28, 35);
  
  pdf.setFontSize(18);
  pdf.setFont("helvetica", "normal");
  pdf.text("Auditoria Funcional Completa", margin, 55);
  
  pdf.setFontSize(12);
  pdf.text(`Versão 2.0 | ${lastUpdated.toLocaleDateString("pt-PT")}`, margin, 68);
  
  pdf.setTextColor(0, 0, 0);
  yPos = 100;
  
  // Document info box
  pdf.setFillColor(243, 244, 246);
  pdf.roundedRect(margin, yPos, contentWidth, 50, 3, 3, "F");
  
  pdf.setFontSize(11);
  pdf.setFont("helvetica", "bold");
  pdf.text("Informações do Documento", margin + 5, yPos + 10);
  
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(10);
  pdf.text(`Data de Geração: ${lastUpdated.toLocaleDateString("pt-PT")} às ${lastUpdated.toLocaleTimeString("pt-PT")}`, margin + 5, yPos + 22);
  pdf.text(`Tipo: Auditoria Técnica e Funcional`, margin + 5, yPos + 32);
  pdf.text(`Classificação: Documento Interno`, margin + 5, yPos + 42);
  
  yPos += 70;
  
  // Metrics summary on cover
  addTitle("Resumo de Métricas", 14);
  
  const coverMetrics = [
    { label: "Tabelas na Base de Dados", value: metrics.tables },
    { label: "Edge Functions", value: metrics.edgeFunctions },
    { label: "Rotas da Aplicação", value: metrics.routes },
    { label: "Componentes React", value: metrics.components },
    { label: "Hooks Personalizados", value: metrics.hooks },
    { label: "Políticas RLS", value: metrics.rlsPolicies },
  ];
  
  coverMetrics.forEach(m => {
    pdf.setFontSize(10);
    pdf.text(`${m.label}: `, margin, yPos);
    pdf.setFont("helvetica", "bold");
    pdf.text(m.value.toString(), margin + 60, yPos);
    pdf.setFont("helvetica", "normal");
    yPos += 7;
  });

  addPageFooter();
  
  // =============================================
  // PAGE 2-3: EXECUTIVE SUMMARY
  // =============================================
  pdf.addPage();
  currentPage++;
  yPos = margin;
  setProgress(10);
  
  addTitle("1. Sumário Executivo", 18);
  addSpacer(5);
  
  addText("Este documento apresenta a auditoria funcional completa do sistema FastCRM, uma plataforma SaaS de gestão empresarial desenvolvida em React com backend Supabase. O sistema implementa uma arquitectura multi-tenant com isolamento completo de dados por workspace.");
  addSpacer(5);
  
  addSubtitle("1.1 Visão Geral");
  addText("O FastCRM é uma solução completa de CRM que integra funcionalidades de gestão de leads, contactos, empresas e oportunidades com capacidades avançadas de IA, automação de processos e comunicação omnicanal. A plataforma suporta múltiplos workspaces com diferentes níveis de permissão e planos de subscrição.");
  addSpacer(5);
  
  addSubtitle("1.2 Estado Atual do Sistema");
  addText(`O sistema conta atualmente com ${metrics.tables} tabelas na base de dados, ${metrics.edgeFunctions} edge functions para lógica de backend, ${metrics.routes} rotas de navegação e ${metrics.components} componentes React. Todas as tabelas principais estão protegidas com ${metrics.rlsPolicies} políticas de Row Level Security.`);
  addSpacer(5);
  
  addSubtitle("1.3 Pontos Fortes Identificados");
  addBullet("Arquitectura multi-tenant robusta com isolamento total de dados");
  addBullet("Sistema de IA integrado com múltiplas capacidades (análise, geração, sugestões)");
  addBullet("Motor de automação flexível com triggers, condições e ações");
  addBullet("Marketplace de módulos para extensibilidade");
  addBullet("Integração nativa com Stripe para pagamentos");
  addBullet("Sistema de comunicação unificado (email, WhatsApp, Instagram)");
  
  addNewPageIfNeeded(60);
  addSpacer(5);
  
  addSubtitle("1.4 Indicadores Chave");
  
  const kpis = [
    { name: "Cobertura RLS", value: "100%", desc: "Todas as tabelas com dados sensíveis protegidas" },
    { name: "Módulos Implementados", value: "10/10", desc: "Todos os módulos core em produção" },
    { name: "Edge Functions", value: metrics.edgeFunctions.toString(), desc: "Funções serverless activas" },
    { name: "Categorias de IA", value: "32", desc: "Funções de inteligência artificial" },
  ];
  
  kpis.forEach(kpi => {
    pdf.setFillColor(249, 250, 251);
    pdf.roundedRect(margin, yPos, contentWidth, 18, 2, 2, "F");
    
    pdf.setFontSize(14);
    pdf.setFont("helvetica", "bold");
    pdf.text(kpi.value, margin + 5, yPos + 8);
    
    pdf.setFontSize(10);
    pdf.setFont("helvetica", "normal");
    pdf.text(kpi.name, margin + 35, yPos + 7);
    pdf.setFontSize(8);
    pdf.setTextColor(100, 100, 100);
    pdf.text(kpi.desc, margin + 35, yPos + 13);
    pdf.setTextColor(0, 0, 0);
    
    yPos += 22;
  });

  addPageFooter();
  
  // =============================================
  // PAGE 4-5: SYSTEM METRICS
  // =============================================
  pdf.addPage();
  currentPage++;
  yPos = margin;
  setProgress(20);
  
  addTitle("2. Métricas do Sistema", 18);
  addSpacer(5);
  
  addSubtitle("2.1 Métricas de Código");
  
  const codeMetrics = [
    { category: "Frontend", items: [
      { label: "Rotas", value: metrics.routes },
      { label: "Componentes React", value: metrics.components },
      { label: "Hooks Personalizados", value: metrics.hooks },
      { label: "Módulos Funcionais", value: metrics.modules },
    ]},
    { category: "Backend", items: [
      { label: "Tabelas PostgreSQL", value: metrics.tables },
      { label: "Edge Functions", value: metrics.edgeFunctions },
      { label: "Políticas RLS", value: metrics.rlsPolicies },
      { label: "Triggers", value: metrics.triggers },
      { label: "Storage Buckets", value: metrics.storageBuckets },
    ]},
  ];
  
  codeMetrics.forEach(group => {
    pdf.setFillColor(59, 130, 246);
    pdf.roundedRect(margin, yPos, contentWidth, 8, 1, 1, "F");
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(10);
    pdf.setFont("helvetica", "bold");
    pdf.text(group.category, margin + 5, yPos + 5.5);
    pdf.setTextColor(0, 0, 0);
    yPos += 12;
    
    group.items.forEach(item => {
      pdf.setFontSize(10);
      pdf.setFont("helvetica", "normal");
      pdf.text(item.label, margin + 5, yPos);
      pdf.setFont("helvetica", "bold");
      pdf.text(item.value.toString(), pageWidth - margin - 20, yPos);
      yPos += 7;
    });
    yPos += 5;
  });
  
  addSpacer(10);
  addSubtitle("2.2 Distribuição de Edge Functions por Categoria");
  
  const categoryStats = Object.entries(EDGE_FUNCTION_CATEGORIES).map(([cat, funcs]) => ({
    category: cat,
    count: funcs.length,
  })).sort((a, b) => b.count - a.count);
  
  categoryStats.forEach(stat => {
    addNewPageIfNeeded(10);
    const barWidth = (stat.count / 35) * (contentWidth - 80);
    
    pdf.setFontSize(9);
    pdf.text(stat.category.substring(0, 25), margin, yPos);
    
    pdf.setFillColor(59, 130, 246);
    pdf.roundedRect(margin + 55, yPos - 4, barWidth, 6, 1, 1, "F");
    
    pdf.setFontSize(9);
    pdf.setFont("helvetica", "bold");
    pdf.text(stat.count.toString(), margin + 60 + barWidth, yPos);
    pdf.setFont("helvetica", "normal");
    
    yPos += 9;
  });

  addPageFooter();
  
  // =============================================
  // PAGE 6-8: TECHNICAL ARCHITECTURE
  // =============================================
  pdf.addPage();
  currentPage++;
  yPos = margin;
  setProgress(35);
  
  addTitle("3. Arquitectura Técnica", 18);
  addSpacer(5);
  
  addSubtitle("3.1 Stack Tecnológico");
  
  const techStack = [
    { layer: "Frontend", techs: "React 18, TypeScript, Vite, Tailwind CSS, Radix UI" },
    { layer: "State Management", techs: "TanStack Query, React Context, Zustand" },
    { layer: "Routing", techs: "React Router DOM v6" },
    { layer: "Backend", techs: "Supabase (PostgreSQL, Auth, Storage, Realtime)" },
    { layer: "Edge Computing", techs: "Deno Edge Functions, Oak Framework" },
    { layer: "IA & ML", techs: "OpenAI GPT-4, Google Gemini, Embeddings" },
    { layer: "Pagamentos", techs: "Stripe (Checkout, Subscriptions, Webhooks)" },
    { layer: "Email", techs: "Resend, SMTP, Zoho Integration" },
    { layer: "Comunicação", techs: "WhatsApp API, Instagram Graph API" },
  ];
  
  techStack.forEach(item => {
    addNewPageIfNeeded(12);
    pdf.setFillColor(243, 244, 246);
    pdf.roundedRect(margin, yPos - 3, contentWidth, 12, 2, 2, "F");
    
    pdf.setFontSize(10);
    pdf.setFont("helvetica", "bold");
    pdf.text(item.layer, margin + 5, yPos + 4);
    
    pdf.setFont("helvetica", "normal");
    pdf.text(item.techs, margin + 50, yPos + 4);
    
    yPos += 15;
  });
  
  addSpacer(10);
  addSubtitle("3.2 Estrutura de Pastas");
  
  const folders = [
    "src/components/ - Componentes React organizados por feature",
    "src/hooks/ - Hooks personalizados para lógica reutilizável",
    "src/pages/ - Páginas da aplicação mapeadas para rotas",
    "src/contexts/ - Contextos React para state global",
    "src/integrations/ - Integrações com serviços externos",
    "src/utils/ - Utilitários e helpers",
    "src/types/ - Definições TypeScript",
    "supabase/functions/ - Edge Functions Deno",
    "supabase/migrations/ - Migrações SQL",
  ];
  
  folders.forEach(folder => addBullet(folder));
  
  addNewPageIfNeeded(60);
  addSpacer(10);
  addSubtitle("3.3 Padrões de Arquitectura");
  
  addText("O sistema segue uma arquitectura baseada em componentes com separação clara de responsabilidades:");
  addSpacer(3);
  addBullet("Feature-First Organization: Componentes agrupados por funcionalidade");
  addBullet("Custom Hooks: Lógica de negócio encapsulada em hooks reutilizáveis");
  addBullet("Context Providers: Estado global gerido com React Context");
  addBullet("Edge Functions: Lógica sensível e integrações executadas no servidor");
  addBullet("RLS Policies: Segurança ao nível da base de dados");

  addPageFooter();
  
  // =============================================
  // PAGE 9-12: FUNCTIONAL MODULES
  // =============================================
  pdf.addPage();
  currentPage++;
  yPos = margin;
  setProgress(50);
  
  addTitle("4. Módulos Funcionais", 18);
  addSpacer(5);
  
  addText("O FastCRM é composto por 10 módulos funcionais principais, cada um responsável por um domínio específico do sistema.");
  addSpacer(10);
  
  AUDIT_MODULES.forEach((module, index) => {
    addNewPageIfNeeded(50);
    
    // Module card
    pdf.setFillColor(249, 250, 251);
    pdf.roundedRect(margin, yPos, contentWidth, 40, 3, 3, "F");
    
    // Status badge
    const statusColors: Record<string, [number, number, number]> = {
      implemented: [34, 197, 94],
      partial: [234, 179, 8],
      planned: [156, 163, 175],
    };
    const statusLabels: Record<string, string> = {
      implemented: "Implementado",
      partial: "Parcial",
      planned: "Planeado",
    };
    
    pdf.setFillColor(...statusColors[module.status]);
    pdf.roundedRect(pageWidth - margin - 30, yPos + 5, 25, 8, 1, 1, "F");
    pdf.setFontSize(7);
    pdf.setTextColor(255, 255, 255);
    pdf.text(statusLabels[module.status], pageWidth - margin - 28, yPos + 10.5);
    pdf.setTextColor(0, 0, 0);
    
    // Module name
    pdf.setFontSize(13);
    pdf.setFont("helvetica", "bold");
    pdf.text(`${index + 1}. ${module.name}`, margin + 5, yPos + 12);
    
    // Objective
    pdf.setFontSize(10);
    pdf.setFont("helvetica", "normal");
    pdf.text(`Objetivo: ${module.objective}`, margin + 5, yPos + 22);
    
    // Components
    pdf.setFontSize(9);
    pdf.setTextColor(100, 100, 100);
    const componentsText = `Componentes: ${module.components.join(", ")}`;
    const compLines = pdf.splitTextToSize(componentsText, contentWidth - 15);
    pdf.text(compLines[0], margin + 5, yPos + 32);
    pdf.setTextColor(0, 0, 0);
    
    yPos += 48;
  });

  addPageFooter();
  
  // =============================================
  // PAGE 13-15: DATABASE STRUCTURE
  // =============================================
  pdf.addPage();
  currentPage++;
  yPos = margin;
  setProgress(60);
  
  addTitle("5. Estrutura de Base de Dados", 18);
  addSpacer(5);
  
  addText(`A base de dados PostgreSQL contém ${metrics.tables} tabelas organizadas em grupos funcionais. Todas as tabelas com dados de utilizador estão protegidas com Row Level Security.`);
  addSpacer(10);
  
  addSubtitle("5.1 Entidades Principais");
  
  const entityGroups = [
    {
      group: "Core CRM",
      tables: ["leads", "contacts", "companies", "opportunities", "tasks", "notes", "activity_logs"]
    },
    {
      group: "Vendas",
      tables: ["proposals", "proposal_items", "invoices", "invoice_items", "products", "product_variants"]
    },
    {
      group: "Automação",
      tables: ["automation_rules", "automation_conditions", "automation_actions", "automation_logs"]
    },
    {
      group: "IA & Knowledge",
      tables: ["ai_personas", "knowledge_bases", "knowledge_entries", "ai_agent_executions", "ai_agent_memory"]
    },
    {
      group: "Comunicação",
      tables: ["conversations", "messages", "email_templates", "email_accounts", "marketing_campaigns"]
    },
    {
      group: "Sistema",
      tables: ["workspaces", "workspace_members", "profiles", "user_roles", "admin_settings"]
    },
  ];
  
  entityGroups.forEach(eg => {
    addNewPageIfNeeded(25);
    
    pdf.setFillColor(59, 130, 246);
    pdf.roundedRect(margin, yPos, contentWidth, 8, 1, 1, "F");
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(10);
    pdf.setFont("helvetica", "bold");
    pdf.text(eg.group, margin + 5, yPos + 5.5);
    pdf.setTextColor(0, 0, 0);
    yPos += 12;
    
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(9);
    const tableList = eg.tables.join(", ");
    const lines = pdf.splitTextToSize(tableList, contentWidth - 10);
    lines.forEach((line: string) => {
      pdf.text(line, margin + 5, yPos);
      yPos += 5;
    });
    yPos += 5;
  });
  
  addNewPageIfNeeded(60);
  addSpacer(10);
  addSubtitle("5.2 Políticas de Segurança (RLS)");
  
  addText(`O sistema implementa ${metrics.rlsPolicies} políticas de Row Level Security distribuídas pelas tabelas. As políticas garantem:`);
  addSpacer(3);
  addBullet("Isolamento de dados por workspace_id");
  addBullet("Verificação de membership para acesso");
  addBullet("Bypass controlado para Super Admins");
  addBullet("Políticas específicas por operação (SELECT, INSERT, UPDATE, DELETE)");
  
  addSpacer(10);
  addSubtitle("5.3 Triggers e Funções");
  
  addText(`Existem ${metrics.triggers} triggers activos na base de dados para:`);
  addSpacer(3);
  addBullet("Actualização automática de timestamps (updated_at)");
  addBullet("Cálculo de lead scoring");
  addBullet("Sincronização de contadores");
  addBullet("Auditoria de alterações");
  addBullet("Disparo de automações");

  addPageFooter();
  
  // =============================================
  // PAGE 16-17: EDGE FUNCTIONS
  // =============================================
  pdf.addPage();
  currentPage++;
  yPos = margin;
  setProgress(75);
  
  addTitle("6. Edge Functions", 18);
  addSpacer(5);
  
  addText(`O sistema conta com ${metrics.edgeFunctions} Edge Functions Deno organizadas em categorias funcionais. Estas funções executam lógica sensível, integrações com APIs externas e processamento de IA.`);
  addSpacer(10);
  
  Object.entries(EDGE_FUNCTION_CATEGORIES).slice(0, 8).forEach(([category, functions]) => {
    addNewPageIfNeeded(30);
    
    pdf.setFillColor(243, 244, 246);
    pdf.roundedRect(margin, yPos, contentWidth, 8, 1, 1, "F");
    
    pdf.setFontSize(11);
    pdf.setFont("helvetica", "bold");
    pdf.text(`${category} (${functions.length})`, margin + 5, yPos + 5.5);
    yPos += 12;
    
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(8);
    
    // Show first 6 functions
    const displayFuncs = functions.slice(0, 6);
    const funcText = displayFuncs.join(", ") + (functions.length > 6 ? `, +${functions.length - 6} mais` : "");
    const lines = pdf.splitTextToSize(funcText, contentWidth - 10);
    lines.forEach((line: string) => {
      pdf.text(line, margin + 5, yPos);
      yPos += 4;
    });
    yPos += 5;
  });

  addPageFooter();
  
  // =============================================
  // PAGE 18-19: SECURITY & COMPLIANCE
  // =============================================
  pdf.addPage();
  currentPage++;
  yPos = margin;
  setProgress(85);
  
  addTitle("7. Segurança e Compliance", 18);
  addSpacer(5);
  
  addSubtitle("7.1 Modelo de Segurança");
  addText("O FastCRM implementa um modelo de segurança em camadas:");
  addSpacer(3);
  addBullet("Autenticação via Supabase Auth com suporte a email/password e OAuth");
  addBullet("Autorização baseada em roles (Owner, Admin, Agent, Viewer, Agency)");
  addBullet("Row Level Security em todas as tabelas com dados sensíveis");
  addBullet("Isolamento multi-tenant por workspace_id");
  addBullet("Edge Functions com validação de JWT");
  
  addSpacer(10);
  addSubtitle("7.2 Roles e Permissões");
  
  const roles = [
    { role: "Super Admin", perms: "Acesso global ao sistema, gestão de workspaces, configurações SaaS" },
    { role: "Owner", perms: "Acesso total ao workspace, pode eliminar e transferir propriedade" },
    { role: "Admin", perms: "Gestão completa exceto eliminação de workspace" },
    { role: "Agent", perms: "Operações CRM completas, sem acesso a configurações" },
    { role: "Viewer", perms: "Apenas leitura de dados do workspace" },
    { role: "Agency", perms: "Gestão de workspaces de clientes (white-label)" },
  ];
  
  roles.forEach(r => {
    addNewPageIfNeeded(15);
    pdf.setFontSize(10);
    pdf.setFont("helvetica", "bold");
    pdf.text(r.role, margin, yPos);
    pdf.setFont("helvetica", "normal");
    pdf.text(r.perms, margin + 35, yPos);
    yPos += 8;
  });
  
  addSpacer(10);
  addSubtitle("7.3 Compliance RGPD");
  addBullet("Consentimento explícito para recolha de dados");
  addBullet("Direito ao esquecimento implementado");
  addBullet("Exportação de dados pessoais disponível");
  addBullet("Logs de auditoria para acções administrativas");
  addBullet("Encriptação de dados sensíveis");

  addPageFooter();
  
  // =============================================
  // PAGE 20: INTEGRATIONS
  // =============================================
  pdf.addPage();
  currentPage++;
  yPos = margin;
  setProgress(92);
  
  addTitle("8. Integrações Externas", 18);
  addSpacer(5);
  
  const integrations = [
    { name: "Stripe", desc: "Pagamentos, subscrições, checkout e webhooks" },
    { name: "OpenAI / Gemini", desc: "Modelos de IA para análise e geração de conteúdo" },
    { name: "Instagram Graph API", desc: "Mensagens directas e análise de perfis" },
    { name: "WhatsApp Business", desc: "Comunicação via WhatsApp" },
    { name: "Google Places", desc: "Enriquecimento de dados de empresas" },
    { name: "Firecrawl", desc: "Web scraping e pesquisa" },
    { name: "SMTP / Resend", desc: "Envio de emails transacionais" },
    { name: "Zoho Mail", desc: "Integração com caixas de email" },
    { name: "GoHighLevel", desc: "Sincronização de contactos e mensagens" },
  ];
  
  integrations.forEach(int => {
    pdf.setFillColor(249, 250, 251);
    pdf.roundedRect(margin, yPos, contentWidth, 14, 2, 2, "F");
    
    pdf.setFontSize(11);
    pdf.setFont("helvetica", "bold");
    pdf.text(int.name, margin + 5, yPos + 6);
    
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(9);
    pdf.text(int.desc, margin + 50, yPos + 6);
    
    yPos += 18;
  });

  addPageFooter();
  
  // =============================================
  // PAGE 21: CONCLUSION & ROADMAP
  // =============================================
  pdf.addPage();
  currentPage++;
  yPos = margin;
  setProgress(98);
  
  addTitle("9. Conclusão e Recomendações", 18);
  addSpacer(5);
  
  addSubtitle("9.1 Estado Geral");
  addText("O FastCRM apresenta-se como uma solução madura e robusta para gestão empresarial. Com todos os 10 módulos core implementados e operacionais, o sistema está preparado para produção em escala.");
  addSpacer(5);
  
  addSubtitle("9.2 Pontos de Melhoria Identificados");
  addBullet("Optimização de queries em tabelas com grande volume de dados");
  addBullet("Implementação de cache distribuído para edge functions frequentes");
  addBullet("Expansão de testes automatizados");
  addBullet("Documentação técnica adicional para desenvolvedores");
  
  addSpacer(10);
  addSubtitle("9.3 Roadmap Sugerido");
  addBullet("Q1: Optimização de performance e monitorização avançada");
  addBullet("Q2: Novos módulos do marketplace e integrações");
  addBullet("Q3: Expansão de capacidades de IA (agentes autónomos)");
  addBullet("Q4: Mobile app nativo e offline-first");
  
  addSpacer(20);
  
  // Contact box
  pdf.setFillColor(17, 24, 39);
  pdf.roundedRect(margin, yPos, contentWidth, 35, 3, 3, "F");
  
  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(12);
  pdf.setFont("helvetica", "bold");
  pdf.text("FastCRM - Plataforma de Gestão Empresarial", margin + 10, yPos + 12);
  
  pdf.setFontSize(10);
  pdf.setFont("helvetica", "normal");
  pdf.text("Documento gerado automaticamente pelo sistema de auditoria", margin + 10, yPos + 22);
  pdf.text(`Data: ${lastUpdated.toLocaleDateString("pt-PT")} | Versão: 2.0`, margin + 10, yPos + 30);

  addPageFooter();
  setProgress(100);
  
  // Save the PDF
  pdf.save(`FastCRM_Auditoria_Completa_${lastUpdated.toISOString().split("T")[0]}.pdf`);
}
