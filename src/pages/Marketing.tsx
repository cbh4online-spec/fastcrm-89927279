import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { TabsContent } from '@/components/ui/tabs';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Plus,
  Send,
  Sparkles,
  Paintbrush,
  Code,
  ShieldBan,
  Library,
  MoreHorizontal,
} from 'lucide-react';
import { IXEntityTabs, type IXTabDef } from '@/components/entity/ix/IXEntityTabs';
import { MarketingCampaignsList } from '@/components/marketing/MarketingCampaignsList';
import { MarketingSegmentsList } from '@/components/marketing/MarketingSegmentsList';
import { TemplateLibraryPage } from '@/components/marketing/TemplateLibraryPage';
import { MarketingDashboard } from '@/components/marketing/MarketingDashboard';
import { MarketingSettingsPanel } from '@/components/marketing/MarketingSettingsPanel';
import { CampaignFormDialog } from '@/components/marketing/CampaignFormDialog';
import { SegmentFormDialog } from '@/components/marketing/SegmentFormDialog';
import { TemplateFormDialog } from '@/components/marketing/TemplateFormDialog';
import { EmailBuilderDialog } from '@/components/marketing/EmailBuilderDialog';
import { HtmlEmailEditorDialog } from '@/components/marketing/HtmlEmailEditorDialog';
import { CampaignCreationFlow } from '@/components/marketing/CampaignCreationFlow';
import { AdvancedAnalyticsPanel } from '@/components/marketing/AdvancedAnalyticsPanel';
import { PipelineTriggersPanel } from '@/components/marketing/PipelineTriggersPanel';
import { TemplateLibraryDialog } from '@/components/marketing/TemplateLibraryDialog';
import { WebhookEventsPanel } from '@/components/marketing/WebhookEventsPanel';
import { CampaignLandingPages } from '@/components/marketing/CampaignLandingPages';
import { CampaignReportExport } from '@/components/marketing/CampaignReportExport';
import { MultichannelSequenceBuilder } from '@/components/marketing/MultichannelSequenceBuilder';
import { LifecycleAutomations } from '@/components/marketing/LifecycleAutomations';
import { MCPIntegrationsTab } from '@/components/marketing/mcp/MCPIntegrationsTab';
import { EmailCampaignWizardDialog } from '@/components/marketing/EmailCampaignWizardDialog';
import { Tabs } from '@/components/ui/tabs';
import { toast } from 'sonner';


export default function Marketing() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [showCampaignCreation, setShowCampaignCreation] = useState(false);
  const [showCampaignEdit, setShowCampaignEdit] = useState(false);
  const [showSegmentDialog, setShowSegmentDialog] = useState(false);
  const [showTemplateDialog, setShowTemplateDialog] = useState(false);
  const [showEmailBuilder, setShowEmailBuilder] = useState(false);
  const [showHtmlEditor, setShowHtmlEditor] = useState(false);
  const [showTemplateLibrary, setShowTemplateLibrary] = useState(false);
  const [showCampaignWizard, setShowCampaignWizard] = useState(false);
  const [wizardInitialHtml, setWizardInitialHtml] = useState<string | null>(null);

  const handleWizardOpenEditor = (html: string) => {
    setWizardInitialHtml(html);
    setShowCampaignCreation(true);
  };

  const handleSelectLibraryTemplate = (html: string, name: string) => {
    toast.success(`Template "${name || 'selecionado'}" carregado`);
    setShowEmailBuilder(true);
  };

  const getAddButton = () => {
    switch (activeTab) {
      case 'campaigns':
        return (
          <Button onClick={() => setShowCampaignCreation(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Nova Campanha
          </Button>
        );
      case 'segments':
        return (
          <Button onClick={() => setShowSegmentDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Novo Segmento
          </Button>
        );
      case 'templates':
        return (
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setShowTemplateLibrary(true)}>
              <Library className="h-4 w-4 mr-2" />
              Biblioteca
            </Button>
            <Button variant="outline" onClick={() => setShowHtmlEditor(true)}>
              <Code className="h-4 w-4 mr-2" />
              Editor HTML
            </Button>
            <Button variant="outline" onClick={() => setShowEmailBuilder(true)}>
              <Paintbrush className="h-4 w-4 mr-2" />
              Editor Visual
            </Button>
            <Button onClick={() => setShowTemplateDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Novo Template
            </Button>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Mail className="h-6 w-6 text-primary" />
              Email Marketing
            </h1>
            <p className="text-muted-foreground mt-1">
              Crie e envie campanhas de email para os seus contactos
            </p>
          </div>
          <div className="flex gap-2 items-center flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowCampaignWizard(true)}
              className="gap-1.5"
            >
              <Sparkles className="h-4 w-4" />
              Criar com IA
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/dashboard/email-campaigns/suppressions')}
            >
              <ShieldBan className="h-4 w-4 mr-2" />
              Supressões
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/dashboard/sequences')}
            >
              <Send className="h-4 w-4 mr-2" />
              Sequências
            </Button>
            {getAddButton()}
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <div className="overflow-x-auto -mx-1 px-1">
            <TabsList className="flex w-max min-w-full lg:w-auto lg:inline-flex">
              <TabsTrigger value="dashboard" className="gap-1.5">
                <BarChart3 className="h-4 w-4" />
                <span className="hidden sm:inline">Dashboard</span>
              </TabsTrigger>
              <TabsTrigger value="campaigns" className="gap-1.5">
                <Send className="h-4 w-4" />
                <span className="hidden sm:inline">Campanhas</span>
              </TabsTrigger>
              <TabsTrigger value="segments" className="gap-1.5">
                <Target className="h-4 w-4" />
                <span className="hidden sm:inline">Segmentos</span>
              </TabsTrigger>
              <TabsTrigger value="templates" className="gap-1.5">
                <FileText className="h-4 w-4" />
                <span className="hidden sm:inline">Templates</span>
              </TabsTrigger>
              <TabsTrigger value="landing" className="gap-1.5">
                <Globe className="h-4 w-4" />
                <span className="hidden sm:inline">Landing Pages</span>
              </TabsTrigger>
              <TabsTrigger value="multicanal" className="gap-1.5">
                <Zap className="h-4 w-4" />
                <span className="hidden sm:inline">Multi-Canal</span>
              </TabsTrigger>
              <TabsTrigger value="automations" className="gap-1.5">
                <GitBranch className="h-4 w-4" />
                <span className="hidden sm:inline">Automações</span>
              </TabsTrigger>
              <TabsTrigger value="analytics" className="gap-1.5">
                <TrendingUp className="h-4 w-4" />
                <span className="hidden sm:inline">Analytics</span>
              </TabsTrigger>
              <TabsTrigger value="events" className="gap-1.5">
                <Bell className="h-4 w-4" />
                <span className="hidden sm:inline">Eventos</span>
              </TabsTrigger>
              <TabsTrigger value="pipeline" className="gap-1.5">
                <GitBranch className="h-4 w-4" />
                <span className="hidden sm:inline">Pipeline</span>
              </TabsTrigger>
              <TabsTrigger value="mcp" className="gap-1.5">
                <Blocks className="h-4 w-4" />
                <span className="hidden sm:inline">Integrações MCP</span>
              </TabsTrigger>
              <TabsTrigger value="settings" className="gap-1.5">
                <Settings className="h-4 w-4" />
                <span className="hidden sm:inline">Definições</span>
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="dashboard" className="space-y-6">
            <MarketingDashboard onCreateCampaign={() => setShowCampaignCreation(true)} />
          </TabsContent>

          <TabsContent value="campaigns" className="space-y-6">
            <MarketingCampaignsList onCreateNew={() => setShowCampaignCreation(true)} />
          </TabsContent>

          <TabsContent value="segments" className="space-y-6">
            <MarketingSegmentsList onCreateNew={() => setShowSegmentDialog(true)} />
          </TabsContent>

          <TabsContent value="templates" className="space-y-6">
            <TemplateLibraryPage />
          </TabsContent>

          <TabsContent value="landing" className="space-y-6">
            <CampaignLandingPages />
          </TabsContent>

          <TabsContent value="multicanal" className="space-y-6">
            <MultichannelSequenceBuilder />
          </TabsContent>

          <TabsContent value="automations" className="space-y-6">
            <LifecycleAutomations />
          </TabsContent>

          <TabsContent value="analytics" className="space-y-6">
            <div className="grid gap-4 lg:grid-cols-3">
              <div className="lg:col-span-2">
                <AdvancedAnalyticsPanel />
              </div>
              <div>
                <CampaignReportExport />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="events" className="space-y-6">
            <WebhookEventsPanel />
          </TabsContent>

          <TabsContent value="pipeline" className="space-y-6">
            <PipelineTriggersPanel />
          </TabsContent>

          <TabsContent value="mcp" className="space-y-6">
            <MCPIntegrationsTab />
          </TabsContent>

          <TabsContent value="settings" className="space-y-6">
            <MarketingSettingsPanel />
          </TabsContent>
        </Tabs>
      </div>

      {/* Dialogs */}
      <CampaignCreationFlow
        open={showCampaignCreation}
        onOpenChange={(open) => {
          setShowCampaignCreation(open);
          if (!open) setWizardInitialHtml(null);
        }}
        initialHtml={wizardInitialHtml}
      />

      <CampaignFormDialog
        open={showCampaignEdit}
        onOpenChange={setShowCampaignEdit}
        campaign={null}
        onClose={() => setShowCampaignEdit(false)}
      />

      <SegmentFormDialog
        open={showSegmentDialog}
        onOpenChange={setShowSegmentDialog}
        onClose={() => setShowSegmentDialog(false)}
      />

      <TemplateFormDialog
        open={showTemplateDialog}
        onOpenChange={setShowTemplateDialog}
        onClose={() => setShowTemplateDialog(false)}
      />

      <EmailBuilderDialog
        open={showEmailBuilder}
        onOpenChange={setShowEmailBuilder}
      />

      <HtmlEmailEditorDialog
        open={showHtmlEditor}
        onOpenChange={setShowHtmlEditor}
      />

      <TemplateLibraryDialog
        open={showTemplateLibrary}
        onOpenChange={setShowTemplateLibrary}
        onSelectTemplate={handleSelectLibraryTemplate}
      />

      <EmailCampaignWizardDialog
        open={showCampaignWizard}
        onOpenChange={setShowCampaignWizard}
        onOpenEditor={handleWizardOpenEditor}
      />
    </DashboardLayout>
  );
}
