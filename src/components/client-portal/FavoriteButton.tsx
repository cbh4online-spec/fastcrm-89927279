import { Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useClientFavorites } from "@/hooks/client-portal/useClientFavorites";

interface FavoriteButtonProps {
  productId: string;
  variant?: "icon" | "button";
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function FavoriteButton({
  productId,
  variant = "icon",
  size = "md",
  className,
}: FavoriteButtonProps) {
  const { isFavorite, toggleFavorite } = useClientFavorites();
  const favorited = isFavorite(productId);

  const sizeClasses = {
    sm: "h-4 w-4",
    md: "h-5 w-5",
    lg: "h-6 w-6",
  };

  const buttonSizeClasses = {
    sm: "h-8 w-8",
    md: "h-9 w-9",
    lg: "h-10 w-10",
  };

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    toggleFavorite(productId);
  };

  if (variant === "button") {
    return (
      <Button
        variant={favorited ? "default" : "outline"}
        size="sm"
        onClick={handleClick}
        className={cn("gap-2", className)}
      >
        <Heart
          className={cn(
            sizeClasses[size],
            favorited && "fill-current"
          )}
        />
        {favorited ? "Nos favoritos" : "Adicionar aos favoritos"}
      </Button>
    );
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={handleClick}
      className={cn(
        buttonSizeClasses[size],
        "rounded-full transition-all duration-200",
        favorited 
          ? "bg-red-100 text-red-600 hover:bg-red-200 hover:text-red-700" 
          : "bg-background/80 text-muted-foreground hover:bg-background hover:text-foreground",
        className
      )}
    >
      <Heart
        className={cn(
          sizeClasses[size],
          "transition-transform duration-200",
          favorited && "fill-current scale-110"
        )}
      />
    </Button>
  );
}
