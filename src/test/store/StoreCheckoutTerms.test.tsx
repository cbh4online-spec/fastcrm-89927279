import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";

// Sem rede: a função de checkout é simulada; nunca há chamada Stripe real.
const invoke = vi.fn(async (name: string) => {
  if (name === "store-capture-lead") return { data: { contactId: null }, error: null };
  return { data: { error: "mock_stop" }, error: null };
});
vi.mock("@/integrations/supabase/client", () => ({ supabase: { functions: { invoke: (...a: any[]) => (invoke as any)(...a) } } }));
vi.mock("@/lib/analytics", () => ({ trackEvent: vi.fn() }));
vi.mock("@/lib/ecommerceTracking", () => ({ trackBeginCheckout: vi.fn() }));
vi.mock("@/lib/ai-commerce/tracking", () => ({ trackCommerceEvent: vi.fn() }));
vi.mock("@/lib/sentry", () => ({ Sentry: { captureException: vi.fn() } }));
vi.mock("sonner", () => ({ toast: { error: vi.fn(), info: vi.fn(), success: vi.fn() } }));
vi.mock("@/components/store/StoreHeader", () => ({ StoreHeader: () => null }));
vi.mock("@/components/checkout/TrustBadges", () => ({ TrustBadges: () => null }));
vi.mock("@/components/store/StoreCartComplements", () => ({ StoreCartComplements: () => null }));
vi.mock("@/components/store/StoreCartStockGuard", () => ({ StoreCartStockGuard: () => null }));
vi.mock("@/components/store/checkout/CheckoutSummaryCard", () => ({ CheckoutSummaryCard: () => null }));
vi.mock("@/hooks/useResolveStoreWorkspace", () => ({ useResolveStoreWorkspace: () => ({ workspaceId: "ws-1", slug: "ajax" }) }));
vi.mock("@/hooks/useStoreSettings", () => ({
  usePublicStoreSettings: () => ({ data: { store_name: "Ajax", payment_methods: { stripe_card: true, mbway: true, multibanco: true } } }),
}));
vi.mock("@/contexts/StoreCartContext", () => ({
  useStoreCart: () => ({ items: [{ productId: "p1", quantity: 1, name: "Hub", price: 100, currency: "EUR" }], subtotal: 100, clearCart: vi.fn() }),
}));
vi.mock("@/hooks/useStoreCartOffers", () => ({
  useStoreCartOffers: () => ({ complements: [], unavailable: [], isChecking: false, isError: false, data: { unavailable: [], complements: [] }, refetch: async () => ({ isError: false, data: { unavailable: [] } }) }),
}));
const ctt = { id: "ctt", name: "CTT", price: 3.9, estimate: "2-3 dias" };
vi.mock("@/components/store/checkout/useCheckoutPricing", () => ({
  useCheckoutPricing: () => ({
    totalWeight: 1, shippingLoading: false, shippingError: null, overWeight: false,
    cttOptions: [ctt], selectedShippingId: "ctt", setSelectedShippingId: vi.fn(), selectedCttOption: ctt,
    effectiveShippingCost: 3.9, finalTotal: 103.9, appliedCoupon: null, appliedGiftCard: null,
  }),
}));

import StoreCheckoutPage from "@/pages/store/StoreCheckoutPage";

const checkoutCalls = () => invoke.mock.calls.filter((c) => c[0] === "create-store-checkout");

async function goToPaymentStep() {
  render(
    <HelmetProvider>
      <MemoryRouter initialEntries={["/store/ajax/checkout"]}>
        <Routes><Route path="/store/:workspaceSlug/checkout" element={<StoreCheckoutPage />} /></Routes>
      </MemoryRouter>
    </HelmetProvider>,
  );
  fireEvent.change(screen.getByLabelText(/nome/i), { target: { value: "Teste Cliente" } });
  fireEvent.change(screen.getByLabelText(/email/i), { target: { value: "teste@example.com" } });
  fireEvent.change(screen.getByLabelText(/telefone|telemóvel/i), { target: { value: "912345678" } });
  fireEvent.click(screen.getByRole("button", { name: /continuar/i }));
  return screen.findByRole("checkbox", { name: /li e aceito/i });
}

describe("Checkout da loja — Termos e Condições", () => {
  beforeEach(() => invoke.mockClear());

  it("começa desmarcado (nunca assume aceite) e bloqueia sem chamar o checkout", async () => {
    const box = (await goToPaymentStep()) as HTMLInputElement;
    expect(box.checked).toBe(false);
    fireEvent.click(screen.getByRole("button", { name: /pagar com cartão/i }));
    expect(await screen.findByText("Deve aceitar os Termos e Condições para prosseguir")).toBeTruthy();
    expect(checkoutCalls()).toHaveLength(0);
  });

  it.each([["cartão", /pagar com cartão/i], ["MB Way", /pagar com mb way/i], ["Multibanco", /pagar com multibanco/i]])(
    "marcar a caixa (via etiqueta) avança com %s; desmarcar volta a bloquear",
    async (_label, buttonName) => {
      const box = (await goToPaymentStep()) as HTMLInputElement;
      if (!/cartão/.test(String(buttonName))) {
        fireEvent.click(screen.getByText(String(buttonName).includes("mb way") ? /^MB Way$/i : /^Multibanco$/i));
      }
      fireEvent.click(screen.getByText(/li e aceito os/i)); // clique humano na etiqueta
      expect(box.checked).toBe(true);
      fireEvent.click(screen.getByRole("button", { name: buttonName }));
      await waitFor(() => expect(checkoutCalls()).toHaveLength(1));
      expect(screen.queryByText("Deve aceitar os Termos e Condições para prosseguir")).toBeNull();

      fireEvent.click(box);
      expect(box.checked).toBe(false);
      fireEvent.click(screen.getByRole("button", { name: buttonName }));
      expect(await screen.findByText("Deve aceitar os Termos e Condições para prosseguir")).toBeTruthy();
      expect(checkoutCalls()).toHaveLength(1);
    },
  );

  it("o link dos Termos abre as Condições de Venda da loja", async () => {
    await goToPaymentStep();
    expect(screen.getByRole("link", { name: "Termos e Condições" }).getAttribute("href")).toBe("/store/ajax/terms");
  });
});
