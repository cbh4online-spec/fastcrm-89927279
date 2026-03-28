import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Save, Eye, X, Variable, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import type { B2BEmailTemplateType } from "@/hooks/useB2BEmailTemplates";

interface B2BEmailTemplateEditorProps {
  templateType: B2BEmailTemplateType;
  existingData?: {
    id: string;
    subject_template: string | null;
    body_template: string | null;
  } | null;
  onSave: (data: { subject: string; body: string }) => Promise<void>;
  onClose: () => void;
  isSaving: boolean;
}

function replaceVariables(text: string, variables: { key: string; label: string }[]): string {
  let result = text;
  const sampleValues: Record<string, string> = {
    "{{client_name}}": "João Silva",
    "{{order_number}}": "ENC-2026-0042",
    "{{total}}": "1.250,00",
    "{{items_count}}": "5",
    "{{estimated_delivery}}": "2 de Abril, 2026",
    "{{tracking_url}}": "https://tracking.example.com/ABC123",
    "{{rejection_reason}}": "Stock insuficiente para os artigos selecionados",
    "{{invoice_number}}": "FT-2026-0089",
    "{{amount}}": "3.400,00",
    "{{due_date}}": "15 de Abril, 2026",
    "{{company_name}}": "FastCRM Solutions",
    "{{portal_url}}": "https://portal.example.com",
    "{{last_order_date}}": "28 de Fevereiro, 2026",
    "{{top_products}}": "• Produto A\n• Produto B\n• Produto C",
    "{{month}}": "Março",
    "{{orders_count}}": "8",
    "{{total_spent}}": "12.500,00",
  };
  for (const v of variables) {
    result = result.replaceAll(v.key, sampleValues[v.key] || v.label);
  }
  return result;
}

export function B2BEmailTemplateEditor({
  templateType,
  existingData,
  onSave,
  onClose,
  isSaving,
}: B2BEmailTemplateEditorProps) {
  const [subject, setSubject] = useState(
    existingData?.subject_template || templateType.defaultSubject
  );
  const [body, setBody] = useState(
    existingData?.body_template || templateType.defaultBody
  );
  const [showPreview, setShowPreview] = useState(false);

  const insertVariable = (key: string, target: "subject" | "body") => {
    if (target === "subject") {
      setSubject((prev) => prev + key);
    } else {
      setBody((prev) => prev + key);
    }
  };

  const handleReset = () => {
    setSubject(templateType.defaultSubject);
    setBody(templateType.defaultBody);
  };

  const previewSubject = replaceVariables(subject, templateType.variables);
  const previewBody = replaceVariables(body, templateType.variables);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-lg">{templateType.label}</h3>
          <p className="text-sm text-muted-foreground">{templateType.description}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={handleReset}>
            <RotateCcw className="h-4 w-4 mr-1" />
            Repor
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowPreview(!showPreview)}
          >
            <Eye className="h-4 w-4 mr-1" />
            {showPreview ? "Editor" : "Preview"}
          </Button>
          <Button size="sm" onClick={() => onSave({ subject, body })} disabled={isSaving}>
            <Save className="h-4 w-4 mr-1" />
            {isSaving ? "A guardar..." : "Guardar"}
          </Button>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <Separator />

      {showPreview ? (
        /* Preview Mode */
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Pré-visualização com dados de exemplo
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label className="text-xs text-muted-foreground">Assunto</Label>
              <p className="font-medium mt-1">{previewSubject}</p>
            </div>
            <Separator />
            <div>
              <Label className="text-xs text-muted-foreground">Corpo</Label>
              <div className="mt-2 whitespace-pre-wrap text-sm bg-muted/30 rounded-lg p-4 leading-relaxed">
                {previewBody}
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        /* Editor Mode */
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_220px] gap-4">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Assunto do Email</Label>
              <Input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Assunto..."
              />
            </div>
            <div className="space-y-2">
              <Label>Corpo do Email</Label>
              <Textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={12}
                className="font-mono text-sm"
                placeholder="Corpo do email..."
              />
            </div>
          </div>

          {/* Variables sidebar */}
          <div className="space-y-3">
            <div className="flex items-center gap-1.5">
              <Variable className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Variáveis
              </span>
            </div>
            <div className="space-y-1.5">
              {templateType.variables.map((v) => (
                <div key={v.key} className="space-y-1">
                  <p className="text-[11px] text-muted-foreground">{v.label}</p>
                  <div className="flex gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-6 text-[10px] px-1.5 font-mono flex-1"
                      onClick={() => insertVariable(v.key, "body")}
                    >
                      {v.key}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
            <Separator />
            <p className="text-[10px] text-muted-foreground">
              Clique numa variável para a inserir no corpo do email. As variáveis são substituídas automaticamente pelos dados reais ao enviar.
            </p>
          </div>
        </div>
      )}

      {/* Trigger info */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/30 rounded-lg px-3 py-2">
        <Badge variant="outline" className="text-[10px]">
          Trigger
        </Badge>
        <span>{templateType.trigger}</span>
      </div>
    </div>
  );
}
