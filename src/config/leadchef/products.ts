// Catálogo de produtos Bimby (consulta interna LeadChef).
// Hardcoded a partir das referências fornecidas pelo agente.

export interface LeadChefProduct {
  id: string;
  name: string;
  points: number;
  price: number; // EUR
  promo?: boolean;
  category?: string;
}

export const LEADCHEF_PRODUCTS: LeadChefProduct[] = [
  { id: "conj-2-bimby-brush", name: "Conj 2 Bimby brush", points: 2, price: 32.0 },
  { id: "mandolina-bimby-tm6", name: "Mandolina Bimby TM6", points: 6, price: 129.0 },
  { id: "bimby-sensor", name: "Bimby Sensor", points: 6, price: 149.0 },
  { id: "cacarola-bimby", name: "Caçarola Bimby", points: 6, price: 149.0 },
  { id: "forma-bimby-universo-tm7", name: "Forma Bimby Universo TM7", points: 3, price: 39.0 },
  {
    id: "protetor-lamina-descascador",
    name: "2 Protetor de Lâmina e Descascador",
    points: 3,
    price: 79.8,
    promo: true,
  },
  { id: "saco-transporte-sky-blue-bimby", name: "Saco transporte sky blue Bimby", points: 3, price: 39.0 },
  { id: "set-6-ramequins", name: "Set 6 Ramequins", points: 3, price: 40.0 },
  { id: "conj-8-frascos-multiusos", name: "Conj 8 frascos multiusos", points: 3, price: 24.9 },
  { id: "set-bimby-cutter-tm7-pt", name: "Set Bimby Cutter+ TM7 PT", points: 8, price: 159.0 },
];

export const formatEUR = (v: number) =>
  v.toLocaleString("pt-PT", { style: "currency", currency: "EUR" });
