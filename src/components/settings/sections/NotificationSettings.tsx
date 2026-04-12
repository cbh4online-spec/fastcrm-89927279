import { useTranslation } from "react-i18next";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { useUserNotificationPreferences } from "@/hooks/useUserNotificationPreferences";
import { Loader2 } from "lucide-react";

type PrefKey = "channel_email" | "channel_push" | "channel_in_app" | "type_new_leads" | "type_deal_updates" | "type_mentions";

interface NotificationRow {
  titleKey: string;
  descKey: string;
  prefKey: PrefKey;
}

const channelRows: NotificationRow[] = [
  { titleKey: "notifications_email", descKey: "notifications_emailDesc", prefKey: "channel_email" },
  { titleKey: "notifications_push", descKey: "notifications_pushDesc", prefKey: "channel_push" },
  { titleKey: "notifications_inApp", descKey: "notifications_inAppDesc", prefKey: "channel_in_app" },
];

const typeRows: NotificationRow[] = [
  { titleKey: "notifications_newLeads", descKey: "notifications_newLeadsDesc", prefKey: "type_new_leads" },
  { titleKey: "notifications_dealUpdates", descKey: "notifications_dealUpdatesDesc", prefKey: "type_deal_updates" },
  { titleKey: "notifications_mentions", descKey: "notifications_mentionsDesc", prefKey: "type_mentions" },
];

export function NotificationSettings() {
  const { t } = useTranslation("settings");
  const { preferences, isLoading, updatePreferences, saving } = useUserNotificationPreferences();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const renderRow = (row: NotificationRow) => (
    <div key={row.titleKey} className="flex items-center justify-between py-3">
      <div>
        <p className="text-sm font-medium">{t(row.titleKey)}</p>
        <p className="text-xs text-muted-foreground">{t(row.descKey)}</p>
      </div>
      <Switch
        checked={(preferences as any)[row.prefKey] ?? true}
        onCheckedChange={(v) => updatePreferences({ [row.prefKey]: v })}
        disabled={saving}
      />
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h3 className="text-sm font-medium">{t("notifications_title")}</h3>
        <p className="text-xs text-muted-foreground">{t("notifications_description")}</p>
      </div>

      <div className="divide-y divide-border">
        {channelRows.map(renderRow)}
      </div>

      <Separator />

      <div className="divide-y divide-border">
        {typeRows.map(renderRow)}
      </div>
    </div>
  );
}
