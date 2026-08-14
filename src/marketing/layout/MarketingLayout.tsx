import { Outlet } from "react-router-dom";
import { HeaderV2 } from "@/components/landing-fastcrm-v2/HeaderV2";
import { FooterV2 } from "@/components/landing-fastcrm-v2/Sections3";

/**
 * Layout único das páginas públicas de marketing.
 * Usa o mesmo cabeçalho e rodapé da landing page para garantir
 * uma navegação coerente em todo o site público.
 */
export default function MarketingLayout() {
  return (
    <div className="min-h-screen bg-background text-foreground antialiased">
      <HeaderV2 />
      <main>
        <Outlet />
      </main>
      <FooterV2 />
    </div>
  );
}
