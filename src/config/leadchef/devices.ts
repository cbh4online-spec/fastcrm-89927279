// Marcas e modelos comuns de robôs de cozinha (PT).
// Lista usada nos formulários LeadChef para registar o equipamento atual
// do lead/cliente. A entrada é livre — esta lista serve apenas como sugestão.

export const LEADCHEF_DEVICE_BRANDS = [
  "Bimby",
  "Yämmi",
  "Mambo",
  "Monsieur Cuisine",
  "Moulinex",
  "Kenwood",
  "Magimix",
  "Cecotec",
  "Outra",
  "Nenhum",
] as const;

export type LeadChefDeviceBrand = (typeof LEADCHEF_DEVICE_BRANDS)[number];
