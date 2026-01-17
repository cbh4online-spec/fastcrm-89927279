import { useState, useMemo } from 'react';
import { format, startOfWeek, endOfWeek, addWeeks, subWeeks, isToday, startOfMonth, endOfMonth, addMonths, subMonths } from 'date-fns';
import { pt } from 'date-fns/locale';
import { 
  ChevronLeft, 
  ChevronRight, 
  Plus,
  Calendar as CalendarIcon,
  List,
  Kanban,
  Users,
  User,
  Building2,
  RefreshCw,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Video,
  MapPin,
  Download,
  Trash2,
  Tag,
  CalendarCheck,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { MeetingCard } from './MeetingCard';
import { MeetingCreateModal } from './MeetingCreateModal';
import { MeetingOutcomeModal } from './MeetingOutcomeModal';
import { MeetingCloseModal } from './MeetingCloseModal';
import { MeetingPreparationPanel } from './MeetingPreparationPanel';
import { NoShowModal } from './NoShowModal';
import { useMeetings, type Meeting, type MeetingStatus, type MeetingCategory, type MeetingOutcome, type CreateMeetingData } from '@/hooks/useMeetings';
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
import { cn } from '@/lib/utils';

type ViewMode = 'list' | 'board';
type DateMode = 'week' | 'month';

const PAGE_SIZE_OPTIONS = [10, 25, 50];

const statusOrder: MeetingStatus[] = ['pending', 'confirmed', 'completed', 'no_show', 'cancelled'];

const statusLabels: Record<MeetingStatus, string> = {
  pending: 'Pendentes',
  confirmed: 'Confirmadas',
  cancelled: 'Canceladas',
  no_show: 'Sem comparência',
  completed: 'Concluídas',
};

const statusIcons: Record<MeetingStatus, React.ReactNode> = {
  pending: <Clock className="h-4 w-4 text-warning" />,
  confirmed: <CheckCircle2 className="h-4 w-4 text-success" />,
  cancelled: <XCircle className="h-4 w-4 text-destructive" />,
  no_show: <AlertTriangle className="h-4 w-4 text-muted-foreground" />,
  completed: <CheckCircle2 className="h-4 w-4 text-primary" />,
};

const categoryLabels: Record<MeetingCategory | 'all', string> = {
  all: 'Todas',
  client: 'Cliente',
  internal: 'Interna',
  hybrid: 'Híbrida',
};

export function MeetingsDashboard() {
  // State
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [dateMode, setDateMode] = useState<DateMode>('week');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedMeeting, setSelectedMeeting] = useState<Meeting | null>(null);
  const [showOutcomeModal, setShowOutcomeModal] = useState(false);
  const [meetingForOutcome, setMeetingForOutcome] = useState<Meeting | null>(null);
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [meetingForClose, setMeetingForClose] = useState<Meeting | null>(null);
  const [showPreparation, setShowPreparation] = useState(false);
  const [meetingForPreparation, setMeetingForPreparation] = useState<Meeting | null>(null);
  const [showNoShowModal, setShowNoShowModal] = useState(false);
  const [meetingForNoShow, setMeetingForNoShow] = useState<Meeting | null>(null);
  
  // UI state
  const [showFilterSidebar, setShowFilterSidebar] = useState(true);
  const [activeFilterId, setActiveFilterId] = useState<string | undefined>();
  const [searchValue, setSearchValue] = useState('');
  const [sortValue, setSortValue] = useState('start_time_asc');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZE_OPTIONS[0]);
  
  // Filters
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  // Get date range based on mode
  const dateRange = useMemo(() => {
    if (dateMode === 'week') {
      return {
        start: startOfWeek(currentDate, { weekStartsOn: 1 }),
        end: endOfWeek(currentDate, { weekStartsOn: 1 }),
      };
    } else {
      return {
        start: startOfMonth(currentDate),
        end: endOfMonth(currentDate),
      };
    }
  }, [currentDate, dateMode]);

  const { 
    meetings, 
    meetingTypes,
    meetingsByStatus,
    isLoading,
    createMeeting,
    updateMeetingStatus,
    updateMeetingOutcome,
    createFollowUpTask,
    publishToTeam,
    refresh,
  } = useMeetings(dateRange);

  // Filter and sort meetings
  const filteredMeetings = useMemo(() => {
    let result = [...meetings];
    
    // Category filter
    if (categoryFilter !== 'all') {
      result = result.filter(m => m.category === categoryFilter);
    }
    
    // Status filter
    if (statusFilter !== 'all') {
      result = result.filter(m => m.status === statusFilter);
    }
    
    // Type filter
    if (typeFilter !== 'all') {
      result = result.filter(m => m.meeting_type_id === typeFilter);
    }
    
    // Search
    if (searchValue) {
      const query = searchValue.toLowerCase();
      result = result.filter(m =>
        m.title.toLowerCase().includes(query) ||
        m.description?.toLowerCase().includes(query) ||
        m.location?.toLowerCase().includes(query) ||
        m.contact?.name?.toLowerCase().includes(query) ||
        m.company?.name?.toLowerCase().includes(query)
      );
    }
    
    // Sort
    result.sort((a, b) => {
      switch (sortValue) {
        case 'start_time_asc':
          return new Date(a.start_time).getTime() - new Date(b.start_time).getTime();
        case 'start_time_desc':
          return new Date(b.start_time).getTime() - new Date(a.start_time).getTime();
        case 'title_asc':
          return a.title.localeCompare(b.title);
        case 'title_desc':
          return b.title.localeCompare(a.title);
        default:
          return 0;
      }
    });
    
    return result;
  }, [meetings, categoryFilter, statusFilter, typeFilter, searchValue, sortValue]);

  // Stats
  const stats = useMemo(() => {
    const today = new Date();
    const todayMeetings = meetings.filter(m => isToday(new Date(m.start_time)));
    
    return {
      total: meetings.length,
      today: todayMeetings.length,
      pending: meetings.filter(m => m.status === 'pending').length,
      confirmed: meetings.filter(m => m.status === 'confirmed').length,
      completed: meetings.filter(m => m.status === 'completed').length,
    };
  }, [meetings]);

  // Pagination
  const totalPages = Math.ceil(filteredMeetings.length / pageSize);
  const paginatedMeetings = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredMeetings.slice(start, start + pageSize);
  }, [filteredMeetings, currentPage, pageSize]);

  // Navigation
  const navigate = (direction: 'prev' | 'next') => {
    if (dateMode === 'week') {
      setCurrentDate(direction === 'next' ? addWeeks(currentDate, 1) : subWeeks(currentDate, 1));
    } else {
      setCurrentDate(direction === 'next' ? addMonths(currentDate, 1) : subMonths(currentDate, 1));
    }
  };

  const goToToday = () => setCurrentDate(new Date());

  // Handlers
  const handleCreateMeeting = async (data: CreateMeetingData) => {
    await createMeeting(data);
    setShowCreateModal(false);
  };

  const handleMeetingClick = (meeting: Meeting) => {
    setSelectedMeeting(meeting);
    setShowCreateModal(true);
  };

  const handleRegisterOutcome = (meeting: Meeting) => {
    if (meeting.category === 'client' || meeting.category === 'hybrid') {
      setMeetingForClose(meeting);
      setShowCloseModal(true);
    } else {
      setMeetingForOutcome(meeting);
      setShowOutcomeModal(true);
    }
  };

  const handleSaveOutcome = async (
    outcome: MeetingOutcome,
    outcomeNotes?: string,
    nextSteps?: string,
    followUpDate?: string
  ) => {
    const targetMeeting = meetingForOutcome || meetingForClose;
    if (!targetMeeting) return;
    await updateMeetingOutcome(
      targetMeeting.id,
      outcome,
      outcomeNotes,
      nextSteps,
      followUpDate
    );
    setShowOutcomeModal(false);
    setMeetingForOutcome(null);
    setShowCloseModal(false);
    setMeetingForClose(null);
  };

  const handleCreateTask = async (title: string, description?: string, dueDate?: string) => {
    const targetMeeting = meetingForOutcome || meetingForClose;
    if (!targetMeeting) return;
    await createFollowUpTask(targetMeeting.id, title, description, dueDate);
  };

  const handlePublishToTeam = async (meetingId: string) => {
    await publishToTeam(meetingId);
  };

  const handlePrepare = (meeting: Meeting) => {
    setMeetingForPreparation(meeting);
    setShowPreparation(true);
  };

  const handleNoShow = (meeting: Meeting) => {
    if (meeting.category === 'client' || meeting.category === 'hybrid') {
      setMeetingForNoShow(meeting);
      setShowNoShowModal(true);
    } else {
      updateMeetingStatus(meeting.id, 'no_show');
    }
  };

  const handleFilterSelect = (filterId: string) => {
    setActiveFilterId(filterId);
    setCurrentPage(1);
    
    // Parse filter ID
    const [group, value] = filterId.split('_');
    
    if (group === 'category') {
      setCategoryFilter(value);
      setStatusFilter('all');
      setTypeFilter('all');
    } else if (group === 'status') {
      setStatusFilter(value);
      setCategoryFilter('all');
      setTypeFilter('all');
    } else if (group === 'type') {
      setTypeFilter(value);
      setCategoryFilter('all');
      setStatusFilter('all');
    } else if (group === 'timing') {
      // Handle timing filters
      setCategoryFilter('all');
      setStatusFilter('all');
      setTypeFilter('all');
    }
  };

  const handleClearFilters = () => {
    setActiveFilterId(undefined);
    setCategoryFilter('all');
    setStatusFilter('all');
    setTypeFilter('all');
    setSearchValue('');
    setCurrentPage(1);
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(paginatedMeetings.map(m => m.id));
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

  const handleBulkExport = () => {
    const selectedMeetings = meetings.filter(m => selectedIds.includes(m.id));
    const csvContent = [
      ['Título', 'Data', 'Hora', 'Categoria', 'Estado', 'Contacto', 'Empresa', 'Local'].join(','),
      ...selectedMeetings.map(m => [
        m.title,
        format(new Date(m.start_time), 'dd/MM/yyyy'),
        format(new Date(m.start_time), 'HH:mm'),
        categoryLabels[m.category as MeetingCategory],
        statusLabels[m.status],
        m.contact?.name || '',
        m.company?.name || '',
        m.location || '',
      ].join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `reunioes_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();
    setSelectedIds([]);
  };

  // Title
  const title = dateMode === 'week'
    ? `${format(dateRange.start, 'd MMM', { locale: pt })} - ${format(dateRange.end, 'd MMM yyyy', { locale: pt })}`
    : format(currentDate, 'MMMM yyyy', { locale: pt });

  // Sort options
  const sortOptions = [
    { value: 'start_time_asc', label: 'Data (mais próxima)' },
    { value: 'start_time_desc', label: 'Data (mais distante)' },
    { value: 'title_asc', label: 'Título (A-Z)' },
    { value: 'title_desc', label: 'Título (Z-A)' },
  ];

  // Filter groups
  const filterGroups: FilterGroup[] = [
    {
      id: 'category',
      label: 'Categoria',
      icon: <Users className="h-4 w-4" />,
      defaultOpen: true,
      items: [
        { id: 'category_client', label: 'Cliente', icon: <User className="h-4 w-4" />, count: meetings.filter(m => m.category === 'client').length },
        { id: 'category_internal', label: 'Interna', icon: <Users className="h-4 w-4" />, count: meetings.filter(m => m.category === 'internal').length },
        { id: 'category_hybrid', label: 'Híbrida', icon: <Building2 className="h-4 w-4" />, count: meetings.filter(m => m.category === 'hybrid').length },
      ],
    },
    {
      id: 'status',
      label: 'Estado',
      icon: <Tag className="h-4 w-4" />,
      defaultOpen: true,
      items: statusOrder.map(status => ({
        id: `status_${status}`,
        label: statusLabels[status],
        icon: statusIcons[status],
        count: meetings.filter(m => m.status === status).length,
      })),
    },
    {
      id: 'type',
      label: 'Tipo',
      icon: <CalendarCheck className="h-4 w-4" />,
      defaultOpen: false,
      items: meetingTypes.map(type => ({
        id: `type_${type.id}`,
        label: type.name,
        count: meetings.filter(m => m.meeting_type_id === type.id).length,
      })),
    },
    {
      id: 'format',
      label: 'Formato',
      icon: <Video className="h-4 w-4" />,
      defaultOpen: false,
      items: [
        { id: 'format_video', label: 'Videochamada', icon: <Video className="h-4 w-4" />, count: meetings.filter(m => m.meeting_url).length },
        { id: 'format_presencial', label: 'Presencial', icon: <MapPin className="h-4 w-4" />, count: meetings.filter(m => m.location && !m.meeting_url).length },
      ],
    },
  ];

  // Page tabs
  const pageTabs = [
    { id: 'week', label: 'Semana' },
    { id: 'month', label: 'Mês' },
  ];

  return (
    <div className="flex flex-col h-full">
      {/* PageHeader */}
      <PageHeader
        title="Reuniões"
        count={stats.total}
        description={`${stats.today} reuniões hoje`}
        tabs={pageTabs}
        activeTab={dateMode}
        onTabChange={(tab) => setDateMode(tab as DateMode)}
        actions={[
          {
            label: 'Nova Reunião',
            icon: <Plus className="h-4 w-4" />,
            onClick: () => {
              setSelectedMeeting(null);
              setShowCreateModal(true);
            },
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
              <CalendarIcon className="h-8 w-8 text-muted-foreground/20" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card/50">
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Pendentes</p>
                <p className="text-xl font-bold text-warning">{stats.pending}</p>
              </div>
              <Clock className="h-8 w-8 text-warning/20" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card/50">
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Confirmadas</p>
                <p className="text-xl font-bold text-success">{stats.confirmed}</p>
              </div>
              <CheckCircle2 className="h-8 w-8 text-success/20" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card/50">
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Concluídas</p>
                <p className="text-xl font-bold text-primary">{stats.completed}</p>
              </div>
              <CheckCircle2 className="h-8 w-8 text-primary/20" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Toolbar */}
      <Toolbar
        searchValue={searchValue}
        searchPlaceholder="Pesquisar reuniões..."
        onSearchChange={(value) => {
          setSearchValue(value);
          setCurrentPage(1);
        }}
        showFilters={showFilterSidebar}
        filtersActive={activeFilterId !== undefined || categoryFilter !== 'all' || statusFilter !== 'all' || typeFilter !== 'all'}
        onToggleFilters={() => setShowFilterSidebar(!showFilterSidebar)}
        onClearFilters={handleClearFilters}
        sortOptions={sortOptions}
        sortValue={sortValue}
        onSortChange={setSortValue}
        leftActions={
          <div className="flex items-center gap-2">
            {/* Date Navigation */}
            <div className="flex items-center gap-1">
              <Button variant="outline" size="icon" onClick={() => navigate('prev')}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon" onClick={() => navigate('next')}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            <Button variant="ghost" size="sm" onClick={goToToday}>
              Hoje
            </Button>
            <span className="text-sm font-medium">{title}</span>
          </div>
        }
        rightActions={
          <div className="flex items-center gap-2">
            {selectedIds.length > 0 && (
              <div className="flex items-center gap-2 mr-2">
                <Badge variant="secondary">{selectedIds.length} selecionadas</Badge>
                <Button variant="outline" size="sm" onClick={handleBulkExport}>
                  <Download className="h-4 w-4 mr-1" />
                  Exportar
                </Button>
              </div>
            )}
            <Button variant="ghost" size="icon" onClick={() => refresh?.()}>
              <RefreshCw className="h-4 w-4" />
            </Button>
            <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as ViewMode)}>
              <TabsList>
                <TabsTrigger value="list" className="gap-2">
                  <List className="h-4 w-4" />
                </TabsTrigger>
                <TabsTrigger value="board" className="gap-2">
                  <Kanban className="h-4 w-4" />
                </TabsTrigger>
              </TabsList>
            </Tabs>
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
          {viewMode === 'list' && (
            <ListView 
              meetings={paginatedMeetings}
              allMeetings={filteredMeetings}
              selectedIds={selectedIds}
              onSelectAll={handleSelectAll}
              onSelectOne={handleSelectOne}
              onStatusChange={updateMeetingStatus}
              onClick={handleMeetingClick}
              onRegisterOutcome={handleRegisterOutcome}
              onPublishToTeam={handlePublishToTeam}
              onPrepare={handlePrepare}
              onNoShow={handleNoShow}
              isLoading={isLoading}
            />
          )}

          {viewMode === 'board' && (
            <BoardView
              meetingsByStatus={meetingsByStatus}
              categoryFilter={categoryFilter}
              onStatusChange={updateMeetingStatus}
              onClick={handleMeetingClick}
              onRegisterOutcome={handleRegisterOutcome}
              onPublishToTeam={handlePublishToTeam}
              onPrepare={handlePrepare}
              onNoShow={handleNoShow}
            />
          )}

          {/* Pagination */}
          {viewMode === 'list' && totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 pt-4 border-t">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">
                  {filteredMeetings.length} reuniões
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

      {/* Create/Edit Modal */}
      <MeetingCreateModal
        open={showCreateModal}
        onOpenChange={setShowCreateModal}
        meetingTypes={meetingTypes}
        meeting={selectedMeeting}
        onSubmit={handleCreateMeeting}
      />

      {/* Outcome Modal */}
      {meetingForOutcome && (
        <MeetingOutcomeModal
          isOpen={showOutcomeModal}
          onClose={() => {
            setShowOutcomeModal(false);
            setMeetingForOutcome(null);
          }}
          meeting={meetingForOutcome}
          onSaveOutcome={handleSaveOutcome}
          onCreateTask={handleCreateTask}
        />
      )}

      {/* AI Close Modal for client meetings */}
      {meetingForClose && (
        <MeetingCloseModal
          isOpen={showCloseModal}
          onClose={() => {
            setShowCloseModal(false);
            setMeetingForClose(null);
          }}
          meeting={meetingForClose}
          onSaveOutcome={handleSaveOutcome}
          onCreateTask={handleCreateTask}
        />
      )}

      {/* AI Preparation Panel */}
      {meetingForPreparation && (
        <MeetingPreparationPanel
          meeting={meetingForPreparation}
          isOpen={showPreparation}
          onClose={() => {
            setShowPreparation(false);
            setMeetingForPreparation(null);
          }}
        />
      )}

      {/* No-Show Modal */}
      {meetingForNoShow && (
        <NoShowModal
          isOpen={showNoShowModal}
          onClose={() => {
            setShowNoShowModal(false);
            setMeetingForNoShow(null);
          }}
          meeting={meetingForNoShow}
          onStatusUpdated={() => {
            updateMeetingStatus(meetingForNoShow.id, 'no_show');
          }}
        />
      )}
    </div>
  );
}

interface ListViewProps {
  meetings: Meeting[];
  allMeetings: Meeting[];
  selectedIds: string[];
  onSelectAll: (checked: boolean) => void;
  onSelectOne: (id: string, checked: boolean) => void;
  onStatusChange: (id: string, status: MeetingStatus, reason?: string) => void;
  onClick: (meeting: Meeting) => void;
  onRegisterOutcome: (meeting: Meeting) => void;
  onPublishToTeam: (meetingId: string) => void;
  onPrepare: (meeting: Meeting) => void;
  onNoShow: (meeting: Meeting) => void;
  isLoading?: boolean;
}

function ListView({ meetings, allMeetings, selectedIds, onSelectAll, onSelectOne, onStatusChange, onClick, onRegisterOutcome, onPublishToTeam, onPrepare, onNoShow, isLoading }: ListViewProps) {
  // Group by date
  const groupedByDate = useMemo(() => {
    const groups: Record<string, Meeting[]> = {};
    
    meetings.forEach(m => {
      const dateKey = format(new Date(m.start_time), 'yyyy-MM-dd');
      if (!groups[dateKey]) groups[dateKey] = [];
      groups[dateKey].push(m);
    });

    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
  }, [meetings]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (meetings.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
        <CalendarIcon className="h-12 w-12 mb-4 opacity-50" />
        <p>Nenhuma reunião encontrada</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {groupedByDate.map(([dateKey, dateMeetings]) => (
        <div key={dateKey}>
          <h3 className={cn(
            "font-semibold mb-3 flex items-center gap-2",
            isToday(new Date(dateKey)) && "text-primary"
          )}>
            {format(new Date(dateKey), "EEEE, d 'de' MMMM", { locale: pt })}
            {isToday(new Date(dateKey)) && (
              <Badge variant="default">Hoje</Badge>
            )}
            <Badge variant="secondary">{dateMeetings.length}</Badge>
          </h3>
          <div className="space-y-2">
            {dateMeetings.map(meeting => (
              <MeetingCard
                key={meeting.id}
                meeting={meeting}
                compact
                onStatusChange={onStatusChange}
                onClick={onClick}
                onRegisterOutcome={onRegisterOutcome}
                onPublishToTeam={onPublishToTeam}
                onPrepare={onPrepare}
                onNoShow={onNoShow}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

interface BoardViewProps {
  meetingsByStatus: Record<MeetingStatus, Meeting[]>;
  categoryFilter: string;
  onStatusChange: (id: string, status: MeetingStatus, reason?: string) => void;
  onClick: (meeting: Meeting) => void;
  onRegisterOutcome: (meeting: Meeting) => void;
  onPublishToTeam: (meetingId: string) => void;
  onPrepare: (meeting: Meeting) => void;
  onNoShow: (meeting: Meeting) => void;
}

function BoardView({ meetingsByStatus, categoryFilter, onStatusChange, onClick, onRegisterOutcome, onPublishToTeam, onPrepare, onNoShow }: BoardViewProps) {
  const filteredByStatus = useMemo(() => {
    const filtered: Record<MeetingStatus, Meeting[]> = {} as Record<MeetingStatus, Meeting[]>;
    
    (Object.keys(meetingsByStatus) as MeetingStatus[]).forEach(status => {
      filtered[status] = meetingsByStatus[status].filter(m => 
        categoryFilter === 'all' || m.category === categoryFilter
      );
    });

    return filtered;
  }, [meetingsByStatus, categoryFilter]);

  return (
    <div className="grid grid-cols-5 gap-4 h-full">
      {statusOrder.map(status => (
        <div key={status} className="flex flex-col">
          <div className="flex items-center justify-between mb-3 pb-2 border-b">
            <h3 className="font-semibold text-sm">{statusLabels[status]}</h3>
            <Badge variant="secondary">{filteredByStatus[status]?.length || 0}</Badge>
          </div>
          <div className="flex-1 space-y-2 overflow-auto">
            {filteredByStatus[status]?.map(meeting => (
              <MeetingCard
                key={meeting.id}
                meeting={meeting}
                onStatusChange={onStatusChange}
                onClick={onClick}
                onRegisterOutcome={onRegisterOutcome}
                onPublishToTeam={onPublishToTeam}
                onPrepare={onPrepare}
                onNoShow={onNoShow}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
