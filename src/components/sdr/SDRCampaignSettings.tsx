import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Save, Loader2, Plus, Trash2, Sparkles, Copy } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import type { SDRCampaign } from "@/hooks/useSDRCampaigns";
import { toast } from "sonner";

interface ABVariant {
  name: string;
  weight: number;
}

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
  const { currentWorkspace } = useWorkspace();
  const [name, setName] = useState(campaign.name);
  const [description, setDescription] = useState(campaign.description || "");
  const [autoEnroll, setAutoEnroll] = useState(campaign.auto_enroll_enabled);
  const [minScore, setMinScore] = useState(campaign.auto_enroll_min_score ?? 70);
  const [sequenceId, setSequenceId] = useState(campaign.sequence_id || "none");
  const [abVariants, setAbVariants] = useState<ABVariant[]>(() => {
    const cfg = campaign.ab_testing_config as any;
    return cfg?.variants || [{ name: "A", weight: 100 }];
  });

  // Fetch available sequences
  const { data: sequences = [] } = useQuery({
    queryKey: ["sdr-sequences-list", currentWorkspace?.id],
    queryFn: async () => {
      if (!currentWorkspace?.id) return [];
      const { data, error } = await supabase
        .from("multichannel_sequences")
        .select("id, name, status, channels")
        .eq("workspace_id", currentWorkspace.id)
        .order("name");
      if (error) throw error;
      return data as { id: string; name: string; status: string; channels: string[] }[];
    },
    enabled: !!currentWorkspace?.id && open,
  });

  useEffect(() => {
    setName(campaign.name);
    setDescription(campaign.description || "");
    setAutoEnroll(campaign.auto_enroll_enabled);
    setMinScore(campaign.auto_enroll_min_score ?? 70);
    setSequenceId(campaign.sequence_id || "none");
    const cfg = campaign.ab_testing_config as any;
    setAbVariants(cfg?.variants || [{ name: "A", weight: 100 }]);
  }, [campaign]);

  const addVariant = () => {
    const nextLetter = String.fromCharCode(65 + abVariants.length); // A, B, C...
    const newWeight = Math.floor(100 / (abVariants.length + 1));
    const updated = abVariants.map((v) => ({ ...v, weight: newWeight }));
    updated.push({ name: nextLetter, weight: 100 - newWeight * abVariants.length });
    setAbVariants(updated);
  };

  const removeVariant = (index: number) => {
    if (abVariants.length <= 1) return;
    const updated = abVariants.filter((_, i) => i !== index);
    const perWeight = Math.floor(100 / updated.length);
    const rebalanced = updated.map((v, i) => ({
      ...v,
      weight: i === updated.length - 1 ? 100 - perWeight * (updated.length - 1) : perWeight,
    }));
    setAbVariants(rebalanced);
  };

  const updateVariantWeight = (index: number, weight: number) => {
    const updated = [...abVariants];
    updated[index] = { ...updated[index], weight: Math.max(0, Math.min(100, weight)) };
    setAbVariants(updated);
  };

  const handleSave = () => {
    onSave({
      id: campaign.id,
      name: name.trim(),
      description: description.trim() || null,
      auto_enroll_enabled: autoEnroll,
      auto_enroll_min_score: autoEnroll ? minScore : null,
      sequence_id: sequenceId === "none" ? null : sequenceId,
      ab_testing_config: { variants: abVariants } as any,
    } as any);
  };

  const origCfg = campaign.ab_testing_config as any;
  const hasChanges =
    name !== campaign.name ||
    description !== (campaign.description || "") ||
    autoEnroll !== campaign.auto_enroll_enabled ||
    minScore !== (campaign.auto_enroll_min_score ?? 70) ||
    sequenceId !== (campaign.sequence_id || "none") ||
    JSON.stringify(abVariants) !== JSON.stringify(origCfg?.variants || [{ name: "A", weight: 100 }]);

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
              <Input id="camp-name" value={name} onChange={(e) => setName(e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label htmlFor="camp-desc">Descrição</Label>
              <Textarea id="camp-desc" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className="mt-1" placeholder="Objectivo e público-alvo..." />
            </div>
          </div>

          <Separator />

          {/* Sequence selector */}
          <div className="space-y-2">
            <Label>Sequência Multi-Canal</Label>
            <Select value={sequenceId} onValueChange={setSequenceId}>
              <SelectTrigger>
                <SelectValue placeholder="Sem sequência" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sem sequência</SelectItem>
                {sequences.map((seq) => (
                  <SelectItem key={seq.id} value={seq.id}>
                    <span className="flex items-center gap-2">
                      {seq.name}
                      <Badge variant={seq.status === "active" ? "default" : "secondary"} className="text-[10px] ml-1">
                        {seq.status}
                      </Badge>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-[11px] text-muted-foreground">
              Associe uma sequência para automação de envios multi-canal
            </p>
          </div>

          <Separator />

          {/* Auto-enroll */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <Label>Auto-enroll</Label>
                <p className="text-xs text-muted-foreground mt-0.5">Inscrever automaticamente prospects com score elevado</p>
              </div>
              <Switch checked={autoEnroll} onCheckedChange={setAutoEnroll} />
            </div>
            {autoEnroll && (
              <div>
                <Label htmlFor="min-score">Score mínimo</Label>
                <Input id="min-score" type="number" min={0} max={100} value={minScore} onChange={(e) => setMinScore(Number(e.target.value))} className="mt-1 w-28" />
              </div>
            )}
          </div>

          <Separator />

          {/* A/B Testing */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <Label>A/B Testing</Label>
                <p className="text-xs text-muted-foreground mt-0.5">Defina variantes para testar mensagens diferentes</p>
              </div>
              {abVariants.length < 4 && (
                <Button variant="outline" size="sm" className="h-7 text-xs" onClick={addVariant}>
                  <Plus className="h-3 w-3 mr-1" /> Variante
                </Button>
              )}
            </div>
            <div className="space-y-2">
              {abVariants.map((v, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Badge variant="outline" className="w-8 justify-center text-xs">{v.name}</Badge>
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    value={v.weight}
                    onChange={(e) => updateVariantWeight(i, Number(e.target.value))}
                    className="w-20 h-8 text-sm"
                  />
                  <span className="text-xs text-muted-foreground">%</span>
                  {abVariants.length > 1 && (
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeVariant(i)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              ))}
              {abVariants.reduce((s, v) => s + v.weight, 0) !== 100 && (
                <p className="text-[11px] text-destructive">Os pesos devem somar 100%</p>
              )}
            </div>
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
          <Button onClick={handleSave} disabled={!hasChanges || saving || !name.trim()} className="w-full">
            {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
            Guardar
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
