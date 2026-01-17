import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Plus, 
  Clock, 
  AlertCircle, 
  RefreshCw,
  Calendar,
  CheckCircle2,
  XCircle,
  Tag,
  Users,
  Download,
  Trash2,
} from 'lucide-react';
import { useAvailability, type UserAvailability, type CreateSlotData, type CreateExceptionData } from '@/hooks/useAvailability';
import { useCalendars } from '@/hooks/useCalendars';
import { AvailabilityCard } from './AvailabilityCard';
import { AvailabilityModal } from './AvailabilityModal';
import { PageHeader } from '@/components/common/PageHeader';
import { Toolbar } from '@/components/common/Toolbar';
import { FilterSidebar, type FilterGroup } from '@/components/common/FilterSidebar';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
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

const PAGE_SIZE_OPTIONS = [9, 18, 27];

export function AvailabilityDashboard() {
  const {
    availabilities,
    isLoading,
    error,
    createAvailability,
    updateAvailability,
    deleteAvailability,
    updateSlots,
    addException,
    removeException,
    assignToCalendar,
    removeCalendarAssignment,
    refresh,
  } = useAvailability();

  const { calendars } = useCalendars();

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedAvailability, setSelectedAvailability] = useState<UserAvailability | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // UI state
  const [showFilterSidebar, setShowFilterSidebar] = useState(true);
  const [activeFilterId, setActiveFilterId] = useState<string | undefined>();
  const [searchValue, setSearchValue] = useState('');
  const [sortValue, setSortValue] = useState('name_asc');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZE_OPTIONS[0]);

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [defaultFilter, setDefaultFilter] = useState<string>('all');

  // Stats
  const stats = useMemo(() => ({
    total: availabilities.length,
    active: availabilities.filter(a => a.is_active).length,
    inactive: availabilities.filter(a => !a.is_active).length,
    default: availabilities.filter(a => a.is_default).length,
  }), [availabilities]);

  // Filter and sort
  const filteredAvailabilities = useMemo(() => {
    let result = [...availabilities];

    // Status filter
    if (statusFilter === 'active') {
      result = result.filter(a => a.is_active);
    } else if (statusFilter === 'inactive') {
      result = result.filter(a => !a.is_active);
    }

    // Default filter
    if (defaultFilter === 'default') {
      result = result.filter(a => a.is_default);
    } else if (defaultFilter === 'custom') {
      result = result.filter(a => !a.is_default);
    }

    // Search
    if (searchValue) {
      const query = searchValue.toLowerCase();
      result = result.filter(a =>
        a.name.toLowerCase().includes(query) ||
        a.timezone?.toLowerCase().includes(query)
      );
    }

    // Sort
    result.sort((a, b) => {
      switch (sortValue) {
        case 'name_asc':
          return a.name.localeCompare(b.name);
        case 'name_desc':
          return b.name.localeCompare(a.name);
        case 'created_asc':
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        case 'created_desc':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        default:
          return 0;
      }
    });

    return result;
  }, [availabilities, statusFilter, defaultFilter, searchValue, sortValue]);

  // Pagination
  const totalPages = Math.ceil(filteredAvailabilities.length / pageSize);
  const paginatedAvailabilities = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredAvailabilities.slice(start, start + pageSize);
  }, [filteredAvailabilities, currentPage, pageSize]);

  // Handlers
  const handleCreate = () => {
    setSelectedAvailability(null);
    setIsModalOpen(true);
  };

  const handleEdit = (availability: UserAvailability) => {
    setSelectedAvailability(availability);
    setIsModalOpen(true);
  };

  const handleSave = async (data: {
    name: string;
    timezone: string;
    is_default: boolean;
    slots: CreateSlotData[];
    pendingExceptions?: CreateExceptionData[];
    pendingCalendarIds?: string[];
  }) => {
    if (selectedAvailability) {
      await updateAvailability(selectedAvailability.id, {
        name: data.name,
        timezone: data.timezone,
        is_default: data.is_default,
      });
      await updateSlots(selectedAvailability.id, data.slots);
    } else {
      const newAvailability = await createAvailability({
        name: data.name,
        timezone: data.timezone,
        is_default: data.is_default,
      });
      if (newAvailability) {
        await updateSlots(newAvailability.id, data.slots);
        
        if (data.pendingExceptions && data.pendingExceptions.length > 0) {
          for (const exception of data.pendingExceptions) {
            await addException(newAvailability.id, exception);
          }
        }
        
        if (data.pendingCalendarIds && data.pendingCalendarIds.length > 0) {
          for (const calendarId of data.pendingCalendarIds) {
            await assignToCalendar(newAvailability.id, calendarId);
          }
        }
      }
    }
    setIsModalOpen(false);
  };

  const handleUpdateSlots = async (availabilityId: string, slots: CreateSlotData[]) => {
    await updateSlots(availabilityId, slots);
  };

  const handleAddException = async (availabilityId: string, data: CreateExceptionData) => {
    await addException(availabilityId, data);
  };

  const handleRemoveException = async (exceptionId: string) => {
    await removeException(exceptionId);
  };

  const handleAssignCalendar = async (availabilityId: string, calendarId: string) => {
    await assignToCalendar(availabilityId, calendarId);
  };

  const handleRemoveCalendarAssignment = async (assignmentId: string) => {
    await removeCalendarAssignment(assignmentId);
  };

  const handleToggleDefault = async (id: string, isDefault: boolean) => {
    await updateAvailability(id, { is_default: isDefault });
  };

  const handleToggleActive = async (id: string, isActive: boolean) => {
    await updateAvailability(id, { is_active: isActive });
  };

  const handleConfirmDelete = async () => {
    if (deleteId) {
      await deleteAvailability(deleteId);
      setDeleteId(null);
    }
  };

  const handleFilterSelect = (filterId: string) => {
    setActiveFilterId(filterId);
    setCurrentPage(1);

    const [group, value] = filterId.split('_');

    if (group === 'status') {
      setStatusFilter(value);
      setDefaultFilter('all');
    } else if (group === 'type') {
      setDefaultFilter(value);
      setStatusFilter('all');
    }
  };

  const handleClearFilters = () => {
    setActiveFilterId(undefined);
    setStatusFilter('all');
    setDefaultFilter('all');
    setSearchValue('');
    setCurrentPage(1);
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(paginatedAvailabilities.map(a => a.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectOne = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedIds(prev => [...prev, id]);
    } else {
      setSelectedIds(prev => prev.filter(i => i !== id));
    }
  };

  const handleBulkDelete = async () => {
    for (const id of selectedIds) {
      await deleteAvailability(id);
    }
    setSelectedIds([]);
  };

  // Sort options
  const sortOptions = [
    { value: 'name_asc', label: 'Nome (A-Z)' },
    { value: 'name_desc', label: 'Nome (Z-A)' },
    { value: 'created_desc', label: 'Mais recentes' },
    { value: 'created_asc', label: 'Mais antigos' },
  ];

  // Filter groups
  const filterGroups: FilterGroup[] = [
    {
      id: 'status',
      label: 'Estado',
      icon: <Tag className="h-4 w-4" />,
      defaultOpen: true,
      items: [
        { id: 'status_active', label: 'Ativas', icon: <CheckCircle2 className="h-4 w-4 text-success" />, count: stats.active },
        { id: 'status_inactive', label: 'Inativas', icon: <XCircle className="h-4 w-4 text-muted-foreground" />, count: stats.inactive },
      ],
    },
    {
      id: 'type',
      label: 'Tipo',
      icon: <Calendar className="h-4 w-4" />,
      defaultOpen: true,
      items: [
        { id: 'type_default', label: 'Predefinida', icon: <CheckCircle2 className="h-4 w-4" />, count: stats.default },
        { id: 'type_custom', label: 'Personalizada', icon: <Users className="h-4 w-4" />, count: stats.total - stats.default },
      ],
    },
  ];

  if (error) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <AlertCircle className="h-12 w-12 text-destructive mb-4" />
          <p className="text-lg font-medium">Erro ao carregar disponibilidades</p>
          <p className="text-muted-foreground">{error}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* PageHeader */}
      <PageHeader
        title="Disponibilidade"
        count={stats.total}
        description="Gerir os seus horários de trabalho e exceções"
        actions={[
          {
            label: 'Nova Disponibilidade',
            icon: <Plus className="h-4 w-4" />,
            onClick: handleCreate,
          },
        ]}
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-4 border-b">
        <Card className="bg-card/50">
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Total</p>
                <p className="text-xl font-bold">{stats.total}</p>
              </div>
              <Clock className="h-8 w-8 text-muted-foreground/20" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card/50">
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Ativas</p>
                <p className="text-xl font-bold text-success">{stats.active}</p>
              </div>
              <CheckCircle2 className="h-8 w-8 text-success/20" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card/50">
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Inativas</p>
                <p className="text-xl font-bold text-muted-foreground">{stats.inactive}</p>
              </div>
              <XCircle className="h-8 w-8 text-muted-foreground/20" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card/50">
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Predefinidas</p>
                <p className="text-xl font-bold text-primary">{stats.default}</p>
              </div>
              <Calendar className="h-8 w-8 text-primary/20" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Toolbar */}
      <Toolbar
        searchValue={searchValue}
        searchPlaceholder="Pesquisar disponibilidades..."
        onSearchChange={(value) => {
          setSearchValue(value);
          setCurrentPage(1);
        }}
        showFilters={showFilterSidebar}
        filtersActive={activeFilterId !== undefined || statusFilter !== 'all' || defaultFilter !== 'all'}
        onToggleFilters={() => setShowFilterSidebar(!showFilterSidebar)}
        onClearFilters={handleClearFilters}
        sortOptions={sortOptions}
        sortValue={sortValue}
        onSortChange={setSortValue}
        rightActions={
          <div className="flex items-center gap-2">
            {selectedIds.length > 0 && (
              <div className="flex items-center gap-2 mr-2">
                <Badge variant="secondary">{selectedIds.length} selecionadas</Badge>
                <Button variant="destructive" size="sm" onClick={handleBulkDelete}>
                  <Trash2 className="h-4 w-4 mr-1" />
                  Eliminar
                </Button>
              </div>
            )}
            <Button variant="ghost" size="icon" onClick={() => refresh?.()}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        }
      />

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Filter Sidebar */}
        <FilterSidebar
          filterGroups={filterGroups}
          activeFilterId={activeFilterId}
          onFilterSelect={handleFilterSelect}
          onClearFilter={handleClearFilters}
          isOpen={showFilterSidebar}
          onClose={() => setShowFilterSidebar(false)}
        />

        {/* Content */}
        <div className="flex-1 overflow-auto p-4">
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : paginatedAvailabilities.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Clock className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">
                  {searchValue || activeFilterId ? 'Nenhuma disponibilidade encontrada' : 'Nenhuma disponibilidade configurada'}
                </h3>
                <p className="text-muted-foreground text-center mb-4">
                  {searchValue || activeFilterId
                    ? 'Tente ajustar os filtros ou pesquisa'
                    : 'Configure os seus horários de trabalho para controlar quando pode ser marcado'}
                </p>
                {!searchValue && !activeFilterId && (
                  <Button onClick={handleCreate}>
                    <Plus className="mr-2 h-4 w-4" />
                    Criar Disponibilidade
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {paginatedAvailabilities.map(availability => (
                <AvailabilityCard
                  key={availability.id}
                  availability={availability}
                  onEdit={handleEdit}
                  onDelete={setDeleteId}
                  onToggleDefault={handleToggleDefault}
                  onToggleActive={handleToggleActive}
                />
              ))}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 pt-4 border-t">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">
                  {filteredAvailabilities.length} disponibilidades
                </span>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="text-sm border rounded px-2 py-1 bg-background"
                >
                  {PAGE_SIZE_OPTIONS.map(size => (
                    <option key={size} value={size}>{size} por página</option>
                  ))}
                </select>
              </div>
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious 
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      className={currentPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                    />
                  </PaginationItem>
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum: number;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }
                    return (
                      <PaginationItem key={pageNum}>
                        <PaginationLink
                          onClick={() => setCurrentPage(pageNum)}
                          isActive={currentPage === pageNum}
                          className="cursor-pointer"
                        >
                          {pageNum}
                        </PaginationLink>
                      </PaginationItem>
                    );
                  })}
                  <PaginationItem>
                    <PaginationNext
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      className={currentPage === totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          )}
        </div>
      </div>

      {/* Modal */}
      <AvailabilityModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        availability={selectedAvailability}
        calendars={calendars}
        onSave={handleSave}
        onUpdateSlots={handleUpdateSlots}
        onAddException={handleAddException}
        onRemoveException={handleRemoveException}
        onAssignCalendar={handleAssignCalendar}
        onRemoveCalendarAssignment={handleRemoveCalendarAssignment}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar disponibilidade?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser revertida. Todos os horários e exceções associados serão eliminados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
