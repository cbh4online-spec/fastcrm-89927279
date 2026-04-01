import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle2, XCircle, Zap } from "lucide-react";
import { useCreateMCPProvider, useUpdateMCPProvider, useTestMCPConnection } from "@/hooks/useMarketingMCP";

interface MCPProviderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workspaceId: string;
  provider?: {
    id: string;
    provider_key: string;
    provider_name: string;
    provider_type: string;
    server_url: string;
    auth_type: string;
    is_default_for_pages: boolean;
    is_default_for_funnels: boolean;
  } | null;
}

const PROVIDER_PRESETS: Record<string, { name: string; type: string; url: string }> = {
  figma: { name: "Figma MCP", type: "mcp", url: "" },
  git: { name: "Git MCP", type: "mcp", url: "" },
  custom: { name: "", type: "mcp", url: "" },
};

export function MCPProviderDialog({ open, onOpenChange, workspaceId, provider }: MCPProviderDialogProps) {
  const isEdit = !!provider;
  const createMutation = useCreateMCPProvider(workspaceId);
  const updateMutation = useUpdateMCPProvider(workspaceId);
  const testMutation = useTestMCPConnection(workspaceId);

  const [providerKey, setProviderKey] = useState("figma");
  const [name, setName] = useState("");
  const [serverUrl, setServerUrl] = useState("");
  const [authType, setAuthType] = useState("bearer");
  const [credentials, setCredentials] = useState("");
  const [defaultPages, setDefaultPages] = useState(false);
  const [defaultFunnels, setDefaultFunnels] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; error?: string; server_info?: unknown } | null>(null);

  useEffect(() => {
    if (open) {
      if (provider) {
        setProviderKey(provider.provider_key);
        setName(provider.provider_name);
        setServerUrl(provider.server_url);
        setAuthType(provider.auth_type);
        setCredentials("");
        setDefaultPages(provider.is_default_for_pages);
        setDefaultFunnels(provider.is_default_for_funnels);
      } else {
        setProviderKey("figma");
        setName(PROVIDER_PRESETS.figma.name);
        setServerUrl("");
        setAuthType("bearer");
        setCredentials("");
        setDefaultPages(false);
        setDefaultFunnels(false);
      }
      setTestResult(null);
    }
  }, [open, provider]);

  const handlePresetChange = (key: string) => {
    setProviderKey(key);
    const preset = PROVIDER_PRESETS[key];
    if (preset && !isEdit) {
      if (preset.name) setName(preset.name);
      if (preset.url) setServerUrl(preset.url);
    }
  };

  const handleSubmit = () => {
    if (!name.trim() || !serverUrl.trim()) return;

    if (isEdit) {
      updateMutation.mutate(
        {
          provider_id: provider!.id,
          provider_name: name,
          server_url: serverUrl,
          auth_type: authType,
          ...(credentials ? { credentials } : {}),
          is_default_for_pages: defaultPages,
          is_default_for_funnels: defaultFunnels,
        },
        { onSuccess: () => onOpenChange(false) }
      );
    } else {
      createMutation.mutate(
        {
          provider_key: providerKey,
          provider_name: name,
          server_url: serverUrl,
          auth_type: authType,
          ...(credentials ? { credentials } : {}),
        },
        { onSuccess: () => onOpenChange(false) }
      );
    }
  };

  const handleTest = () => {
    if (!provider?.id) return;
    setTestResult(null);
    testMutation.mutate(provider.id, {
      onSuccess: (data) => setTestResult(data),
      onError: (err) => setTestResult({ success: false, error: err.message }),
    });
  };

  const isSaving = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar Provider MCP" : "Adicionar Provider MCP"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {!isEdit && (
            <div className="space-y-1.5">
              <Label>Tipo de Provider</Label>
              <Select value={providerKey} onValueChange={handlePresetChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="figma">Figma MCP</SelectItem>
                  <SelectItem value="git">Git MCP</SelectItem>
                  <SelectItem value="custom">Custom MCP</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-1.5">
            <Label>Nome</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Figma Design System" maxLength={200} />
          </div>

          <div className="space-y-1.5">
            <Label>Server URL</Label>
            <Input value={serverUrl} onChange={(e) => setServerUrl(e.target.value)} placeholder="https://mcp-server.example.com" maxLength={2000} />
          </div>

          <div className="space-y-1.5">
            <Label>Método de Autenticação</Label>
            <Select value={authType} onValueChange={setAuthType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="bearer">Bearer Token</SelectItem>
                <SelectItem value="api_key">API Key</SelectItem>
                <SelectItem value="none">Sem Autenticação</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {authType !== "none" && (
            <div className="space-y-1.5">
              <Label>{authType === "bearer" ? "Token" : "API Key"}</Label>
              <Input
                type="password"
                value={credentials}
                onChange={(e) => setCredentials(e.target.value)}
                placeholder={isEdit ? "Deixar vazio para manter atual" : "Inserir credencial"}
              />
            </div>
          )}

          <div className="flex items-center justify-between">
            <Label>Default para Landing Pages</Label>
            <Switch checked={defaultPages} onCheckedChange={setDefaultPages} />
          </div>

          <div className="flex items-center justify-between">
            <Label>Default para Funis</Label>
            <Switch checked={defaultFunnels} onCheckedChange={setDefaultFunnels} />
          </div>

          {isEdit && (
            <div className="pt-2 border-t">
              <Button variant="outline" size="sm" onClick={handleTest} disabled={testMutation.isPending}>
                {testMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Zap className="h-4 w-4 mr-2" />}
                Testar Conexão
              </Button>
              {testResult && (
                <div className="mt-2">
                  {testResult.success ? (
                    <Badge variant="default" className="bg-primary">
                      <CheckCircle2 className="h-3 w-3 mr-1" /> Conectado
                    </Badge>
                  ) : (
                    <div className="space-y-1">
                      <Badge variant="destructive">
                        <XCircle className="h-3 w-3 mr-1" /> Falhou
                      </Badge>
                      {testResult.error && (
                        <p className="text-xs text-destructive">{testResult.error}</p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={isSaving || !name.trim() || !serverUrl.trim()}>
            {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {isEdit ? "Guardar" : "Criar Provider"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
