import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { 
  Target, 
  MoreHorizontal, 
  Search, 
  Edit, 
  Trash2, 
  Users,
  Filter
} from 'lucide-react';
import { useMarketingSegments, useDeleteSegment } from '@/hooks/useMarketingSegments';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';
import { SegmentFormDialog } from './SegmentFormDialog';
import { SegmentContactCount } from './SegmentContactCount';
import type { MarketingSegment } from '@/types/marketing';

interface MarketingSegmentsListProps {
  onCreateNew: () => void;
}

export function MarketingSegmentsList({ onCreateNew }: MarketingSegmentsListProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSegment, setSelectedSegment] = useState<MarketingSegment | null>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [segmentToDelete, setSegmentToDelete] = useState<string | null>(null);

  const { data: segments = [], isLoading } = useMarketingSegments();
  const deleteSegment = useDeleteSegment();

  const filteredSegments = segments.filter(
    (s) =>
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleEdit = (segment: MarketingSegment) => {
    setSelectedSegment(segment);
    setShowEditDialog(true);
  };

  const handleDelete = (id: string) => {
    setSegmentToDelete(id);
    setShowDeleteDialog(true);
  };

  const confirmDelete = async () => {
    if (segmentToDelete) {
      await deleteSegment.mutateAsync(segmentToDelete);
      setShowDeleteDialog(false);
      setSegmentToDelete(null);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto" />
          <p className="mt-4 text-muted-foreground">A carregar segmentos...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                Segmentos
              </CardTitle>
              <CardDescription>
                Organiza os teus contactos em grupos para campanhas direcionadas
              </CardDescription>
            </div>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Pesquisar segmentos..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredSegments.length === 0 ? (
            <div className="text-center py-12">
              <Target className="h-12 w-12 mx-auto text-muted-foreground/50" />
              <p className="mt-4 text-muted-foreground">
                {searchQuery ? 'Nenhum segmento encontrado' : 'Ainda não criaste nenhum segmento'}
              </p>
              {!searchQuery && (
                <Button onClick={onCreateNew} className="mt-4">
                  <Target className="h-4 w-4 mr-2" />
                  Criar Primeiro Segmento
                </Button>
              )}
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredSegments.map((segment) => (
                <Card key={segment.id} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-base">{segment.name}</CardTitle>
                        {segment.description && (
                          <CardDescription className="text-sm mt-1">
                            {segment.description}
                          </CardDescription>
                        )}
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEdit(segment)}>
                            <Edit className="h-4 w-4 mr-2" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => handleDelete(segment.id)}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Eliminar
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="flex items-center justify-between text-sm">
                      <SegmentContactCount segment={segment} />
                      <Badge variant={segment.isDynamic ? 'default' : 'secondary'}>
                        {segment.isDynamic ? 'Dinâmico' : 'Estático'}
                      </Badge>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-1">
                      {segment.filterRules?.conditions?.slice(0, 3).map((condition, index) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          <Filter className="h-3 w-3 mr-1" />
                          {condition.field}
                        </Badge>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground mt-3">
                      Criado em {format(new Date(segment.createdAt), "d MMM yyyy", { locale: pt })}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <SegmentFormDialog
        open={showEditDialog}
        onOpenChange={setShowEditDialog}
        segment={selectedSegment}
        onClose={() => {
          setShowEditDialog(false);
          setSelectedSegment(null);
        }}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar Segmento?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O segmento será permanentemente eliminado.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
