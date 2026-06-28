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

  const getPrimaryAction = () => {
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
          <Button onClick={() => setShowTemplateDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Novo Template
          </Button>
        );
      default:
        return (
          <Button onClick={() => setShowCampaignCreation(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Nova Campanha
          </Button>
        );
    }
  };

  const tabs: IXTabDef[] = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'campaigns', label: 'Campanhas' },
    { id: 'segments', label: 'Segmentos' },
    { id: 'templates', label: 'Templates' },
    { id: 'landing', label: 'Landing Pages' },
    { id: 'multicanal', label: 'Multi-Canal' },
    { id: 'automations', label: 'Automações' },
    { id: 'analytics', label: 'Analytics' },
    { id: 'events', label: 'Eventos' },
    { id: 'pipeline', label: 'Pipeline' },
    { id: 'mcp', label: 'Integrações MCP' },
    { id: 'settings', label: 'Definições' },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="min-w-0">
            <h1 className="text-3xl font-bold tracking-tight text-foreground">
              Email Marketing
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Crie e envie campanhas de email para os seus contactos
            </p>
          </div>
          <div className="flex gap-2 items-center">
            {getPrimaryAction()}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon" aria-label="Mais ações">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem onClick={() => setShowCampaignWizard(true)}>
                  <Sparkles className="h-4 w-4 mr-2" /> Criar com IA
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setShowTemplateLibrary(true)}>
                  <Library className="h-4 w-4 mr-2" /> Biblioteca de templates
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setShowHtmlEditor(true)}>
                  <Code className="h-4 w-4 mr-2" /> Editor HTML
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setShowEmailBuilder(true)}>
                  <Paintbrush className="h-4 w-4 mr-2" /> Editor Visual
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate('/dashboard/email-campaigns/suppressions')}>
                  <ShieldBan className="h-4 w-4 mr-2" /> Supressões
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate('/dashboard/sequences')}>
                  <Send className="h-4 w-4 mr-2" /> Sequências
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <IXEntityTabs tabs={tabs} activeId={activeTab} onChange={setActiveTab} className="px-0 sm:px-0" />


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
