import { Check, X, Minus } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { ComparisonCriteria, SEOEntity } from '../../types';

interface ComparisonTableProps {
  criteria: ComparisonCriteria[] | undefined;
  entityA?: SEOEntity | null;
  entityB?: SEOEntity | null;
}

function WinnerIcon({ winner }: { winner?: 'a' | 'b' | 'tie' }) {
  if (winner === 'a' || winner === 'b') {
    return <Check className="h-4 w-4 text-green-500" />;
  }
  if (winner === 'tie') {
    return <Minus className="h-4 w-4 text-muted-foreground" />;
  }
  return null;
}

export function ComparisonTable({ criteria, entityA, entityB }: ComparisonTableProps) {
  if (!criteria?.length) return null;

  return (
    <div className="rounded-lg border overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50">
            <TableHead className="w-[200px]">Critério</TableHead>
            <TableHead className="text-center">
              <div className="flex items-center justify-center gap-2">
                <span className="font-semibold">{entityA?.title || 'Opção A'}</span>
              </div>
            </TableHead>
            <TableHead className="text-center">
              <div className="flex items-center justify-center gap-2">
                <span className="font-semibold">{entityB?.title || 'Opção B'}</span>
              </div>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {criteria.map((criterion, index) => (
            <TableRow key={index}>
              <TableCell className="font-medium">{criterion.name}</TableCell>
              <TableCell className="text-center">
                <div className="flex items-center justify-center gap-2">
                  <span>{criterion.entity_a_value}</span>
                  {criterion.winner === 'a' && <WinnerIcon winner="a" />}
                </div>
              </TableCell>
              <TableCell className="text-center">
                <div className="flex items-center justify-center gap-2">
                  <span>{criterion.entity_b_value}</span>
                  {criterion.winner === 'b' && <WinnerIcon winner="b" />}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

interface ComparisonConclusionProps {
  winner: 'a' | 'b' | 'tie' | null | undefined;
  conclusion: string | undefined;
  entityA?: SEOEntity | null;
  entityB?: SEOEntity | null;
}

export function ComparisonConclusion({ winner, conclusion, entityA, entityB }: ComparisonConclusionProps) {
  const getWinnerName = () => {
    if (winner === 'a') return entityA?.title || 'Opção A';
    if (winner === 'b') return entityB?.title || 'Opção B';
    if (winner === 'tie') return 'Empate';
    return null;
  };

  const winnerName = getWinnerName();

  return (
    <div className="mt-8 p-6 rounded-lg bg-muted/50 border">
      <h3 className="text-lg font-semibold mb-4">Conclusão</h3>
      
      {winnerName && winner !== 'tie' && (
        <div className="flex items-center gap-2 mb-4">
          <Check className="h-5 w-5 text-green-500" />
          <span className="font-medium">
            Vencedor: <span className="text-primary">{winnerName}</span>
          </span>
        </div>
      )}
      
      {winner === 'tie' && (
        <div className="flex items-center gap-2 mb-4">
          <Minus className="h-5 w-5 text-muted-foreground" />
          <span className="font-medium">Resultado: Empate técnico</span>
        </div>
      )}

      {conclusion && (
        <p className="text-muted-foreground">{conclusion}</p>
      )}
    </div>
  );
}
