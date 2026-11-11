import { useWascript } from "@/hooks/useWascript";
import { WascriptContactTools } from "@/components/whatsapp-pro/WascriptContactTools";

/** Mostra etiquetas/notas WAScript só quando a WAScript está ligada e há número. */
export function WascriptContactToolsGate({ phone }: { phone?: string | null }) {
  const { status } = useWascript();
  if (!phone || phone.replace(/\D/g, "").length < 9) return null;
  if (!status.data?.connected) return null;
  return <WascriptContactTools key={phone} phone={phone} />;
}
