import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Package, CreditCard, Tag } from "lucide-react";
import { ProductTypesTab } from "./ProductTypesTab";
import { BillingTypesTab } from "./BillingTypesTab";
import { CategoriesTabContent } from "../CategoriesTabContent";

const settingsTabs = [
  { id: "types", label: "Tipos de Produto", icon: Package },
  { id: "billing", label: "Cobrança", icon: CreditCard },
  { id: "categories", label: "Categorias", icon: Tag },
];

export function ProductSettingsTabContent() {
  const [activeSettingsTab, setActiveSettingsTab] = useState("types");

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Configurações de Produtos</h2>
        <p className="text-sm text-muted-foreground">
          Gerencie as tabelas de configuração do catálogo de produtos
        </p>
      </div>

      <Tabs value={activeSettingsTab} onValueChange={setActiveSettingsTab}>
        <TabsList className="mb-4">
          {settingsTabs.map((tab) => {
            const IconComp = tab.icon;
            return (
              <TabsTrigger key={tab.id} value={tab.id} className="gap-2">
                <IconComp className="h-4 w-4" />
                {tab.label}
              </TabsTrigger>
            );
          })}
        </TabsList>

        <TabsContent value="types">
          <ProductTypesTab />
        </TabsContent>

        <TabsContent value="billing">
          <BillingTypesTab />
        </TabsContent>

        <TabsContent value="categories">
          <CategoriesTabContent />
        </TabsContent>
      </Tabs>
    </div>
  );
}
