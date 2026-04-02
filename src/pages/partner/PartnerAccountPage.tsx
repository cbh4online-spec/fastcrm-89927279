import { PartnerLayout } from "@/components/partner/PartnerLayout";
import { usePartnerAuth } from "@/hooks/partner/usePartnerAuth";
import { usePartnerAccount } from "@/hooks/partner/usePartnerAccount";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Building2, CreditCard, FileText, Users } from "lucide-react";
import { formatMoneyEur } from "@/lib/money";

export default function PartnerAccountPage() {
  const { partnerUser } = usePartnerAuth();
  const { account, creditAvailable, creditUsagePercent } = usePartnerAccount(partnerUser?.partner_account_id);

  if (!account) return null;

  return (
    <PartnerLayout>
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <Building2 className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{account.trade_name || account.legal_name}</h1>
            <p className="text-muted-foreground">Código: {account.account_code}</p>
          </div>
          {account.tier && (
            <Badge className="ml-auto" style={{ backgroundColor: `${account.tier.color}20`, color: account.tier.color, borderColor: `${account.tier.color}40` }}>
              {account.tier.name}
            </Badge>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Dados da Empresa</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Razão Social</span><span>{account.legal_name}</span></div>
              {account.vat_number && <div className="flex justify-between"><span className="text-muted-foreground">NIF</span><span>{account.vat_number}</span></div>}
              <div className="flex justify-between"><span className="text-muted-foreground">País</span><span>{account.country}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Moeda</span><span>{account.currency}</span></div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Condições Comerciais</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Pagamento</span><span>{account.payment_terms}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Aprovação Requerida</span><span>{account.requires_order_approval ? 'Sim' : 'Não'}</span></div>
              {account.approval_threshold && (
                <div className="flex justify-between"><span className="text-muted-foreground">Threshold</span><span>{formatMoneyEur(account.approval_threshold)}</span></div>
              )}
              <div className="flex justify-between"><span className="text-muted-foreground">Backorders</span><span>{account.allow_backorders ? 'Sim' : 'Não'}</span></div>
            </CardContent>
          </Card>
        </div>

        {account.credit_limit > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <CreditCard className="h-4 w-4" /> Crédito
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between text-sm">
                <span>Utilizado: {formatMoneyEur(account.current_credit_exposure)}</span>
                <span>Limite: {formatMoneyEur(account.credit_limit)}</span>
              </div>
              <Progress value={creditUsagePercent} className="h-2" />
              <p className="text-sm font-medium text-green-600">Disponível: {formatMoneyEur(creditAvailable)}</p>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Users className="h-4 w-4" /> O Meu Perfil
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Nome</span><span>{partnerUser?.full_name}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Email</span><span>{partnerUser?.email}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Role</span><span>{partnerUser?.role}</span></div>
          </CardContent>
        </Card>
      </div>
    </PartnerLayout>
  );
}
