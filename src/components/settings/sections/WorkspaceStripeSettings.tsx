import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { useWorkspaceStripeConfig } from "@/hooks/useWorkspaceStripeConfig";
import { 
  CreditCard, 
  Save, 
  Loader2, 
  Eye, 
  EyeOff, 
  TestTube, 
  CheckCircle2,
  AlertCircle,
  ExternalLink
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

export function WorkspaceStripeSettings() {
  const { config, isLoading, saveConfig, testConnection, isConfigured } = useWorkspaceStripeConfig();
  
  const [secretKey, setSecretKey] = useState("");
  const [webhookSecret, setWebhookSecret] = useState("");
  const [publishableKey, setPublishableKey] = useState("");
  const [isActive, setIsActive] = useState(false);
  const [testMode, setTestMode] = useState(true);
  const [showSecretKey, setShowSecretKey] = useState(false);
  const [showWebhookSecret, setShowWebhookSecret] = useState(false);

  useEffect(() => {
    if (config) {
      setPublishableKey(config.stripe_publishable_key || "");
      setIsActive(config.is_active || false);
      setTestMode(config.test_mode ?? true);
      // Don't populate encrypted keys - they're one-way
    }
  }, [config]);

  const handleSave = async () => {
    await saveConfig.mutateAsync({
      stripe_secret_key: secretKey || undefined,
      stripe_webhook_secret: webhookSecret || undefined,
      stripe_publishable_key: publishableKey || undefined,
      is_active: isActive,
      test_mode: testMode,
    });
    
    // Clear sensitive fields after save
    setSecretKey("");
    setWebhookSecret("");
  };

  const handleTestConnection = async () => {
    await testConnection.mutateAsync();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Status Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CreditCard className="h-5 w-5 text-primary" />
              <div>
                <CardTitle className="text-lg">Stripe</CardTitle>
                <CardDescription>
                  Configure a integração com Stripe para pagamentos
                </CardDescription>
              </div>
            </div>
            <Badge variant={isConfigured ? "default" : "secondary"}>
              {isConfigured ? (
                <><CheckCircle2 className="h-3 w-3 mr-1" /> Configurado</>
              ) : (
                <><AlertCircle className="h-3 w-3 mr-1" /> Não configurado</>
              )}
            </Badge>
          </div>
        </CardHeader>
      </Card>

      {/* Configuration Card */}
      <Card>
        <CardHeader>
          <CardTitle>Credenciais API</CardTitle>
          <CardDescription>
            Obtenha as chaves no{" "}
            <a 
              href="https://dashboard.stripe.com/apikeys" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-primary hover:underline inline-flex items-center gap-1"
            >
              Dashboard Stripe <ExternalLink className="h-3 w-3" />
            </a>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Mode Toggle */}
          <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
            <div className="space-y-0.5">
              <Label>Modo de Teste</Label>
              <p className="text-sm text-muted-foreground">
                {testMode 
                  ? "A usar chaves de teste - sem pagamentos reais" 
                  : "A usar chaves de produção - pagamentos reais"}
              </p>
            </div>
            <Switch
              checked={testMode}
              onCheckedChange={setTestMode}
            />
          </div>

          {/* Publishable Key */}
          <div className="space-y-2">
            <Label htmlFor="publishable-key">Chave Publicável (pk_...)</Label>
            <Input
              id="publishable-key"
              placeholder={testMode ? "pk_test_..." : "pk_live_..."}
              value={publishableKey}
              onChange={(e) => setPublishableKey(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Esta chave é segura para usar no frontend
            </p>
          </div>

          {/* Secret Key */}
          <div className="space-y-2">
            <Label htmlFor="secret-key">Chave Secreta (sk_...)</Label>
            <div className="relative">
              <Input
                id="secret-key"
                type={showSecretKey ? "text" : "password"}
                placeholder={config?.stripe_secret_key_encrypted 
                  ? "••••••••••••••••••••" 
                  : testMode ? "sk_test_..." : "sk_live_..."}
                value={secretKey}
                onChange={(e) => setSecretKey(e.target.value)}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-0 top-0 h-full px-3"
                onClick={() => setShowSecretKey(!showSecretKey)}
              >
                {showSecretKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
            {config?.stripe_secret_key_encrypted && !secretKey && (
              <p className="text-xs text-muted-foreground">
                Chave já configurada. Deixe em branco para manter a atual.
              </p>
            )}
          </div>

          {/* Webhook Secret */}
          <div className="space-y-2">
            <Label htmlFor="webhook-secret">Webhook Secret (whsec_...)</Label>
            <div className="relative">
              <Input
                id="webhook-secret"
                type={showWebhookSecret ? "text" : "password"}
                placeholder={config?.stripe_webhook_secret_encrypted 
                  ? "••••••••••••••••••••" 
                  : "whsec_..."}
                value={webhookSecret}
                onChange={(e) => setWebhookSecret(e.target.value)}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-0 top-0 h-full px-3"
                onClick={() => setShowWebhookSecret(!showWebhookSecret)}
              >
                {showWebhookSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
            {config?.stripe_webhook_secret_encrypted && !webhookSecret && (
              <p className="text-xs text-muted-foreground">
                Secret já configurado. Deixe em branco para manter o atual.
              </p>
            )}
          </div>

          {/* Activation Toggle */}
          <div className="flex items-center justify-between p-4 rounded-lg border">
            <div className="space-y-0.5">
              <Label>Ativar Integração</Label>
              <p className="text-sm text-muted-foreground">
                Permitir pagamentos via Stripe neste workspace
              </p>
            </div>
            <Switch
              checked={isActive}
              onCheckedChange={setIsActive}
              disabled={!config?.stripe_secret_key_encrypted && !secretKey}
            />
          </div>
        </CardContent>
      </Card>

      {/* Webhook Info Card */}
      <Card>
        <CardHeader>
          <CardTitle>Configuração de Webhooks</CardTitle>
          <CardDescription>
            Configure o endpoint de webhooks no Stripe Dashboard
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <AlertDescription className="space-y-2">
              <p><strong>URL do Webhook:</strong></p>
              <code className="block p-2 bg-muted rounded text-sm break-all">
                {`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/subscription-webhook`}
              </code>
              <p className="text-xs mt-2">
                Eventos recomendados: <code>invoice.paid</code>, <code>invoice.payment_failed</code>, 
                <code>customer.subscription.updated</code>, <code>customer.subscription.deleted</code>
              </p>
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex justify-end gap-3">
        <Button
          variant="outline"
          onClick={handleTestConnection}
          disabled={!isConfigured || testConnection.isPending}
        >
          {testConnection.isPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <TestTube className="mr-2 h-4 w-4" />
          )}
          Testar Conexão
        </Button>
        <Button
          onClick={handleSave}
          disabled={saveConfig.isPending}
        >
          {saveConfig.isPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-2 h-4 w-4" />
          )}
          Guardar
        </Button>
      </div>
    </div>
  );
}
