import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspace } from '@/contexts/WorkspaceContext';

export interface CategorySuggestionItem {
  product_name: string;
  category: string;
  subcategory: string;
  is_new_category: boolean;
  confidence: 'high' | 'medium' | 'low';
  accepted?: boolean;
}

export function useFeedCategorySuggestions() {
  const { currentWorkspace } = useWorkspace();
  const [suggestions, setSuggestions] = useState<CategorySuggestionItem[]>([]);

  const suggestCategories = useMutation({
    mutationFn: async (productNames: string[]) => {
      if (!currentWorkspace?.id) throw new Error('No workspace');
      const { data, error } = await supabase.functions.invoke('ai-category-suggest', {
        body: {
          product_names: productNames,
          workspace_id: currentWorkspace.id,
        },
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'AI suggestion failed');
      return data.suggestions as CategorySuggestionItem[];
    },
    onSuccess: (data) => {
      setSuggestions(data.map((s: CategorySuggestionItem) => ({ ...s, accepted: true })));
    },
  });

  const toggleSuggestion = (index: number) => {
    setSuggestions(prev =>
      prev.map((s, i) => (i === index ? { ...s, accepted: !s.accepted } : s))
    );
  };

  const updateSuggestion = (index: number, updates: Partial<CategorySuggestionItem>) => {
    setSuggestions(prev =>
      prev.map((s, i) => (i === index ? { ...s, ...updates } : s))
    );
  };

  const acceptedSuggestions = suggestions.filter(s => s.accepted);

  const clearSuggestions = () => setSuggestions([]);

  return {
    suggestions,
    acceptedSuggestions,
    suggestCategories,
    toggleSuggestion,
    updateSuggestion,
    clearSuggestions,
    isLoading: suggestCategories.isPending,
  };
}
