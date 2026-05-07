/**
 * Click-to-Call Button — reutilizável em contactos, deals, tickets (Fase 1P.3)
 */
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Phone } from "lucide-react";
import { LogCallDialog } from "./LogCallDialog";

interface Props {
  to: string;
  contactId?: string;
  variant?: "default" | "outline" | "ghost";
  size?: "default" | "sm" | "icon";
  label?: string;
}

export function ClickToCallButton({ to, contactId, variant = "outline", size = "sm", label }: Props) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant={variant} size={size} onClick={() => setOpen(true)} disabled={!to}>
        <Phone className="h-4 w-4" />
        {label && <span className="ml-2">{label}</span>}
      </Button>
      <LogCallDialog open={open} onOpenChange={setOpen} defaultContactId={contactId} defaultToNumber={to} />
    </>
  );
}
