import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  FileText,
  MoreHorizontal,
  Pencil,
  Copy,
  Trash2,
  Type,
  Image,
  DollarSign,
  Quote,
  HelpCircle,
  Minus,
  MousePointer,
} from "lucide-react";
import { format } from "date-fns";
import { pt } from "date-fns/locale";
import type { ProposalTemplate, ContentBlock } from "@/types/proposal";

interface ProposalTemplateCardProps {
  template: ProposalTemplate;
  onEdit: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onToggleActive: (active: boolean) => void;
}

const blockTypeIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  text: Type,
  image: Image,
  offer: DollarSign,
  testimonials: Quote,
  faq: HelpCircle,
  divider: Minus,
  cta: MousePointer,
};

const blockTypeLabels: Record<string, string> = {
  text: "Texto",
  image: "Imagem",
  offer: "Oferta",
  testimonials: "Depoimentos",
  faq: "FAQ",
  divider: "Divisor",
  cta: "CTA",
};

export function ProposalTemplateCard({
  template,
  onEdit,
  onDuplicate,
  onDelete,
  onToggleActive,
}: ProposalTemplateCardProps) {
  const blocks = (template.content_blocks || []) as ContentBlock[];
  const uniqueBlockTypes = [...new Set(blocks.map((b) => b.type))];

  return (
    <Card className="group hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <FileText className="h-5 w-5 text-primary" />
            </div>
            <div className="min-w-0">
              <h3 className="font-semibold truncate">{template.name}</h3>
              {template.description && (
                <p className="text-sm text-muted-foreground line-clamp-2 mt-0.5">
                  {template.description}
                </p>
              )}
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onEdit}>
                <Pencil className="h-4 w-4 mr-2" />
                Editar
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onDuplicate}>
                <Copy className="h-4 w-4 mr-2" />
                Duplicar
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onDelete} className="text-destructive">
                <Trash2 className="h-4 w-4 mr-2" />
                Eliminar
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>

      <CardContent className="pb-3">
        {uniqueBlockTypes.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {uniqueBlockTypes.map((type) => {
              const Icon = blockTypeIcons[type] || FileText;
              return (
                <Badge key={type} variant="secondary" className="gap-1 text-xs">
                  <Icon className="h-3 w-3" />
                  {blockTypeLabels[type] || type}
                </Badge>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Sem blocos definidos</p>
        )}
      </CardContent>

      <CardFooter className="pt-3 border-t flex items-center justify-between">
        <span className="text-xs text-muted-foreground">
          Criado em{" "}
          {format(new Date(template.created_at), "d 'de' MMM, yyyy", {
            locale: pt,
          })}
        </span>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">
            {template.is_active ? "Activo" : "Inactivo"}
          </span>
          <Switch
            checked={template.is_active}
            onCheckedChange={onToggleActive}
          />
        </div>
      </CardFooter>
    </Card>
  );
}
