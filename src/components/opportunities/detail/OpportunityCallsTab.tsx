import { Button } from "@/components/ui/button";
import { Phone, Plus } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

interface OpportunityCallsTabProps {
  opportunityId: string;
}

export function OpportunityCallsTab({ opportunityId }: OpportunityCallsTabProps) {
  const { t } = useTranslation("crm");

  return (
    <div className="text-center py-12 text-muted-foreground">
      <Phone className="w-10 h-10 mx-auto mb-3 opacity-30" />
      <p className="text-sm mb-3">{t("oppDetail_noCalls")}</p>
      <Button
        variant="outline"
        size="sm"
        className="gap-1.5"
        onClick={() => toast.info(t("oppDetail_logCallSoon"))}
      >
        <Plus className="w-3.5 h-3.5" />
        {t("oppDetail_logCall")}
      </Button>
    </div>
  );
}
