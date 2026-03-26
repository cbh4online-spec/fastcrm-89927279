import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PageHeader } from "@/components/common/PageHeader";
import { CommandHero } from "@/components/command-center-v2/CommandHero";
import { CommandResponseCard } from "@/components/command-center-v2/CommandResponseCard";
import { CommandQuickActions } from "@/components/command-center-v2/CommandQuickActions";
import { CommandFollowUpChips } from "@/components/command-center-v2/CommandFollowUpChips";
import { CommandLiveDashboard } from "@/components/command-center-v2/CommandLiveDashboard";
import { CommandProactiveFeed } from "@/components/command-center-v2/CommandProactiveFeed";
import { CommandHistoryTimeline } from "@/components/command-center-v2/CommandHistoryTimeline";
import { CommandSuggestionGrid } from "@/components/command-center-v2/CommandSuggestionGrid";
import { useCommandOrchestrator } from "@/hooks/useCommandOrchestrator";
import { Skeleton } from "@/components/ui/skeleton";

export default function CommandCenterV2Page() {
  const { execute, isLoading, currentResponse, history, clear } = useCommandOrchestrator();

  const handleSubmit = (command: string) => {
    execute(command);
  };

  return (
    <DashboardLayout>
    <div className="space-y-6 p-4 md:p-6 max-w-5xl mx-auto">
      <PageHeader
        title="Command Center"
        description="Execute comandos inteligentes com contexto CRM completo"
      />

      {/* Live Dashboard — always visible */}
      <CommandLiveDashboard />

      <CommandHero
        onSubmit={handleSubmit}
        isLoading={isLoading}
        onCommandSelect={handleSubmit}
      />

      {/* Proactive Kernel Signals */}
      {!currentResponse && !isLoading && (
        <CommandProactiveFeed onSignalClick={handleSubmit} />
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="space-y-4">
          <Skeleton className="h-20 rounded-xl" />
          <Skeleton className="h-32 rounded-xl" />
          <Skeleton className="h-24 rounded-xl" />
        </div>
      )}

      {/* Response */}
      {currentResponse?.result && !isLoading && (
        <div className="space-y-6">
          <CommandResponseCard
            result={currentResponse.result}
            intent={currentResponse.intent}
          />
          <CommandQuickActions
            actions={currentResponse.result.suggested_actions}
            entityId={currentResponse.entity_id}
            entityName={currentResponse.entity_name}
          />
          {/* Follow-up contextual chips */}
          <CommandFollowUpChips
            response={currentResponse}
            onSelect={handleSubmit}
            isLoading={isLoading}
          />
        </div>
      )}

      {/* Idle State — show suggestions */}
      {!currentResponse && !isLoading && (
        <CommandSuggestionGrid onSelect={handleSubmit} />
      )}

      {/* History Timeline */}
      <CommandHistoryTimeline
        history={history}
        onReplay={handleSubmit}
      />
    </div>
    </DashboardLayout>
  );
}
