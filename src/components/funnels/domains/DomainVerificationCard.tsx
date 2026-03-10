import {
  Globe, Shield, AlertCircle, CheckCircle2, Clock,
  ExternalLink, Trash2, RefreshCw, Copy
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import type { CustomDomain } from "@/hooks/useFunnelInstances";

interface Props {
  domain: CustomDomain;
  onDelete: () => void;
}

export function DomainVerificationCard({ domain, onDelete }: Props) {
  const statusConfig: Record<string, { icon: typeof CheckCircle2; color: string; label: string; bg: string }> = {
    active: { icon: CheckCircle2, color: "text-green-500", label: "Activo", bg: "bg-green-500/10" },
    verified: { icon: Shield, color: "text-blue-500", label: "Verificado", bg: "bg-blue-500/10" },
    pending: { icon: Clock, color: "text-yellow-500", label: "Pendente", bg: "bg-yellow-500/10" },
    error: { icon: AlertCircle, color: "text-destructive", label: "Erro", bg: "bg-destructive/10" },
  };

  const verifyStatus = statusConfig[domain.verification_status] || statusConfig.pending;
  const sslStatus = statusConfig[domain.ssl_status] || statusConfig.pending;
  const VerifyIcon = verifyStatus.icon;
  const SslIcon = sslStatus.icon;

  const copyDomain = () => {
    navigator.clipboard.writeText(domain.domain);
    toast.success("Domínio copiado");
  };

  return (
    <Card className="border-border/50 hover:border-border transition-colors">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-lg ${verifyStatus.bg} flex items-center justify-center`}>
              <Globe className={`h-5 w-5 ${verifyStatus.color}`} />
            </div>
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                {domain.domain}
                {domain.is_primary && (
                  <Badge variant="default" className="text-[10px]">Principal</Badge>
                )}
              </CardTitle>
              {domain.subdomain && (
                <p className="text-xs text-muted-foreground">
                  Subdomínio: {domain.subdomain} · Raiz: {domain.root_domain}
                </p>
              )}
            </div>
          </div>
          <Button variant="ghost" size="icon" className="text-destructive" onClick={onDelete}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Status badges */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <VerifyIcon className={`h-3.5 w-3.5 ${verifyStatus.color}`} />
            <span className="text-xs">DNS: {verifyStatus.label}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <SslIcon className={`h-3.5 w-3.5 ${sslStatus.color}`} />
            <span className="text-xs">SSL: {sslStatus.label}</span>
          </div>
        </div>

        {/* DNS instructions for pending */}
        {domain.verification_status === "pending" && (
          <div className="bg-muted/30 rounded-lg p-3 space-y-2">
            <p className="text-xs font-medium">Configuração DNS necessária:</p>
            <div className="bg-background rounded p-2 font-mono text-[10px] space-y-0.5">
              <p>A {domain.subdomain || "@"} → 185.158.133.1</p>
              <p>TXT _fastcrm → fastcrm_verify=...</p>
            </div>
            <Button variant="outline" size="sm" className="w-full gap-2 text-xs">
              <RefreshCw className="h-3 w-3" />
              Verificar DNS
            </Button>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-2 pt-2 border-t border-border/50">
          <Button variant="ghost" size="sm" className="text-xs gap-1" onClick={copyDomain}>
            <Copy className="h-3 w-3" />
            Copiar
          </Button>
          {domain.verification_status === "active" && (
            <Button
              variant="ghost"
              size="sm"
              className="text-xs gap-1"
              onClick={() => window.open(`https://${domain.domain}`, "_blank")}
            >
              <ExternalLink className="h-3 w-3" />
              Abrir
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
