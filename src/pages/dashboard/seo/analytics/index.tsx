import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Target, 
  FileText, 
  TrendingUp, 
  Wrench, 
  MousePointer, 
  Users 
} from 'lucide-react';
import { SEOActivationDashboard } from './SEOActivationDashboard';
import { KeywordPagesDashboard } from './KeywordPagesDashboard';
import { SEOFunnelDashboard } from './SEOFunnelDashboard';
import { TemplatesToolsDashboard } from './TemplatesToolsDashboard';
import { UXFrictionDashboard } from './UXFrictionDashboard';
import { GrowthRetargetingDashboard } from './GrowthRetargetingDashboard';

interface SEOAnalyticsDashboardsProps {
  initialTab?: string;
}

export function SEOAnalyticsDashboards({ initialTab = 'activation' }: SEOAnalyticsDashboardsProps) {
  const [activeTab, setActiveTab] = useState(initialTab);

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
      <TabsList className="grid w-full grid-cols-6 lg:w-auto lg:inline-grid">
        <TabsTrigger value="activation" className="gap-2">
          <Target className="h-4 w-4" />
          <span className="hidden lg:inline">Ativação</span>
        </TabsTrigger>
        <TabsTrigger value="keywords" className="gap-2">
          <FileText className="h-4 w-4" />
          <span className="hidden lg:inline">Keywords</span>
        </TabsTrigger>
        <TabsTrigger value="funnel" className="gap-2">
          <TrendingUp className="h-4 w-4" />
          <span className="hidden lg:inline">Funil</span>
        </TabsTrigger>
        <TabsTrigger value="templates" className="gap-2">
          <Wrench className="h-4 w-4" />
          <span className="hidden lg:inline">Templates</span>
        </TabsTrigger>
        <TabsTrigger value="ux" className="gap-2">
          <MousePointer className="h-4 w-4" />
          <span className="hidden lg:inline">UX</span>
        </TabsTrigger>
        <TabsTrigger value="growth" className="gap-2">
          <Users className="h-4 w-4" />
          <span className="hidden lg:inline">Growth</span>
        </TabsTrigger>
      </TabsList>

      <TabsContent value="activation">
        <SEOActivationDashboard />
      </TabsContent>

      <TabsContent value="keywords">
        <KeywordPagesDashboard />
      </TabsContent>

      <TabsContent value="funnel">
        <SEOFunnelDashboard />
      </TabsContent>

      <TabsContent value="templates">
        <TemplatesToolsDashboard />
      </TabsContent>

      <TabsContent value="ux">
        <UXFrictionDashboard />
      </TabsContent>

      <TabsContent value="growth">
        <GrowthRetargetingDashboard />
      </TabsContent>
    </Tabs>
  );
}

export { SEOActivationDashboard } from './SEOActivationDashboard';
export { KeywordPagesDashboard } from './KeywordPagesDashboard';
export { SEOFunnelDashboard } from './SEOFunnelDashboard';
export { TemplatesToolsDashboard } from './TemplatesToolsDashboard';
export { UXFrictionDashboard } from './UXFrictionDashboard';
export { GrowthRetargetingDashboard } from './GrowthRetargetingDashboard';
