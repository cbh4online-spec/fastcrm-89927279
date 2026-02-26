import { useSearchParams } from "react-router-dom";
import { CheckCircle, XCircle } from "lucide-react";

export default function EventRsvpResponse() {
  const [params] = useSearchParams();
  const status = params.get("status");
  const eventTitle = params.get("event");

  const isConfirmed = status === "confirmed";
  const isDeclined = status === "declined";

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="max-w-md w-full text-center space-y-6">
        {isConfirmed ? (
          <>
            <CheckCircle className="mx-auto h-16 w-16 text-green-500" />
            <h1 className="text-2xl font-bold text-foreground">Presença Confirmada!</h1>
            <p className="text-muted-foreground">
              A sua presença no evento{" "}
              {eventTitle && <strong>"{eventTitle}"</strong>} foi confirmada com sucesso.
            </p>
          </>
        ) : isDeclined ? (
          <>
            <XCircle className="mx-auto h-16 w-16 text-muted-foreground" />
            <h1 className="text-2xl font-bold text-foreground">Convite Recusado</h1>
            <p className="text-muted-foreground">
              A sua resposta ao evento{" "}
              {eventTitle && <strong>"{eventTitle}"</strong>} foi registada.
            </p>
          </>
        ) : (
          <>
            <XCircle className="mx-auto h-16 w-16 text-destructive" />
            <h1 className="text-2xl font-bold text-foreground">Resposta Inválida</h1>
            <p className="text-muted-foreground">
              Não foi possível processar a sua resposta. O link pode ter expirado ou ser inválido.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
