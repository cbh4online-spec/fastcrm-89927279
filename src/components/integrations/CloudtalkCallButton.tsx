import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { PhoneCall, Loader2 } from "lucide-react";
import { useCloudtalk } from "@/hooks/useCloudtalk";

/** Click-to-call via CloudTalk. Renders nothing when the module/connection is not ready. */
export function CloudtalkCallButton({ phone }: { phone?: string | null }) {
  const { moduleActive, status, call } = useCloudtalk();
  if (!phone || !moduleActive || !status.data?.connected) return null;
  const onClick = async () => {
    try { await call.mutateAsync(phone); toast.success("A CloudTalk está a ligar-lhe — atenda para ligar ao cliente."); }
    catch (e) { toast.error((e as Error).message); }
  };
  return (
    <Button variant="outline" size="sm" className="w-full justify-start" onClick={onClick} disabled={call.isPending}>
      {call.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <PhoneCall className="w-4 h-4 mr-2" />}
      Ligar via CloudTalk
    </Button>
  );
}
