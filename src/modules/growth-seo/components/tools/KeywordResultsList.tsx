import { useState, useMemo } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Download, Lock } from 'lucide-react';
import { KeywordResultCard } from './KeywordResultCard';
import { KeywordUnlockCTA } from './KeywordUnlockCTA';
import { useTracking } from '../../hooks/useTracking';
import type { KeywordCategories, KeywordResult } from '../../types/keywords';

interface KeywordResultsListProps {
  keywords: KeywordCategories;
  previewLimit: number;
  isAuthenticated: boolean;
  onUnlockClick: () => void;
}

type TabValue = 'all' | 'main' | 'long-tail' | 'questions';

export function KeywordResultsList({ 
  keywords, 
  previewLimit, 
  isAuthenticated,
  onUnlockClick 
}: KeywordResultsListProps) {
  const [activeTab, setActiveTab] = useState<TabValue>('all');
  const { trackCTAClick } = useTracking();

  const allKeywords = useMemo(() => {
    return [
      ...keywords.main,
      ...keywords.long_tail,
      ...keywords.questions,
    ];
  }, [keywords]);

  const getKeywordsByTab = (tab: TabValue): KeywordResult[] => {
    switch (tab) {
      case 'main':
        return keywords.main;
      case 'long-tail':
        return keywords.long_tail;
      case 'questions':
        return keywords.questions;
      default:
        return allKeywords;
    }
  };

  const currentKeywords = getKeywordsByTab(activeTab);
  const visibleLimit = isAuthenticated ? currentKeywords.length : previewLimit;

  const handleExportClick = () => {
    if (!isAuthenticated) {
      trackCTAClick({
        cta_type: 'export_gated',
        placement: 'results_list',
        page_type: 'tool',
      });
      onUnlockClick();
      return;
    }
    
    // Export logic for authenticated users
    const csvContent = currentKeywords
      .map(k => `"${k.keyword}","${k.type}","${k.estimated_volume}","${k.difficulty}","${k.intent}"`)
      .join('\n');
    
    const blob = new Blob([`"Keyword","Type","Volume","Difficulty","Intent"\n${csvContent}`], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'keywords.csv';
    a.click();
  };

  const handleCopy = (keyword: string) => {
    trackCTAClick({
      cta_type: 'copy_keyword',
      placement: 'results_list',
      page_type: 'tool',
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-lg">
          {currentKeywords.length} Keywords Encontradas
        </h3>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={handleExportClick}
          className="gap-2"
        >
          {isAuthenticated ? (
            <>
              <Download className="w-4 h-4" />
              Exportar CSV
            </>
          ) : (
            <>
              <Lock className="w-4 h-4" />
              Exportar (Premium)
            </>
          )}
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabValue)}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="all">
            Todas ({allKeywords.length})
          </TabsTrigger>
          <TabsTrigger value="main">
            Principais ({keywords.main.length})
          </TabsTrigger>
          <TabsTrigger value="long-tail">
            Long-tail ({keywords.long_tail.length})
          </TabsTrigger>
          <TabsTrigger value="questions">
            Perguntas ({keywords.questions.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-4">
          <div className="space-y-2">
            {currentKeywords.slice(0, visibleLimit).map((keyword, index) => (
              <KeywordResultCard 
                key={`${keyword.keyword}-${index}`}
                keyword={keyword}
                onCopy={handleCopy}
              />
            ))}

            {currentKeywords.slice(visibleLimit).map((keyword, index) => (
              <KeywordResultCard 
                key={`blurred-${keyword.keyword}-${index}`}
                keyword={keyword}
                isBlurred
              />
            ))}
          </div>

          {!isAuthenticated && currentKeywords.length > previewLimit && (
            <KeywordUnlockCTA 
              totalCount={currentKeywords.length}
              visibleCount={previewLimit}
              onUnlock={onUnlockClick}
            />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
