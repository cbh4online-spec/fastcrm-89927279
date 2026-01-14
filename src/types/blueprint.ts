import { FormSchema } from './formSchema';

export interface BlueprintCustomField {
  name: string;
  type: 'text' | 'textarea' | 'number' | 'currency' | 'date' | 'datetime' | 'boolean' | 'select' | 'multiselect' | 'email' | 'phone' | 'url';
  required: boolean;
  options?: { label: string; value: string }[];
  sourceFieldId?: string;
  mappingRule?: string;
}

export interface BlueprintSection {
  id: string;
  name: string;
  description?: string;
  fields: string[];
  collapsed?: boolean;
}

export interface BlueprintPipelineStage {
  name: string;
  color: string;
  position: number;
  description?: string;
}

export interface BlueprintAutomation {
  name: string;
  description: string;
  trigger: string;
  conditions: { field: string; operator: string; value: string }[];
  actions: { type: string; config: Record<string, unknown> }[];
}

export interface BlueprintDedupeRule {
  field: string;
  priority: number;
  matchType: 'exact' | 'fuzzy' | 'normalized';
}

export interface CrmBlueprint {
  id: string;
  version: number;
  name: string;
  description?: string;
  entityType: 'lead' | 'contact' | 'opportunity';
  customFields: BlueprintCustomField[];
  sections: BlueprintSection[];
  pipelineStages?: BlueprintPipelineStage[];
  automations: BlueprintAutomation[];
  dedupeRules: BlueprintDedupeRule[];
  mappingRules: { sourceField: string; targetField: string; transform?: string }[];
  sourceFormSchema?: FormSchema;
  metadata: {
    createdAt: string;
    updatedAt: string;
    createdBy?: string;
    status: 'draft' | 'active' | 'archived';
  };
}

export interface BlueprintClarifyingQuestion {
  id: string;
  question: string;
  type: 'single' | 'multiple' | 'text';
  options?: { label: string; value: string }[];
  answer?: string | string[];
}

export interface BlueprintGenerationRequest {
  formSchema?: FormSchema;
  naturalLanguageDescription?: string;
  clarifyingAnswers?: Record<string, string | string[]>;
}

export interface BlueprintGenerationResponse {
  needsClarification: boolean;
  questions?: BlueprintClarifyingQuestion[];
  blueprint?: CrmBlueprint;
  confidence?: number;
  explanation?: string;
}
