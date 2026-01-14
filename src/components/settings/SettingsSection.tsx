import { ReactNode } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Crown, Lock } from "lucide-react";
import { cn } from "@/lib/utils";

interface SettingsSectionProps {
  title: string;
  description: string;
  icon: ReactNode;
  children: ReactNode;
  isPremium?: boolean;
  isLocked?: boolean;
  planRequired?: string;
}

export function SettingsSection({
  title,
  description,
  icon,
  children,
  isPremium,
  isLocked,
  planRequired,
}: SettingsSectionProps) {
  return (
    <Card className={cn(isLocked && "opacity-60")}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              {icon}
            </div>
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                {title}
                {isPremium && (
                  <Badge variant="outline" className="gap-1 text-amber-600 border-amber-300">
                    <Crown className="w-3 h-3" />
                    Pro
                  </Badge>
                )}
                {isLocked && (
                  <Badge variant="secondary" className="gap-1">
                    <Lock className="w-3 h-3" />
                    {planRequired || "Upgrade"}
                  </Badge>
                )}
              </CardTitle>
              <CardDescription>{description}</CardDescription>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLocked ? (
          <div className="text-center py-8">
            <Lock className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
            <p className="text-muted-foreground">
              Faça upgrade para o plano {planRequired || "Pro"} para desbloquear esta funcionalidade.
            </p>
          </div>
        ) : (
          children
        )}
      </CardContent>
    </Card>
  );
}

interface SettingsItemProps {
  title: string;
  description: string;
  action?: ReactNode;
  icon?: ReactNode;
  onClick?: () => void;
}

export function SettingsItem({ title, description, action, icon, onClick }: SettingsItemProps) {
  return (
    <div
      className={cn(
        "flex items-center justify-between py-4 border-b border-border last:border-0",
        onClick && "cursor-pointer hover:bg-muted/50 -mx-2 px-2 rounded-lg"
      )}
      onClick={onClick}
    >
      <div className="flex items-center gap-3">
        {icon && (
          <div className="p-1.5 rounded-md bg-muted text-muted-foreground">
            {icon}
          </div>
        )}
        <div>
          <p className="font-medium text-sm">{title}</p>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
      </div>
      {action}
    </div>
  );
}
