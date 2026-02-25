import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";
import { User, Building2, Target } from "lucide-react";
import type { CrmLink } from "@/hooks/useRecordingUpload";

const entityConfig: Record<string, { icon: typeof User; labelKey: string }> = {
  contact: { icon: User, labelKey: "recording_linkedContact" },
  company: { icon: Building2, labelKey: "recording_linkedCompany" },
  opportunity: { icon: Target, labelKey: "recording_linkedDeal" },
};

interface Props {
  links: CrmLink[];
}

export function RecordingCrmLinks({ links }: Props) {
  const { t } = useTranslation("meetings");

  if (!links.length) return null;

  return (
    <div className="space-y-1.5">
      <p className="text-xs font-medium text-muted-foreground">{t("recording_crmLinks")}</p>
      <div className="flex flex-wrap gap-1.5">
        {links.map((link) => {
          const config = entityConfig[link.entity_type];
          if (!config) return null;
          const Icon = config.icon;
          return (
            <Badge
              key={`${link.entity_type}-${link.entity_id}`}
              variant="secondary"
              className="gap-1 text-xs"
            >
              <Icon className="h-3 w-3" />
              {link.entity_name || t(config.labelKey)}
            </Badge>
          );
        })}
      </div>
    </div>
  );
}
