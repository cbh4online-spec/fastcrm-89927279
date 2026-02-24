import { Users, Building2, Kanban, LucideIcon } from "lucide-react";

export interface ObjectRegistryEntry {
  slug: string;
  label: string;
  labelPt: string;
  icon: LucideIcon;
  table: string;
  color: string;
  description: string;
  objectsPath: string;
  objectsDetailPath: string;
  legacyListPath: string;
  legacyDetailPath: string;
}

export const OBJECT_REGISTRY: Record<string, ObjectRegistryEntry> = {
  contacts: {
    slug: "contacts",
    label: "Contacts",
    labelPt: "Contatos",
    icon: Users,
    table: "contacts",
    color: "text-blue-600",
    description: "Pessoas e indivíduos no seu CRM",
    objectsPath: "/objects/contacts",
    objectsDetailPath: "/objects/contacts/:id",
    legacyListPath: "/dashboard/contacts",
    legacyDetailPath: "/dashboard/contacts/:id",
  },
  companies: {
    slug: "companies",
    label: "Companies",
    labelPt: "Empresas",
    icon: Building2,
    table: "companies",
    color: "text-emerald-600",
    description: "Organizações e empresas parceiras",
    objectsPath: "/objects/companies",
    objectsDetailPath: "/objects/companies/:id",
    legacyListPath: "/dashboard/companies",
    legacyDetailPath: "/dashboard/companies/:id",
  },
  deals: {
    slug: "deals",
    label: "Deals",
    labelPt: "Negócios",
    icon: Kanban,
    table: "opportunities",
    color: "text-amber-600",
    description: "Oportunidades e pipeline de vendas",
    objectsPath: "/objects/deals",
    objectsDetailPath: "/objects/deals/:id",
    legacyListPath: "/dashboard/opportunities",
    legacyDetailPath: "/dashboard/opportunities/:id",
  },
};

export const OBJECT_TYPES = Object.keys(OBJECT_REGISTRY);

export function getObjectConfig(type: string): ObjectRegistryEntry | undefined {
  return OBJECT_REGISTRY[type];
}
