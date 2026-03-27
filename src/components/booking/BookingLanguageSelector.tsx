import { Globe } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { supportedLanguages } from '@/i18n';
import { cn } from '@/lib/utils';

interface Props {
  className?: string;
}

export function BookingLanguageSelector({ className }: Props) {
  const { i18n } = useTranslation();
  const current = i18n.language?.slice(0, 2) || 'pt';

  return (
    <div className={cn('flex items-center gap-1', className)}>
      <Globe className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
      {supportedLanguages.map((lang) => (
        <button
          key={lang.code}
          onClick={() => i18n.changeLanguage(lang.code)}
          className={cn(
            'px-2 py-1 rounded-md text-xs font-medium transition-all',
            current === lang.code
              ? 'bg-foreground/10 text-foreground'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted/80',
          )}
          title={lang.label}
        >
          {lang.flag}
        </button>
      ))}
    </div>
  );
}
