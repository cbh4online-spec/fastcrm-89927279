import { useExtensionManifests } from "@/hooks/useExtensionManifests";
import { Link } from "react-router-dom";
import { Settings, ChevronRight } from "lucide-react";

export function ExtensionSettingsSection() {
  const { extensionSettingsPages, isLoading } = useExtensionManifests();

  if (isLoading || extensionSettingsPages.length === 0) return null;

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
        <Settings className="h-4 w-4 text-muted-foreground" />
        Definições de Extensões
      </h3>
      <div className="space-y-1">
        {extensionSettingsPages.map((page) => (
          <Link
            key={page.key}
            to={page.route}
            className="flex items-center justify-between px-3 py-2.5 rounded-lg border border-border hover:border-primary/30 hover:bg-muted/50 transition-colors group"
          >
            <span className="text-sm text-foreground">{page.label}</span>
            <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
          </Link>
        ))}
      </div>
    </div>
  );
}
