import { useMemo, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Users, Search, Mail, Building2, UserRound, UserCheck } from 'lucide-react';
import { useSegmentContacts } from '@/hooks/useMarketingSegments';
import type { MarketingSegment } from '@/types/marketing';

interface SegmentMembersDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  segment: MarketingSegment | null;
}

const TYPE_LABELS = {
  contact: 'Contacto',
  lead: 'Lead',
  company: 'Empresa',
};

const TYPE_ICONS = {
  contact: UserRound,
  lead: UserCheck,
  company: Building2,
};

export function SegmentMembersDialog({ open, onOpenChange, segment }: SegmentMembersDialogProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const { data, isLoading } = useSegmentContacts(open ? segment?.id : undefined);

  const members = data?.contacts ?? [];

  const filteredMembers = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return members;

    return members.filter((member) => {
      return (
        member.name.toLowerCase().includes(query) ||
        (member.email ?? '').toLowerCase().includes(query) ||
        TYPE_LABELS[member.type].toLowerCase().includes(query)
      );
    });
  }, [members, searchQuery]);

  if (!segment) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Lista do Segmento
          </DialogTitle>
          <DialogDescription>
            {segment.name} · {data?.count ?? members.length} {data?.count === 1 ? 'registo' : 'registos'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Pesquisar por nome, email ou tipo..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          {isLoading ? (
            <div className="py-10 text-center text-muted-foreground">A carregar lista do segmento...</div>
          ) : filteredMembers.length === 0 ? (
            <div className="py-10 text-center text-muted-foreground">
              {members.length === 0 ? 'Este segmento não tem registos.' : 'Nenhum resultado para a pesquisa.'}
            </div>
          ) : (
            <div className="max-h-[55vh] overflow-y-auto space-y-2 pr-1">
              {filteredMembers.map((member) => {
                const TypeIcon = TYPE_ICONS[member.type];

                return (
                  <div
                    key={`${member.type}-${member.id}`}
                    className="flex items-center gap-3 rounded-md border p-3"
                  >
                    <Badge variant="outline" className="shrink-0 flex items-center gap-1">
                      <TypeIcon className="h-3.5 w-3.5" />
                      {TYPE_LABELS[member.type]}
                    </Badge>

                    <div className="min-w-0">
                      <p className="font-medium truncate">{member.name}</p>
                      <p className="text-sm text-muted-foreground truncate flex items-center gap-1.5">
                        <Mail className="h-3.5 w-3.5 shrink-0" />
                        {member.email || 'Sem email'}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
