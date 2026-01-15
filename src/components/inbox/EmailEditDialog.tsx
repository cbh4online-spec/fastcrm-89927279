import { useState, useEffect } from "react";
import { Mail, Eye, EyeOff, Globe, Shield, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Switch } from "@/components/ui/switch";
import { EmailConnection, useUpdateEmail } from "@/hooks/useEmailConnection";

interface EmailEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  connection: EmailConnection;
}

export function EmailEditDialog({ open, onOpenChange, connection }: EmailEditDialogProps) {
  const [displayName, setDisplayName] = useState(connection.display_name || "");
  const [appPassword, setAppPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isActive, setIsActive] = useState(connection.is_active);
  
  // Server settings
  const [imapHost, setImapHost] = useState(connection.imap_host || "");
  const [imapPort, setImapPort] = useState(connection.imap_port?.toString() || "993");
  const [smtpHost, setSmtpHost] = useState(connection.smtp_host || "");
  const [smtpPort, setSmtpPort] = useState(connection.smtp_port?.toString() || "587");

  const updateEmail = useUpdateEmail();

  // Reset form when connection changes
  useEffect(() => {
    setDisplayName(connection.display_name || "");
    setAppPassword("");
    setIsActive(connection.is_active);
    setImapHost(connection.imap_host || "");
    setImapPort(connection.imap_port?.toString() || "993");
    setSmtpHost(connection.smtp_host || "");
    setSmtpPort(connection.smtp_port?.toString() || "587");
  }, [connection]);

  const handleClose = () => {
    setAppPassword("");
    setShowPassword(false);
    onOpenChange(false);
  };

  const handleSave = () => {
    updateEmail.mutate({
      connectionId: connection.id,
      displayName: displayName || undefined,
      newPassword: appPassword || undefined,
      isActive,
      serverConfig: connection.provider === "custom" ? {
        imapHost,
        imapPort: parseInt(imapPort),
        smtpHost,
        smtpPort: parseInt(smtpPort),
      } : undefined,
    }, {
      onSuccess: () => {
        handleClose();
      },
    });
  };

  const isCustomProvider = connection.provider === "custom";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Editar Configurações
          </DialogTitle>
          <DialogDescription>
            Altere as configurações da conta {connection.email_address}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Display Name */}
          <div className="space-y-2">
            <Label htmlFor="displayName">Nome de exibição</Label>
            <Input
              id="displayName"
              placeholder="O seu nome"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Este nome aparece como remetente nos emails enviados.
            </p>
          </div>

          {/* Password Update */}
          <div className="space-y-2">
            <Label htmlFor="appPassword">Nova Password (opcional)</Label>
            <div className="relative">
              <Input
                id="appPassword"
                type={showPassword ? "text" : "password"}
                placeholder="Deixe vazio para manter atual"
                value={appPassword}
                onChange={(e) => setAppPassword(e.target.value)}
                className="pr-10"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-0 top-0 h-full"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Preencha apenas se quiser alterar a password/app password.
            </p>
          </div>

          {/* Active Toggle */}
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="space-y-0.5">
              <Label htmlFor="isActive">Conta Ativa</Label>
              <p className="text-xs text-muted-foreground">
                Contas desativadas não sincronizam emails.
              </p>
            </div>
            <Switch
              id="isActive"
              checked={isActive}
              onCheckedChange={setIsActive}
            />
          </div>

          {/* Server Settings (only for custom) */}
          {isCustomProvider && (
            <>
              <div className="pt-2">
                <Label className="text-sm font-medium">Configurações de Servidor</Label>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="imapHost">Servidor IMAP</Label>
                  <Input
                    id="imapHost"
                    placeholder="imap.exemplo.com"
                    value={imapHost}
                    onChange={(e) => setImapHost(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="imapPort">Porta IMAP</Label>
                  <Input
                    id="imapPort"
                    placeholder="993"
                    value={imapPort}
                    onChange={(e) => setImapPort(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="smtpHost">Servidor SMTP</Label>
                  <Input
                    id="smtpHost"
                    placeholder="smtp.exemplo.com"
                    value={smtpHost}
                    onChange={(e) => setSmtpHost(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="smtpPort">Porta SMTP</Label>
                  <Input
                    id="smtpPort"
                    placeholder="587"
                    value={smtpPort}
                    onChange={(e) => setSmtpPort(e.target.value)}
                  />
                </div>
              </div>

              <Alert variant="default" className="bg-muted">
                <Globe className="w-4 h-4" />
                <AlertDescription className="text-xs">
                  Certifique-se de que o seu servidor suporta SSL/TLS para IMAP (porta 993) 
                  e STARTTLS para SMTP (porta 587).
                </AlertDescription>
              </Alert>
            </>
          )}

          {/* Security Note */}
          <Alert variant="default" className="bg-muted">
            <Shield className="w-4 h-4" />
            <AlertDescription className="text-xs">
              A sua password é encriptada antes de ser guardada. 
              Nunca armazenamos passwords em texto simples.
            </AlertDescription>
          </Alert>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancelar
          </Button>
          <Button 
            onClick={handleSave} 
            disabled={updateEmail.isPending}
          >
            {updateEmail.isPending ? "A guardar..." : "Guardar Alterações"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
