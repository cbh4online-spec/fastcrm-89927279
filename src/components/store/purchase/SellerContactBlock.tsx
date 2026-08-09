import { Mail, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface SellerContactBlockProps {
  storeName?: string | null;
  email?: string | null;
  productName: string;
}

/** Passo 4: falar com a loja. Só renderiza se houver canal configurado. */
export function SellerContactBlock({ storeName, email, productName }: SellerContactBlockProps) {
  if (!email) return null;

  const subject = encodeURIComponent(`Questão sobre: ${productName}`);
  const body = encodeURIComponent(
    `Olá${storeName ? ` ${storeName}` : ""},\n\nTenho uma questão sobre o produto "${productName}".\n\n`,
  );

  return (
    <div className="rounded-xl border p-3">
      <p className="mb-2 flex items-center gap-2 text-xs text-muted-foreground">
        <MessageCircle className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
        Dúvidas antes de comprar? Respondemos por email.
      </p>
      <Button asChild variant="outline" className="h-11 w-full gap-2 rounded-xl">
        <a href={`mailto:${email}?subject=${subject}&body=${body}`}>
          <Mail className="h-4 w-4" aria-hidden="true" />
          Contactar a loja
        </a>
      </Button>
    </div>
  );
}
