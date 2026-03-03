import { useCallback, useMemo, useState } from "react";
import { FEATURE_REGISTRY, MODULE_CATEGORIES, type FeatureModule, type ModuleCategory } from "@/types/featureRegistry";

export function useFeatureRegistry() {
  const [selectedCategory, setSelectedCategory] = useState<ModuleCategory | "all">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  const forceRefresh = useCallback(() => {
    setRefreshKey((k) => k + 1);
  }, []);

  const filteredModules = useMemo(() => {
    let modules = FEATURE_REGISTRY;

    if (selectedCategory !== "all") {
      modules = modules.filter((m) => m.category === selectedCategory);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      modules = modules.filter(
        (m) =>
          m.name.toLowerCase().includes(q) ||
          m.description.toLowerCase().includes(q) ||
          m.features.some((f) => f.name.toLowerCase().includes(q)) ||
          m.edgeFunctions.some((ef) => ef.toLowerCase().includes(q))
      );
    }

    return modules;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCategory, searchQuery, refreshKey]);

  const stats = useMemo(() => {
    const allModules = FEATURE_REGISTRY;
    const allFeatures = allModules.flatMap((m) => m.features);
    const allEdgeFunctions = new Set(allModules.flatMap((m) => m.edgeFunctions));
    const allPages = allModules.flatMap((m) => m.pages);
    const allTables = new Set(allModules.flatMap((m) => m.tables));

    return {
      totalModules: allModules.length,
      totalFeatures: allFeatures.length,
      aiFeatures: allFeatures.filter((f) => f.aiPowered).length,
      edgeFunctions: allEdgeFunctions.size,
      pages: allPages.length,
      tables: allTables.size,
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshKey]);

  const categoryStats = useMemo(() => {
    return MODULE_CATEGORIES.map((cat) => {
      const modules = FEATURE_REGISTRY.filter((m) => m.category === cat.id);
      return {
        ...cat,
        moduleCount: modules.length,
        featureCount: modules.flatMap((m) => m.features).length,
      };
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshKey]);

  return {
    modules: filteredModules,
    stats,
    categoryStats,
    categories: MODULE_CATEGORIES,
    selectedCategory,
    setSelectedCategory,
    searchQuery,
    setSearchQuery,
    forceRefresh,
  };
}
