import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Mail, 
  Users, 
  BarChart3, 
  Settings, 
  Plus,
  Send,
  FileText,
  Target,
  Paintbrush
} from 'lucide-react';
import { MarketingCampaignsList } from '@/components/marketing/MarketingCampaignsList';
import { MarketingSegmentsList } from '@/components/marketing/MarketingSegmentsList';
import { MarketingTemplatesList } from '@/components/marketing/MarketingTemplatesList';
import { MarketingDashboard } from '@/components/marketing/MarketingDashboard';
import { MarketingSettingsPanel } from '@/components/marketing/MarketingSettingsPanel';
import { CampaignFormDialog } from '@/components/marketing/CampaignFormDialog';
import { SegmentFormDialog } from '@/components/marketing/SegmentFormDialog';
import { TemplateFormDialog } from '@/components/marketing/TemplateFormDialog';
import { EmailBuilderDialog } from '@/components/marketing/EmailBuilderDialog';

export default function Marketing() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [showCampaignDialog, setShowCampaignDialog] = useState(false);
  const [showSegmentDialog, setShowSegmentDialog] = useState(false);
  const [showTemplateDialog, setShowTemplateDialog] = useState(false);
  const [showEmailBuilder, setShowEmailBuilder] = useState(false);

  const getAddButton = () => {
    switch (activeTab) {
      case 'campaigns':
        return (
          <Button onClick={() => setShowCampaignDialog(true)}>
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
          {getAddButton()}
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-5 lg:w-auto lg:inline-flex">
            <TabsTrigger value="dashboard" className="gap-2">
              <BarChart3 className="h-4 w-4" />
              <span className="hidden sm:inline">Dashboard</span>
            </TabsTrigger>
            <TabsTrigger value="campaigns" className="gap-2">
              <Send className="h-4 w-4" />
              <span className="hidden sm:inline">Campanhas</span>
            </TabsTrigger>
            <TabsTrigger value="segments" className="gap-2">
              <Target className="h-4 w-4" />
              <span className="hidden sm:inline">Segmentos</span>
            </TabsTrigger>
            <TabsTrigger value="templates" className="gap-2">
              <FileText className="h-4 w-4" />
              <span className="hidden sm:inline">Templates</span>
            </TabsTrigger>
            <TabsTrigger value="settings" className="gap-2">
              <Settings className="h-4 w-4" />
              <span className="hidden sm:inline">Definições</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="space-y-6">
            <MarketingDashboard onCreateCampaign={() => setShowCampaignDialog(true)} />
          </TabsContent>

          <TabsContent value="campaigns" className="space-y-6">
            <MarketingCampaignsList onCreateNew={() => setShowCampaignDialog(true)} />
          </TabsContent>

          <TabsContent value="segments" className="space-y-6">
            <MarketingSegmentsList onCreateNew={() => setShowSegmentDialog(true)} />
          </TabsContent>

          <TabsContent value="templates" className="space-y-6">
            <MarketingTemplatesList onCreateNew={() => setShowTemplateDialog(true)} />
          </TabsContent>

          <TabsContent value="settings" className="space-y-6">
            <MarketingSettingsPanel />
          </TabsContent>
        </Tabs>
      </div>

      {/* Dialogs */}
      <CampaignFormDialog
        open={showCampaignDialog}
        onOpenChange={setShowCampaignDialog}
        campaign={null}
        onClose={() => setShowCampaignDialog(false)}
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
    </DashboardLayout>
  );
}
