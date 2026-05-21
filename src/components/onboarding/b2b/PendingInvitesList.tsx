import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Mail, Loader2 } from "lucide-react";
import type { PendingInvite } from "@/hooks/onboarding/usePendingInvites";

interface Props {
  invites: PendingInvite[];
  onAccept: (token: string) => void;
  submitting: boolean;
}

export function PendingInvitesList({ invites, onAccept, submitting }: Props) {
  if (!invites.length) return null;
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm font-medium text-foreground">
        <Mail className="w-4 h-4 text-primary" />
        Convites pendentes ({invites.length})
      </div>
      <div className="space-y-2">
        {invites.map((inv) => (
          <div
            key={inv.id}
            className="flex items-center justify-between gap-3 p-4 rounded-lg border border-border bg-card"
          >
            <div className="min-w-0">
              <div className="font-medium text-foreground truncate">{inv.workspace_name}</div>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="secondary" className="capitalize">{inv.role}</Badge>
                {inv.invited_by_email && (
                  <span className="text-xs text-muted-foreground truncate">por {inv.invited_by_email}</span>
                )}
              </div>
            </div>
            <Button
              size="sm"
              onClick={() => onAccept(inv.invite_token)}
              disabled={submitting}
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Aceitar"}
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
