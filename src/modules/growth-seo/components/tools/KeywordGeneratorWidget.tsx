import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, Sparkles, Search, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useKeywordGenerator } from '../../hooks/useKeywordGenerator';
import { KeywordResultsList } from './KeywordResultsList';
import { useTracking } from '../../hooks/useTracking';

interface KeywordGeneratorWidgetProps {
  className?: string;
  showResults?: boolean;
  compact?: boolean;
  initialSeedKeyword?: string;
  autoFocus?: boolean;
  placement?: 'hero' | 'inline' | 'page' | 'widget';
}

const countries = [
  { value: 'PT', label: '🇵🇹 Portugal' },
  { value: 'BR', label: '🇧🇷 Brasil' },
  { value: 'US', label: '🇺🇸 Estados Unidos' },
  { value: 'ES', label: '🇪🇸 Espanha' },
  { value: 'UK', label: '🇬🇧 Reino Unido' },
];

const languages = [
  { value: 'pt', label: 'Português' },
  { value: 'en', label: 'English' },
  { value: 'es', label: 'Español' },
];

export function KeywordGeneratorWidget({ 
  className = '', 
  showResults = true,
  compact = false,
  initialSeedKeyword = '',
  autoFocus = false,
  placement = 'widget'
}: KeywordGeneratorWidgetProps) {
  const [seedKeyword, setSeedKeyword] = useState(initialSeedKeyword);
  const [country, setCountry] = useState<string>('');
  const [language, setLanguage] = useState<string>('');
  const navigate = useNavigate();
  const { trackCTAClick } = useTracking();

  const {
    keywords,
    totalCount,
    previewLimit,
    isGenerating,
    error,
    generateKeywords,
    isAuthenticated,
  } = useKeywordGenerator();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!seedKeyword.trim()) return;

    trackCTAClick({
      cta_type: 'generate_keywords',
      placement: 'widget',
      page_type: 'tool',
    });

    await generateKeywords({
      seed_keyword: seedKeyword.trim(),
      country: country || undefined,
      language: language || undefined,
    });
  };

  const handleUnlockClick = () => {
    trackCTAClick({
      cta_type: 'unlock_signup',
      placement: 'results',
      page_type: 'tool',
    });
    navigate('/auth');
  };

  return (
    <div className={className}>
      <Card className="p-6 bg-gradient-to-br from-primary/5 to-transparent border-primary/20">
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="w-5 h-5 text-primary" />
          <h3 className="font-semibold">Gerador de Keyword Ideas</h3>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="seed-keyword">Seed Keyword</Label>
            <div className="relative mt-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="seed-keyword"
                value={seedKeyword}
                onChange={(e) => setSeedKeyword(e.target.value)}
                placeholder="Ex: email marketing, CRM software..."
                className="pl-10"
                disabled={isGenerating}
              />
            </div>
          </div>

          {!compact && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="country">País (opcional)</Label>
                <Select value={country} onValueChange={setCountry}>
                  <SelectTrigger id="country" className="mt-1">
                    <SelectValue placeholder="Selecionar país" />
                  </SelectTrigger>
                  <SelectContent>
                    {countries.map((c) => (
                      <SelectItem key={c.value} value={c.value}>
                        {c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="language">Idioma (opcional)</Label>
                <Select value={language} onValueChange={setLanguage}>
                  <SelectTrigger id="language" className="mt-1">
                    <SelectValue placeholder="Selecionar idioma" />
                  </SelectTrigger>
                  <SelectContent>
                    {languages.map((l) => (
                      <SelectItem key={l.value} value={l.value}>
                        {l.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 text-destructive text-sm">
              <AlertCircle className="w-4 h-4" />
              {error}
            </div>
          )}

          <Button 
            type="submit" 
            className="w-full gap-2"
            disabled={isGenerating || !seedKeyword.trim()}
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                A gerar keywords...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                Gerar Keyword Ideas
              </>
            )}
          </Button>
        </form>
      </Card>

      {showResults && keywords && (
        <div className="mt-6">
          <KeywordResultsList
            keywords={keywords}
            previewLimit={previewLimit}
            isAuthenticated={isAuthenticated}
            onUnlockClick={handleUnlockClick}
          />
        </div>
      )}
    </div>
  );
}
