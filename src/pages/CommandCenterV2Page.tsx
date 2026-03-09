import { PageHeader } from "@/components/common/PageHeader";
import { CommandHero } from "@/components/command-center-v2/CommandHero";
import { CommandResponseCard } from "@/components/command-center-v2/CommandResponseCard";
import { CommandQuickActions } from "@/components/command-center-v2/CommandQuickActions";
import { CommandSuggestionGrid } from "@/components/command-center-v2/CommandSuggestionGrid";
import { useCommandOrchestrator } from "@/hooks/useCommandOrchestrator";
import { Skeleton } from "@/components/ui/skeleton";

export default function CommandCenterV2Page() {
  const { execute, isLoading, currentResponse, history, clear } = useCommandOrchestrator();

  const handleSubmit = (command: string) => {
    execute(command);
  };

  return (
    <div className="space-y-6 p-4 md:p-6 max-w-5xl mx-auto">
      <PageHeader
        title="Command Center"
        description="Execute comandos inteligentes com contexto CRM completo"
      />

      <CommandHero
        onSubmit={handleSubmit}
        isLoading={isLoading}
        onCommandSelect={handleSubmit}
      />

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
          <CommandQuickActions actions={currentResponse.result.suggested_actions} />
        </div>
      )}

      {/* Idle State — show suggestions */}
      {!currentResponse && !isLoading && (
        <CommandSuggestionGrid onSelect={handleSubmit} />
      )}

      {/* History */}
      {history.length > 1 && !isLoading && (
        <div className="space-y-2 pt-4 border-t border-border/50">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Histórico Recente</p>
          <div className="space-y-1">
            {history.slice(1, 6).map((item, i) => (
              <button
                key={i}
                onClick={() => execute(item.command)}
                className="w-full text-left px-3 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors truncate"
              >
                {item.command}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
