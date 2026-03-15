import { useEffect } from "react";
import { useTheme } from "next-themes";

/**
 * Force dark mode while public marketplace routes are mounted,
 * then restore previous light/dark class on unmount.
 */
export function usePublicMarketplaceTheme() {
  const { setTheme } = useTheme();

  useEffect(() => {
    const previousTheme = document.documentElement.classList.contains("dark") ? "dark" : "light";
    setTheme("dark");

    return () => {
      setTheme(previousTheme);
    };
  }, [setTheme]);
}
