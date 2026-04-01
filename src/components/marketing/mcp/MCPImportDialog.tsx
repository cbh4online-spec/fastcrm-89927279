import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle2, XCircle, Download, Layers, Palette, Component } from "lucide-react";
import { useMCPProviders, useImportFromMCP, type NormalizedPayload } from "@/hooks/useMarketingMCP";
import { MCPImportResult } from "./MCPImportResult";

const IMPORT_TYPES = [
  { value: "design_system", label: "Design System Completo" },
  { value: "page_frame", label: "Frame de Página" },
  { value: "section", label: "Secção Específica" },
  { value: "component", label: "Componente" },
  { value: "tokens", label: "Tokens / Estilos" },
];

interface MCPImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workspaceId: string;
}

type Step = "config" | "processing" | "result";

export function MCPImportDialog({ open, onOpenChange, workspaceId }: MCPImportDialogProps) {
  const [step, setStep] = useState<Step>("config");
  const [providerId, setProviderId] = useState("");
  const [importType, setImportType] = useState("");
  const [externalRef, setExternalRef] = useState("");
  const [result, setResult] = useState<{ status: string; normalized?: NormalizedPayload; error?: string } | null>(null);

  const { data: providers } = useMCPProviders(workspaceId);
  const importMutation = useImportFromMCP(workspaceId);

  const enabledProviders = (providers || []).filter((p) => p.is_enabled);

  const handleImport = async () => {
    setStep("processing");
    setResult(null);
    try {
      const res = await importMutation.mutateAsync({
        provider_id: providerId,
        import_type: importType,
        external_reference: externalRef,
      });
      setResult({ status: res.status, normalized: res.normalized as NormalizedPayload, error: res.error });
      setStep("result");
    } catch (err) {
      setResult({ status: "failed", error: err instanceof Error ? err.message : "Erro desconhecido" });
      setStep("result");
    }
  };

  const handleClose = () => {
    onOpenChange(false);
    setTimeout(() => {
      setStep("config");
      setProviderId("");
      setImportType("");
      setExternalRef("");
      setResult(null);
    }, 200);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Importar Contexto MCP
          </DialogTitle>
        </DialogHeader>

        {step === "config" && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Provider MCP</Label>
              <Select value={providerId} onValueChange={setProviderId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar provider..." />
                </SelectTrigger>
                <SelectContent>
                  {enabledProviders.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.provider_name} ({p.provider_key})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {enabledProviders.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  Nenhum provider activo. Active um provider na secção de Providers.
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Tipo de Importação</Label>
              <Select value={importType} onValueChange={setImportType}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar tipo..." />
                </SelectTrigger>
                <SelectContent>
                  {IMPORT_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Referência Externa</Label>
              <Input
                placeholder="URL do Figma ou file key (ex: https://figma.com/design/abc123...)"
                value={externalRef}
                onChange={(e) => setExternalRef(e.target.value)}
                maxLength={500}
              />
              <p className="text-xs text-muted-foreground">
                Cole o URL do ficheiro Figma ou o file key. Para secções específicas, inclua o node-id no URL.
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={handleClose}>
                Cancelar
              </Button>
              <Button
                onClick={handleImport}
                disabled={!providerId || !importType || !externalRef.trim()}
              >
                <Download className="h-4 w-4 mr-2" />
                Importar
              </Button>
            </div>
          </div>
        )}

        {step === "processing" && (
          <div className="flex flex-col items-center justify-center py-12 space-y-4">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <div className="text-center">
              <p className="font-medium">A importar contexto...</p>
              <p className="text-sm text-muted-foreground mt-1">
                A conectar ao servidor MCP, a ler estrutura e a normalizar dados.
              </p>
            </div>
          </div>
        )}

        {step === "result" && result && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              {result.status === "completed" ? (
                <Badge variant="default" className="bg-green-600">
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  Concluído
                </Badge>
              ) : (
                <Badge variant="destructive">
                  <XCircle className="h-3 w-3 mr-1" />
                  Falhou
                </Badge>
              )}
            </div>

            {result.error && (
              <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                <p className="text-sm text-destructive">{result.error}</p>
              </div>
            )}

            {result.normalized && (
              <MCPImportResult normalized={result.normalized} />
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => { setStep("config"); setResult(null); }}>
                Nova Importação
              </Button>
              <Button onClick={handleClose}>Fechar</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
