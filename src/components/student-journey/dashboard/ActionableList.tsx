import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { 
  Phone, Calendar, ChevronRight, 
  TrendingUp, Clock, Zap 
} from "lucide-react";
import { Link } from "react-router-dom";
import type { JourneyProfile } from "@/types/sjJourney";
import { JOURNEY_STATE_CONFIG } from "@/types/sjJourney";

interface ActionableListProps {
  title: string;
  subtitle?: string;
  profiles: JourneyProfile[];
  emptyMessage: string;
  emptyIcon?: React.ReactNode;
  maxItems?: number;
  viewAllLink?: string;
  variant?: 'activation' | 'contact' | 'risk';
}

export function ActionableList({ 
  title, 
  subtitle,
  profiles, 
  emptyMessage, 
  emptyIcon,
  maxItems = 5,
  viewAllLink,
  variant = 'activation'
}: ActionableListProps) {
  const displayProfiles = profiles.slice(0, maxItems);
  const hasMore = profiles.length > maxItems;

  const getVariantStyles = () => {
    switch (variant) {
      case 'contact':
        return { 
          headerColor: 'text-blue-600', 
          iconBg: 'bg-blue-100 dark:bg-blue-900/30',
          badgeBg: 'bg-blue-50 dark:bg-blue-900/20'
        };
      case 'risk':
        return { 
          headerColor: 'text-amber-600', 
          iconBg: 'bg-amber-100 dark:bg-amber-900/30',
          badgeBg: 'bg-amber-50 dark:bg-amber-900/20'
        };
      default:
        return { 
          headerColor: 'text-emerald-600', 
          iconBg: 'bg-emerald-100 dark:bg-emerald-900/30',
          badgeBg: 'bg-emerald-50 dark:bg-emerald-900/20'
        };
    }
  };

  const styles = getVariantStyles();

  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className={cn("text-base font-semibold flex items-center gap-2", styles.headerColor)}>
              {variant === 'activation' && <TrendingUp className="h-4 w-4" />}
              {variant === 'contact' && <Phone className="h-4 w-4" />}
              {variant === 'risk' && <Clock className="h-4 w-4" />}
              {title}
            </CardTitle>
            {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
          </div>
          <Badge className={cn("border-0", styles.badgeBg, styles.headerColor)}>
            {profiles.length}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        {profiles.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
            {emptyIcon || <Zap className="h-8 w-8 mb-2 opacity-50" />}
            <p className="text-sm text-center">{emptyMessage}</p>
          </div>
        ) : (
          <ScrollArea className="h-[260px]">
            <div className="space-y-2">
              {displayProfiles.map((jp) => {
                const stateConfig = JOURNEY_STATE_CONFIG[jp.currentState];
                return (
                  <Link 
                    key={jp.profile.id} 
                    to={`/dashboard/student-journey/profiles/${jp.profile.id}`}
                    className="block"
                  >
                    <div className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors border border-transparent hover:border-border">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={cn(
                          "h-9 w-9 rounded-full flex items-center justify-center text-white text-sm font-medium shrink-0",
                          variant === 'activation' && "bg-gradient-to-br from-emerald-400 to-emerald-600",
                          variant === 'contact' && "bg-gradient-to-br from-blue-400 to-blue-600",
                          variant === 'risk' && "bg-gradient-to-br from-amber-400 to-amber-600"
                        )}>
                          {jp.profile.full_name.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{jp.profile.full_name}</p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Badge 
                              variant="outline" 
                              className={cn("text-xs px-1.5 py-0", stateConfig.color, stateConfig.bgColor, "border-0")}
                            >
                              {stateConfig.label}
                            </Badge>
                            {jp.completedEnrollments > 0 && (
                              <span>{jp.completedEnrollments} curso(s)</span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <div className={cn(
                          "px-2 py-1 rounded-md text-xs font-semibold",
                          jp.activationScore >= 80 && "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600",
                          jp.activationScore >= 60 && jp.activationScore < 80 && "bg-amber-100 dark:bg-amber-900/30 text-amber-600",
                          jp.activationScore < 60 && "bg-gray-100 dark:bg-gray-800/50 text-gray-600"
                        )}>
                          {jp.activationScore}%
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
            {hasMore && viewAllLink && (
              <div className="mt-3 pt-3 border-t">
                <Link to={viewAllLink}>
                  <Button variant="ghost" size="sm" className="w-full gap-2">
                    Ver todos ({profiles.length})
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </Link>
              </div>
            )}
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
