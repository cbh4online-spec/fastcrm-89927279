import { useState } from "react";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { MCPProvidersPanel } from "./MCPProvidersPanel";
import { MCPWorkflowBindings } from "./MCPWorkflowBindings";
import { MCPImportDialog } from "./MCPImportDialog";
import { MCPImportHistory } from "./MCPImportHistory";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";

export function MCPIntegrationsTab() {
  const { currentWorkspace } = useWorkspace();
  const [importOpen, setImportOpen] = useState(false);

  if (!currentWorkspace?.id) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        Selecione um workspace para configurar integrações MCP.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Integrações MCP</h2>
          <p className="text-sm text-muted-foreground">
            Configure servidores MCP externos para alimentar workflows de marketing — landing pages, funis, design systems e mais.
          </p>
        </div>
        <Button onClick={() => setImportOpen(true)}>
          <Download className="h-4 w-4 mr-2" />
          Importar
        </Button>
      </div>

      <MCPProvidersPanel workspaceId={currentWorkspace.id} />
      <MCPWorkflowBindings workspaceId={currentWorkspace.id} />
      <MCPImportHistory workspaceId={currentWorkspace.id} />

      <MCPImportDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        workspaceId={currentWorkspace.id}
      />
    </div>
  );
}
