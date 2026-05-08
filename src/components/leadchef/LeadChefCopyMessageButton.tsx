import { useState } from "react";
import { Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { copyToClipboard } from "@/utils/leadchef/contact";
import { toast } from "sonner";

interface Props {
  text: string;
  size?: "default" | "sm";
  variant?: "default" | "outline" | "ghost";
  className?: string;
  label?: string;
}

export function LeadChefCopyMessageButton({
  text,
  size = "default",
  variant = "outline",
  className,
  label = "Copiar mensagem",
}: Props) {
  const [copied, setCopied] = useState(false);
  const onClick = async () => {
    try {
      await copyToClipboard(text);
      setCopied(true);
      toast.success("Mensagem copiada.");
      setTimeout(() => setCopied(false), 1800);
    } catch (e: any) {
      toast.error(e?.message || "Não foi possível copiar.");
    }
  };
  return (
    <Button size={size} variant={variant} className={className} onClick={onClick}>
      {copied ? <Check className="h-4 w-4 mr-1.5" /> : <Copy className="h-4 w-4 mr-1.5" />}
      {copied ? "Copiado" : label}
    </Button>
  );
}
