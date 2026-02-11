import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Clock, CheckCircle2, XCircle, RotateCcw, Mail, Ban } from "lucide-react";
import { format } from "date-fns";
import { pt } from "date-fns/locale";
import { useC2CSellerInvites, useRevokeSellerInvite, useResendSellerInvite, type C2CSellerInvite } from "@/hooks/useC2CSellerInvites";

const STATUS_MAP: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: any }> = {
  pending: { label: "Pendente", variant: "secondary", icon: Clock },
  accepted: { label: "Aceite", variant: "default", icon: CheckCircle2 },
  expired: { label: "Expirado", variant: "outline", icon: XCircle },
  revoked: { label: "Revogado", variant: "destructive", icon: Ban },
};

function getEffectiveStatus(invite: C2CSellerInvite): string {
  if (invite.status === "pending" && invite.expires_at && new Date(invite.expires_at) < new Date()) {
    return "expired";
  }
  return invite.status;
}

interface Props {
  workspaceId: string;
}

export default function SellerInvitesList({ workspaceId }: Props) {
  const { data: invites = [], isLoading } = useC2CSellerInvites(workspaceId);
  const revokeInvite = useRevokeSellerInvite();
  const resendInvite = useResendSellerInvite(workspaceId);

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-12 rounded-lg" />
        ))}
      </div>
    );
  }

  if (invites.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Mail className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
          <p className="text-muted-foreground">Nenhum convite enviado ainda</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nome</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead>Enviado</TableHead>
            <TableHead>Expira</TableHead>
            <TableHead className="text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {invites.map((invite) => {
            const effectiveStatus = getEffectiveStatus(invite);
            const config = STATUS_MAP[effectiveStatus] || STATUS_MAP.pending;
            const StatusIcon = config.icon;
            return (
              <TableRow key={invite.id}>
                <TableCell className="font-medium">{invite.name}</TableCell>
                <TableCell className="text-muted-foreground">{invite.email}</TableCell>
                <TableCell>
                  <Badge variant={config.variant} className="gap-1">
                    <StatusIcon className="h-3 w-3" />
                    {config.label}
                  </Badge>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {format(new Date(invite.created_at), "dd MMM yyyy", { locale: pt })}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {invite.expires_at
                    ? format(new Date(invite.expires_at), "dd MMM yyyy", { locale: pt })
                    : "—"}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center gap-1 justify-end">
                    {effectiveStatus === "pending" && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive/80"
                        onClick={() => revokeInvite.mutate(invite.id)}
                        disabled={revokeInvite.isPending}
                        title="Revogar"
                      >
                        <Ban className="h-4 w-4" />
                      </Button>
                    )}
                    {(effectiveStatus === "expired" || effectiveStatus === "revoked") && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => resendInvite.mutate(invite)}
                        disabled={resendInvite.isPending}
                        title="Reenviar"
                      >
                        <RotateCcw className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </Card>
  );
}
