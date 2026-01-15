import { useState } from "react";
import { Mail, Eye, EyeOff, Globe, Shield, AlertTriangle } from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useConnectEmail, EmailProvider } from "@/hooks/useEmailConnection";

interface EmailConnectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const providerOptions = [
  { value: "gmail", label: "Gmail", icon: "🔴" },
  { value: "outlook", label: "Outlook / Microsoft 365", icon: "🔵" },
  { value: "hostinger", label: "Hostinger", icon: "🟣" },
  { value: "custom", label: "Servidor personalizado (IMAP/SMTP)", icon: "⚙️" },
];

export function EmailConnectDialog({ open, onOpenChange }: EmailConnectDialogProps) {
  const [step, setStep] = useState<"provider" | "credentials" | "custom">("provider");
  const [provider, setProvider] = useState<EmailProvider>("gmail");
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [appPassword, setAppPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  
  // Custom server settings
  const [imapHost, setImapHost] = useState("");
  const [imapPort, setImapPort] = useState("993");
  const [smtpHost, setSmtpHost] = useState("");
  const [smtpPort, setSmtpPort] = useState("587");

  const connectEmail = useConnectEmail();

  const resetForm = () => {
    setStep("provider");
    setProvider("gmail");
    setEmail("");
    setDisplayName("");
    setAppPassword("");
    setImapHost("");
    setImapPort("993");
    setSmtpHost("");
    setSmtpPort("587");
  };

  const handleClose = () => {
    resetForm();
    onOpenChange(false);
  };

  const handleProviderSelect = (value: EmailProvider) => {
    setProvider(value);
    if (value === "custom") {
      setStep("custom");
    } else if (value === "hostinger") {
      // Pre-fill Hostinger server settings
      setImapHost("imap.hostinger.com");
      setImapPort("993");
      setSmtpHost("smtp.hostinger.com");
      setSmtpPort("587");
      setStep("credentials");
    } else {
      setStep("credentials");
    }
  };

  const handleConnect = () => {
    const params: Parameters<typeof connectEmail.mutate>[0] = {
      emailAddress: email,
      displayName: displayName || undefined,
      provider,
      authType: "app_password",
      appPassword,
    };

    if (provider === "custom") {
      params.customConfig = {
        imapHost,
        imapPort: parseInt(imapPort),
        smtpHost,
        smtpPort: parseInt(smtpPort),
      };
    }

    connectEmail.mutate(params, {
      onSuccess: () => {
        handleClose();
      },
    });
  };

  const isValid = () => {
    if (!email || !appPassword) return false;
    if (provider === "custom" && (!imapHost || !smtpHost)) return false;
    return true;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="w-5 h-5" />
            Conectar Email
          </DialogTitle>
          <DialogDescription>
            Conecte a sua conta de email para receber e enviar mensagens no Inbox.
          </DialogDescription>
        </DialogHeader>

        {step === "provider" && (
          <div className="space-y-4 py-4">
            <Label>Selecione o seu fornecedor de email</Label>
            <div className="grid gap-3">
              {providerOptions.map((option) => (
                <Button
                  key={option.value}
                  variant="outline"
                  className="justify-start h-auto py-4 px-4"
                  onClick={() => handleProviderSelect(option.value as EmailProvider)}
                >
                  <span className="text-xl mr-3">{option.icon}</span>
                  <span>{option.label}</span>
                </Button>
              ))}
            </div>
          </div>
        )}

        {step === "credentials" && (
          <div className="space-y-4 py-4">
            <Alert>
              <Shield className="w-4 h-4" />
              <AlertDescription>
                {provider === "gmail" ? (
                  <>
                    Para Gmail, precisa de criar uma <strong>App Password</strong>.{" "}
                    <a 
                      href="https://myaccount.google.com/apppasswords" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="underline"
                    >
                      Criar App Password
                    </a>
                  </>
                ) : provider === "hostinger" ? (
                  <>
                    Para Hostinger, use a password da sua conta de email.
                    Certifique-se de que o email está ativo no painel Hostinger.
                  </>
                ) : (
                  <>
                    Para Outlook, pode usar a sua password normal se não tiver 2FA, 
                    ou criar uma <strong>App Password</strong> nas configurações de segurança.
                  </>
                )}
              </AlertDescription>
            </Alert>

            <div className="space-y-2">
              <Label htmlFor="email">Endereço de email</Label>
              <Input
                id="email"
                type="email"
                placeholder={`exemplo@${provider === "gmail" ? "gmail.com" : provider === "hostinger" ? "seudominio.com" : "outlook.com"}`}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="displayName">Nome de exibição (opcional)</Label>
              <Input
                id="displayName"
                placeholder="O seu nome"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="appPassword">App Password</Label>
              <div className="relative">
                <Input
                  id="appPassword"
                  type={showPassword ? "text" : "password"}
                  placeholder="xxxx xxxx xxxx xxxx"
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
            </div>

            <Alert variant="default" className="bg-muted">
              <AlertTriangle className="w-4 h-4" />
              <AlertDescription className="text-xs">
                A sua password é encriptada antes de ser guardada. Nunca armazenamos passwords em texto simples.
              </AlertDescription>
            </Alert>
          </div>
        )}

        {step === "custom" && (
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="email">Endereço de email</Label>
              <Input
                id="email"
                type="email"
                placeholder="email@seudominio.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="displayName">Nome de exibição (opcional)</Label>
              <Input
                id="displayName"
                placeholder="O seu nome"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="appPassword">Password</Label>
              <div className="relative">
                <Input
                  id="appPassword"
                  type={showPassword ? "text" : "password"}
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
          </div>
        )}

        <DialogFooter>
          {step !== "provider" && (
            <Button variant="outline" onClick={() => setStep("provider")}>
              Voltar
            </Button>
          )}
          {step !== "provider" && (
            <Button 
              onClick={handleConnect} 
              disabled={!isValid() || connectEmail.isPending}
            >
              {connectEmail.isPending ? "A conectar..." : "Conectar"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
