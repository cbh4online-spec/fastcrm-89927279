import { useTranslation } from 'react-i18next';
import { supportedLanguages } from '@/i18n';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Globe } from 'lucide-react';

interface LanguageSelectorProps {
  variant?: 'ghost' | 'outline';
  showLabel?: boolean;
  className?: string;
}

export function LanguageSelector({ variant = 'ghost', showLabel = false, className }: LanguageSelectorProps) {
  const { i18n } = useTranslation();
  const currentLang = supportedLanguages.find((l) => l.code === i18n.language) || supportedLanguages[0];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant={variant} size={showLabel ? 'sm' : 'icon'} className={className}>
          <span className="text-base leading-none">{currentLang.flag}</span>
          {showLabel && <span className="ml-1.5 text-xs">{currentLang.code.toUpperCase()}</span>}
          {!showLabel && <Globe className="h-4 w-4 sr-only" />}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[140px]">
        {supportedLanguages.map((lang) => (
          <DropdownMenuItem
            key={lang.code}
            onClick={() => i18n.changeLanguage(lang.code)}
            className={i18n.language === lang.code ? 'bg-accent' : ''}
          >
            <span className="text-base mr-2">{lang.flag}</span>
            <span className="text-sm">{lang.label}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
