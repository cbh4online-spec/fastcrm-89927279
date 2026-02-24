import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  Crown, Calendar, CreditCard, AlertTriangle,
  RefreshCw, ExternalLink, CheckCircle2, Clock, XCircle, Sparkles
} from "lucide-react";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { PLAN_DISPLAY_INFO } from "@/types/saas";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

interface CurrentPlanOverviewProps {
  className?: string;
  showActions?: boolean;
}

export function CurrentPlanOverview({ className, showActions = true }: CurrentPlanOverviewProps) {
  const { 
    plan, subscribed, subscriptionEnd, cancelAtPeriodEnd, 
    isLoading, openCustomerPortal, checkSubscription 
  } = useSubscription();

  const planInfo = PLAN_DISPLAY_INFO[plan];

  const getStatusBadge = () => {
    if (cancelAtPeriodEnd) {
      return (
        <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/30 gap-1">
          <Clock className="w-3 h-3" />
          Ending
        </Badge>
      );
    }
    if (subscribed) {
      return (
        <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30 gap-1">
          <CheckCircle2 className="w-3 h-3" />
          Active
        </Badge>
      );
    }
    if (plan === "starter") {
      return (
        <Badge variant="outline" className="bg-muted text-muted-foreground">
          Free
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/30 gap-1">
        <XCircle className="w-3 h-3" />
        Inactive
      </Badge>
    );
  };

  const getPlanBadgeColor = () => {
    switch (plan) {
      case "scale":
        return "bg-gradient-to-r from-amber-500/10 to-orange-500/10 text-amber-600 border-amber-500/30";
      case "growth":
        return "bg-blue-500/10 text-blue-600 border-blue-500/30";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  return (
    <Card className={cn("relative overflow-hidden", className)}>
      {plan !== "starter" && (
        <div className="absolute top-0 right-0 w-40 h-40 opacity-10">
          <div className={cn(
            "absolute inset-0 rounded-full blur-3xl",
            plan === "scale" && "bg-amber-500",
            plan === "growth" && "bg-blue-500"
          )} />
        </div>
      )}

      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              {plan !== "starter" && <Crown className="w-5 h-5 text-primary" />}
              Your Plan
            </CardTitle>
            <CardDescription>
              Everything you need to know about your plan.
            </CardDescription>
          </div>
          {getStatusBadge()}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="flex items-center justify-between p-4 rounded-xl bg-muted/50">
          <div className="flex items-center gap-3">
            <div className={cn(
              "w-14 h-14 rounded-xl flex items-center justify-center",
              getPlanBadgeColor()
            )}>
              {plan === "starter" ? (
                <Sparkles className="w-7 h-7" />
              ) : (
                <Crown className="w-7 h-7" />
              )}
            </div>
            <div>
              <p className="font-semibold text-xl">{planInfo.name}</p>
              <p className="text-sm text-muted-foreground">{planInfo.description}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-3xl font-bold">€{planInfo.price}</p>
            {planInfo.price > 0 && (
              <p className="text-sm text-muted-foreground">/mo</p>
            )}
          </div>
        </div>

        {subscribed && subscriptionEnd && (
          <>
            <Separator />
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
                <Calendar className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">
                    {cancelAtPeriodEnd ? "Ends on" : "Renews on"}
                  </p>
                  <p className="text-sm font-medium">
                    {format(new Date(subscriptionEnd), "MMM d, yyyy")}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
                <CreditCard className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Next payment</p>
                  <p className="text-sm font-medium">
                    {cancelAtPeriodEnd ? "—" : `€${planInfo.price}`}
                  </p>
                </div>
              </div>
            </div>

            {cancelAtPeriodEnd && (
              <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-500/10 border border-amber-500/30">
                <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium text-amber-700">Your subscription is ending</p>
                  <p className="text-sm text-amber-600 mt-1">
                    Access continues until {format(new Date(subscriptionEnd), "MMM d")}. 
                    You can reactivate anytime.
                  </p>
                </div>
              </div>
            )}
          </>
        )}

        {showActions && (
          <>
            <Separator />
            <div className="flex gap-2">
              {subscribed && plan !== "starter" && (
                <Button 
                  variant="outline" 
                  className="flex-1 gap-2"
                  onClick={() => openCustomerPortal()}
                >
                  <CreditCard className="w-4 h-4" />
                  Manage Subscription
                  <ExternalLink className="w-3 h-3" />
                </Button>
              )}
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => checkSubscription()}
                disabled={isLoading}
                title="Refresh info"
              >
                <RefreshCw className={cn("w-4 h-4", isLoading && "animate-spin")} />
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
