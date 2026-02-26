import { useState, useRef } from "react";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Sparkles, Variable, Info } from "lucide-react";
import type { FormattingConfig } from "@/types/fieldManager";

interface AIAutofillConfigProps {
  config: FormattingConfig;
  onChange: (config: FormattingConfig) => void;
  existingFields?: { name: string; label: string }[];
}

const AUTOFILL_TYPES = [
  { value: "research", label: "Research agent", description: "Pesquisa informação na web sobre o registo" },
  { value: "generate", label: "Gerar conteúdo", description: "Gera texto com base nos dados do registo" },
  { value: "classify", label: "Classificar", description: "Categoriza o registo com base nos atributos" },
] as const;

const PLACEHOLDER_BY_TYPE: Record<string, string> = {
  research: "Ex: Pesquisar o website da empresa {nome} e extrair a descrição principal do negócio.",
  generate: "Ex: Com base no nome {nome} e sector {sector}, gera uma descrição comercial curta.",
  classify: "Ex: Classifica o contacto como 'Lead Quente', 'Lead Frio' ou 'Cliente' com base no {valor_oportunidade} e {ultima_interacao}.",
};

export function AIAutofillConfig({ config, onChange, existingFields = [] }: AIAutofillConfigProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [variableOpen, setVariableOpen] = useState(false);

  const enabled = config.ai_autofill_enabled ?? false;
  const type = config.ai_autofill_type ?? "generate";
  const guidance = config.ai_autofill_guidance ?? "";

  const insertVariable = (fieldName: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = guidance;
    const variable = `{${fieldName}}`;
    const newText = text.substring(0, start) + variable + text.substring(end);
    onChange({ ...config, ai_autofill_guidance: newText });
    setVariableOpen(false);
    setTimeout(() => {
      textarea.focus();
      const pos = start + variable.length;
      textarea.setSelectionRange(pos, pos);
    }, 50);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between p-3 rounded-lg bg-gradient-to-r from-primary/5 to-purple-500/5 border border-primary/10">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-md bg-primary/10">
            <Sparkles className="h-4 w-4 text-primary" />
          </div>
          <div className="space-y-0.5">
            <Label className="font-medium">AI Autofill</Label>
            <p className="text-xs text-muted-foreground">
              Preenche automaticamente com inteligência artificial
            </p>
          </div>
        </div>
        <Switch
          checked={enabled}
          onCheckedChange={(v) => onChange({ ...config, ai_autofill_enabled: v })}
        />
      </div>

      {enabled && (
        <div className="space-y-4 pl-1 animate-fade-in">
          <div className="space-y-2">
            <Label className="text-sm">Tipo de autofill</Label>
            <Select
              value={type}
              onValueChange={(v) => onChange({ ...config, ai_autofill_type: v as FormattingConfig["ai_autofill_type"] })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {AUTOFILL_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    <div className="flex flex-col">
                      <span>{t.label}</span>
                      <span className="text-xs text-muted-foreground">{t.description}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm">Orientação para a IA</Label>
              <Popover open={variableOpen} onOpenChange={setVariableOpen}>
                <PopoverTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-7 gap-1.5 text-xs text-muted-foreground">
                    <Variable className="h-3.5 w-3.5" />
                    Usar variável
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-56 p-2" align="end">
                  <p className="text-xs font-medium text-muted-foreground px-2 py-1">Inserir campo</p>
                  <div className="max-h-48 overflow-y-auto space-y-0.5">
                    {existingFields.length === 0 ? (
                      <p className="text-xs text-muted-foreground px-2 py-2">Nenhum campo disponível</p>
                    ) : (
                      existingFields.map((f) => (
                        <button
                          key={f.name}
                          className="w-full text-left px-2 py-1.5 text-sm rounded hover:bg-muted/80 transition-colors"
                          onClick={() => insertVariable(f.name)}
                        >
                          <span className="font-mono text-xs text-primary">{`{${f.name}}`}</span>
                          <span className="ml-2 text-muted-foreground">{f.label}</span>
                        </button>
                      ))
                    )}
                  </div>
                </PopoverContent>
              </Popover>
            </div>
            <Textarea
              ref={textareaRef}
              value={guidance}
              onChange={(e) => onChange({ ...config, ai_autofill_guidance: e.target.value })}
              placeholder={PLACEHOLDER_BY_TYPE[type] || "Descreva o que a IA deve fazer..."}
              rows={3}
              className="text-sm resize-none"
            />
          </div>

          <div className="flex items-start gap-2 p-2.5 rounded-md bg-muted/50 border border-border/30">
            <Info className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
            <p className="text-xs text-muted-foreground">
              A IA terá acesso a todos os atributos do registo para gerar o valor deste campo.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
