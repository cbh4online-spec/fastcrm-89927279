import { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Save, Loader2 } from "lucide-react";
import type { SDRCampaign } from "@/hooks/useSDRCampaigns";

interface SDRCampaignSettingsProps {
  campaign: SDRCampaign;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (updates: Partial<SDRCampaign>) => void;
  saving?: boolean;
}

export function SDRCampaignSettings({
  campaign,
  open,
  onOpenChange,
  onSave,
  saving,
}: SDRCampaignSettingsProps) {
  const [name, setName] = useState(campaign.name);
  const [description, setDescription] = useState(campaign.description || "");
  const [autoEnroll, setAutoEnroll] = useState(campaign.auto_enroll_enabled);
  const [minScore, setMinScore] = useState(campaign.auto_enroll_min_score ?? 70);

  useEffect(() => {
    setName(campaign.name);
    setDescription(campaign.description || "");
    setAutoEnroll(campaign.auto_enroll_enabled);
    setMinScore(campaign.auto_enroll_min_score ?? 70);
  }, [campaign]);

  const handleSave = () => {
    onSave({
      id: campaign.id,
      name: name.trim(),
      description: description.trim() || null,
      auto_enroll_enabled: autoEnroll,
      auto_enroll_min_score: autoEnroll ? minScore : null,
    } as any);
  };

  const hasChanges =
    name !== campaign.name ||
    description !== (campaign.description || "") ||
    autoEnroll !== campaign.auto_enroll_enabled ||
    minScore !== (campaign.auto_enroll_min_score ?? 70);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Configurações da Campanha</SheetTitle>
        </SheetHeader>

        <div className="space-y-6 py-6">
          {/* Basic info */}
          <div className="space-y-3">
            <div>
              <Label htmlFor="camp-name">Nome</Label>
              <Input
                id="camp-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="camp-desc">Descrição</Label>
              <Textarea
                id="camp-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="mt-1"
                placeholder="Objectivo e público-alvo..."
              />
            </div>
          </div>

          <Separator />

          {/* Auto-enroll */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <Label>Auto-enroll</Label>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Inscrever automaticamente prospects com score elevado
                </p>
              </div>
              <Switch checked={autoEnroll} onCheckedChange={setAutoEnroll} />
            </div>
            {autoEnroll && (
              <div>
                <Label htmlFor="min-score">Score mínimo</Label>
                <Input
                  id="min-score"
                  type="number"
                  min={0}
                  max={100}
                  value={minScore}
                  onChange={(e) => setMinScore(Number(e.target.value))}
                  className="mt-1 w-28"
                />
                <p className="text-[11px] text-muted-foreground mt-1">
                  Prospects com score ≥ {minScore} são inscritos automaticamente
                </p>
              </div>
            )}
          </div>

          <Separator />

          {/* Stats summary */}
          <div className="space-y-2">
            <Label>Métricas</Label>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="p-3 rounded-lg bg-muted/50">
                <p className="text-lg font-bold">{campaign.total_enrolled}</p>
                <p className="text-xs text-muted-foreground">Enrolled</p>
              </div>
              <div className="p-3 rounded-lg bg-muted/50">
                <p className="text-lg font-bold">{campaign.total_replied}</p>
                <p className="text-xs text-muted-foreground">Replies</p>
              </div>
              <div className="p-3 rounded-lg bg-muted/50">
                <p className="text-lg font-bold">{campaign.total_meetings}</p>
                <p className="text-xs text-muted-foreground">Reuniões</p>
              </div>
              <div className="p-3 rounded-lg bg-muted/50">
                <p className="text-lg font-bold">{campaign.total_converted}</p>
                <p className="text-xs text-muted-foreground">Convertidos</p>
              </div>
            </div>
          </div>
        </div>

        <SheetFooter>
          <Button
            onClick={handleSave}
            disabled={!hasChanges || saving || !name.trim()}
            className="w-full"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Guardar
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
