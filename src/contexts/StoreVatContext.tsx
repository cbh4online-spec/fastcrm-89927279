import { createContext, useContext, type ReactNode } from "react";

interface StoreVatContextValue {
  pricesIncludeVat: boolean;
  vatRate: number;
  isB2B: boolean;
}

const StoreVatContext = createContext<StoreVatContextValue>({
  pricesIncludeVat: true,
  vatRate: 23,
  isB2B: false,
});

interface StoreVatProviderProps {
  pricesIncludeVat?: boolean;
  vatRate?: number;
  isB2B?: boolean;
  children: ReactNode;
}

export function StoreVatProvider({ pricesIncludeVat = true, vatRate = 23, isB2B = false, children }: StoreVatProviderProps) {
  // B2B users always see prices without VAT
  const effectiveIncludeVat = isB2B ? false : pricesIncludeVat;

  return (
    <StoreVatContext.Provider value={{ pricesIncludeVat: effectiveIncludeVat, vatRate, isB2B }}>
      {children}
    </StoreVatContext.Provider>
  );
}

export function useStoreVat() {
  return useContext(StoreVatContext);
}
