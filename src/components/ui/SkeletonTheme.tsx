import { SkeletonTheme as RSTheme } from "react-loading-skeleton";

interface Props {
  children: React.ReactNode;
}

/**
 * Pre-themed skeleton wrapper using design-system dark tokens.
 * Wrap any section that uses <Skeleton /> components.
 */
export function SkeletonTheme({ children }: Props) {
  return (
    <RSTheme baseColor="hsl(var(--muted))" highlightColor="hsl(var(--accent))">
      {children}
    </RSTheme>
  );
}
