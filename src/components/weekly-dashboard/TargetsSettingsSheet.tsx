import { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Settings, Save, Loader2, ChevronDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useAuth } from "@/contexts/AuthContext";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

const metricTypeKeys = [
  { key: "revenue", labelKey: "revenueMetricLabel" },
  { key: "leads", labelKey: "leadsLabel" },
  { key: "meetings", labelKey: "meetingsLabel" },
  { key: "proposals", labelKey: "proposalsLabel" },
  { key: "deals", labelKey: "dealsClosedLabel" },
  { key: "new_deals", labelKey: "newDealsLabel" },
];

const conversionKeys = [
  { key: "conversion_lead_to_meeting", labelKey: "leadToMeeting" },
  { key: "conversion_meeting_to_proposal", labelKey: "meetingToProposal" },
  { key: "conversion_proposal_to_deal", labelKey: "proposalToDeal" },
];

const healthKeys = [
  { key: "health_stalled_weight", labelKey: "stalledWeightLabel" },
  { key: "health_missing_data_weight", labelKey: "missingDataWeightLabel" },
  { key: "health_coverage_weight", labelKey: "coverageWeightLabel" },
];

const ALL_SETTINGS_KEYS = [
  ...metricTypeKeys.map(m => m.key),
  ...conversionKeys.map(m => m.key),
  ...healthKeys.map(m => m.key),
];

export function TargetsSettingsSheet() {
  const { t } = useTranslation("dashboard");
  const { currentWorkspace } = useWorkspace();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [values, setValues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!currentWorkspace?.id || !open) return;
    loadTargets();
  }, [currentWorkspace?.id, open]);

  async function loadTargets() {
    const now = new Date();
    const day = now.getDay();
    const monday = new Date(now);
    monday.setDate(now.getDate() - (day === 0 ? 6 : day - 1));
    const startDate = monday.toISOString().split("T")[0];

    const { data } = await supabase
      .from("performance_targets")
      .select("*")
      .eq("workspace_id", currentWorkspace!.id)
      .eq("period_type", "weekly")
      .lte("period_start", startDate)
      .gte("period_end", startDate);

    const map: Record<string, string> = {};
    (data || []).forEach((t: any) => { map[t.metric_type] = String(t.target_value); });
    setValues(map);
  }

  async function save() {
    if (!currentWorkspace?.id || !user?.id) return;
    setSaving(true);

    const now = new Date();
    const day = now.getDay();
    const monday = new Date(now);
    monday.setDate(now.getDate() - (day === 0 ? 6 : day - 1));
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);

    const periodStart = monday.toISOString().split("T")[0];
    const periodEnd = sunday.toISOString().split("T")[0];

    for (const key of ALL_SETTINGS_KEYS) {
      const val = Number(values[key] || 0);
      if (val <= 0) continue;

      await supabase
        .from("performance_targets")
        .delete()
        .eq("workspace_id", currentWorkspace.id)
        .eq("metric_type", key)
        .eq("period_type", "weekly")
        .eq("period_start", periodStart);

      await supabase.from("performance_targets").insert({
        workspace_id: currentWorkspace.id,
        metric_type: key,
        target_value: val,
        period_type: "weekly",
        period_start: periodStart,
        period_end: periodEnd,
        created_by: user.id,
      });
    }

    queryClient.invalidateQueries({ queryKey: ["workspace-metric-settings"] });
    toast.success(t("targetsUpdated"));
    setSaving(false);
    setOpen(false);
  }

  const renderInputGroup = (items: { key: string; labelKey: string }[]) =>
    items.map((mt) => (
      <div key={mt.key} className="space-y-1.5">
        <Label>{t(mt.labelKey)}</Label>
        <Input
          type="number"
          value={values[mt.key] || ""}
          onChange={(e) => setValues((v) => ({ ...v, [mt.key]: e.target.value }))}
          placeholder="0"
        />
      </div>
    ));

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Settings className="h-3.5 w-3.5" />
          {t("targets")}
        </Button>
      </SheetTrigger>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>{t("weeklyTargetsTitle")}</SheetTitle>
        </SheetHeader>
        <div className="space-y-4 mt-6">
          {renderInputGroup(metricTypeKeys)}

          <Collapsible>
            <CollapsibleTrigger className="flex items-center justify-between w-full py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              {t("conversionRatiosTitle")}
              <ChevronDown className="h-4 w-4" />
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-3 pt-2">
              {renderInputGroup(conversionKeys)}
            </CollapsibleContent>
          </Collapsible>

          <Collapsible>
            <CollapsibleTrigger className="flex items-center justify-between w-full py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              {t("healthWeightsTitle")}
              <ChevronDown className="h-4 w-4" />
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-3 pt-2">
              {renderInputGroup(healthKeys)}
            </CollapsibleContent>
          </Collapsible>

          <Button onClick={save} disabled={saving} className="w-full gap-2">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {t("saveTargets")}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
