import { useState } from "react";
import { Mail, RefreshCw, Trash2, Power, CheckCircle, AlertCircle, Clock, Loader2, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  AlertDialog, 
  AlertDialogCancel, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle, 
  AlertDialogTrigger 
} from "@/components/ui/alert-dialog";
import { EmailConnection, useDisconnectEmail, useSyncEmail } from "@/hooks/useEmailConnection";
import { EmailEditDialog } from "./EmailEditDialog";
import { formatDistanceToNow } from "date-fns";
import { pt } from "date-fns/locale";

interface EmailConnectionCardProps {
  connection: EmailConnection;
}

const providerLabels: Record<string, string> = {
  gmail: "Gmail",
  outlook: "Outlook",
  hostinger: "Hostinger",
  custom: "Custom IMAP",
};

const providerColors: Record<string, string> = {
  gmail: "bg-red-500",
  outlook: "bg-blue-600",
  hostinger: "bg-purple-600",
  custom: "bg-gray-500",
};

const statusConfig = {
  pending: { icon: Clock, color: "text-yellow-500", label: "Pendente" },
  syncing: { icon: Loader2, color: "text-blue-500", label: "A sincronizar..." },
  synced: { icon: CheckCircle, color: "text-green-500", label: "Sincronizado" },
  error: { icon: AlertCircle, color: "text-red-500", label: "Erro" },
};

export function EmailConnectionCard({ connection }: EmailConnectionCardProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const disconnectEmail = useDisconnectEmail();
  const syncEmail = useSyncEmail();

  const StatusIcon = statusConfig[connection.sync_status]?.icon || Clock;
  const statusColor = statusConfig[connection.sync_status]?.color || "text-muted-foreground";
  const statusLabel = statusConfig[connection.sync_status]?.label || connection.sync_status;

  const handleSync = () => {
    syncEmail.mutate(connection.id);
  };

  const handleDisconnect = (deleteData: boolean) => {
    disconnectEmail.mutate({ connectionId: connection.id, deleteData });
    setShowDeleteDialog(false);
  };

  return (
    <Card className={!connection.is_active ? "opacity-60" : ""}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${providerColors[connection.provider]}`}>
              <Mail className="w-5 h-5 text-white" />
            </div>
            <div>
              <CardTitle className="text-base">{connection.email_address}</CardTitle>
              <CardDescription className="flex items-center gap-2 mt-1">
                <Badge variant="outline" className="text-xs">
                  {providerLabels[connection.provider]}
                </Badge>
                {!connection.is_active && (
                  <Badge variant="secondary" className="text-xs">
                    Desativado
                  </Badge>
                )}
              </CardDescription>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowEditDialog(true)}
              title="Editar configurações"
            >
              <Settings className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleSync}
              disabled={syncEmail.isPending || !connection.is_active}
              title="Sincronizar"
            >
              <RefreshCw className={`w-4 h-4 ${syncEmail.isPending ? "animate-spin" : ""}`} />
            </Button>
            
            <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
                  <Trash2 className="w-4 h-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Desconectar email?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Escolha como pretende desconectar o email {connection.email_address}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <div className="space-y-3 py-4">
                  <Button
                    variant="outline"
                    className="w-full justify-start gap-2"
                    onClick={() => handleDisconnect(false)}
                    disabled={disconnectEmail.isPending}
                  >
                    <Power className="w-4 h-4" />
                    <div className="text-left">
                      <div className="font-medium">Desativar</div>
                      <div className="text-xs text-muted-foreground">
                        Mantém conversas existentes, para de sincronizar
                      </div>
                    </div>
                  </Button>
                  <Button
                    variant="destructive"
                    className="w-full justify-start gap-2"
                    onClick={() => handleDisconnect(true)}
                    disabled={disconnectEmail.isPending}
                  >
                    <Trash2 className="w-4 h-4" />
                    <div className="text-left">
                      <div className="font-medium">Remover tudo</div>
                      <div className="text-xs opacity-90">
                        Remove conexão e limpa credenciais
                      </div>
                    </div>
                  </Button>
                </div>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <StatusIcon className={`w-4 h-4 ${statusColor} ${connection.sync_status === "syncing" ? "animate-spin" : ""}`} />
            <span className={statusColor}>{statusLabel}</span>
          </div>
          
          {connection.last_sync_at && (
            <span className="text-muted-foreground text-xs">
              Última sync: {formatDistanceToNow(new Date(connection.last_sync_at), { addSuffix: true, locale: pt })}
            </span>
          )}
        </div>

        {connection.sync_error && (
          <div className="mt-2 p-2 bg-destructive/10 text-destructive text-xs rounded">
            {connection.sync_error}
          </div>
        )}

        <div className="mt-3 text-xs text-muted-foreground">
          <div>IMAP: {connection.imap_host}:{connection.imap_port}</div>
          <div>SMTP: {connection.smtp_host}:{connection.smtp_port}</div>
        </div>
      </CardContent>

      <EmailEditDialog
        open={showEditDialog}
        onOpenChange={setShowEditDialog}
        connection={connection}
      />
    </Card>
  );
}
