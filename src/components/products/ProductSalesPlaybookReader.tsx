import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollText as ScriptIcon, MessageSquareWarning, ShieldCheck, Copy, Check } from "lucide-react";
import { toast } from "sonner";

interface ObjectionItem {
  objection: string;
  response: string;
}

interface Props {
  productName: string;
  data: {
    script: string;
    objections: ObjectionItem[];
    warranty: string;
    updated_at?: string;
  };
}

/**
 * Read-only "quick read" view of the sales playbook.
 *
 * Designed for copy-paste workflow: each block (script, individual objection,
 * individual response, full warranty, full playbook) has its own copy button
 * so the user can grab exactly what they need without selecting text manually.
 */
export function ProductSalesPlaybookReader({ productName, data }: Props) {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const copy = async (key: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
      toast.success("Copiado para a área de transferência");
      window.setTimeout(() => setCopiedKey((k) => (k === key ? null : k)), 1500);
    } catch {
      toast.error("Não foi possível copiar");
    }
  };

  const buildFullText = () => {
    const lines: string[] = [];
    lines.push(`# Procedimento de vendas — ${productName}`);
    lines.push("");
    lines.push("## Script de vendas");
    lines.push(data.script.trim() || "(vazio)");
    lines.push("");
    lines.push("## Objeções e respostas");
    if (data.objections.length === 0) {
      lines.push("(sem objeções)");
    } else {
      data.objections.forEach((o, i) => {
        lines.push(`### ${i + 1}. ${o.objection.trim() || "(sem objeção)"}`);
        lines.push(o.response.trim() || "(sem resposta)");
        lines.push("");
      });
    }
    lines.push("## Reclamação e garantia");
    lines.push(data.warranty.trim() || "(vazio)");
    return lines.join("\n");
  };

  const CopyButton = ({ k, text, label = "Copiar" }: { k: string; text: string; label?: string }) => {
    const isCopied = copiedKey === k;
    const isEmpty = !text || text.trim() === "";
    return (
      <Button
        size="sm"
        variant="ghost"
        onClick={() => copy(k, text)}
        disabled={isEmpty}
        className="h-7 px-2 text-xs"
      >
        {isCopied ? (
          <>
            <Check className="h-3.5 w-3.5 mr-1 text-emerald-600" /> Copiado
          </>
        ) : (
          <>
            <Copy className="h-3.5 w-3.5 mr-1" /> {label}
          </>
        )}
      </Button>
    );
  };

  const totalObjs = data.objections.length;

  return (
    <div className="space-y-4">
      {/* Top action: copy everything */}
      <div className="flex flex-wrap items-center justify-between gap-2 sticky top-0 z-10 bg-background/95 backdrop-blur py-2 -mx-1 px-1 border-b">
        <div className="text-sm text-muted-foreground">
          Modo leitura — clica em <span className="font-medium">Copiar</span> para usar em chats, propostas ou treino.
        </div>
        <CopyButton k="all" text={buildFullText()} label="Copiar tudo" />
      </div>

      {/* Script */}
      <Card>
        <CardHeader className="pb-3 flex flex-row items-start justify-between gap-2">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <ScriptIcon className="h-4 w-4 text-primary" />
              Script de vendas
            </CardTitle>
            <CardDescription>Abordagem recomendada do início ao fecho.</CardDescription>
          </div>
          <CopyButton k="script" text={data.script} />
        </CardHeader>
        <CardContent>
          {data.script.trim() ? (
            <pre className="whitespace-pre-wrap break-words text-sm font-sans leading-relaxed text-foreground">
              {data.script}
            </pre>
          ) : (
            <p className="text-sm text-muted-foreground italic">Sem script definido.</p>
          )}
        </CardContent>
      </Card>

      {/* Objeções */}
      <Card>
        <CardHeader className="pb-3 flex flex-row items-start justify-between gap-2">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <MessageSquareWarning className="h-4 w-4 text-amber-600" />
              Objeções &amp; respostas
              {totalObjs > 0 && <Badge variant="secondary">{totalObjs}</Badge>}
            </CardTitle>
            <CardDescription>Cada bloco tem o seu botão de copiar individual.</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {totalObjs === 0 ? (
            <p className="text-sm text-muted-foreground italic">Sem objeções registadas.</p>
          ) : (
            data.objections.map((o, idx) => (
              <div key={idx} className="rounded-lg border bg-muted/20 p-4 space-y-3">
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="text-xs font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-400">
                      Objeção #{idx + 1}
                    </div>
                    <CopyButton k={`obj-${idx}`} text={o.objection} />
                  </div>
                  <p className="mt-1 text-sm font-medium text-foreground whitespace-pre-wrap break-words">
                    {o.objection.trim() || <span className="italic text-muted-foreground">(vazio)</span>}
                  </p>
                </div>
                <Separator />
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="text-xs font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-400">
                      Resposta sugerida
                    </div>
                    <CopyButton k={`resp-${idx}`} text={o.response} />
                  </div>
                  <pre className="mt-1 whitespace-pre-wrap break-words text-sm font-sans leading-relaxed text-foreground">
                    {o.response.trim() || <span className="italic text-muted-foreground">(vazio)</span>}
                  </pre>
                </div>
                <div className="pt-1">
                  <CopyButton
                    k={`pair-${idx}`}
                    text={`Objeção: ${o.objection}\n\nResposta: ${o.response}`}
                    label="Copiar par completo"
                  />
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Garantia */}
      <Card>
        <CardHeader className="pb-3 flex flex-row items-start justify-between gap-2">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <ShieldCheck className="h-4 w-4 text-emerald-600" />
              Reclamação &amp; garantia
            </CardTitle>
            <CardDescription>Procedimento pós-venda completo.</CardDescription>
          </div>
          <CopyButton k="warranty" text={data.warranty} />
        </CardHeader>
        <CardContent>
          {data.warranty.trim() ? (
            <pre className="whitespace-pre-wrap break-words text-sm font-sans leading-relaxed text-foreground">
              {data.warranty}
            </pre>
          ) : (
            <p className="text-sm text-muted-foreground italic">Sem procedimento definido.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
