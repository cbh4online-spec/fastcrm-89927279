import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle, ArrowRight, User } from "lucide-react";
import { cn } from "@/lib/utils";

export interface DuplicateWarningItem {
  id: string;
  title: string;
  /** Etiqueta curta do tipo de correspondência (ex.: "Email duplicado") */
  matchLabel: string;
  /** Duplicados bloqueantes impedem a criação */
  blocking?: boolean;
}

interface DuplicateWarningCardProps {
  items: DuplicateWarningItem[];
  onUseExisting: (id: string) => void;
  onContinue?: () => void;
  useLabel?: string;
}

/**
 * Aviso de duplicado apresentado dentro do formulário — mesmo padrão
 * usado na criação de Contactos.
 */
export function DuplicateWarningCard({
  items,
  onUseExisting,
  onContinue,
  useLabel = "Usar este",
}: DuplicateWarningCardProps) {
  if (items.length === 0) return null;

  const blocking = items.filter((i) => i.blocking);
  const warnings = items.filter((i) => !i.blocking);
  const hasBlocking = blocking.length > 0;

  return (
    <Card
      className={cn(
        "p-3",
        hasBlocking
          ? "border-destructive/50 bg-destructive/5 dark:bg-destructive/10"
          : "border-amber-500/50 bg-amber-50/50 dark:bg-amber-950/20",
      )}
    >
      <div className="flex items-start gap-2">
        <AlertTriangle
          className={cn(
            "w-4 h-4 mt-0.5 shrink-0",
            hasBlocking ? "text-destructive" : "text-amber-600",
          )}
        />
        <div className="flex-1 min-w-0">
          <p
            className={cn(
              "text-sm font-medium",
              hasBlocking
                ? "text-destructive dark:text-red-300"
                : "text-amber-800 dark:text-amber-200",
            )}
          >
            {hasBlocking ? "Registo já existente" : "Possível duplicado encontrado"}
          </p>
          <div className="mt-2 space-y-2">
            {[...blocking, ...warnings].slice(0, 4).map((item) => (
              <div key={item.id} className="flex items-center justify-between text-sm gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <User className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                  <span className="truncate">{item.title}</span>
                  <Badge
                    variant={item.blocking ? "destructive" : "outline"}
                    className="text-[10px]"
                  >
                    {item.matchLabel}
                  </Badge>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs shrink-0"
                  onClick={() => onUseExisting(item.id)}
                >
                  {item.blocking ? "Ver registo" : useLabel}
                  <ArrowRight className="w-3 h-3 ml-1" />
                </Button>
              </div>
            ))}
          </div>
          {!hasBlocking && onContinue && (
            <Button
              variant="link"
              size="sm"
              className="h-auto p-0 mt-2 text-xs text-amber-700 dark:text-amber-300"
              onClick={onContinue}
            >
              Criar mesmo assim
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}
