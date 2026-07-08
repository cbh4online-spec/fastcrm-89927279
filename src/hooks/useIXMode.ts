import { useLocation } from "react-router-dom";

/**
 * Retorna true quando a sidebar/dashboard IX (InvoiceXpress-style) está activa.
 * Fonte: ?nav=ix (query) ou localStorage("fastcrm.sidebar") === "ix".
 * ?nav=legacy|watidy|adaptive desactivam.
 */
export function useIXMode(): boolean {
  const location = useLocation();
  const nav = new URLSearchParams(location.search).get("nav");
  if (nav === "ix") return true;
  if (nav === "legacy" || nav === "watidy" || nav === "adaptive") return false;
  try {
    return localStorage.getItem("fastcrm.sidebar") === "ix";
  } catch {
    return false;
  }
}
