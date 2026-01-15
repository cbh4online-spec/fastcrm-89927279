import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  Users, 
  Plus, 
  Search,
  Settings,
  Power,
  MessageCircle,
  Briefcase,
  GraduationCap,
  Heart,
  Wrench,
  ChevronRight
} from 'lucide-react';
import { AIPersona, PERSONA_TYPES, TONE_OPTIONS } from '@/types/knowledge-base';
import { cn } from '@/lib/utils';

interface PersonaListProps {
  personas: AIPersona[];
  isLoading?: boolean;
  onSelect?: (persona: AIPersona) => void;
  onCreateNew?: () => void;
}

const PERSONA_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  atendimento: MessageCircle,
  comercial: Briefcase,
  formador: GraduationCap,
  terapeuta: Heart,
  suporte: Wrench
};

export function PersonaList({ 
  personas, 
  isLoading,
  onSelect,
  onCreateNew
}: PersonaListProps) {
  const [search, setSearch] = useState('');

  const filtered = personas.filter(p => 
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.description?.toLowerCase().includes(search.toLowerCase())
  );

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Personas IA
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="p-4 border rounded-lg animate-pulse">
                <div className="h-5 w-40 bg-muted rounded mb-2" />
                <div className="h-4 w-60 bg-muted rounded" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5 text-purple-500" />
          Personas IA
        </CardTitle>
        <Button onClick={onCreateNew} size="sm" variant="outline">
          <Plus className="h-4 w-4 mr-1" />
          Nova Persona
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Pesquisar personas..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Empty State */}
        {filtered.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <Users className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p className="font-medium">Sem personas configuradas.</p>
            <p className="text-sm mb-4">
              Cria personas para definir como a IA deve comunicar.
            </p>
            <Button onClick={onCreateNew} variant="outline">
              <Plus className="h-4 w-4 mr-1" />
              Criar Persona
            </Button>
          </div>
        )}

        {/* List */}
        <div className="space-y-3">
          {filtered.map((persona) => {
            const typeConfig = PERSONA_TYPES[persona.personaType as keyof typeof PERSONA_TYPES];
            const IconComponent = PERSONA_ICONS[persona.personaType] || MessageCircle;

            return (
              <div
                key={persona.id}
                className={cn(
                  "p-4 border rounded-lg cursor-pointer transition-all hover:shadow-md hover:border-purple-300",
                  !persona.isActive && "opacity-60"
                )}
                onClick={() => onSelect?.(persona)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className={cn(
                      "h-10 w-10 rounded-full flex items-center justify-center",
                      persona.isActive 
                        ? "bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400" 
                        : "bg-muted text-muted-foreground"
                    )}>
                      <IconComponent className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium">{persona.name}</h3>
                        {!persona.isActive && (
                          <Badge variant="outline" className="text-xs">Inativa</Badge>
                        )}
                      </div>
                      {persona.description && (
                        <p className="text-sm text-muted-foreground mt-0.5">
                          {persona.description}
                        </p>
                      )}
                      <div className="flex items-center gap-2 mt-2">
                        <Badge variant="secondary" className="text-xs">
                          {TONE_OPTIONS[persona.toneOfVoice as keyof typeof TONE_OPTIONS] || persona.toneOfVoice}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {persona.technicalDepth === 'high' ? 'Técnico' : 
                           persona.technicalDepth === 'medium' ? 'Médio' : 'Simples'}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </div>

                {/* Knowledge Bases */}
                {persona.knowledgeBaseIds && persona.knowledgeBaseIds.length > 0 && (
                  <div className="mt-3 text-xs text-muted-foreground">
                    Usa {persona.knowledgeBaseIds.length} base(s) de conhecimento
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Info */}
        <div className="text-xs text-muted-foreground text-center pt-2 border-t">
          Escolhe como a IA deve falar em cada contexto.
        </div>
      </CardContent>
    </Card>
  );
}
