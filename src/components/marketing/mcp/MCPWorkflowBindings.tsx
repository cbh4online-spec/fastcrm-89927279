import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Globe, GitBranch, FileText, Layers, BookOpen, X } from "lucide-react";
import {
  useMCPProviders,
  useMCPWorkflowBindings,
  useUpsertMCPBinding,
  useDeleteMCPBinding,
} from "@/hooks/useMarketingMCP";

interface MCPWorkflowBindingsProps {
  workspaceId: string;
}

const WORKFLOW_TYPES = [
  { key: "landing_page", label: "Landing Pages", icon: Globe },
  { key: "funnel", label: "Funis", icon: GitBranch },
  { key: "website", label: "Websites", icon: Layers },
  { key: "campaign", label: "Campanhas", icon: FileText },
  { key: "section_library", label: "Biblioteca de Secções", icon: BookOpen },
] as const;

export function MCPWorkflowBindings({ workspaceId }: MCPWorkflowBindingsProps) {
  const { data: providers, isLoading: loadingProviders } = useMCPProviders(workspaceId);
  const { data: bindings, isLoading: loadingBindings } = useMCPWorkflowBindings(workspaceId);
  const upsertMutation = useUpsertMCPBinding(workspaceId);
  const deleteMutation = useDeleteMCPBinding(workspaceId);

  const enabledProviders = providers?.filter((p) => p.is_enabled) ?? [];
  const isLoading = loadingProviders || loadingBindings;

  const getBinding = (workflowType: string) =>
    bindings?.find((b) => b.workflow_type === workflowType);

  const handleChange = (workflowType: string, providerId: string) => {
    if (providerId === "__none__") {
      const binding = getBinding(workflowType);
      if (binding) deleteMutation.mutate(binding.id);
      return;
    }
    upsertMutation.mutate({ workflow_type: workflowType, provider_id: providerId });
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader><CardTitle>Workflow Bindings</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-12 w-full" />)}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Workflow Bindings</CardTitle>
        <p className="text-sm text-muted-foreground">
          Defina qual provider MCP é usado em cada tipo de workflow de marketing.
        </p>
      </CardHeader>
      <CardContent>
        {!enabledProviders.length ? (
          <div className="text-center py-6 text-muted-foreground text-sm">
            Nenhum provider MCP activo. Active um provider primeiro.
          </div>
        ) : (
          <div className="space-y-4">
            {WORKFLOW_TYPES.map(({ key, label, icon: Icon }) => {
              const binding = getBinding(key);
              return (
                <div key={key} className="flex items-center gap-3 p-3 rounded-lg border bg-card">
                  <Icon className="h-5 w-5 text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{label}</p>
                  </div>
                  <Select
                    value={binding?.provider_id || "__none__"}
                    onValueChange={(v) => handleChange(key, v)}
                    disabled={upsertMutation.isPending || deleteMutation.isPending}
                  >
                    <SelectTrigger className="w-[200px]">
                      <SelectValue placeholder="Nenhum" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">Nenhum</SelectItem>
                      {enabledProviders.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.provider_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
