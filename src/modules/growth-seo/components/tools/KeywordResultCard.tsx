import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { TrendingUp, Target, DollarSign, Copy, Check } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import type { KeywordResult } from '../../types/keywords';

interface KeywordResultCardProps {
  keyword: KeywordResult;
  isBlurred?: boolean;
  onCopy?: (keyword: string) => void;
}

const volumeConfig = {
  high: { label: 'Alto', bars: 3, color: 'text-green-600' },
  medium: { label: 'Médio', bars: 2, color: 'text-yellow-600' },
  low: { label: 'Baixo', bars: 1, color: 'text-gray-500' },
};

const difficultyConfig = {
  easy: { label: 'Fácil', variant: 'outline' as const, className: 'border-green-500 text-green-700' },
  medium: { label: 'Médio', variant: 'outline' as const, className: 'border-yellow-500 text-yellow-700' },
  hard: { label: 'Difícil', variant: 'outline' as const, className: 'border-red-500 text-red-700' },
};

const intentConfig = {
  informational: { label: 'Info', icon: '📚' },
  commercial: { label: 'Comercial', icon: '🔍' },
  transactional: { label: 'Compra', icon: '🛒' },
};

const typeConfig = {
  main: { label: 'Principal', className: 'bg-primary text-primary-foreground' },
  'long-tail': { label: 'Long-tail', className: 'bg-blue-100 text-blue-800' },
  question: { label: 'Pergunta', className: 'bg-purple-100 text-purple-800' },
};

export function KeywordResultCard({ keyword, isBlurred = false, onCopy }: KeywordResultCardProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (isBlurred) return;
    navigator.clipboard.writeText(keyword.keyword);
    setCopied(true);
    onCopy?.(keyword.keyword);
    setTimeout(() => setCopied(false), 2000);
  };

  const volume = volumeConfig[keyword.estimated_volume];
  const difficulty = difficultyConfig[keyword.difficulty];
  const intent = intentConfig[keyword.intent];
  const type = typeConfig[keyword.type];

  return (
    <Card 
      className={cn(
        "p-4 hover:shadow-md transition-shadow cursor-pointer group",
        isBlurred && "select-none"
      )}
      onClick={handleCopy}
    >
      <div className={cn(isBlurred && "blur-sm pointer-events-none")}>
        <div className="flex items-start justify-between gap-2 mb-3">
          <p className="font-medium text-foreground flex-1">{keyword.keyword}</p>
          <button 
            className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-muted rounded"
            onClick={(e) => { e.stopPropagation(); handleCopy(); }}
          >
            {copied ? (
              <Check className="w-4 h-4 text-green-600" />
            ) : (
              <Copy className="w-4 h-4 text-muted-foreground" />
            )}
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Badge className={cn("text-xs", type.className)}>
            {type.label}
          </Badge>

          <div className="flex items-center gap-1" title={`Volume: ${volume.label}`}>
            <TrendingUp className={cn("w-3 h-3", volume.color)} />
            <div className="flex gap-0.5">
              {[1, 2, 3].map((bar) => (
                <div
                  key={bar}
                  className={cn(
                    "w-1 h-3 rounded-sm",
                    bar <= volume.bars ? "bg-current" : "bg-gray-200",
                    volume.color
                  )}
                />
              ))}
            </div>
          </div>

          <Badge variant={difficulty.variant} className={cn("text-xs", difficulty.className)}>
            <Target className="w-3 h-3 mr-1" />
            {difficulty.label}
          </Badge>

          <Badge variant="secondary" className="text-xs">
            {intent.icon} {intent.label}
          </Badge>

          {keyword.cpc_indicator && (
            <Badge variant="outline" className="text-xs">
              <DollarSign className="w-3 h-3 mr-0.5" />
              {keyword.cpc_indicator === 'high' ? '€€€' : keyword.cpc_indicator === 'medium' ? '€€' : '€'}
            </Badge>
          )}
        </div>
      </div>
    </Card>
  );
}
