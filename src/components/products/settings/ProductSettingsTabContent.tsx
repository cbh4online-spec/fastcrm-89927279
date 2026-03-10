import { useState, useCallback } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Package, CreditCard, Tag, Clock, Wallet, Activity, Truck, Calendar, Sparkles } from "lucide-react";
import { ProductTypesTab } from "./ProductTypesTab";
import { BillingTypesTab } from "./BillingTypesTab";
import { CategoriesTabContent } from "../CategoriesTabContent";
import { PaymentConditionsTab } from "./PaymentConditionsTab";
import { PaymentMethodsTab } from "./PaymentMethodsTab";
import { ConsumptionModelsTab } from "./ConsumptionModelsTab";
import { DeliveryModesTab } from "./DeliveryModesTab";
import { BillingFrequenciesTab } from "./BillingFrequenciesTab";
import { AISettingsSuggestions } from "./AISettingsSuggestions";
import {
  useProductTypes,
  useBillingTypes,
  usePaymentConditions,
  usePaymentMethods,
  useConsumptionModels,
  useDeliveryModes,
  useBillingFrequencies,
} from "@/hooks/useProductSettings";
import { useProductCategoriesList, useCreateProductCategory } from "@/hooks/useProductCategories";
import { useIndustryLabels } from "@/hooks/useIndustryLabels";

const settingsTabs = [
  { id: "types", label: "Tipos de Produto", icon: Package, settingsLabel: "Tipos de Produto" },
  { id: "billing", label: "Cobrança", icon: CreditCard, settingsLabel: "Tipos de Cobrança" },
  { id: "categories", label: "Categorias", icon: Tag, settingsLabel: "Categorias" },
  { id: "payment-conditions", label: "Condições Pagamento", icon: Clock, settingsLabel: "Condições de Pagamento" },
  { id: "payment-methods", label: "Métodos Pagamento", icon: Wallet, settingsLabel: "Métodos de Pagamento" },
  { id: "consumption", label: "Modelos Consumo", icon: Activity, settingsLabel: "Modelos de Consumo" },
  { id: "delivery", label: "Modos Entrega", icon: Truck, settingsLabel: "Modos de Entrega" },
  { id: "frequencies", label: "Frequências", icon: Calendar, settingsLabel: "Frequências de Cobrança" },
];

export function ProductSettingsTabContent() {
  const [activeSettingsTab, setActiveSettingsTab] = useState("types");
  const [aiDialogOpen, setAiDialogOpen] = useState(false);

  // Load all settings data for AI context
  const productTypes = useProductTypes();
  const billingTypes = useBillingTypes();
  const paymentConditions = usePaymentConditions();
  const paymentMethods = usePaymentMethods();
  const consumptionModels = useConsumptionModels();
  const deliveryModes = useDeliveryModes();
  const billingFrequencies = useBillingFrequencies();
  const { data: categories } = useProductCategoriesList();
  const createCategory = useCreateProductCategory();
  const { data: industryLabels } = useIndustryLabels();

  const getExistingEntries = useCallback(() => {
    switch (activeSettingsTab) {
      case "types": return productTypes.data || [];
      case "billing": return billingTypes.data || [];
      case "categories": return (categories || []).map(c => ({ code: c.name, name: c.name, ...c }));
      case "payment-conditions": return paymentConditions.data || [];
      case "payment-methods": return paymentMethods.data || [];
      case "consumption": return consumptionModels.data || [];
      case "delivery": return deliveryModes.data || [];
      case "frequencies": return billingFrequencies.data || [];
      default: return [];
    }
  }, [activeSettingsTab, productTypes.data, billingTypes.data, categories, paymentConditions.data, paymentMethods.data, consumptionModels.data, deliveryModes.data, billingFrequencies.data]);

  const handleAddEntry = useCallback(async (entry: any) => {
    switch (activeSettingsTab) {
      case "types":
        await productTypes.create.mutateAsync(entry);
        break;
      case "billing":
        await billingTypes.create.mutateAsync(entry);
        break;
      case "categories":
        await createCategory.mutateAsync({
          name: entry.name || entry.label,
          description: entry.description,
          color: entry.color,
          icon: entry.icon,
        });
        break;
      case "payment-conditions":
        await paymentConditions.create.mutateAsync(entry);
        break;
      case "payment-methods":
        await paymentMethods.create.mutateAsync(entry);
        break;
      case "consumption":
        await consumptionModels.create.mutateAsync(entry);
        break;
      case "delivery":
        await deliveryModes.create.mutateAsync(entry);
        break;
      case "frequencies":
        await billingFrequencies.create.mutateAsync(entry);
        break;
    }
  }, [activeSettingsTab, productTypes.create, billingTypes.create, createCategory, paymentConditions.create, paymentMethods.create, consumptionModels.create, deliveryModes.create, billingFrequencies.create]);

  const activeTab = settingsTabs.find(t => t.id === activeSettingsTab);
  const industryContext = industryLabels?.industry_type
    ? `Indústria: ${industryLabels.industry_type}`
    : undefined;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Configurações de Produtos</h2>
          <p className="text-sm text-muted-foreground">
            Gerencie as tabelas de configuração do catálogo de produtos
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setAiDialogOpen(true)}
          className="gap-2"
        >
          <Sparkles className="h-4 w-4" />
          Sugerir com IA
        </Button>
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

      <AISettingsSuggestions
        open={aiDialogOpen}
        onOpenChange={setAiDialogOpen}
        settingsType={activeSettingsTab}
        settingsLabel={activeTab?.settingsLabel || ""}
        existingEntries={getExistingEntries()}
        industryContext={industryContext}
        onAddEntry={handleAddEntry}
      />
    </div>
  );
}
