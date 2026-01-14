import { useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileText, Send, Loader2 } from "lucide-react";
import { useProposalTemplates } from "@/hooks/useProposals";
import { useTemplates } from "@/hooks/useTemplates";

interface ProposalActionConfigProps {
  actionType: "create_proposal" | "send_proposal_link";
  config: Record<string, unknown>;
  onChange: (config: Record<string, unknown>) => void;
}

export function ProposalActionConfig({
  actionType,
  config,
  onChange,
}: ProposalActionConfigProps) {
  const { data: proposalTemplates, isLoading: loadingProposals } = useProposalTemplates();
  const { data: messageTemplates, isLoading: loadingTemplates } = useTemplates();

  if (actionType === "create_proposal") {
    return (
      <Card className="p-4 space-y-4">
        <div className="flex items-center gap-2 text-sm font-medium">
          <FileText className="h-4 w-4" />
          Criar Proposta
        </div>

        <div className="space-y-3">
          <div className="space-y-2">
            <Label>Modelo de Proposta</Label>
            <Select
              value={(config.proposal_template_id as string) || ""}
              onValueChange={(value) =>
                onChange({ ...config, proposal_template_id: value })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione um modelo" />
              </SelectTrigger>
              <SelectContent>
                {loadingProposals ? (
                  <div className="p-2 flex justify-center">
                    <Loader2 className="h-4 w-4 animate-spin" />
                  </div>
                ) : (
                  proposalTemplates?.map((template) => (
                    <SelectItem key={template.id} value={template.id}>
                      {template.name}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Título da Proposta</Label>
            <Input
              placeholder="Use {{opportunity.title}} para título dinâmico"
              value={(config.title_template as string) || ""}
              onChange={(e) =>
                onChange({ ...config, title_template: e.target.value })
              }
            />
            <p className="text-xs text-muted-foreground">
              Suporta variáveis: {"{{lead.name}}"}, {"{{opportunity.value}}"}, etc.
            </p>
          </div>

          <div className="space-y-2">
            <Label>Dias para Expirar (opcional)</Label>
            <Input
              type="number"
              placeholder="30"
              value={(config.expires_in_days as string) || ""}
              onChange={(e) =>
                onChange({ ...config, expires_in_days: e.target.value })
              }
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="auto_publish"
              checked={(config.auto_publish as boolean) || false}
              onChange={(e) =>
                onChange({ ...config, auto_publish: e.target.checked })
              }
              className="rounded border-gray-300"
            />
            <Label htmlFor="auto_publish" className="text-sm">
              Publicar automaticamente após criação
            </Label>
          </div>
        </div>
      </Card>
    );
  }

  if (actionType === "send_proposal_link") {
    return (
      <Card className="p-4 space-y-4">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Send className="h-4 w-4" />
          Enviar Link da Proposta
        </div>

        <div className="space-y-3">
          <div className="space-y-2">
            <Label>Template de Mensagem</Label>
            <Select
              value={(config.message_template_id as string) || ""}
              onValueChange={(value) =>
                onChange({ ...config, message_template_id: value })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione um template" />
              </SelectTrigger>
              <SelectContent>
                {loadingTemplates ? (
                  <div className="p-2 flex justify-center">
                    <Loader2 className="h-4 w-4 animate-spin" />
                  </div>
                ) : (
                  messageTemplates?.map((template) => (
                    <SelectItem key={template.id} value={template.id}>
                      <div className="flex items-center gap-2">
                        {template.name}
                        <Badge variant="outline" className="text-xs">
                          {template.type}
                        </Badge>
                      </div>
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Use {"{{proposal.url}}"} no template para inserir o link
            </p>
          </div>

          <div className="space-y-2">
            <Label>Canal</Label>
            <Select
              value={(config.channel as string) || "email"}
              onValueChange={(value) => onChange({ ...config, channel: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="email">Email</SelectItem>
                <SelectItem value="whatsapp">WhatsApp</SelectItem>
                <SelectItem value="instagram_dm">Instagram DM</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="validate_template"
              checked={(config.validate_before_send as boolean) !== false}
              onChange={(e) =>
                onChange({ ...config, validate_before_send: e.target.checked })
              }
              className="rounded border-gray-300"
            />
            <Label htmlFor="validate_template" className="text-sm">
              Validar variáveis do template antes de enviar
            </Label>
          </div>
        </div>
      </Card>
    );
  }

  return null;
}
