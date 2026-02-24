export interface ExtensionObjectDef {
  type: string;
  label: string;
  labelPt: string;
  icon: string;
  source_table: string;
  color: string;
  description: string;
}

export interface ExtensionFieldDef {
  object_type: string;
  key: string;
  type: "text" | "number" | "date" | "select" | "currency";
  label: string;
}

export interface ExtensionViewDef {
  object_type: string;
  name: string;
  filter: Record<string, unknown>;
}

export interface ExtensionAutomationDef {
  template_key: string;
  label: string;
  description: string;
  trigger: string;
}

export interface ExtensionIntelligenceDef {
  capability: string;
  label: string;
  description: string;
}

export interface ExtensionSettingsPageDef {
  key: string;
  label: string;
  route: string;
}

export interface ExtensionManifest {
  objects?: ExtensionObjectDef[];
  fields?: ExtensionFieldDef[];
  views?: ExtensionViewDef[];
  automations?: ExtensionAutomationDef[];
  intelligence?: ExtensionIntelligenceDef[];
  settings_pages?: ExtensionSettingsPageDef[];
  feature_flags?: string[];
}

export interface ModuleWithManifest {
  slug: string;
  name: string;
  manifest: ExtensionManifest;
}
