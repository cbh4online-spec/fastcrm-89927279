import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Zap, Pencil, Check, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import type { AutomationPreview } from "@/hooks/useAskFastCRM";

interface Props {
  preview: AutomationPreview;
  onConfirm: (preview: AutomationPreview) => void;
  onCancel: () => void;
  isConfirming?: boolean;
}

export function AskAutomationPreview({ preview, onConfirm, onCancel, isConfirming }: Props) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedPreview, setEditedPreview] = useState<AutomationPreview>(preview);

  const currentPreview = isEditing ? editedPreview : preview;

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
        <div>
          <p className="text-sm font-semibold text-foreground">
            {currentPreview.name}
          </p>
          <p className="text-xs text-muted-foreground">
            New automation rule
          </p>
        </div>
      </div>

      {/* When / If / Then blocks */}
      <div className="space-y-2.5">
        {/* WHEN */}
        <div className="rounded-lg border border-border/60 bg-muted/20 p-3">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
            When
          </p>
          {isEditing && currentPreview.trigger === "lead_no_response" ? (
            <div className="flex items-center gap-2">
              <span className="text-sm text-foreground">No activity for</span>
              <Input
                type="number"
                className="w-16 h-7 text-sm"
                value={currentPreview.trigger_config?.delay_days ?? 7}
                onChange={(e) => updateTriggerConfig("delay_days", parseInt(e.target.value) || 7)}
                min={1}
                max={90}
              />
              <span className="text-sm text-foreground">days</span>
            </div>
          ) : isEditing && currentPreview.trigger === "opportunity_stage_changed" ? (
            <div className="flex items-center gap-2">
              <span className="text-sm text-foreground">Deal enters stage</span>
              <Input
                className="w-32 h-7 text-sm"
                value={currentPreview.trigger_config?.stage_name ?? ""}
                onChange={(e) => updateTriggerConfig("stage_name", e.target.value)}
                placeholder="Stage name"
              />
            </div>
          ) : (
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
                    <Input
                      className="w-24 h-7 text-sm"
                      value={cond.value ?? ""}
                      onChange={(e) => updateConditionValue(i, e.target.value)}
                    />
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
                  {action.action_type === "create_task" && (
                    <>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-foreground">Create task:</span>
                        <Input
                          className="flex-1 h-7 text-sm"
                          value={action.config?.title ?? ""}
                          onChange={(e) => updateActionConfig(i, "title", e.target.value)}
                          placeholder="Task title"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">Due in</span>
                        <Input
                          type="number"
                          className="w-14 h-7 text-sm"
                          value={action.config?.due_in_days ?? 3}
                          onChange={(e) => updateActionConfig(i, "due_in_days", parseInt(e.target.value) || 3)}
                          min={1}
                          max={90}
                        />
                        <span className="text-xs text-muted-foreground">days</span>
                        <Select
                          value={String(action.config?.priority ?? "medium")}
                          onValueChange={(v) => updateActionConfig(i, "priority", v)}
                        >
                          <SelectTrigger className="w-24 h-7 text-sm">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="high">High</SelectItem>
                            <SelectItem value="medium">Medium</SelectItem>
                            <SelectItem value="low">Low</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </>
                  )}
                  {action.action_type === "notify_user" && (
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-foreground">Notify:</span>
                      <Input
                        className="flex-1 h-7 text-sm"
                        value={action.config?.message ?? ""}
                        onChange={(e) => updateActionConfig(i, "message", e.target.value)}
                        placeholder="Notification message"
                      />
                    </div>
                  )}
                  {action.action_type === "move_opportunity_stage" && (
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-foreground">Move to stage:</span>
                      <Input
                        className="w-32 h-7 text-sm"
                        value={action.config?.stage_name ?? ""}
                        onChange={(e) => updateActionConfig(i, "stage_name", e.target.value)}
                        placeholder="Stage name"
                      />
                    </div>
                  )}
                  {action.action_type === "assign_owner" && (
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-foreground">Assign:</span>
                      <Input
                        className="flex-1 h-7 text-sm"
                        value={action.config?.message ?? ""}
                        onChange={(e) => updateActionConfig(i, "message", e.target.value)}
                        placeholder="Assignment rule"
                      />
                    </div>
                  )}
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
          <>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setIsEditing(false)}
              className="gap-1.5"
            >
              <Check className="h-3.5 w-3.5" />
              Done editing
            </Button>
          </>
        ) : (
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setEditedPreview(preview);
              setIsEditing(true);
            }}
            className="gap-1.5"
          >
            <Pencil className="h-3.5 w-3.5" />
            Edit
          </Button>
        )}
        <Button
          size="sm"
          onClick={handleConfirm}
          disabled={isConfirming}
          className="gap-1.5"
        >
          <Zap className="h-3.5 w-3.5" />
          {isConfirming ? "Activating…" : "Confirm & Activate"}
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={onCancel}
          disabled={isConfirming}
          className="gap-1.5"
        >
          <X className="h-3.5 w-3.5" />
          Cancel
        </Button>
      </div>
    </motion.div>
  );
}
