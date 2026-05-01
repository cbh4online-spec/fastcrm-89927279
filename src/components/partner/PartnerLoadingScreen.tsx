import { Loader2 } from "lucide-react";

interface PartnerLoadingScreenProps {
  /** Mensagem opcional mostrada por baixo do spinner. */
  message?: string;
  /** Quando true ocupa apenas a área disponível em vez de min-h-screen. */
  inline?: boolean;
}

/**
 * Estado de carregamento partilhado por todo o Partner Center.
 * Garante consistência visual entre:
 *  - Suspense fallback dos chunks lazy
 *  - Verificação inicial de sessão (PartnerAuthProvider)
 *  - Resolução de workspace na PartnerLoginPage
 *
 * Evita ecrãs brancos e spinners desalinhados entre páginas.
 */
export function PartnerLoadingScreen({
  message = "A carregar o Partner Center…",
  inline = false,
}: PartnerLoadingScreenProps) {
  return (
    <div
      className={
        (inline ? "min-h-[40vh]" : "min-h-screen") +
        " flex items-center justify-center bg-gradient-to-br from-background via-background to-muted/20"
      }
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" aria-hidden="true" />
        {message ? (
          <p className="text-sm text-muted-foreground">{message}</p>
        ) : null}
      </div>
    </div>
  );
}
