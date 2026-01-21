// Credit Intermediation Module Types

export type CreditType = "habitacao" | "pessoal" | "empresarial" | "automovel";

export type ProposalStatus = 
  | "draft"           // Rascunho
  | "collecting_docs" // A recolher documentos
  | "analysis"        // Em análise
  | "submitted"       // Submetida ao banco
  | "bank_analysis"   // Análise bancária
  | "pre_approved"    // Pré-aprovada
  | "approved"        // Aprovada
  | "signing"         // Em assinatura
  | "funded"          // Financiada
  | "rejected"        // Rejeitada
  | "canceled";       // Cancelada

export type RiskLevel = "low" | "medium" | "high";

export type DocumentType = 
  | "irs"
  | "salary_receipt"
  | "bank_statement"
  | "id_card"
  | "employment_contract"
  | "property_deed"
  | "vehicle_docs"
  | "business_license"
  | "financial_statements"
  | "other";

// Financial Profile
export interface FinancialProfile {
  id: string;
  entity_type: "contact" | "company";
  entity_id: string;
  workspace_id: string;
  
  // Income
  monthly_income: number;
  annual_income: number;
  income_type: "employment" | "self_employed" | "business" | "rental" | "pension" | "other";
  income_stability: "stable" | "variable" | "seasonal";
  
  // Expenses & Liabilities
  monthly_expenses: number;
  existing_credits: ExistingCredit[];
  total_monthly_installments: number;
  
  // Calculated Metrics
  effort_rate: number; // Taxa de esforço
  disposable_income: number;
  debt_to_income_ratio: number;
  
  // Assets
  assets: Asset[];
  total_assets_value: number;
  
  // Credit Score (AI calculated)
  credit_score?: number;
  score_factors?: string[];
  score_calculated_at?: string;
  
  // Metadata
  verified_at?: string;
  verified_by?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface ExistingCredit {
  id: string;
  type: CreditType;
  bank: string;
  original_amount: number;
  current_balance: number;
  monthly_installment: number;
  interest_rate: number;
  end_date: string;
  can_consolidate: boolean;
}

export interface Asset {
  id: string;
  type: "property" | "vehicle" | "savings" | "investments" | "other";
  description: string;
  estimated_value: number;
  is_collateral: boolean;
}

// Credit Proposal
export interface CreditProposal {
  id: string;
  workspace_id: string;
  reference_number: string;
  
  // Client
  entity_type: "contact" | "company";
  entity_id: string;
  entity_name: string;
  
  // Credit Details
  credit_type: CreditType;
  purpose: string;
  amount_requested: number;
  term_months: number;
  
  // Property Details (for habitacao)
  property_value?: number;
  property_location?: string;
  ltv_ratio?: number;
  
  // Vehicle Details (for automovel)
  vehicle_brand?: string;
  vehicle_model?: string;
  vehicle_year?: number;
  vehicle_value?: number;
  
  // Status & Workflow
  status: ProposalStatus;
  status_history: StatusChange[];
  current_stage_since: string;
  
  // Bank Submissions
  bank_submissions: BankSubmission[];
  selected_bank_id?: string;
  
  // Approved Terms
  approved_amount?: number;
  approved_rate?: number;
  approved_term?: number;
  approved_monthly_payment?: number;
  approved_taeg?: number;
  
  // AI Analysis
  ai_viability_score?: number;
  ai_approval_probability?: number;
  ai_recommended_banks?: string[];
  ai_risk_assessment?: string;
  ai_optimization_tips?: string[];
  ai_analyzed_at?: string;
  
  // Documents
  required_documents: RequiredDocument[];
  documents_complete: boolean;
  
  // Commission
  commission_amount?: number;
  commission_paid?: boolean;
  commission_paid_at?: string;
  
  // Metadata
  assigned_to?: string;
  created_by: string;
  notes?: string;
  tags?: string[];
  created_at: string;
  updated_at: string;
}

export interface StatusChange {
  from_status: ProposalStatus;
  to_status: ProposalStatus;
  changed_at: string;
  changed_by: string;
  notes?: string;
}

export interface RequiredDocument {
  id: string;
  type: DocumentType;
  name: string;
  is_required: boolean;
  is_uploaded: boolean;
  file_url?: string;
  uploaded_at?: string;
  verified?: boolean;
  ai_extracted_data?: Record<string, unknown>;
}

// Bank Partnership
export interface BankPartner {
  id: string;
  workspace_id: string;
  
  name: string;
  logo_url?: string;
  is_active: boolean;
  
  // Contact
  contact_name?: string;
  contact_email?: string;
  contact_phone?: string;
  
  // Credit Types Offered
  credit_types: CreditType[];
  
  // Terms by Credit Type
  terms: BankTerms[];
  
  // Performance Metrics
  avg_approval_rate?: number;
  avg_processing_days?: number;
  total_proposals_submitted?: number;
  total_funded?: number;
  
  // Commission Structure
  commission_rates: CommissionRate[];
  
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface BankTerms {
  credit_type: CreditType;
  min_amount: number;
  max_amount: number;
  min_term_months: number;
  max_term_months: number;
  min_rate: number;
  max_rate: number;
  max_ltv?: number; // For habitacao
  max_effort_rate: number;
  requirements: string[];
}

export interface CommissionRate {
  credit_type: CreditType;
  rate_percentage: number;
  min_amount?: number;
  max_amount?: number;
  bonus_conditions?: string;
}

export interface BankSubmission {
  id: string;
  bank_id: string;
  bank_name: string;
  submitted_at: string;
  status: "pending" | "in_analysis" | "approved" | "rejected" | "counter_proposal";
  
  // Response
  response_at?: string;
  approved_amount?: number;
  approved_rate?: number;
  approved_term?: number;
  monthly_payment?: number;
  taeg?: number;
  rejection_reason?: string;
  counter_conditions?: string;
  
  // Decision
  is_selected?: boolean;
  decision_at?: string;
  decision_notes?: string;
}

// Credit Simulation
export interface CreditSimulation {
  id: string;
  workspace_id: string;
  
  // Input
  credit_type: CreditType;
  amount: number;
  term_months: number;
  interest_rate: number;
  
  // Property (if habitacao)
  property_value?: number;
  down_payment?: number;
  
  // Results
  monthly_payment: number;
  total_interest: number;
  total_amount: number;
  taeg: number;
  ltv?: number;
  
  // Comparison Results
  bank_comparisons?: SimulationBankResult[];
  
  // Client
  entity_type?: "contact" | "company";
  entity_id?: string;
  
  created_at: string;
}

export interface SimulationBankResult {
  bank_id: string;
  bank_name: string;
  rate: number;
  monthly_payment: number;
  total_amount: number;
  taeg: number;
  is_best_rate: boolean;
  is_lowest_payment: boolean;
  estimated_approval_chance: number;
}

// AI Analysis Results
export interface AIViabilityAnalysis {
  proposal_id: string;
  analyzed_at: string;
  
  // Overall Score
  viability_score: number; // 0-100
  approval_probability: number; // 0-100
  risk_level: RiskLevel;
  
  // Factors Analysis
  positive_factors: AnalysisFactor[];
  negative_factors: AnalysisFactor[];
  neutral_factors: AnalysisFactor[];
  
  // Bank Matching
  recommended_banks: BankRecommendation[];
  
  // Optimization
  optimization_suggestions: OptimizationSuggestion[];
  
  // Document Analysis
  document_completeness: number;
  missing_critical_docs: string[];
  
  // Risk Breakdown
  income_stability_score: number;
  debt_capacity_score: number;
  collateral_score?: number;
  credit_history_score?: number;
  
  summary: string;
}

export interface AnalysisFactor {
  factor: string;
  impact: "high" | "medium" | "low";
  description: string;
}

export interface BankRecommendation {
  bank_id: string;
  bank_name: string;
  match_score: number;
  approval_probability: number;
  estimated_rate: number;
  reasoning: string;
}

export interface OptimizationSuggestion {
  type: "reduce_amount" | "extend_term" | "add_guarantor" | "consolidate_debts" | "increase_down_payment" | "other";
  title: string;
  description: string;
  potential_impact: string;
  priority: "high" | "medium" | "low";
}

// Dashboard Stats
export interface CreditDashboardStats {
  // Pipeline
  proposals_by_status: Record<ProposalStatus, number>;
  total_pipeline_value: number;
  
  // Performance
  total_funded_this_month: number;
  total_funded_value_this_month: number;
  avg_processing_days: number;
  approval_rate: number;
  
  // Commission
  total_commission_this_month: number;
  pending_commission: number;
  
  // By Type
  proposals_by_type: Record<CreditType, number>;
  funded_by_type: Record<CreditType, number>;
  
  // Top Banks
  top_banks: {
    bank_id: string;
    bank_name: string;
    proposals: number;
    funded: number;
    funded_value: number;
  }[];
}

// Display Constants
export const CREDIT_TYPE_LABELS: Record<CreditType, string> = {
  habitacao: "Crédito Habitação",
  pessoal: "Crédito Pessoal",
  empresarial: "Crédito Empresarial",
  automovel: "Crédito Automóvel",
};

export const CREDIT_TYPE_ICONS: Record<CreditType, string> = {
  habitacao: "Home",
  pessoal: "User",
  empresarial: "Building2",
  automovel: "Car",
};

export const PROPOSAL_STATUS_LABELS: Record<ProposalStatus, string> = {
  draft: "Rascunho",
  collecting_docs: "A Recolher Docs",
  analysis: "Em Análise",
  submitted: "Submetida",
  bank_analysis: "Análise Bancária",
  pre_approved: "Pré-Aprovada",
  approved: "Aprovada",
  signing: "Em Assinatura",
  funded: "Financiada",
  rejected: "Rejeitada",
  canceled: "Cancelada",
};

export const PROPOSAL_STATUS_COLORS: Record<ProposalStatus, string> = {
  draft: "bg-slate-100 text-slate-700",
  collecting_docs: "bg-amber-100 text-amber-700",
  analysis: "bg-blue-100 text-blue-700",
  submitted: "bg-indigo-100 text-indigo-700",
  bank_analysis: "bg-purple-100 text-purple-700",
  pre_approved: "bg-emerald-100 text-emerald-700",
  approved: "bg-green-100 text-green-700",
  signing: "bg-cyan-100 text-cyan-700",
  funded: "bg-green-500 text-white",
  rejected: "bg-red-100 text-red-700",
  canceled: "bg-gray-100 text-gray-500",
};

export const DOCUMENT_TYPE_LABELS: Record<DocumentType, string> = {
  irs: "Declaração IRS",
  salary_receipt: "Recibo de Vencimento",
  bank_statement: "Extrato Bancário",
  id_card: "Cartão de Cidadão",
  employment_contract: "Contrato de Trabalho",
  property_deed: "Escritura do Imóvel",
  vehicle_docs: "Documentos do Veículo",
  business_license: "Licença de Atividade",
  financial_statements: "Demonstrações Financeiras",
  other: "Outro",
};
