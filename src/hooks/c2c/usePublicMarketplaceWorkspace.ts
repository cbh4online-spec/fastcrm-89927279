import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase as _supabase } from "@/integrations/supabase/client";

const supabase = _supabase as any;

export interface PublicMarketplaceWorkspace {
  id: string;
  name: string;
  slug: string;
}

const IGNORED_HOST_LABELS = new Set([
  "www",
  "app",
  "fastcrm",
  "lovable",
  "lovableproject",
  "preview",
  "id-preview",
  "localhost",
]);

function normalizeSlug(value?: string | null) {
  return value?.trim().toLowerCase() || "";
}

function getSlugCandidates(routeSlug?: string): string[] {
  const candidates: string[] = [];
  const fromRoute = normalizeSlug(routeSlug);
  if (fromRoute) candidates.push(fromRoute);

  if (typeof window !== "undefined") {
    const labels = window.location.hostname
      .toLowerCase()
      .split(".")
      .map((label) => label.trim())
      .filter((label) => label.length > 2 && !IGNORED_HOST_LABELS.has(label));

    candidates.push(...labels);
  }

  return Array.from(new Set(candidates));
}

async function findWorkspaceByMarketplaceSlug(slug: string): Promise<PublicMarketplaceWorkspace | null> {
  const { data } = await supabase
    .from("c2c_marketplace_config")
    .select("workspace_id, name, slug")
    .eq("slug", slug)
    .eq("status", "active")
    .limit(1)
    .maybeSingle();

  if (!data?.workspace_id) return null;

  return {
    id: data.workspace_id,
    name: data.name || slug,
    slug: data.slug || slug,
  };
}

async function findWorkspaceByStoreSlug(slug: string): Promise<PublicMarketplaceWorkspace | null> {
  const { data: storeData } = await supabase
    .from("store_settings")
    .select("workspace_id, store_slug")
    .eq("store_slug", slug)
    .limit(1)
    .maybeSingle();

  if (!storeData?.workspace_id) return null;

  const { data: workspaceData } = await supabase
    .from("public_workspaces")
    .select("id, name, slug")
    .eq("id", storeData.workspace_id)
    .limit(1)
    .maybeSingle();

  return {
    id: storeData.workspace_id,
    name: workspaceData?.name || slug,
    slug: workspaceData?.slug || storeData.store_slug || slug,
  };
}

async function findWorkspaceByWorkspaceSlug(slug: string): Promise<PublicMarketplaceWorkspace | null> {
  const { data } = await supabase
    .from("public_workspaces")
    .select("id, name, slug")
    .eq("slug", slug)
    .limit(1)
    .maybeSingle();

  if (!data?.id) return null;

  return {
    id: data.id,
    name: data.name || slug,
    slug: data.slug || slug,
  };
}

export function usePublicMarketplaceWorkspace(routeSlug?: string) {
  const slugCandidates = useMemo(() => getSlugCandidates(routeSlug), [routeSlug]);

  return useQuery({
    queryKey: ["c2c-public-workspace", slugCandidates.join("|")],
    enabled: slugCandidates.length > 0,
    retry: 1,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      for (const slug of slugCandidates) {
        const byMarketplace = await findWorkspaceByMarketplaceSlug(slug);
        if (byMarketplace) return byMarketplace;
      }

      for (const slug of slugCandidates) {
        const byStore = await findWorkspaceByStoreSlug(slug);
        if (byStore) return byStore;
      }

      for (const slug of slugCandidates) {
        const byWorkspace = await findWorkspaceByWorkspaceSlug(slug);
        if (byWorkspace) return byWorkspace;
      }

      return null;
    },
  });
}
