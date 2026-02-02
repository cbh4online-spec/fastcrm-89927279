import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CalendarDays,
  Plus,
  X,
  Clock,
  Flag,
  GripVertical,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface TimelinePhase {
  id: string;
  type: "phase" | "milestone";
  title: string;
  duration?: number; // in days, for phases
  week?: number; // for milestones
  description?: string;
}

export interface TimelineData {
  phases: TimelinePhase[];
  startDate?: string;
}

interface ProposalTimelineSectionProps {
  data: TimelineData;
  onChange: (data: TimelineData) => void;
  disabled?: boolean;
}

const generateId = () => Math.random().toString(36).substring(2, 9);

export function ProposalTimelineSection({
  data,
  onChange,
  disabled = false,
}: ProposalTimelineSectionProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const totalDuration = data.phases
    .filter((p) => p.type === "phase")
    .reduce((sum, p) => sum + (p.duration || 0), 0);

  const addPhase = () => {
    const newPhase: TimelinePhase = {
      id: generateId(),
      type: "phase",
      title: "",
      duration: 7,
      description: "",
    };
    onChange({
      ...data,
      phases: [...data.phases, newPhase],
    });
    setExpandedId(newPhase.id);
  };

  const addMilestone = () => {
    // Find last phase index without using findLastIndex (ES2023)
    let lastPhaseIndex = -1;
    for (let i = data.phases.length - 1; i >= 0; i--) {
      if (data.phases[i].type === "phase") {
        lastPhaseIndex = i;
        break;
      }
    }
    const cumulativeWeek = data.phases
      .slice(0, lastPhaseIndex + 1)
      .filter((p) => p.type === "phase")
      .reduce((sum, p) => sum + Math.ceil((p.duration || 0) / 7), 0);

    const newMilestone: TimelinePhase = {
      id: generateId(),
      type: "milestone",
      title: "",
      week: cumulativeWeek || 1,
    };
    onChange({
      ...data,
      phases: [...data.phases, newMilestone],
    });
    setExpandedId(newMilestone.id);
  };

  const updatePhase = (id: string, updates: Partial<TimelinePhase>) => {
    onChange({
      ...data,
      phases: data.phases.map((p) =>
        p.id === id ? { ...p, ...updates } : p
      ),
    });
  };

  const removePhase = (id: string) => {
    onChange({
      ...data,
      phases: data.phases.filter((p) => p.id !== id),
    });
    if (expandedId === id) setExpandedId(null);
  };

  const movePhase = (id: string, direction: "up" | "down") => {
    const index = data.phases.findIndex((p) => p.id === id);
    if (
      (direction === "up" && index === 0) ||
      (direction === "down" && index === data.phases.length - 1)
    ) {
      return;
    }

    const newPhases = [...data.phases];
    const swapIndex = direction === "up" ? index - 1 : index + 1;
    [newPhases[index], newPhases[swapIndex]] = [
      newPhases[swapIndex],
      newPhases[index],
    ];

    onChange({ ...data, phases: newPhases });
  };

  return (
    <div className="space-y-6">
      {/* Summary Card */}
      <Card className="bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <CalendarDays className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Duração Total</p>
                <p className="text-2xl font-bold">{totalDuration} dias</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="gap-1">
                <Clock className="h-3 w-3" />
                {Math.ceil(totalDuration / 7)} semanas
              </Badge>
              <Badge variant="outline" className="gap-1">
                <Flag className="h-3 w-3" />
                {data.phases.filter((p) => p.type === "milestone").length} marcos
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Timeline Visual */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-medium flex items-center justify-between">
            <span className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4" />
              Fases e Marcos
            </span>
            <div className="flex gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={addPhase}
                disabled={disabled}
              >
                <Plus className="h-4 w-4 mr-1" />
                Fase
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={addMilestone}
                disabled={disabled}
              >
                <Flag className="h-4 w-4 mr-1" />
                Marco
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {data.phases.length > 0 ? (
            <div className="relative">
              {/* Timeline line */}
              <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-border" />

              <div className="space-y-3">
                {data.phases.map((phase, index) => {
                  const isExpanded = expandedId === phase.id;
                  const isPhase = phase.type === "phase";

                  return (
                    <div
                      key={phase.id}
                      className={cn(
                        "relative pl-12",
                        "transition-all duration-200"
                      )}
                    >
                      {/* Timeline node */}
                      <div
                        className={cn(
                          "absolute left-3 top-4 w-4 h-4 rounded-full border-2 z-10",
                          isPhase
                            ? "bg-primary border-primary"
                            : "bg-amber-500 border-amber-500"
                        )}
                      >
                        {!isPhase && (
                          <Flag className="h-2.5 w-2.5 text-white absolute top-0.5 left-0.5" />
                        )}
                      </div>

                      {/* Phase/Milestone card */}
                      <div
                        className={cn(
                          "border rounded-lg p-3 bg-card transition-all",
                          isExpanded && "ring-2 ring-primary/20"
                        )}
                      >
                        {/* Header */}
                        <div className="flex items-center gap-2">
                          {!disabled && (
                            <div className="flex flex-col gap-0.5">
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-5 w-5"
                                onClick={() => movePhase(phase.id, "up")}
                                disabled={index === 0}
                              >
                                <ChevronUp className="h-3 w-3" />
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-5 w-5"
                                onClick={() => movePhase(phase.id, "down")}
                                disabled={index === data.phases.length - 1}
                              >
                                <ChevronDown className="h-3 w-3" />
                              </Button>
                            </div>
                          )}

                          <div className="flex-1 min-w-0">
                            <Input
                              value={phase.title}
                              onChange={(e) =>
                                updatePhase(phase.id, { title: e.target.value })
                              }
                              placeholder={
                                isPhase ? "Nome da fase..." : "Nome do marco..."
                              }
                              disabled={disabled}
                              className="font-medium border-0 p-0 h-auto focus-visible:ring-0 bg-transparent"
                            />
                          </div>

                          <div className="flex items-center gap-2">
                            <Badge
                              variant={isPhase ? "default" : "secondary"}
                              className="shrink-0"
                            >
                              {isPhase
                                ? `${phase.duration || 0} dias`
                                : `Semana ${phase.week || 1}`}
                            </Badge>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() =>
                                setExpandedId(isExpanded ? null : phase.id)
                              }
                            >
                              {isExpanded ? (
                                <ChevronUp className="h-4 w-4" />
                              ) : (
                                <ChevronDown className="h-4 w-4" />
                              )}
                            </Button>
                            {!disabled && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-destructive"
                                onClick={() => removePhase(phase.id)}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </div>

                        {/* Expanded content */}
                        {isExpanded && (
                          <div className="mt-4 pt-4 border-t space-y-4">
                            {isPhase ? (
                              <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                  <Label>Duração (dias)</Label>
                                  <Input
                                    type="number"
                                    min={1}
                                    value={phase.duration || 7}
                                    onChange={(e) =>
                                      updatePhase(phase.id, {
                                        duration: parseInt(e.target.value) || 1,
                                      })
                                    }
                                    disabled={disabled}
                                  />
                                </div>
                                <div className="space-y-2">
                                  <Label>Descrição</Label>
                                  <Textarea
                                    value={phase.description || ""}
                                    onChange={(e) =>
                                      updatePhase(phase.id, {
                                        description: e.target.value,
                                      })
                                    }
                                    placeholder="Actividades desta fase..."
                                    disabled={disabled}
                                    rows={2}
                                    className="resize-none"
                                  />
                                </div>
                              </div>
                            ) : (
                              <div className="space-y-2">
                                <Label>Semana do Marco</Label>
                                <Select
                                  value={String(phase.week || 1)}
                                  onValueChange={(v) =>
                                    updatePhase(phase.id, {
                                      week: parseInt(v),
                                    })
                                  }
                                  disabled={disabled}
                                >
                                  <SelectTrigger className="w-32">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {Array.from(
                                      { length: Math.max(12, Math.ceil(totalDuration / 7) + 2) },
                                      (_, i) => i + 1
                                    ).map((week) => (
                                      <SelectItem key={week} value={String(week)}>
                                        Semana {week}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-lg text-muted-foreground">
              <CalendarDays className="h-8 w-8 mb-2 opacity-50" />
              <p className="text-sm">Nenhuma fase ou marco definido</p>
              <p className="text-xs mt-1">
                Adicione fases para criar o cronograma do projecto
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
