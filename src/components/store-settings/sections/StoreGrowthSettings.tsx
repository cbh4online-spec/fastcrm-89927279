import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Target, HelpCircle, Star, Users, HandCoins, Gift } from "lucide-react";
import { CrmOffersManager } from "@/components/store-settings/CrmOffersManager";
import { StoreFaqManager } from "@/components/store-settings/StoreFaqManager";
import { StoreLoyaltyManager } from "@/components/store-settings/StoreLoyaltyManager";
import { StoreReferralManager } from "@/components/store-settings/StoreReferralManager";
import { StoreOffersManager } from "@/components/store-settings/StoreOffersManager";
import { StoreGiftCardsManager } from "@/components/store-settings/StoreGiftCardsManager";

export function StoreGrowthSettings() {
  return (
    <div className="space-y-4">
      <Tabs defaultValue="crm-offers">
        <TabsList className="flex-wrap">
          <TabsTrigger value="crm-offers" className="gap-1 text-xs sm:text-sm"><Target className="h-3.5 w-3.5" /> CRM & Ofertas</TabsTrigger>
          <TabsTrigger value="faq" className="gap-1 text-xs sm:text-sm"><HelpCircle className="h-3.5 w-3.5" /> FAQ</TabsTrigger>
          <TabsTrigger value="loyalty" className="gap-1 text-xs sm:text-sm"><Star className="h-3.5 w-3.5" /> Fidelidade</TabsTrigger>
          <TabsTrigger value="referrals" className="gap-1 text-xs sm:text-sm"><Users className="h-3.5 w-3.5" /> Referrals</TabsTrigger>
          <TabsTrigger value="offers" className="gap-1 text-xs sm:text-sm"><HandCoins className="h-3.5 w-3.5" /> Ofertas</TabsTrigger>
          <TabsTrigger value="gift-cards" className="gap-1 text-xs sm:text-sm"><Gift className="h-3.5 w-3.5" /> Gift Cards</TabsTrigger>
        </TabsList>

        <TabsContent value="crm-offers" className="mt-4">
          <CrmOffersManager />
        </TabsContent>
        <TabsContent value="faq" className="mt-4">
          <StoreFaqManager />
        </TabsContent>
        <TabsContent value="loyalty" className="mt-4">
          <StoreLoyaltyManager />
        </TabsContent>
        <TabsContent value="referrals" className="mt-4">
          <StoreReferralManager />
        </TabsContent>
        <TabsContent value="offers" className="mt-4">
          <StoreOffersManager />
        </TabsContent>
        <TabsContent value="gift-cards" className="mt-4">
          <StoreGiftCardsManager />
        </TabsContent>
      </Tabs>
    </div>
  );
}
