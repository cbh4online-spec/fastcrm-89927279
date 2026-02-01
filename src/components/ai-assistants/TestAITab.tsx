/**
 * Test AI Tab - AI Query Panel with metrics
 * Allows testing AI responses directly within the module
 */

import { useKnowledgeBase } from "@/hooks/useKnowledgeBase";
import { AIQueryPanel } from "@/components/knowledge-base/AIQueryPanel";
import { KnowledgeMetricsCard } from "@/components/knowledge-base/KnowledgeMetricsCard";

export function TestAITab() {
  const { personas, metrics, queryKnowledge } = useKnowledgeBase();

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        Teste o comportamento da IA em tempo real usando as personas e bases de conhecimento configuradas.
      </p>
      
      {/* Metrics Overview */}
      {metrics && (
        <KnowledgeMetricsCard metrics={metrics} />
      )}

      {/* AI Query Panel */}
      <AIQueryPanel
        personas={personas}
        onQuery={queryKnowledge}
        context="test"
      />
    </div>
  );
}
