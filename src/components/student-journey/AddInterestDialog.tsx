import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useProfiles } from "@/hooks/useStudentJourney";
import { Loader2, X } from "lucide-react";
import type { SJProfile } from "@/types/studentJourney";

interface AddInterestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  profile: SJProfile | null;
}

export function AddInterestDialog({
  open,
  onOpenChange,
  profile,
}: AddInterestDialogProps) {
  const { updateProfile } = useProfiles();
  const [newInterest, setNewInterest] = useState("");

  const currentInterests = profile?.interests || [];

  const handleAddInterest = async () => {
    if (!profile || !newInterest.trim()) return;

    const trimmedInterest = newInterest.trim();
    
    // Check if interest already exists
    if (currentInterests.includes(trimmedInterest)) {
      setNewInterest("");
      return;
    }

    const updatedInterests = [...currentInterests, trimmedInterest];

    await updateProfile.mutateAsync({
      id: profile.id,
      interests: updatedInterests,
    });

    setNewInterest("");
  };

  const handleRemoveInterest = async (interest: string) => {
    if (!profile) return;

    const updatedInterests = currentInterests.filter((i) => i !== interest);

    await updateProfile.mutateAsync({
      id: profile.id,
      interests: updatedInterests,
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddInterest();
    }
  };

  const handleClose = (open: boolean) => {
    if (!open) setNewInterest("");
    onOpenChange(open);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Marcar Interesse</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="text-sm text-muted-foreground">
            Aluno: <span className="font-medium text-foreground">{profile?.full_name}</span>
          </div>

          <div className="space-y-2">
            <Label htmlFor="interest">Interesse / Área</Label>
            <div className="flex gap-2">
              <Input
                id="interest"
                value={newInterest}
                onChange={(e) => setNewInterest(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ex: Gestão de Projetos, Liderança..."
              />
              <Button
                onClick={handleAddInterest}
                disabled={!newInterest.trim() || updateProfile.isPending}
              >
                {updateProfile.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Adicionar"
                )}
              </Button>
            </div>
          </div>

          {currentInterests.length > 0 && (
            <div className="space-y-2">
              <Label>Interesses atuais</Label>
              <div className="flex flex-wrap gap-2">
                {currentInterests.map((interest) => (
                  <Badge
                    key={interest}
                    variant="secondary"
                    className="gap-1 pr-1"
                  >
                    {interest}
                    <button
                      onClick={() => handleRemoveInterest(interest)}
                      className="ml-1 rounded-full p-0.5 hover:bg-muted-foreground/20"
                      disabled={updateProfile.isPending}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {currentInterests.length === 0 && (
            <div className="text-sm text-muted-foreground text-center py-4 border rounded-md">
              Nenhum interesse registado
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleClose(false)}>
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
