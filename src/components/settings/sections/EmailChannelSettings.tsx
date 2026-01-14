import { useState } from "react";
import { Mail, Plus, Shield, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { SettingsSection } from "@/components/settings/SettingsSection";
import { EmailConnectionCard } from "@/components/inbox/EmailConnectionCard";
import { EmailConnectDialog } from "@/components/inbox/EmailConnectDialog";
import { useEmailConnections } from "@/hooks/useEmailConnection";

interface EmailChannelSettingsProps {
  searchQuery?: string;
  matchedSections?: Set<string>;
}

export function EmailChannelSettings({ searchQuery, matchedSections }: EmailChannelSettingsProps) {
  const [showConnectDialog, setShowConnectDialog] = useState(false);
  const { data: connections, isLoading, error } = useEmailConnections();

  const shouldShow = (sectionId: string) => {
    if (!searchQuery) return true;
    return matchedSections?.has(sectionId) ?? false;
  };

  if (!shouldShow("email-channel")) return null;

  return (
    <>
      <SettingsSection
        title="Canal de Email"
        description="Configure contas de email para receber e enviar mensagens no Inbox"
        icon={<Mail className="w-5 h-5" />}
      >
        <div className="space-y-6">
          {/* Security Notice */}
          <Alert>
            <Shield className="w-4 h-4" />
            <AlertTitle>Segurança de Credenciais</AlertTitle>
            <AlertDescription>
              As suas credenciais de email são encriptadas antes de serem armazenadas. 
              Nunca armazenamos passwords em texto simples e pode desconectar a qualquer momento.
            </AlertDescription>
          </Alert>

          {/* Connections List */}
          {isLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-32 w-full" />
            </div>
          ) : error ? (
            <Alert variant="destructive">
              <AlertTriangle className="w-4 h-4" />
              <AlertTitle>Erro</AlertTitle>
              <AlertDescription>
                Não foi possível carregar as conexões de email.
              </AlertDescription>
            </Alert>
          ) : connections && connections.length > 0 ? (
            <div className="space-y-4">
              {connections.map((connection) => (
                <EmailConnectionCard key={connection.id} connection={connection} />
              ))}
            </div>
          ) : (
            <div className="text-center py-8 border rounded-lg border-dashed">
              <Mail className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="font-medium mb-2">Nenhum email conectado</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Conecte uma conta de email para receber e responder a mensagens no Inbox.
              </p>
              <Button onClick={() => setShowConnectDialog(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Conectar Email
              </Button>
            </div>
          )}

          {/* Add Connection Button */}
          {connections && connections.length > 0 && (
            <Button onClick={() => setShowConnectDialog(true)} variant="outline" className="w-full">
              <Plus className="w-4 h-4 mr-2" />
              Adicionar outra conta de email
            </Button>
          )}

          {/* Feature Info */}
          <div className="grid gap-4 sm:grid-cols-3 text-sm">
            <div className="p-4 rounded-lg bg-muted/50">
              <h4 className="font-medium mb-1">📥 Receber Emails</h4>
              <p className="text-muted-foreground text-xs">
                Emails aparecem como conversas no Inbox, agrupados automaticamente.
              </p>
            </div>
            <div className="p-4 rounded-lg bg-muted/50">
              <h4 className="font-medium mb-1">📤 Enviar Emails</h4>
              <p className="text-muted-foreground text-xs">
                Responda diretamente do Inbox mantendo o threading das conversas.
              </p>
            </div>
            <div className="p-4 rounded-lg bg-muted/50">
              <h4 className="font-medium mb-1">🤖 IA Assistente</h4>
              <p className="text-muted-foreground text-xs">
                Classificação automática de prioridade e intenção, sugestões de resposta.
              </p>
            </div>
          </div>
        </div>
      </SettingsSection>

      <EmailConnectDialog 
        open={showConnectDialog} 
        onOpenChange={setShowConnectDialog} 
      />
    </>
  );
}
