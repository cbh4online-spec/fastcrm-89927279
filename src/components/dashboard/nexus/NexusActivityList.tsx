import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { MoreHorizontal, ChevronRight, ExternalLink, RefreshCw, Download, Settings } from "lucide-react";
import { toast } from "sonner";

interface ActivityItem {
  id: string;
  name: string;
  email?: string;
  subtitle?: string;
  avatar?: string;
  badge?: {
    label: string;
    variant?: "default" | "secondary" | "outline" | "destructive";
  };
  timestamp?: string;
}

interface NexusActivityListProps {
  title: string;
  items: ActivityItem[];
  isLoading?: boolean;
  maxHeight?: string;
  onItemClick?: (item: ActivityItem) => void;
  onViewAll?: () => void;
  onRefresh?: () => void;
  onExport?: () => void;
  onSettings?: () => void;
  emptyState?: {
    title: string;
    description?: string;
  };
}

function ListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 p-2">
          <div className="h-9 w-9 rounded-full bg-muted animate-pulse" />
          <div className="flex-1 space-y-1.5">
            <div className="h-3.5 w-24 bg-muted rounded animate-pulse" />
            <div className="h-3 w-32 bg-muted rounded animate-pulse" />
          </div>
        </div>
      ))}
    </div>
  );
}

function OptionsMenu({ 
  onRefresh, 
  onExport,
  onSettings 
}: { 
  onRefresh?: () => void;
  onExport?: () => void;
  onSettings?: () => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-6 w-6">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="bg-popover">
        <DropdownMenuItem 
          className="gap-2 cursor-pointer"
          onClick={() => {
            if (onRefresh) {
              onRefresh();
              toast.success("Lista atualizada!");
            } else {
              toast.info("Atualização não disponível");
            }
          }}
        >
          <RefreshCw className="h-4 w-4" />
          Atualizar
        </DropdownMenuItem>
        <DropdownMenuItem 
          className="gap-2 cursor-pointer"
          onClick={() => {
            if (onExport) {
              onExport();
            } else {
              toast.info("Exportação não disponível");
            }
          }}
        >
          <Download className="h-4 w-4" />
          Exportar
        </DropdownMenuItem>
        <DropdownMenuItem 
          className="gap-2 cursor-pointer"
          onClick={() => {
            if (onSettings) {
              onSettings();
            } else {
              toast.info("Configurações não disponíveis");
            }
          }}
        >
          <Settings className="h-4 w-4" />
          Configurações
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function NexusActivityList({
  title,
  items,
  isLoading,
  maxHeight = "320px",
  onItemClick,
  onViewAll,
  onRefresh,
  onExport,
  onSettings,
  emptyState = { title: "Sem items", description: "Novos items aparecerão aqui" },
}: NexusActivityListProps) {
  if (isLoading) {
    return (
      <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
        <CardHeader className="pb-2 px-4 pt-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold">{title}</CardTitle>
            <OptionsMenu onRefresh={onRefresh} onExport={onExport} onSettings={onSettings} />
          </div>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          <ListSkeleton count={5} />
        </CardContent>
      </Card>
    );
  }

  if (items.length === 0) {
    return (
      <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
        <CardHeader className="pb-2 px-4 pt-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold">{title}</CardTitle>
            <OptionsMenu onRefresh={onRefresh} onExport={onExport} onSettings={onSettings} />
          </div>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="w-12 h-12 rounded-full bg-muted/50 flex items-center justify-center mb-3">
              <ExternalLink className="h-5 w-5 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium text-muted-foreground">{emptyState.title}</p>
            {emptyState.description && (
              <p className="text-xs text-muted-foreground/70 mt-1">{emptyState.description}</p>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/50 bg-card/80 backdrop-blur-sm transition-all duration-300 hover:shadow-lg hover:shadow-black/5">
      <CardHeader className="pb-2 px-4 pt-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold">{title}</CardTitle>
          <OptionsMenu onRefresh={onRefresh} onExport={onExport} onSettings={onSettings} />
        </div>
      </CardHeader>
      <CardContent className="px-4 pb-4">
        <ScrollArea className="pr-2" style={{ height: maxHeight }}>
          <div className="space-y-1">
            {items.map((item) => {
              const initials = item.name
                ?.split(" ")
                .map((n) => n[0])
                .join("")
                .slice(0, 2)
                .toUpperCase() || "??";

              return (
                <div
                  key={item.id}
                  onClick={() => onItemClick?.(item)}
                  className={cn(
                    "flex items-center justify-between p-2.5 rounded-lg transition-all",
                    "hover:bg-muted/50 group",
                    onItemClick && "cursor-pointer"
                  )}
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <Avatar className="h-9 w-9 ring-2 ring-background">
                      <AvatarImage src={item.avatar} />
                      <AvatarFallback className="text-xs bg-gradient-to-br from-primary/20 to-primary/10 text-primary font-medium">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium truncate">{item.name}</p>
                        {item.badge && (
                          <Badge variant={item.badge.variant || "secondary"} className="text-[10px] h-4 px-1.5">
                            {item.badge.label}
                          </Badge>
                        )}
                      </div>
                      {item.email && (
                        <p className="text-xs text-primary truncate">{item.email}</p>
                      )}
                      {item.subtitle && (
                        <p className="text-xs text-muted-foreground truncate">{item.subtitle}</p>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {item.timestamp && (
                      <span className="text-[10px] text-muted-foreground">{item.timestamp}</span>
                    )}
                    <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>
        
        {onViewAll && (
          <Button 
            variant="ghost" 
            size="sm" 
            className="w-full mt-3 text-xs text-muted-foreground hover:text-primary"
            onClick={onViewAll}
          >
            Ver todos
            <ChevronRight className="h-3 w-3 ml-1" />
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
