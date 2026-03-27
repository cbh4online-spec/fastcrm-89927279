import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Sparkles,
  Loader2,
  Check,
  RefreshCw,
  X,
  Wand2,
  ArrowDownNarrowWide,
  Crosshair,
  Briefcase,
  Heart,
  SmilePlus,
  PenLine,
} from "lucide-react";
import { useInboxAI, type ModifyAction } from "@/hooks/useInboxAI";
import { toast } from "sonner";

interface AIEmailAssistPanelProps {
  body: string;
  subject: string;
  onApplyBody: (text: string) => void;
  onApplySubject: (text: string) => void;
  disabled?: boolean;
}

const MODIFY_ACTIONS: { action: ModifyAction; label: string; icon: React.ReactNode }[] = [
  { action: "shorten", label: "Encurtar", icon: <ArrowDownNarrowWide className="w-3.5 h-3.5" /> },
  { action: "direct", label: "Direto", icon: <Crosshair className="w-3.5 h-3.5" /> },
  { action: "formal", label: "Formal", icon: <Briefcase className="w-3.5 h-3.5" /> },
  { action: "friendly", label: "Friendly", icon: <SmilePlus className="w-3.5 h-3.5" /> },
  { action: "commercial", label: "Comercial", icon: <Heart className="w-3.5 h-3.5" /> },
  { action: "rewrite", label: "Reescrever", icon: <PenLine className="w-3.5 h-3.5" /> },
];

export function AIEmailAssistPanel({
  body,
  subject,
  onApplyBody,
  onApplySubject,
  disabled,
}: AIEmailAssistPanelProps) {
  const [open, setOpen] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [result, setResult] = useState<string | null>(null);
  const [resultSubject, setResultSubject] = useState<string | null>(null);

  const { isLoading, suggestReplies, modifyReply } = useInboxAI();

  const hasBody = body.trim().length > 0;

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast.error("Descreva o email que pretende gerar");
      return;
    }

    const res = await suggestReplies(
      [{ id: "prompt", content: prompt, direction: "inbound", conversation_id: "", created_at: "", workspace_id: "" } as any],
      undefined,
      undefined,
      "email"
    );

    if (res?.suggestions?.[0]) {
      setResult(res.suggestions[0].text);
      setResultSubject(null);
    }
  };

  const handleModify = async (action: ModifyAction) => {
    if (!hasBody) {
      toast.error("Escreva algum conteúdo primeiro");
      return;
    }

    const res = await modifyReply(body, action, undefined, "email");

    if (res?.modifiedText) {
      setResult(res.modifiedText);
      setResultSubject(null);
    }
  };

  const handleApply = () => {
    if (result) {
      onApplyBody(result);
      if (resultSubject) onApplySubject(resultSubject);
      setResult(null);
      setResultSubject(null);
      setPrompt("");
      setOpen(false);
      toast.success("Conteúdo IA aplicado ao email");
    }
  };

  const handleDiscard = () => {
    setResult(null);
    setResultSubject(null);
  };

  const handleRetry = () => {
    setResult(null);
    setResultSubject(null);
    if (hasBody) {
      // Re-run last action — user can click a button again
    } else {
      handleGenerate();
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-1" disabled={disabled}>
          <Sparkles className="w-4 h-4" />
          <span className="hidden sm:inline">IA</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="start" side="top">
        <div className="p-3 space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Sparkles className="w-4 h-4 text-primary" />
            Assistente IA
          </div>

          {/* Result preview */}
          {result ? (
            <div className="space-y-2">
              <ScrollArea className="max-h-[200px] rounded-md border bg-muted/30 p-3">
                <p className="text-sm whitespace-pre-wrap">{result}</p>
              </ScrollArea>
              <div className="flex items-center gap-1.5">
                <Button size="sm" className="flex-1 gap-1" onClick={handleApply} disabled={isLoading}>
                  <Check className="w-3.5 h-3.5" />
                  Aplicar
                </Button>
                <Button size="sm" variant="outline" onClick={handleRetry} disabled={isLoading}>
                  <RefreshCw className="w-3.5 h-3.5" />
                </Button>
                <Button size="sm" variant="ghost" onClick={handleDiscard} disabled={isLoading}>
                  <X className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          ) : (
            <>
              {/* Generate from scratch */}
              <div className="space-y-2">
                <Textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder={hasBody ? "Descreva como quer modificar..." : "Descreva o email que quer gerar..."}
                  className="min-h-[60px] text-sm resize-none"
                  rows={2}
                />
                <Button
                  size="sm"
                  className="w-full gap-1"
                  onClick={handleGenerate}
                  disabled={isLoading || !prompt.trim()}
                >
                  {isLoading ? (
                    <><Loader2 className="w-3.5 h-3.5 animate-spin" />A gerar...</>
                  ) : (
                    <><Wand2 className="w-3.5 h-3.5" />Gerar Email</>
                  )}
                </Button>
              </div>

              {/* Modify existing text */}
              {hasBody && (
                <>
                  <Separator />
                  <div className="space-y-1.5">
                    <p className="text-xs text-muted-foreground font-medium">Modificar texto existente</p>
                    <div className="flex flex-wrap gap-1">
                      {MODIFY_ACTIONS.map(({ action, label, icon }) => (
                        <Button
                          key={action}
                          variant="outline"
                          size="sm"
                          className="gap-1 text-xs h-7"
                          onClick={() => handleModify(action)}
                          disabled={isLoading}
                        >
                          {isLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : icon}
                          {label}
                        </Button>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
