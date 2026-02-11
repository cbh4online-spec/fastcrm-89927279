import { createContext, useContext, type ReactNode } from "react";

interface StoreVatContextValue {
  pricesIncludeVat: boolean;
  vatRate: number;
}

const StoreVatContext = createContext<StoreVatContextValue>({
  pricesIncludeVat: true,
  vatRate: 23,
});

export function StoreVatProvider({ pricesIncludeVat = true, vatRate = 23, children }: StoreVatContextValue & { children: ReactNode }) {
  return (
    <StoreVatContext.Provider value={{ pricesIncludeVat, vatRate }}>
      {children}
    </StoreVatContext.Provider>
  );
}

export function useStoreVat() {
  return useContext(StoreVatContext);
}
