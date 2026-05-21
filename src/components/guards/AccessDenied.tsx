import { Link } from "react-router-dom";
import { ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  CAPABILITY_LABELS,
  type Capability,
} from "@/lib/permissions/capabilities";

interface AccessDeniedProps {
  capability?: Capability;
  title?: string;
  description?: string;
}

export function AccessDenied({
  capability,
  title = "Acesso restrito",
  description,
}: AccessDeniedProps) {
  const capLabel = capability ? CAPABILITY_LABELS[capability] : null;
  const msg =
    description ??
    (capLabel
      ? `Esta área requer a permissão "${capLabel}". Pede a um administrador do workspace para te conceder acesso.`
      : "Não tens permissão para aceder a esta área. Contacta um administrador do workspace.");

  return (
    <div className="flex min-h-[60vh] items-center justify-center p-6">
      <div className="w-full max-w-md rounded-lg border bg-card p-8 text-center shadow-sm">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
          <ShieldAlert className="h-6 w-6 text-destructive" aria-hidden="true" />
        </div>
        <h1 className="text-xl font-semibold text-foreground">{title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{msg}</p>
        <div className="mt-6 flex justify-center gap-2">
          <Button asChild variant="default">
            <Link to="/dashboard">Voltar ao dashboard</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
