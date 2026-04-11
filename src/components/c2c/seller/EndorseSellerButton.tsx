import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ThumbsUp } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToggleEndorsement, type C2CEndorsement } from "@/hooks/useC2CEndorsements";
import { cn } from "@/lib/utils";

interface EndorseSellerButtonProps {
  sellerId: string;
  workspaceId: string;
  endorsements: C2CEndorsement[];
}

export function EndorseSellerButton({
  sellerId,
  workspaceId,
  endorsements,
}: EndorseSellerButtonProps) {
  const { user } = useAuth();
  const toggleEndorsement = useToggleEndorsement();

  const isEndorsed = user
    ? endorsements.some((e) => e.endorser_id === user.id)
    : false;

  // Don't show for own profile or unauthenticated
  if (!user || user.id === sellerId) return null;

  return (
    <Button
      variant={isEndorsed ? "default" : "outline"}
      size="sm"
      className={cn(
        "w-full gap-2",
        isEndorsed && "bg-purple-600 hover:bg-purple-700"
      )}
      disabled={toggleEndorsement.isPending}
      onClick={() =>
        toggleEndorsement.mutate({ sellerId, workspaceId })
      }
    >
      <ThumbsUp className={cn("h-4 w-4", isEndorsed && "fill-current")} />
      {isEndorsed ? "Recomendado ✓" : "Recomendar vendedor"}
    </Button>
  );
}
