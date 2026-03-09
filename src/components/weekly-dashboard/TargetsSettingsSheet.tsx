import { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Settings, Save, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

const metricTypes = [
  { key: "revenue", label: "Receita (€)" },
  { key: "leads", label: "Leads" },
  { key: "meetings", label: "Reuniões" },
  { key: "proposals", label: "Propostas" },
  { key: "deals", label: "Deals Fechados" },
];

export function TargetsSettingsSheet() {
  const { currentWorkspace } = useWorkspace();
  const { user } = useAuth();
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

    for (const mt of metricTypes) {
      const val = Number(values[mt.key] || 0);
      if (val <= 0) continue;

      // Upsert: delete existing then insert
      await supabase
        .from("performance_targets")
        .delete()
        .eq("workspace_id", currentWorkspace.id)
        .eq("metric_type", mt.key)
        .eq("period_type", "weekly")
        .eq("period_start", periodStart);

      await supabase.from("performance_targets").insert({
        workspace_id: currentWorkspace.id,
        metric_type: mt.key,
        target_value: val,
        period_type: "weekly",
        period_start: periodStart,
        period_end: periodEnd,
        created_by: user.id,
      });
    }

    toast.success("Metas semanais atualizadas");
    setSaving(false);
    setOpen(false);
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Settings className="h-3.5 w-3.5" />
          Metas
        </Button>
      </SheetTrigger>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Metas Semanais</SheetTitle>
        </SheetHeader>
        <div className="space-y-4 mt-6">
          {metricTypes.map((mt) => (
            <div key={mt.key} className="space-y-1.5">
              <Label>{mt.label}</Label>
              <Input
                type="number"
                value={values[mt.key] || ""}
                onChange={(e) => setValues((v) => ({ ...v, [mt.key]: e.target.value }))}
                placeholder="0"
              />
            </div>
          ))}
          <Button onClick={save} disabled={saving} className="w-full gap-2">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Guardar Metas
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
