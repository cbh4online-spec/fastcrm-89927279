import { useState } from 'react';
import { InsightsPanel } from './InsightsPanel';
import { ScoreTemperatureDisplay } from './ScoreTemperatureDisplay';
import { InsightsSettingsDialog } from './InsightsSettingsDialog';
import { useAIInsights } from '@/hooks/useAIInsights';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { History } from 'lucide-react';

interface InsightsSidebarProps {
  entityType: 'lead' | 'contact' | 'company';
  entityId: string;
}

export function InsightsSidebar({ entityType, entityId }: InsightsSidebarProps) {
  const [settingsOpen, setSettingsOpen] = useState(false);
  
  const {
    insights,
    score,
    summary,
    isLoading,
    isRefreshing,
    refresh,
    dismissInsight,
    submitFeedback,
    settings,
    updateSettings,
  } = useAIInsights({ entityId, entityType });

  return (
    <div className="space-y-4">
      {/* Score & Temperature */}
      <ScoreTemperatureDisplay
        score={score}
        isLoading={isLoading}
        showFactors={true}
      />

      <Separator />

      {/* Insights Panel */}
      <InsightsPanel
        entityType={entityType}
        entityId={entityId}
        insights={insights}
        summary={summary}
        isLoading={isLoading}
        isRefreshing={isRefreshing}
        onRefresh={refresh}
        onDismiss={dismissInsight}
        onFeedback={submitFeedback}
        onSettingsClick={() => setSettingsOpen(true)}
      />

      {/* Settings Dialog */}
      <InsightsSettingsDialog
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        settings={settings}
        onSettingsChange={updateSettings}
      />
    </div>
  );
}
