import { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { 
  Users, 
  Building2, 
  Target, 
  FileText, 
  Calendar,
  MessageSquare,
  Package,
  Search,
  FolderOpen,
  Inbox
} from "lucide-react";

// ============================================
// EMPTY STATE - Semantic Empty States
// ============================================

type EntityType = "leads" | "contacts" | "companies" | "opportunities" | "proposals" | "tasks" | "messages" | "products" | "calendar" | "generic";

interface EmptyStateProps {
  type?: EntityType;
  title?: string;
  description?: string;
  icon?: ReactNode;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
  size?: "sm" | "md" | "lg";
}

const entityConfig: Record<EntityType, { title: string; description: string; icon: typeof Users }> = {
  leads: {
    title: "Nenhum lead encontrado",
    description: "Comece a adicionar leads para acompanhar suas oportunidades de vendas.",
    icon: Users,
  },
  contacts: {
    title: "Nenhum contacto encontrado",
    description: "Adicione contactos para gerir suas relações comerciais.",
    icon: Users,
  },
  companies: {
    title: "Nenhuma empresa encontrada",
    description: "Adicione empresas para organizar seus clientes e prospects.",
    icon: Building2,
  },
  opportunities: {
    title: "Nenhuma oportunidade encontrada",
    description: "Crie oportunidades para acompanhar o pipeline de vendas.",
    icon: Target,
  },
  proposals: {
    title: "Nenhuma proposta encontrada",
    description: "Crie propostas comerciais para enviar aos seus clientes.",
    icon: FileText,
  },
  tasks: {
    title: "Nenhuma tarefa encontrada",
    description: "Suas tarefas aparecerão aqui quando forem criadas.",
    icon: FolderOpen,
  },
  messages: {
    title: "Nenhuma mensagem",
    description: "Suas conversas aparecerão aqui.",
    icon: MessageSquare,
  },
  products: {
    title: "Nenhum produto encontrado",
    description: "Adicione produtos ao seu catálogo.",
    icon: Package,
  },
  calendar: {
    title: "Nenhum evento agendado",
    description: "Agende reuniões e eventos para organizar sua agenda.",
    icon: Calendar,
  },
  generic: {
    title: "Nenhum item encontrado",
    description: "Não há itens para exibir no momento.",
    icon: Inbox,
  },
};

export function EmptyState({ 
  type = "generic", 
  title, 
  description, 
  icon, 
  action, 
  className,
  size = "md" 
}: EmptyStateProps) {
  const config = entityConfig[type];
  const Icon = config.icon;
  
  const sizeClasses = {
    sm: {
      container: "py-6",
      icon: "h-8 w-8",
      title: "text-sm",
      description: "text-xs",
    },
    md: {
      container: "py-12",
      icon: "h-12 w-12",
      title: "text-base",
      description: "text-sm",
    },
    lg: {
      container: "py-16",
      icon: "h-16 w-16",
      title: "text-lg",
      description: "text-base",
    },
  };
  
  const sizes = sizeClasses[size];
  
  return (
    <div className={cn("flex flex-col items-center justify-center text-center", sizes.container, className)}>
      <div className="rounded-full bg-muted p-4 mb-4">
        {icon || <Icon className={cn("text-muted-foreground", sizes.icon)} />}
      </div>
      <h3 className={cn("font-semibold text-foreground mb-1", sizes.title)}>
        {title || config.title}
      </h3>
      <p className={cn("text-muted-foreground max-w-sm mb-4", sizes.description)}>
        {description || config.description}
      </p>
      {action && (
        <Button onClick={action.onClick}>
          {action.label}
        </Button>
      )}
    </div>
  );
}

// Search Empty State
interface SearchEmptyStateProps {
  query: string;
  className?: string;
}

export function SearchEmptyState({ query, className }: SearchEmptyStateProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center text-center py-12", className)}>
      <div className="rounded-full bg-muted p-4 mb-4">
        <Search className="h-12 w-12 text-muted-foreground" />
      </div>
      <h3 className="font-semibold text-foreground mb-1">
        Nenhum resultado para "{query}"
      </h3>
      <p className="text-sm text-muted-foreground max-w-sm">
        Tente ajustar os termos de busca ou filtros aplicados.
      </p>
    </div>
  );
}

// Filter Empty State
interface FilterEmptyStateProps {
  onClearFilters?: () => void;
  className?: string;
}

export function FilterEmptyState({ onClearFilters, className }: FilterEmptyStateProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center text-center py-12", className)}>
      <div className="rounded-full bg-muted p-4 mb-4">
        <Search className="h-12 w-12 text-muted-foreground" />
      </div>
      <h3 className="font-semibold text-foreground mb-1">
        Nenhum resultado com os filtros atuais
      </h3>
      <p className="text-sm text-muted-foreground max-w-sm mb-4">
        Tente remover alguns filtros para ver mais resultados.
      </p>
      {onClearFilters && (
        <Button variant="outline" onClick={onClearFilters}>
          Limpar filtros
        </Button>
      )}
    </div>
  );
}

// Export all for convenience
export const EmptyStates = {
  Default: EmptyState,
  Search: SearchEmptyState,
  Filter: FilterEmptyState,
};
