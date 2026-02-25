import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Target, TrendingUp, Shield } from "lucide-react";
import { ENIContact } from "../ENIContactTypes";
import { useUpdateContactScores } from "@/hooks/useContactScores";
import { cn } from "@/lib/utils";

interface ContactScoresCardProps {
  contact: ENIContact;
  editable?: boolean;
}

function ScoreItem({
  label,
  icon: Icon,
  value,
  color,
  editable,
  onChange,
}: {
  label: string;
  icon: React.ElementType;
  value: number;
  color: string;
  editable?: boolean;
  onChange?: (v: number) => void;
}) {
  const [editing, setEditing] = useState(false);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon className={cn("h-4 w-4", color)} />
          <Label className="text-xs font-medium text-muted-foreground">{label}</Label>
        </div>
        {editable && editing ? (
          <Input
            type="number"
            min={0}
            max={100}
            className="h-6 w-16 text-xs text-right"
            defaultValue={value}
            autoFocus
            onBlur={(e) => {
              setEditing(false);
              const v = Math.max(0, Math.min(100, parseInt(e.target.value) || 0));
              if (v !== value) onChange?.(v);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") (e.target as HTMLInputElement).blur();
            }}
          />
        ) : (
          <span
            className={cn("text-sm font-semibold", editable && "cursor-pointer hover:underline")}
            onClick={() => editable && setEditing(true)}
          >
            {value}%
          </span>
        )}
      </div>
      <Progress value={value} className="h-2" />
    </div>
  );
}

export function ContactScoresCard({ contact, editable = false }: ContactScoresCardProps) {
  const updateScores = useUpdateContactScores();

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium">Scores</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <ScoreItem
          label="ICP Fit"
          icon={Target}
          value={contact.icp_fit_score ?? 0}
          color="text-blue-500"
          editable={editable}
          onChange={(v) => updateScores.mutate({ contactId: contact.id, scores: { icp_fit_score: v } })}
        />
        <ScoreItem
          label="Engagement"
          icon={TrendingUp}
          value={contact.engagement_score ?? 0}
          color="text-emerald-500"
          editable={editable}
          onChange={(v) => updateScores.mutate({ contactId: contact.id, scores: { engagement_score: v } })}
        />
        <ScoreItem
          label="PARE"
          icon={Shield}
          value={contact.pare_score ?? 0}
          color="text-amber-500"
          editable={editable}
          onChange={(v) => updateScores.mutate({ contactId: contact.id, scores: { pare_score: v } })}
        />
      </CardContent>
    </Card>
  );
}
