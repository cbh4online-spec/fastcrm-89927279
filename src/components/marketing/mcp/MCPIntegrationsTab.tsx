import { useWorkspace } from "@/contexts/WorkspaceContext";
import { MCPProvidersPanel } from "./MCPProvidersPanel";
import { MCPWorkflowBindings } from "./MCPWorkflowBindings";

export function MCPIntegrationsTab() {
  const { currentWorkspace } = useWorkspace();

  if (!currentWorkspace?.id) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        Selecione um workspace para configurar integrações MCP.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Integrações MCP</h2>
        <p className="text-sm text-muted-foreground">
          Configure servidores MCP externos para alimentar workflows de marketing — landing pages, funis, design systems e mais.
        </p>
      </div>
      <MCPProvidersPanel workspaceId={currentWorkspace.id} />
      <MCPWorkflowBindings workspaceId={currentWorkspace.id} />
    </div>
  );
}
