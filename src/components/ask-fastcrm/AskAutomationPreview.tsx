import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Zap, Pencil, Check, X, Receipt, Users, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import type { AutomationPreview } from "@/hooks/useAskFastCRM";

interface Props {
  preview: AutomationPreview;
  onConfirm: (preview: AutomationPreview) => void;
  onCancel: () => void;
  isConfirming?: boolean;
}

const OBJECT_TYPE_CONFIG = {
  deal: { label: "Deal", icon: TrendingUp, color: "text-blue-600 bg-blue-500/10 border-blue-500/30" },
  contact: { label: "Contact", icon: Users, color: "text-emerald-600 bg-emerald-500/10 border-emerald-500/30" },
  invoice: { label: "Invoice", icon: Receipt, color: "text-amber-600 bg-amber-500/10 border-amber-500/30" },
};

export function AskAutomationPreview({ preview, onConfirm, onCancel, isConfirming }: Props) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedPreview, setEditedPreview] = useState<AutomationPreview>(preview);

  const currentPreview = isEditing ? editedPreview : preview;
  const objectType = currentPreview.object_type || "deal";
  const objectConfig = OBJECT_TYPE_CONFIG[objectType];
  const ObjectIcon = objectConfig.icon;

  const handleConfirm = () => {
    onConfirm(currentPreview);
  };

  const updateTriggerConfig = (key: string, value: string | number) => {
    setEditedPreview((prev) => ({
      ...prev,
      trigger_config: { ...prev.trigger_config, [key]: value },
    }));
  };

  const updateActionConfig = (actionIndex: number, key: string, value: string | number) => {
    setEditedPreview((prev) => {
      const actions = [...prev.actions];
      actions[actionIndex] = {
        ...actions[actionIndex],
        config: { ...actions[actionIndex].config, [key]: value },
      };
      return { ...prev, actions };
    });
  };

  const updateConditionValue = (condIndex: number, value: string) => {
    setEditedPreview((prev) => {
      const conditions = [...prev.conditions];
      conditions[condIndex] = { ...conditions[condIndex], value };
      return { ...prev, conditions };
    });
  };

  const renderTriggerEdit = () => {
    const trigger = currentPreview.trigger;
    const config = currentPreview.trigger_config || {};

    if (trigger === "lead_no_response" || trigger === "contact_no_activity") {
      return (
        <div className="flex items-center gap-2">
          <span className="text-sm text-foreground">No activity for</span>
          <Input type="number" className="w-16 h-7 text-sm" value={config.delay_days ?? 7}
            onChange={(e) => updateTriggerConfig("delay_days", parseInt(e.target.value) || 7)} min={1} max={90} />
          <span className="text-sm text-foreground">days</span>
        </div>
      );
    }
    if (trigger === "opportunity_stage_changed") {
      return (
        <div className="flex items-center gap-2">
          <span className="text-sm text-foreground">Deal enters stage</span>
          <Input className="w-32 h-7 text-sm" value={config.stage_name ?? ""}
            onChange={(e) => updateTriggerConfig("stage_name", e.target.value)} placeholder="Stage name" />
        </div>
      );
    }
    if (trigger === "invoice_overdue") {
      return (
        <div className="flex items-center gap-2">
          <span className="text-sm text-foreground">Overdue by more than</span>
          <Input type="number" className="w-16 h-7 text-sm" value={config.days_overdue ?? 3}
            onChange={(e) => updateTriggerConfig("days_overdue", parseInt(e.target.value) || 3)} min={1} max={90} />
          <span className="text-sm text-foreground">days</span>
        </div>
      );
    }
    if (trigger === "due_date_approaching") {
      return (
        <div className="flex items-center gap-2">
          <span className="text-sm text-foreground">Due date in</span>
          <Input type="number" className="w-16 h-7 text-sm" value={config.days_before_due ?? 3}
            onChange={(e) => updateTriggerConfig("days_before_due", parseInt(e.target.value) || 3)} min={1} max={30} />
          <span className="text-sm text-foreground">days</span>
        </div>
      );
    }
    if (trigger === "invoice_status_changed") {
      return (
        <div className="flex items-center gap-2">
          <span className="text-sm text-foreground">Status changes to</span>
          <Select value={String(config.status ?? "")} onValueChange={(v) => updateTriggerConfig("status", v)}>
            <SelectTrigger className="w-28 h-7 text-sm"><SelectValue placeholder="Select" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="paid">Paid</SelectItem>
              <SelectItem value="overdue">Overdue</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
            </SelectContent>
          </Select>
        </div>
      );
    }
    // Default: show label
    return <p className="text-sm text-foreground">{currentPreview.trigger_label}</p>;
  };

  const renderActionEdit = (action: { action_type: string; config: Record<string, any> }, i: number) => {
    switch (action.action_type) {
      case "create_task":
        return (
          <>
            <div className="flex items-center gap-2">
              <span className="text-sm text-foreground">Create task:</span>
              <Input className="flex-1 h-7 text-sm" value={action.config?.title ?? ""}
                onChange={(e) => updateActionConfig(i, "title", e.target.value)} placeholder="Task title" />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Due in</span>
              <Input type="number" className="w-14 h-7 text-sm" value={action.config?.due_in_days ?? 3}
                onChange={(e) => updateActionConfig(i, "due_in_days", parseInt(e.target.value) || 3)} min={1} max={90} />
              <span className="text-xs text-muted-foreground">days</span>
              <Select value={String(action.config?.priority ?? "medium")} onValueChange={(v) => updateActionConfig(i, "priority", v)}>
                <SelectTrigger className="w-24 h-7 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </>
        );
      case "notify_user":
      case "send_overdue_alert":
        return (
          <div className="flex items-center gap-2">
            <span className="text-sm text-foreground">{action.action_type === "send_overdue_alert" ? "Alert:" : "Notify:"}</span>
            <Input className="flex-1 h-7 text-sm" value={action.config?.message ?? ""}
              onChange={(e) => updateActionConfig(i, "message", e.target.value)} placeholder="Message" />
          </div>
        );
      case "move_opportunity_stage":
        return (
          <div className="flex items-center gap-2">
            <span className="text-sm text-foreground">Move to stage:</span>
            <Input className="w-32 h-7 text-sm" value={action.config?.stage_name ?? ""}
              onChange={(e) => updateActionConfig(i, "stage_name", e.target.value)} placeholder="Stage name" />
          </div>
        );
      case "assign_owner":
        return (
          <div className="flex items-center gap-2">
            <span className="text-sm text-foreground">Assign:</span>
            <Input className="flex-1 h-7 text-sm" value={action.config?.message ?? ""}
              onChange={(e) => updateActionConfig(i, "message", e.target.value)} placeholder="Assignment rule" />
          </div>
        );
      case "mark_as_at_risk":
        return <p className="text-sm text-foreground">Mark as at risk</p>;
      default:
        return <p className="text-sm text-foreground">{action.action_type}</p>;
    }
  };

  return (
    <motion.div
      className="space-y-4"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
    >
      {/* Header */}
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-md bg-primary/10 flex items-center justify-center">
          <Zap className="h-3.5 w-3.5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground">
            {currentPreview.name}
          </p>
          <p className="text-xs text-muted-foreground">
            New automation rule
          </p>
        </div>
        <Badge variant="outline" className={cn("text-[10px] gap-1 shrink-0", objectConfig.color)}>
          <ObjectIcon className="h-3 w-3" />
          {objectConfig.label}
        </Badge>
      </div>

      {/* When / If / Then blocks */}
      <div className="space-y-2.5">
        {/* WHEN */}
        <div className="rounded-lg border border-border/60 bg-muted/20 p-3">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
            When
          </p>
          {isEditing ? renderTriggerEdit() : (
            <p className="text-sm text-foreground">{currentPreview.trigger_label}</p>
          )}
        </div>

        {/* IF (conditions) */}
        {currentPreview.conditions.length > 0 && (
          <div className="rounded-lg border border-border/60 bg-muted/20 p-3">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
              If
            </p>
            <div className="space-y-1.5">
              {isEditing ? (
                currentPreview.conditions.map((cond, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="text-sm text-foreground capitalize">{cond.field_name}</span>
                    <span className="text-xs text-muted-foreground">{cond.operator.replace("_", " ")}</span>
                    <Input className="w-24 h-7 text-sm" value={cond.value ?? ""}
                      onChange={(e) => updateConditionValue(i, e.target.value)} />
                  </div>
                ))
              ) : (
                currentPreview.conditions_labels.map((label, i) => (
                  <p key={i} className="text-sm text-foreground">{label}</p>
                ))
              )}
            </div>
          </div>
        )}

        {/* THEN (actions) */}
        <div className="rounded-lg border border-border/60 bg-muted/20 p-3">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
            Then
          </p>
          <div className="space-y-1.5">
            {isEditing ? (
              currentPreview.actions.map((action, i) => (
                <div key={i} className="space-y-1.5">
                  {renderActionEdit(action, i)}
                </div>
              ))
            ) : (
              currentPreview.actions_labels.map((label, i) => (
                <p key={i} className="text-sm text-foreground">{label}</p>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-2">
        {isEditing ? (
          <Button size="sm" variant="outline" onClick={() => setIsEditing(false)} className="gap-1.5">
            <Check className="h-3.5 w-3.5" />
            Done editing
          </Button>
        ) : (
          <Button size="sm" variant="outline" onClick={() => { setEditedPreview(preview); setIsEditing(true); }} className="gap-1.5">
            <Pencil className="h-3.5 w-3.5" />
            Edit
          </Button>
        )}
        <Button size="sm" onClick={handleConfirm} disabled={isConfirming} className="gap-1.5">
          <Zap className="h-3.5 w-3.5" />
          {isConfirming ? "Activating…" : "Confirm & Activate"}
        </Button>
        <Button size="sm" variant="ghost" onClick={onCancel} disabled={isConfirming} className="gap-1.5">
          <X className="h-3.5 w-3.5" />
          Cancel
        </Button>
      </div>
    </motion.div>
  );
}
