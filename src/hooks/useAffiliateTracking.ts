import { useEffect, useCallback } from "react";

const COOKIE_NAME = "fcrm_aff";

export function getAffiliateCookie(): { code: string; workspace: string; linkId?: string } | null {
  try {
    const match = document.cookie.match(new RegExp(`(?:^|; )${COOKIE_NAME}=([^;]*)`));
    if (!match) return null;
    return JSON.parse(decodeURIComponent(match[1]));
  } catch {
    return null;
  }
}

export function setAffiliateCookie(code: string, workspace: string, linkId?: string, days = 30) {
  const expires = new Date(Date.now() + days * 86400000).toUTCString();
  const value = encodeURIComponent(JSON.stringify({ code, workspace, linkId }));
  document.cookie = `${COOKIE_NAME}=${value}; expires=${expires}; path=/; SameSite=Lax`;
}

export function clearAffiliateCookie() {
  document.cookie = `${COOKIE_NAME}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
}

/**
 * Hook to capture affiliate tracking from URL params.
 * Detects `?aff=CODE` or `?ref=CODE` and stores cookie.
 */
export function useAffiliateCaptureFromUrl(workspaceId?: string) {
  useEffect(() => {
    if (!workspaceId) return;
    const params = new URLSearchParams(window.location.search);
    const code = params.get("aff") || params.get("ref");
    const linkId = params.get("aff_link") ?? undefined;

    if (code) {
      setAffiliateCookie(code, workspaceId, linkId);

      // Fire click tracking (fire-and-forget)
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/affiliate-track-click`;
      fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          affiliate_code: code,
          workspace_id: workspaceId,
          link_id: linkId,
          landing_page: window.location.pathname,
          referrer_url: document.referrer || null,
        }),
        keepalive: true,
      }).catch(() => {});

      // Clean URL params
      params.delete("aff");
      params.delete("ref");
      params.delete("aff_link");
      const clean = params.toString();
      const newUrl = window.location.pathname + (clean ? `?${clean}` : "") + window.location.hash;
      window.history.replaceState({}, "", newUrl);
    }
  }, [workspaceId]);
}

/**
 * Get affiliate data for checkout integration.
 */
export function useAffiliateCheckoutData() {
  return useCallback(() => {
    const cookie = getAffiliateCookie();
    if (!cookie) return null;
    return {
      affiliate_code: cookie.code,
      workspace_id: cookie.workspace,
      link_id: cookie.linkId,
    };
  }, []);
}
