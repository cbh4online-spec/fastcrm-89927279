export type BuilderAssetType =
  | "site"
  | "landing"
  | "funnel"
  | "form"
  | "newsletter";

export type BuilderAssetStatus = "draft" | "published" | "archived";

export interface BuilderAsset {
  id: string;
  workspace_id: string;
  type: BuilderAssetType;
  status: BuilderAssetStatus;
  name: string;
  slug: string;
  description: string | null;
  html: string;
  css: string | null;
  metadata: Record<string, unknown>;
  thumbnail_url: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export const BUILDER_ASSET_TYPES: {
  value: BuilderAssetType;
  label: string;
  description: string;
}[] = [
  { value: "site", label: "Site", description: "Website multi-página" },
  { value: "landing", label: "Landing Page", description: "Página única de conversão" },
  { value: "funnel", label: "Funil", description: "Sequência multi-passo" },
  { value: "form", label: "Formulário", description: "Smart-form embebido" },
  { value: "newsletter", label: "Newsletter", description: "Template de email" },
];
