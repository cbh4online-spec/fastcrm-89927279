import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useTracking } from './useTracking';
import type { 
  GenerateKeywordsRequest, 
  KeywordCategories, 
  GenerateKeywordsResponse 
} from '../types/keywords';

interface UseKeywordGeneratorReturn {
  keywords: KeywordCategories | null;
  seedKeyword: string;
  totalCount: number;
  previewLimit: number;
  isGenerating: boolean;
  error: string | null;
  generateKeywords: (params: GenerateKeywordsRequest) => Promise<void>;
  clearKeywords: () => void;
  isAuthenticated: boolean;
}

export function useKeywordGenerator(): UseKeywordGeneratorReturn {
  const [keywords, setKeywords] = useState<KeywordCategories | null>(null);
  const [seedKeyword, setSeedKeyword] = useState('');
  const [totalCount, setTotalCount] = useState(0);
  const [previewLimit, setPreviewLimit] = useState(5);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const { 
    trackToolRunStarted, 
    trackToolRunCompleted,
    trackCTAClick,
  } = useTracking();

  const checkAuth = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    setIsAuthenticated(!!session);
    return !!session;
  }, []);

  const generateKeywords = useCallback(async (params: GenerateKeywordsRequest) => {
    if (!params.seed_keyword || params.seed_keyword.trim().length < 2) {
      setError('Keyword must be at least 2 characters');
      return;
    }

    setIsGenerating(true);
    setError(null);

    trackToolRunStarted({ 
      tool_name: 'keyword-ideas', 
      input_type: 'text',
    });

    try {
      await checkAuth();

      const { data, error: fnError } = await supabase.functions.invoke('generate-keyword-ideas', {
        body: params,
      });

      if (fnError) {
        throw new Error(fnError.message || 'Failed to generate keywords');
      }

      const response = data as GenerateKeywordsResponse;

      if (!response.success) {
        throw new Error(response.error || 'Failed to generate keywords');
      }

      setKeywords(response.keywords);
      setSeedKeyword(response.seed_keyword);
      setTotalCount(response.total_count);
      setPreviewLimit(response.preview_limit);

      trackToolRunCompleted({
        tool_name: 'keyword-ideas',
        result_type: 'success',
        results_count: response.total_count,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to generate keywords';
      setError(message);
      
      trackToolRunCompleted({
        tool_name: 'keyword-ideas',
        result_type: 'error',
      });
    } finally {
      setIsGenerating(false);
    }
  }, [checkAuth, trackToolRunStarted, trackToolRunCompleted]);

  const clearKeywords = useCallback(() => {
    setKeywords(null);
    setSeedKeyword('');
    setTotalCount(0);
    setError(null);
  }, []);

  return {
    keywords,
    seedKeyword,
    totalCount,
    previewLimit,
    isGenerating,
    error,
    generateKeywords,
    clearKeywords,
    isAuthenticated,
  };
}
