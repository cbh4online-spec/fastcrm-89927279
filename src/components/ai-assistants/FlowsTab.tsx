/**
 * Flows Tab - Wrapper for FlowBuilderModule
 * Integrates conversational flows into the AI Assistants module
 */

import { useKnowledgeBase } from "@/hooks/useKnowledgeBase";
import { FlowBuilderModule } from "@/components/flow-builder/FlowBuilderModule";

export function FlowsTab() {
  const { personas, knowledgeBases } = useKnowledgeBase();

  // Prepare personas for FlowBuilderModule
  const personasForFlows = personas.map(p => ({
    id: p.id,
    name: p.name,
    isActive: p.isActive
  }));

  // Prepare knowledge bases for FlowBuilderModule
  const kbsForFlows = knowledgeBases.map(kb => ({
    id: kb.id,
    name: kb.name
  }));

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Construa fluxos conversacionais visuais que guiam os utilizadores através de interações estruturadas.
      </p>
      <FlowBuilderModule 
        personas={personasForFlows}
        knowledgeBases={kbsForFlows}
      />
    </div>
  );
}
