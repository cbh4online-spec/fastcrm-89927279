import { cn } from "@/lib/utils";
import { Building2 } from "lucide-react";

interface WorkspaceLogoProps {
  logoUrl?: string | null;
  workspaceName?: string;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  className?: string;
  variant?: "default" | "sidebar" | "portal";
}

const sizeClasses = {
  xs: "w-5 h-5",
  sm: "w-6 h-6",
  md: "w-8 h-8",
  lg: "w-10 h-10",
  xl: "w-12 h-12",
};

const textSizeClasses = {
  xs: "text-[8px]",
  sm: "text-[10px]",
  md: "text-xs",
  lg: "text-sm",
  xl: "text-base",
};

const iconSizeClasses = {
  xs: "w-3 h-3",
  sm: "w-3.5 h-3.5",
  md: "w-4 h-4",
  lg: "w-5 h-5",
  xl: "w-6 h-6",
};

export function WorkspaceLogo({
  logoUrl,
  workspaceName,
  size = "md",
  className,
  variant = "default",
}: WorkspaceLogoProps) {
  // Generate initials from workspace name
  const initials = workspaceName
    ?.split(" ")
    .map((word) => word[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) || "WS";

  // If we have a logo URL, render the image
  if (logoUrl) {
    return (
      <img
        src={logoUrl}
        alt={workspaceName || "Workspace"}
        className={cn(
          sizeClasses[size],
          "rounded-lg object-contain flex-shrink-0",
          className
        )}
      />
    );
  }

  // Fallback: Show initials or icon based on variant
  const baseClasses = cn(
    sizeClasses[size],
    "rounded-lg flex items-center justify-center flex-shrink-0",
    className
  );

  if (variant === "sidebar") {
    return (
      <div
        className={cn(
          baseClasses,
          "bg-gradient-to-br from-primary to-violet-600 shadow-lg shadow-primary/25"
        )}
      >
        {workspaceName ? (
          <span className={cn("font-bold text-white", textSizeClasses[size])}>
            {initials}
          </span>
        ) : (
          <Building2 className={cn("text-white", iconSizeClasses[size])} />
        )}
      </div>
    );
  }

  if (variant === "portal") {
    return (
      <div className={cn(baseClasses, "bg-primary")}>
        {workspaceName ? (
          <span
            className={cn(
              "font-bold text-primary-foreground",
              textSizeClasses[size]
            )}
          >
            {initials}
          </span>
        ) : (
          <Building2
            className={cn("text-primary-foreground", iconSizeClasses[size])}
          />
        )}
      </div>
    );
  }

  // Default variant
  return (
    <div className={cn(baseClasses, "bg-primary/10")}>
      {workspaceName ? (
        <span className={cn("font-bold text-primary", textSizeClasses[size])}>
          {initials}
        </span>
      ) : (
        <Building2 className={cn("text-primary", iconSizeClasses[size])} />
      )}
    </div>
  );
}
