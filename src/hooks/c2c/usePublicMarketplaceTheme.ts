import { useEffect } from "react";
import { useTheme } from "next-themes";

/**
 * Force light mode while public marketplace routes are mounted,
 * then restore previous theme on unmount.
 */
export function usePublicMarketplaceTheme() {
  const { setTheme } = useTheme();

  useEffect(() => {
    const previousTheme = document.documentElement.classList.contains("dark") ? "dark" : "light";
    setTheme("light");

    return () => {
      setTheme(previousTheme);
    };
  }, [setTheme]);
}
