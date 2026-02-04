/**
 * ConversationStatusBanner - Consolidated banner showing only important alerts
 * Replaces multiple individual banners with a single compact view
 */

import { useState } from "react";
import { Conversation } from "@/hooks/useConversations";
import { Message } from "@/hooks/useMessages";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { 
  AlertTriangle, 
  Clock, 
  TrendingUp, 
  Bot, 
  ChevronDown,
  ChevronUp,
  Target,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { differenceInHours } from "date-fns";

import { OpportunityTrigger } from "@/hooks/useInboxActionSuggestions";

interface ConversationStatusBannerProps {
  conversation: Conversation;
  messages?: Message[];
  opportunityTrigger?: OpportunityTrigger | null;
  autopilotActive?: boolean;
  className?: string;
}

interface Alert {
  id: string;
  type: "warning" | "info" | "success";
  icon: React.ElementType;
  label: string;
  value?: string;
}

export function ConversationStatusBanner({
  conversation,
  messages,
  opportunityTrigger,
  autopilotActive = false,
  className,
}: ConversationStatusBannerProps) {
  const [isOpen, setIsOpen] = useState(false);
  
  // Calculate alerts
  const alerts: Alert[] = [];
  
  // Check follow-up delay
  const hoursSinceLastMessage = conversation.last_message_at 
    ? differenceInHours(new Date(), new Date(conversation.last_message_at))
    : 0;
  
  if (hoursSinceLastMessage > 2 && conversation.status === "open") {
    alerts.push({
      id: "followup",
      type: "warning",
      icon: Clock,
      label: "Aguarda resposta",
      value: `há ${hoursSinceLastMessage}h`,
    });
  }
  
  // Check intent
  const intent = conversation.user_intent || conversation.ai_intent;
  if (intent === "sales") {
    alerts.push({
      id: "intent",
      type: "info",
      icon: TrendingUp,
      label: "Intenção de compra",
    });
  }
  
  // Check opportunity trigger
  if (opportunityTrigger?.shouldSuggest && opportunityTrigger.priority === "high") {
    alerts.push({
      id: "opportunity",
      type: "success",
      icon: Target,
      label: "Oportunidade detectada",
    });
  }
  
  // Autopilot status
  if (autopilotActive) {
    alerts.push({
      id: "autopilot",
      type: "info",
      icon: Bot,
      label: "Auto-pilot ativo",
    });
  }
  
  // If no alerts, don't render
  if (alerts.length === 0) {
    return null;
  }
  
  const getAlertColor = (type: Alert["type"]) => {
    switch (type) {
      case "warning": return "text-amber-600 bg-amber-500/10";
      case "success": return "text-green-600 bg-green-500/10";
      case "info": return "text-blue-600 bg-blue-500/10";
    }
  };
  
  return (
    <div className={cn("px-3 py-2 border-b border-border bg-muted/30", className)}>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <div className="flex items-center justify-between gap-2">
          {/* Compact alerts row */}
          <div className="flex items-center gap-2 flex-wrap">
            {alerts.slice(0, 3).map((alert) => {
              const Icon = alert.icon;
              return (
                <Badge
                  key={alert.id}
                  variant="secondary"
                  className={cn(
                    "gap-1 text-xs font-normal",
                    getAlertColor(alert.type)
                  )}
                >
                  <Icon className="w-3 h-3" />
                  {alert.label}
                  {alert.value && (
                    <span className="font-medium">{alert.value}</span>
                  )}
                </Badge>
              );
            })}
            {alerts.length > 3 && (
              <Badge variant="outline" className="text-xs">
                +{alerts.length - 3}
              </Badge>
            )}
          </div>
          
          {/* Expand button */}
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
              {isOpen ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </Button>
          </CollapsibleTrigger>
        </div>
        
        <CollapsibleContent className="mt-2 space-y-1.5">
          {alerts.map((alert) => {
            const Icon = alert.icon;
            return (
              <div
                key={alert.id}
                className={cn(
                  "flex items-center gap-2 text-xs p-1.5 rounded",
                  getAlertColor(alert.type)
                )}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{alert.label}</span>
                {alert.value && (
                  <span className="font-medium ml-auto">{alert.value}</span>
                )}
              </div>
            );
          })}
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
