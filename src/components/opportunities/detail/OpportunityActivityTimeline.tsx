import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Phone, Mail, Calendar, FileText, MessageSquare, CheckCircle, Plus, ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatRelativeTime } from "@/lib/formatters";
import { useTranslation } from "react-i18next";

interface Activity {
  id: string;
  type: "call" | "email" | "meeting" | "note" | "task" | "system";
  title: string;
  description?: string;
  created_at: string;
  performed_by?: string;
  avatar_url?: string;
}

interface OpportunityActivityTimelineProps {
  activities: Activity[];
  opportunityId: string;
  isLoading?: boolean;
  compact?: boolean;
}

const activityIcons: Record<string, typeof Phone> = {
  call: Phone,
  email: Mail,
  meeting: Calendar,
  note: FileText,
  task: CheckCircle,
  system: Plus,
};

export function OpportunityActivityTimeline({
  activities,
  opportunityId,
  isLoading = false,
  compact = false,
}: OpportunityActivityTimelineProps) {
  const { t } = useTranslation("crm");
  const [activityFilter, setActivityFilter] = useState("all");
  const [showAll, setShowAll] = useState(false);

  const filteredActivities = useMemo(() => {
    const filtered = activities.filter((activity) => {
      return activityFilter === "all" || activity.type === activityFilter;
    });
    return filtered;
  }, [activities, activityFilter]);

  const displayActivities = showAll ? filteredActivities : filteredActivities.slice(0, 5);

  const getInitials = (name?: string) => {
    if (!name) return "SY";
    return name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
  };

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold flex items-center gap-1.5">
          {t("oppDetailActivity")}
          <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
        </h3>
        <Select value={activityFilter} onValueChange={setActivityFilter}>
          <SelectTrigger className="w-[120px] h-7 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("oppDetail_allActivity")}</SelectItem>
            <SelectItem value="call">{t("sidebarCalls")}</SelectItem>
            <SelectItem value="email">{t("sidebarEmails")}</SelectItem>
            <SelectItem value="note">{t("sidebarNotes")}</SelectItem>
            <SelectItem value="task">{t("tasks")}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Compact Timeline */}
      <div className="space-y-0">
        {displayActivities.map((activity) => {
          const Icon = activityIcons[activity.type] || Plus;
          return (
            <div key={activity.id} className="flex items-center gap-3 py-2 border-b border-border/30 last:border-0">
              <Avatar className="h-6 w-6 shrink-0">
                <AvatarImage src={activity.avatar_url} />
                <AvatarFallback className="text-[8px] bg-muted">
                  {getInitials(activity.performed_by)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-xs truncate">
                  <span className="font-medium">{activity.performed_by || "System"}</span>
                  {" "}
                  <span className="text-muted-foreground">{activity.title}</span>
                </p>
              </div>
              <span className="text-[10px] text-muted-foreground whitespace-nowrap shrink-0">
                {formatRelativeTime(activity.created_at)}
              </span>
            </div>
          );
        })}

        {filteredActivities.length === 0 && (
          <div className="text-center py-6 text-muted-foreground">
            <MessageSquare className="w-6 h-6 mx-auto mb-1.5 opacity-40" />
            <p className="text-xs">{t("oppDetail_noActivity")}</p>
          </div>
        )}
      </div>

      {/* View all */}
      {filteredActivities.length > 5 && !showAll && (
        <button
          onClick={() => setShowAll(true)}
          className="text-xs text-primary hover:underline font-medium"
        >
          {t("oppDetail_viewAll")} ({filteredActivities.length})
        </button>
      )}
    </div>
  );
}
