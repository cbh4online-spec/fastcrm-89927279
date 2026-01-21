// =============================================
// KEYWORD GENERATOR TYPES
// =============================================

export interface GenerateKeywordsRequest {
  seed_keyword: string;
  country?: string;
  language?: string;
  include_questions?: boolean;
  include_long_tail?: boolean;
}

export type KeywordType = 'main' | 'long-tail' | 'question';
export type VolumeIndicator = 'high' | 'medium' | 'low';
export type DifficultyIndicator = 'easy' | 'medium' | 'hard';
export type CPCIndicator = 'low' | 'medium' | 'high';

export interface KeywordResult {
  keyword: string;
  type: KeywordType;
  estimated_volume: VolumeIndicator;
  difficulty: DifficultyIndicator;
  intent: 'informational' | 'commercial' | 'transactional';
  cpc_indicator?: CPCIndicator;
}

export interface KeywordCategories {
  main: KeywordResult[];
  long_tail: KeywordResult[];
  questions: KeywordResult[];
}

export interface GenerateKeywordsResponse {
  success: boolean;
  seed_keyword: string;
  total_count: number;
  keywords: KeywordCategories;
  preview_limit: number;
  error?: string;
}

export interface KeywordGeneratorState {
  keywords: KeywordCategories | null;
  seedKeyword: string;
  totalCount: number;
  previewLimit: number;
  isGenerating: boolean;
  error: string | null;
}
