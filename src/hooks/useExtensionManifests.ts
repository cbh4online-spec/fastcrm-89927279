import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspaceModules } from "@/hooks/useWorkspaceModules";
import type {
  ExtensionManifest,
  ExtensionObjectDef,
  ExtensionViewDef,
  ExtensionAutomationDef,
  ExtensionIntelligenceDef,
  ExtensionSettingsPageDef,
  ModuleWithManifest,
} from "@/types/extensionManifest";

export function useExtensionManifests() {
  const { installedModuleIds } = useWorkspaceModules();

  const { data: modulesWithManifest = [], isLoading } = useQuery({
    queryKey: ["extension-manifests", installedModuleIds],
    queryFn: async () => {
      if (installedModuleIds.length === 0) return [];

      const { data, error } = await supabase
        .from("marketplace_modules")
        .select("slug, name, manifest_json")
        .in("slug", installedModuleIds);

      if (error) throw error;

      return (data || [])
        .filter((m: any) => m.manifest_json && Object.keys(m.manifest_json).length > 0)
        .map((m: any): ModuleWithManifest => ({
          slug: m.slug,
          name: m.name,
          manifest: m.manifest_json as ExtensionManifest,
        }));
    },
    enabled: installedModuleIds.length > 0,
    staleTime: 1000 * 60 * 5,
  });

  const extensionObjects = useMemo<ExtensionObjectDef[]>(
    () => modulesWithManifest.flatMap((m) => m.manifest.objects || []),
    [modulesWithManifest]
  );

  const getExtensionViews = useMemo(
    () =>
      (objectType?: string): ExtensionViewDef[] => {
        const allViews = modulesWithManifest.flatMap((m) => m.manifest.views || []);
        return objectType ? allViews.filter((v) => v.object_type === objectType) : allViews;
      },
    [modulesWithManifest]
  );

  const extensionAutomations = useMemo<ExtensionAutomationDef[]>(
    () => modulesWithManifest.flatMap((m) => m.manifest.automations || []),
    [modulesWithManifest]
  );

  const extensionIntelligence = useMemo<ExtensionIntelligenceDef[]>(
    () => modulesWithManifest.flatMap((m) => m.manifest.intelligence || []),
    [modulesWithManifest]
  );

  const extensionSettingsPages = useMemo<ExtensionSettingsPageDef[]>(
    () => modulesWithManifest.flatMap((m) => m.manifest.settings_pages || []),
    [modulesWithManifest]
  );

  return {
    modulesWithManifest,
    extensionObjects,
    getExtensionViews,
    extensionAutomations,
    extensionIntelligence,
    extensionSettingsPages,
    isLoading,
  };
}
