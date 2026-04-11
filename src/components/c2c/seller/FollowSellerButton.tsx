import { Button } from "@/components/ui/button";
import { UserPlus, UserCheck } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useIsFollowing, useToggleFollow, useSellerFollowerCount } from "@/hooks/useC2CFollowers";
import { cn } from "@/lib/utils";

interface FollowSellerButtonProps {
  sellerId: string;
  workspaceId: string;
  sellerUserId?: string;
  compact?: boolean;
  className?: string;
}

export function FollowSellerButton({
  sellerId,
  workspaceId,
  sellerUserId,
  compact = false,
  className,
}: FollowSellerButtonProps) {
  const { user } = useAuth();
  const { data: isFollowing } = useIsFollowing(sellerId);
  const { data: followerCount = 0 } = useSellerFollowerCount(sellerId);
  const toggleFollow = useToggleFollow();

  if (!user || user.id === sellerUserId) return null;

  return (
    <Button
      variant={isFollowing ? "default" : "outline"}
      size="sm"
      className={cn(
        "gap-2",
        isFollowing && "bg-[#09B1BA] hover:bg-[#09B1BA]/90",
        className
      )}
      disabled={toggleFollow.isPending}
      onClick={() => toggleFollow.mutate({ sellerId, workspaceId })}
    >
      {isFollowing ? (
        <UserCheck className="h-4 w-4" />
      ) : (
        <UserPlus className="h-4 w-4" />
      )}
      {!compact && (isFollowing ? "A seguir" : "Seguir")}
      <span className="text-xs opacity-80">{followerCount}</span>
    </Button>
  );
}
