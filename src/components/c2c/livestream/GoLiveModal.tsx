import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Radio, Calendar, Loader2 } from "lucide-react";
import { useCreateLivestream, useGoLive } from "@/hooks/c2c/useLivestreams";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** When used outside dashboard, pass workspaceId directly */
  workspaceId?: string;
  /** When used outside dashboard, pass workspaceSlug for public URL redirect */
  workspaceSlug?: string;
  /** If true, only shows "Go Live Now" without schedule option */
  simplified?: boolean;
}

export function GoLiveModal({ open, onOpenChange, workspaceId, workspaceSlug, simplified }: Props) {
  const workspaceCtx = useWorkspace();
  const navigate = useNavigate();
  const createLive = useCreateLivestream();
  const goLive = useGoLive();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [mode, setMode] = useState<"now" | "schedule">("now");
  const [scheduledAt, setScheduledAt] = useState("");

  const resolvedWorkspaceId = workspaceId || workspaceCtx?.currentWorkspace?.id;

  const handleSubmit = async () => {
    if (!title.trim() || !resolvedWorkspaceId) return;

    try {
      const live = await createLive.mutateAsync({
        workspace_id: resolvedWorkspaceId,
        title: title.trim(),
        description: description.trim() || undefined,
        category: category.trim() || undefined,
        scheduled_at: mode === "schedule" ? scheduledAt : undefined,
      });

      if (mode === "now") {
        onOpenChange(false);
        resetForm();
        // If we have a public slug, redirect to public setup
        if (workspaceSlug) {
          navigate(`/marketplace/${workspaceSlug}/go-live`);
        } else {
          toast.info("Prepara a tua câmara antes de entrar em direto");
          window.location.href = `/dashboard/marketplace/lives/setup`;
        }
        return;
      } else {
        toast.success("Live agendada com sucesso!");
      }

      onOpenChange(false);
      resetForm();
    } catch {
      toast.error("Erro ao criar a live");
    }
  };

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setCategory("");
    setMode("now");
    setScheduledAt("");
  };

  const isLoading = createLive.isPending || goLive.isPending;
  const showSchedule = !simplified;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Radio className="h-5 w-5 text-red-500" />
            Iniciar Live
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="live-title">Título da Live *</Label>
            <Input
              id="live-title"
              placeholder="Ex: Novidades de Primavera 🌸"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={100}
            />
          </div>

          {!simplified && (
            <div>
              <Label htmlFor="live-desc">Descrição</Label>
              <Textarea
                id="live-desc"
                placeholder="Descreve o que vais mostrar..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                maxLength={500}
              />
            </div>
          )}

          <div>
            <Label htmlFor="live-category">Categoria</Label>
            <Input
              id="live-category"
              placeholder="Ex: Moda, Tecnologia, Casa..."
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              maxLength={50}
            />
          </div>

          {showSchedule && (
            <RadioGroup value={mode} onValueChange={(v) => setMode(v as "now" | "schedule")}>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="now" id="mode-now" />
                  <Label htmlFor="mode-now" className="flex items-center gap-1.5 cursor-pointer">
                    <Radio className="h-4 w-4 text-red-500" />
                    Ir ao vivo agora
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="schedule" id="mode-schedule" />
                  <Label htmlFor="mode-schedule" className="flex items-center gap-1.5 cursor-pointer">
                    <Calendar className="h-4 w-4 text-primary" />
                    Agendar
                  </Label>
                </div>
              </div>
            </RadioGroup>
          )}

          {showSchedule && mode === "schedule" && (
            <div>
              <Label htmlFor="live-schedule">Data e hora</Label>
              <Input
                id="live-schedule"
                type="datetime-local"
                value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
              />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!title.trim() || isLoading || (mode === "schedule" && !scheduledAt)}
            className={mode === "now" ? "bg-red-600 hover:bg-red-700 text-white" : ""}
          >
            {isLoading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            {mode === "now" ? "🔴 Ir ao Vivo" : "📅 Agendar Live"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
