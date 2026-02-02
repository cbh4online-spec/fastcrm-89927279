import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Package, CreditCard, Tag, Clock, Wallet, Activity, Truck, Calendar } from "lucide-react";
import { ProductTypesTab } from "./ProductTypesTab";
import { BillingTypesTab } from "./BillingTypesTab";
import { CategoriesTabContent } from "../CategoriesTabContent";
import { PaymentConditionsTab } from "./PaymentConditionsTab";
import { PaymentMethodsTab } from "./PaymentMethodsTab";
import { ConsumptionModelsTab } from "./ConsumptionModelsTab";
import { DeliveryModesTab } from "./DeliveryModesTab";
import { BillingFrequenciesTab } from "./BillingFrequenciesTab";

const settingsTabs = [
  { id: "types", label: "Tipos de Produto", icon: Package },
  { id: "billing", label: "Cobrança", icon: CreditCard },
  { id: "categories", label: "Categorias", icon: Tag },
  { id: "payment-conditions", label: "Condições Pagamento", icon: Clock },
  { id: "payment-methods", label: "Métodos Pagamento", icon: Wallet },
  { id: "consumption", label: "Modelos Consumo", icon: Activity },
  { id: "delivery", label: "Modos Entrega", icon: Truck },
  { id: "frequencies", label: "Frequências", icon: Calendar },
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
        <ScrollArea className="w-full whitespace-nowrap">
          <TabsList className="mb-4 inline-flex w-max">
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
          <ScrollBar orientation="horizontal" />
        </ScrollArea>

        <TabsContent value="types">
          <ProductTypesTab />
        </TabsContent>

        <TabsContent value="billing">
          <BillingTypesTab />
        </TabsContent>

        <TabsContent value="categories">
          <CategoriesTabContent />
        </TabsContent>

        <TabsContent value="payment-conditions">
          <PaymentConditionsTab />
        </TabsContent>

        <TabsContent value="payment-methods">
          <PaymentMethodsTab />
        </TabsContent>

        <TabsContent value="consumption">
          <ConsumptionModelsTab />
        </TabsContent>

        <TabsContent value="delivery">
          <DeliveryModesTab />
        </TabsContent>

        <TabsContent value="frequencies">
          <BillingFrequenciesTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
