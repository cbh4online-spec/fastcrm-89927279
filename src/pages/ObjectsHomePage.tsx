import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { OBJECT_REGISTRY } from "@/config/objectRegistry";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Plus } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { useExtensionManifests } from "@/hooks/useExtensionManifests";
import { getIconByName } from "@/lib/icons";
import type { ExtensionObjectDef } from "@/types/extensionManifest";

// Map extension object types to existing routes
const EXTENSION_OBJECT_ROUTES: Record<string, string> = {
  proposal: "/dashboard/proposals",
  invoice: "/dashboard/invoices",
  order: "/dashboard/order-notes",
};

function useObjectCounts() {
  return useQuery({
    queryKey: ["object-counts"],
    queryFn: async () => {
      const [contacts, companies, deals] = await Promise.all([
        supabase.from("contacts").select("id", { count: "exact", head: true }),
        supabase.from("companies").select("id", { count: "exact", head: true }),
        supabase.from("opportunities").select("id", { count: "exact", head: true }),
      ]);
      return {
        contacts: contacts.count ?? 0,
        companies: companies.count ?? 0,
        deals: deals.count ?? 0,
      };
    },
    staleTime: 30000,
  });
}

function useExtensionObjectCounts(extensionObjects: ExtensionObjectDef[]) {
  const tables = extensionObjects.map((o) => o.source_table);
  return useQuery({
    queryKey: ["extension-object-counts", tables],
    queryFn: async () => {
      const counts: Record<string, number> = {};
      for (const obj of extensionObjects) {
        try {
          const { count } = await supabase
            .from(obj.source_table as any)
            .select("id", { count: "exact", head: true });
          counts[obj.type] = count ?? 0;
        } catch {
          counts[obj.type] = 0;
        }
      }
      return counts;
    },
    enabled: extensionObjects.length > 0,
    staleTime: 30000,
  });
}

export default function ObjectsHomePage() {
  const navigate = useNavigate();
  const { data: counts } = useObjectCounts();
  const { extensionObjects } = useExtensionManifests();
  const { data: extCounts } = useExtensionObjectCounts(extensionObjects);

  const entries = Object.values(OBJECT_REGISTRY);

  return (
    <DashboardLayout>
      <ScrollArea className="h-[calc(100vh-5rem)]">
        <div className="p-4 md:p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Objects</h1>
              <p className="text-sm text-muted-foreground">
                Gerencie seus contatos, empresas, negócios e objetos customizados.
              </p>
            </div>
            <Button variant="outline" size="sm" disabled className="gap-1.5">
              <Plus className="h-4 w-4" />
              Custom Object
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0">Em breve</Badge>
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Core Objects */}
            {entries.map((entry) => {
              const Icon = entry.icon;
              const count = counts?.[entry.slug as keyof typeof counts] ?? null;
              return (
                <Card
                  key={entry.slug}
                  className="cursor-pointer hover:border-primary/30 transition-colors group"
                  onClick={() => navigate(entry.objectsPath)}
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <div className={`p-2 rounded-lg bg-muted ${entry.color}`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                    <CardTitle className="text-lg mt-2">{entry.labelPt}</CardTitle>
                    <CardDescription>{entry.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {count !== null ? count.toLocaleString("pt-BR") : "—"}
                    </div>
                    <p className="text-xs text-muted-foreground">registros</p>
                  </CardContent>
                </Card>
              );
            })}

            {/* Extension Objects */}
            {extensionObjects.map((extObj) => {
              const Icon = getIconByName(extObj.icon);
              const count = extCounts?.[extObj.type] ?? null;
              const route = EXTENSION_OBJECT_ROUTES[extObj.type] || `/dashboard/${extObj.type}`;
              return (
                <Card
                  key={extObj.type}
                  className="cursor-pointer hover:border-primary/30 transition-colors group"
                  onClick={() => navigate(route)}
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <div className={`p-2 rounded-lg bg-muted ${extObj.color}`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-muted-foreground border-border/60">
                          Extensão
                        </Badge>
                        <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </div>
                    <CardTitle className="text-lg mt-2">{extObj.labelPt}</CardTitle>
                    <CardDescription>{extObj.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {count !== null ? count.toLocaleString("pt-BR") : "—"}
                    </div>
                    <p className="text-xs text-muted-foreground">registros</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </ScrollArea>
    </DashboardLayout>
  );
}
