import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Star, Settings, Unplug, Mail, Calendar } from "lucide-react";
import type { EmailConnection } from "@/hooks/useEmailConnection";

interface EmailAccountRowProps {
  connection: EmailConnection;
  isDefault: boolean;
  onSetDefault: (id: string) => void;
  onDisconnect: (id: string) => void;
  onOpenSettings?: (id: string) => void;
}

function ProviderIcon({ provider }: { provider: string }) {
  switch (provider) {
    case "gmail":
      return (
        <div className="h-9 w-9 rounded-lg bg-red-100 dark:bg-red-900/30 flex items-center justify-center flex-shrink-0">
          <span className="text-sm font-bold text-red-600 dark:text-red-400">G</span>
        </div>
      );
    case "outlook":
      return (
        <div className="h-9 w-9 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
          <span className="text-sm font-bold text-blue-600 dark:text-blue-400">M</span>
        </div>
      );
    case "hostinger":
      return (
        <div className="h-9 w-9 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center flex-shrink-0">
          <span className="text-sm font-bold text-purple-600 dark:text-purple-400">H</span>
        </div>
      );
    default:
      return (
        <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
          <Mail className="h-4 w-4 text-muted-foreground" />
        </div>
      );
  }
}

function SyncStatusBadge({ status }: { status: string }) {
  const { t } = useTranslation("settings");

  switch (status) {
    case "synced":
      return (
        <Badge variant="outline" className="border-green-200 bg-green-50 text-green-700 dark:border-green-800 dark:bg-green-950 dark:text-green-400 text-xs">
          {t("emailCalendar_inSync")}
        </Badge>
      );
    case "syncing":
      return (
        <Badge variant="outline" className="border-yellow-200 bg-yellow-50 text-yellow-700 dark:border-yellow-800 dark:bg-yellow-950 dark:text-yellow-400 text-xs">
          {t("emailCalendar_syncing")}
        </Badge>
      );
    case "error":
      return (
        <Badge variant="outline" className="border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-400 text-xs">
          {t("emailCalendar_error")}
        </Badge>
      );
    default:
      return (
        <Badge variant="outline" className="text-xs">
          {t("emailCalendar_pending")}
        </Badge>
      );
  }
}

export function EmailAccountRow({
  connection,
  isDefault,
  onSetDefault,
  onDisconnect,
  onOpenSettings,
}: EmailAccountRowProps) {
  const { t } = useTranslation("settings");

  return (
    <div className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors">
      <ProviderIcon provider={connection.provider} />

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-foreground truncate">
            {connection.email_address}
          </span>
          {isDefault && (
            <Badge variant="secondary" className="text-xs">
              {t("emailCalendar_default")}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-1.5 mt-0.5">
          <Mail className="h-3 w-3 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">{t("emailCalendar_emailOnly")}</span>
        </div>
      </div>

      <SyncStatusBadge status={connection.sync_status} />

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {!isDefault && (
            <DropdownMenuItem onClick={() => onSetDefault(connection.id)}>
              <Star className="h-4 w-4 mr-2" />
              {t("emailCalendar_setDefault")}
            </DropdownMenuItem>
          )}
          {onOpenSettings && (
            <DropdownMenuItem onClick={() => onOpenSettings(connection.id)}>
              <Settings className="h-4 w-4 mr-2" />
              {t("emailCalendar_settings")}
            </DropdownMenuItem>
          )}
          <DropdownMenuItem
            onClick={() => onDisconnect(connection.id)}
            className="text-destructive focus:text-destructive"
          >
            <Unplug className="h-4 w-4 mr-2" />
            {t("emailCalendar_disconnect")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
