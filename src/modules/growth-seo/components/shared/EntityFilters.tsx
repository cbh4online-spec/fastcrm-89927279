import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Search, Filter, X } from 'lucide-react';
import { useState } from 'react';

interface EntityFiltersProps {
  onSearch?: (query: string) => void;
  onIntentFilter?: (intent: string | null) => void;
  showIntentFilter?: boolean;
  placeholder?: string;
}

export function EntityFilters({
  onSearch,
  onIntentFilter,
  showIntentFilter = true,
  placeholder = 'Pesquisar...',
}: EntityFiltersProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [intent, setIntent] = useState<string>('all');

  const handleSearch = (value: string) => {
    setSearchQuery(value);
    onSearch?.(value);
  };

  const handleIntentChange = (value: string) => {
    setIntent(value);
    onIntentFilter?.(value === 'all' ? null : value);
  };

  const clearFilters = () => {
    setSearchQuery('');
    setIntent('all');
    onSearch?.('');
    onIntentFilter?.(null);
  };

  const hasActiveFilters = searchQuery || intent !== 'all';

  return (
    <div className="flex flex-col sm:flex-row gap-4 mb-8">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder={placeholder}
          value={searchQuery}
          onChange={(e) => handleSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {showIntentFilter && (
        <Select value={intent} onValueChange={handleIntentChange}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Filtrar por tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os tipos</SelectItem>
            <SelectItem value="informational">Informativo</SelectItem>
            <SelectItem value="commercial">Comercial</SelectItem>
            <SelectItem value="transactional">Transacional</SelectItem>
          </SelectContent>
        </Select>
      )}

      {hasActiveFilters && (
        <Button
          variant="ghost"
          size="icon"
          onClick={clearFilters}
          className="shrink-0"
        >
          <X className="h-4 w-4" />
          <span className="sr-only">Limpar filtros</span>
        </Button>
      )}
    </div>
  );
}
