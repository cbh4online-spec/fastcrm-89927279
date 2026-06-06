import { Mail, Calendar, HardDrive, FileText, CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  useGoogleWorkspaceConnections,
  useConnectGoogleService,
  useDisconnectGoogleService,
  type GoogleService,
  type GoogleConnection,
} from "@/hooks/useGoogleWorkspaceConnections";

interface ServiceMeta {
  key: GoogleService;
  label: string;
  description: string;
  icon: React.ReactNode;
  color: string;
}

const SERVICES: ServiceMeta[] = [
  {
    key: "gmail",
    label: "Gmail",
    description: "Envio e leitura de emails da conta Google do workspace.",
    icon: <Mail className="h-5 w-5" />,
    color: "text-red-500",
  },
  {
    key: "calendar",
    label: "Google Calendar",
    description: "Eventos, reuniões e disponibilidade.",
    icon: <Calendar className="h-5 w-5" />,
    color: "text-blue-500",
  },
  {
    key: "drive",
    label: "Google Drive",
    description: "Armazenamento e ficheiros do workspace.",
    icon: <HardDrive className="h-5 w-5" />,
    color: "text-yellow-500",
  },
  {
    key: "docs_sheets",
    label: "Google Docs & Sheets",
    description: "Documentos e folhas de cálculo.",
    icon: <FileText className="h-5 w-5" />,
    color: "text-green-500",
  },
];

export function GoogleWorkspaceIntegrations() {
  const { data: connections = [], isLoading } = useGoogleWorkspaceConnections();
  const connect = useConnectGoogleService();
  const disconnect = useDisconnectGoogleService();

  const byService = new Map<string, GoogleConnection>(
    connections.map((c) => [c.service, c]),
  );

  return (
    <div className="space-y-3">
      {SERVICES.map((svc) => {
        const conn = byService.get(svc.key);
        const isConnected = !!conn && conn.is_active;
        return (
          <div
            key={svc.key}
            className="flex items-start gap-4 rounded-lg border border-border/60 bg-card p-4"
          >
            <div className={`mt-0.5 ${svc.color}`}>{svc.icon}</div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className="font-medium text-sm">{svc.label}</h4>
                {isConnected ? (
                  <Badge variant="secondary" className="gap-1">
                    <CheckCircle2 className="h-3 w-3 text-green-500" />
                    Ligado
                  </Badge>
                ) : (
                  <Badge variant="outline">Não ligado</Badge>
                )}
                {conn?.last_error && (
                  <Badge variant="destructive" className="gap-1">
                    <AlertCircle className="h-3 w-3" /> Erro
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                {svc.description}
              </p>
              {conn?.google_email && (
                <p className="text-xs text-muted-foreground mt-1">
                  Conta: <span className="font-mono">{conn.google_email}</span>
                </p>
              )}
              {conn?.last_error && (
                <p className="text-xs text-destructive mt-1">{conn.last_error}</p>
              )}
            </div>
            <div className="flex gap-2">
              {isConnected ? (
                <>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => connect.mutate(svc.key)}
                    disabled={connect.isPending}
                  >
                    Reautenticar
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => disconnect.mutate(svc.key)}
                    disabled={disconnect.isPending}
                  >
                    Desligar
                  </Button>
                </>
              ) : (
                <Button
                  size="sm"
                  onClick={() => connect.mutate(svc.key)}
                  disabled={connect.isPending || isLoading}
                >
                  Ligar
                </Button>
              )}
            </div>
          </div>
        );
      })}
      <p className="text-xs text-muted-foreground pt-2">
        Cada serviço usa OAuth dedicado por workspace — as credenciais ficam
        isoladas entre workspaces e podem ser revogadas a qualquer momento.
      </p>
    </div>
  );
}
