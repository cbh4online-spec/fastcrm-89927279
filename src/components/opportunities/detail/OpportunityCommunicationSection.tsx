import { useActivities } from "@/hooks/useActivities";
import { Mail, Phone, Calendar, MessageSquare } from "lucide-react";
import { formatRelativeTime } from "@/lib/formatters";
import { useTranslation } from "react-i18next";

interface OpportunityCommunicationSectionProps {
  opportunityId: string;
}

const typeIcons: Record<string, typeof Mail> = {
  email: Mail,
  call: Phone,
  meeting: Calendar,
};

export function OpportunityCommunicationSection({ opportunityId }: OpportunityCommunicationSectionProps) {
  const { t } = useTranslation("crm");
  const { data: activities = [] } = useActivities({
    entityType: "opportunity",
    entityId: opportunityId,
    limit: 1,
  });

  const lastActivity = activities[0];

  if (!lastActivity) {
    return (
      <div className="flex items-center gap-2 py-2 text-xs text-muted-foreground">
        <MessageSquare className="w-3.5 h-3.5" />
        <span>{t("oppDetail_noCommunication")}</span>
      </div>
    );
  }

  const Icon = typeIcons[lastActivity.activity_type] || MessageSquare;

  return (
    <div className="flex items-start gap-3 py-2">
      <div className="p-1.5 rounded-md bg-muted">
        <Icon className="w-3.5 h-3.5 text-muted-foreground" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium truncate">{lastActivity.title || lastActivity.description?.substring(0, 60)}</p>
        <p className="text-[11px] text-muted-foreground">
          {formatRelativeTime(lastActivity.created_at)}
        </p>
      </div>
    </div>
  );
}
