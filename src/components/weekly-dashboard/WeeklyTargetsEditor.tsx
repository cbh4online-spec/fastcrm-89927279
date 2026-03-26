import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Target, DollarSign, Users, Calendar, FileText, TrendingUp } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

interface TargetField {
  key: string;
  label: string;
  icon: React.ElementType;
  type: "currency" | "number";
  placeholder: string;
}

const TARGET_FIELDS: TargetField[] = [
  { key: "revenue", label: "Receita (€)", icon: DollarSign, type: "currency", placeholder: "ex: 2000" },
  { key: "leads", label: "Leads", icon: Users, type: "number", placeholder: "ex: 10" },
  { key: "meetings", label: "Reuniões", icon: Calendar, type: "number", placeholder: "ex: 5" },
  { key: "proposals", label: "Propostas", icon: FileText, type: "number", placeholder: "ex: 3" },
  { key: "deals", label: "Deals Fechados", icon: TrendingUp, type: "number", placeholder: "ex: 2" },
];

function getWeekBounds() {
  const now = new Date();
  const day = now.getDay();
  const monday = new Date(now);
  monday.setDate(now.getDate() - (day === 0 ? 6 : day - 1));
  monday.setHours(0, 0, 0, 0);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);
  return {
    start: monday.toISOString().split("T")[0],
    end: sunday.toISOString().split("T")[0],
    label: `${monday.getDate()}/${monday.getMonth() + 1} — ${sunday.getDate()}/${sunday.getMonth() + 1}`,
  };
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function WeeklyTargetsEditor({ open, onOpenChange }: Props) {
  const { currentWorkspace } = useWorkspace();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [values, setValues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const week = getWeekBounds();

  // Load existing targets for this week
  useEffect(() => {
    if (!open || !currentWorkspace?.id) return;
    setLoading(true);
    supabase
      .from("performance_targets")
      .select("metric_type, target_value")
      .eq("workspace_id", currentWorkspace.id)
      .eq("period_type", "weekly")
      .lte("period_start", week.start)
      .gte("period_end", week.start)
      .then(({ data }) => {
        const vals: Record<string, string> = {};
        (data || []).forEach((t: any) => {
          vals[t.metric_type] = String(t.target_value);
        });
        setValues(vals);
        setLoading(false);
      });
  }, [open, currentWorkspace?.id]);

  const handleSave = async () => {
    if (!currentWorkspace?.id || !user?.id) return;
    setSaving(true);

    try {
      // Delete existing targets for this week
      await supabase
        .from("performance_targets")
        .delete()
        .eq("workspace_id", currentWorkspace.id)
        .eq("period_type", "weekly")
        .lte("period_start", week.start)
        .gte("period_end", week.start);

      // Insert new targets
      const inserts = TARGET_FIELDS
        .filter((f) => values[f.key] && Number(values[f.key]) > 0)
        .map((f) => ({
          workspace_id: currentWorkspace.id,
          metric_type: f.key,
          target_value: Number(values[f.key]),
          period_type: "weekly",
          period_start: week.start,
          period_end: week.end,
          created_by: user.id,
        }));

      if (inserts.length > 0) {
        const { error } = await supabase.from("performance_targets").insert(inserts);
        if (error) throw error;
      }

      queryClient.invalidateQueries({ queryKey: ["weekly-performance"] });
      toast.success("Metas semanais atualizadas!");
      onOpenChange(false);
    } catch (err) {
      console.error(err);
      toast.error("Erro ao guardar metas");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            Metas Semanais
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            Semana {week.label}
          </p>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {TARGET_FIELDS.map((field) => {
            const Icon = field.icon;
            return (
              <div key={field.key} className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <Icon className="h-4 w-4 text-primary" />
                </div>
                <div className="flex-1 space-y-1">
                  <Label htmlFor={field.key} className="text-xs font-medium">
                    {field.label}
                  </Label>
                  <Input
                    id={field.key}
                    type="number"
                    min={0}
                    placeholder={field.placeholder}
                    value={values[field.key] || ""}
                    onChange={(e) => setValues((v) => ({ ...v, [field.key]: e.target.value }))}
                    disabled={loading}
                  />
                </div>
              </div>
            );
          })}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "A guardar..." : "Guardar metas"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
