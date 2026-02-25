import { useTranslation } from "react-i18next";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";

interface NotificationRow {
  titleKey: string;
  descKey: string;
}

const channelRows: NotificationRow[] = [
  { titleKey: "notifications_email", descKey: "notifications_emailDesc" },
  { titleKey: "notifications_push", descKey: "notifications_pushDesc" },
  { titleKey: "notifications_inApp", descKey: "notifications_inAppDesc" },
];

const typeRows: NotificationRow[] = [
  { titleKey: "notifications_newLeads", descKey: "notifications_newLeadsDesc" },
  { titleKey: "notifications_dealUpdates", descKey: "notifications_dealUpdatesDesc" },
  { titleKey: "notifications_mentions", descKey: "notifications_mentionsDesc" },
];

export function NotificationSettings() {
  const { t } = useTranslation("settings");

  const renderRow = (row: NotificationRow) => (
    <div key={row.titleKey} className="flex items-center justify-between py-3">
      <div>
        <p className="text-sm font-medium">{t(row.titleKey)}</p>
        <p className="text-xs text-muted-foreground">{t(row.descKey)}</p>
      </div>
      <Switch defaultChecked />
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
