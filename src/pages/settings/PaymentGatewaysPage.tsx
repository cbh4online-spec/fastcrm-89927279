import { Link } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  CreditCard,
  Wallet,
  ShieldCheck,
  Settings as SettingsIcon,
  CheckCircle2,
  Circle,
  Star,
  Plug,
} from "lucide-react";
import {
  useWorkspaceGateways,
  type GatewayDescriptor,
  type WorkspaceGateway,
} from "@/hooks/payments/useWorkspaceGateways";
import { useUserRole } from "@/hooks/useUserRole";
import { useWorkspace } from "@/contexts/WorkspaceContext";

const PROVIDER_ICON: Record<string, typeof CreditCard> = {
  stripe: CreditCard,
  ifthenpay: Wallet,
};

function statusTone(row: WorkspaceGateway | null): {
  label: string;
  variant: "default" | "secondary" | "destructive" | "outline";
} {
  if (!row || !row.is_active) return { label: "Inativo", variant: "outline" };
  if (row.test_mode) return { label: "Teste", variant: "secondary" };
  return { label: "Live", variant: "default" };
}

function GatewayCard({
  descriptor,
  row,
  canEdit,
  onToggleActive,
  onToggleTest,
  onSetDefault,
}: {
  descriptor: GatewayDescriptor;
  row: WorkspaceGateway | null;
  canEdit: boolean;
  onToggleActive: (active: boolean) => void;
  onToggleTest: (test: boolean) => void;
  onSetDefault: () => void;
}) {
  const Icon = PROVIDER_ICON[descriptor.id] ?? CreditCard;
  const tone = statusTone(row);
  const isDefault = row?.is_default ?? false;
  const isActive = row?.is_active ?? false;

  return (
    <Card className="relative overflow-hidden">
      {isDefault && (
        <div className="absolute right-3 top-3 flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-primary">
          <Star className="h-3 w-3" /> Predefinido
        </div>
      )}
      <CardHeader className="space-y-3">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-muted p-2">
            <Icon className="h-5 w-5 text-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <CardTitle className="text-base">{descriptor.name}</CardTitle>
            <CardDescription className="line-clamp-2">
              {descriptor.description}
            </CardDescription>
          </div>
          <Badge variant={tone.variant}>{tone.label}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-1.5">
          {descriptor.methods.map((m) => (
            <Badge key={m} variant="outline" className="text-[10px] uppercase tracking-wide">
              {m}
            </Badge>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-3 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            {descriptor.supportsOneOff ? (
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
            ) : (
              <Circle className="h-3.5 w-3.5" />
            )}
            Pagamento único
          </div>
          <div className="flex items-center gap-1.5">
            {descriptor.supportsRecurring ? (
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
            ) : (
              <Circle className="h-3.5 w-3.5" />
            )}
            Subscrições
          </div>
        </div>

        <div className="flex items-center justify-between rounded-md border p-2">
          <div>
            <Label className="text-xs">Ativo no workspace</Label>
            <p className="text-[11px] text-muted-foreground">
              Disponibilizar este gateway para cobranças
            </p>
          </div>
          <Switch
            checked={isActive}
            disabled={!canEdit}
            onCheckedChange={onToggleActive}
          />
        </div>

        <div className="flex items-center justify-between rounded-md border p-2">
          <div>
            <Label className="text-xs">Modo de teste</Label>
            <p className="text-[11px] text-muted-foreground">
              Sandbox / credenciais de teste
            </p>
          </div>
          <Switch
            checked={row?.test_mode ?? true}
            disabled={!canEdit || !isActive}
            onCheckedChange={onToggleTest}
          />
        </div>

        <div className="flex items-center gap-2 pt-1">
          <Button asChild size="sm" variant="secondary" className="flex-1">
            <Link to={descriptor.configRoute}>
              <SettingsIcon className="mr-1.5 h-4 w-4" /> Configurar
            </Link>
          </Button>
          {!isDefault && isActive && canEdit && (
            <Button size="sm" variant="outline" onClick={onSetDefault}>
              Definir predefinido
            </Button>
          )}
        </div>

        {row?.last_health_status === "error" && row.last_health_error && (
          <Alert variant="destructive" className="py-2">
            <AlertDescription className="text-xs">
              {row.last_health_error}
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}

export default function PaymentGatewaysPage() {
  const { merged, isLoading, setActive, setTestMode, setDefault } = useWorkspaceGateways();
  const { isSuperAdmin } = useUserRole();
  const { currentWorkspace } = useWorkspace();
  const canEdit =
    isSuperAdmin ||
    currentWorkspace?.role === "owner" ||
    currentWorkspace?.role === "admin";

  return (
    <DashboardLayout>
      <div className="container mx-auto max-w-6xl space-y-6 p-6">
        <header className="flex items-start justify-between gap-4">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
              <Plug className="h-6 w-6" /> Gateways de Pagamento
            </h1>
            <p className="text-sm text-muted-foreground">
              Gere os fornecedores de pagamento disponíveis para faturas, loja e
              subscrições deste workspace.
            </p>
          </div>
          {canEdit && (
            <Badge variant="outline" className="gap-1">
              <ShieldCheck className="h-3 w-3" /> Admin
            </Badge>
          )}
        </header>

        {!canEdit && (
          <Alert>
            <AlertDescription className="text-sm">
              Apenas owners e admins do workspace podem ativar, configurar ou alterar
              gateways. Tens acesso só de leitura.
            </AlertDescription>
          </Alert>
        )}

        {isLoading ? (
          <div className="grid gap-4 md:grid-cols-2">
            <Skeleton className="h-72 w-full" />
            <Skeleton className="h-72 w-full" />
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {merged.map(({ descriptor, row }) => (
              <GatewayCard
                key={descriptor.id}
                descriptor={descriptor}
                row={row}
                canEdit={!!canEdit}
                onToggleActive={(v) =>
                  setActive.mutate({ provider: descriptor.id, is_active: v })
                }
                onToggleTest={(v) =>
                  setTestMode.mutate({ provider: descriptor.id, test_mode: v })
                }
                onSetDefault={() => setDefault.mutate(descriptor.id)}
              />
            ))}
          </div>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Como funciona</CardTitle>
            <CardDescription>
              O gateway predefinido é usado por omissão em novos checkouts. Cada
              gateway pode ser configurado individualmente — credenciais, métodos
              ativos e callbacks ficam na sua página de configuração.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    </DashboardLayout>
  );
}
