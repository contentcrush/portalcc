import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { 
  format, 
  addDays, 
  startOfWeek, 
  endOfWeek, 
  eachDayOfInterval, 
  isSameDay, 
  isToday as isDayToday, 
  parseISO,
  addHours,
  differenceInMinutes,
  isBefore,
  isAfter
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { 
  ChevronLeft, 
  ChevronRight, 
  Plus,
  Calendar as CalendarIcon,
  Info,
  User,
  Briefcase,
  CheckSquare,
  ChevronDown
} from "lucide-react";
import { WEEKDAYS, EVENT_COLORS, TASK_PRIORITY_COLORS, TASK_STATUS_COLORS, EVENT_TYPE_OPTIONS } from "@/lib/constants";

interface CalendarViewProps {
  onEventClick?: (eventId: number) => void;
  onDateClick?: (date: Date) => void;
  onAddEvent?: (date: Date) => void;
}

interface Event {
  id: number;
  title: string;
  description?: string;
  start_date: string | Date;
  end_date: string | Date;
  location?: string;
  type: string;
  project_id?: number;
  client_id?: number;
  all_day?: boolean;
}

interface EventWithColor extends Event {
  colorClass: string;
  top?: string;
  height?: string;
  dayHour?: Date;
  duration?: number;
}

export default function CalendarView({ onEventClick, onDateClick, onAddEvent }: CalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [calendarDays, setCalendarDays] = useState<Date[]>([]);
  const [viewMode, setViewMode] = useState<'day' | 'week' | 'month' | 'agenda'>('week');

  // Fetch events, tasks and projects
  const { data: events = [] } = useQuery<Event[]>({
    queryKey: ['/api/events'],
  });
  
  const { data: tasks = [] } = useQuery<any[]>({
    queryKey: ['/api/tasks'],
  });
  
  const { data: projects = [] } = useQuery<any[]>({
    queryKey: ['/api/projects'],
  });
  
  const { data: users = [] } = useQuery<any[]>({
    queryKey: ['/api/users'],
  });
  
  const { data: clients = [] } = useQuery<any[]>({
    queryKey: ['/api/clients'],
  });

  // Definir estados para filtros
  const [filterProject, setFilterProject] = useState<number | null>(null);
  const [filterResponsible, setFilterResponsible] = useState<number | null>(null);
  const [filterType, setFilterType] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  
  // Estado para determinar se evento está sendo editado
  const [selectedEventForEdit, setSelectedEventForEdit] = useState<any>(null);
  const [showEventDrawer, setShowEventDrawer] = useState(false);
  
  // Generate calendar days based on current date and view mode
  useEffect(() => {
    if (viewMode === 'week') {
      const start = startOfWeek(currentDate, { weekStartsOn: 1 }); // Monday
      const end = endOfWeek(currentDate, { weekStartsOn: 1 }); // Sunday
      setCalendarDays(eachDayOfInterval({ start, end }));
    } else if (viewMode === 'day') {
      setCalendarDays([currentDate]);
    } else if (viewMode === 'month') {
      // Para o mês, pegamos todos os dias do mês
      const start = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
      const end = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
      
      // Também incluímos dias do início da semana anterior e final da próxima
      // para completar a grade do mês
      const monthStart = startOfWeek(start, { weekStartsOn: 1 });
      const monthEnd = endOfWeek(end, { weekStartsOn: 1 });
      setCalendarDays(eachDayOfInterval({ start: monthStart, end: monthEnd }));
    }
    // Para o modo agenda, não precisamos de dias específicos
  }, [currentDate, viewMode]);

  // Navigation functions
  const goToPrevious = () => {
    if (viewMode === 'week') {
      setCurrentDate(addDays(currentDate, -7));
    } else if (viewMode === 'day') {
      setCurrentDate(addDays(currentDate, -1));
    } else if (viewMode === 'month') {
      // Ir para o mês anterior
      const prevMonth = new Date(currentDate);
      prevMonth.setMonth(prevMonth.getMonth() - 1);
      setCurrentDate(prevMonth);
    } else if (viewMode === 'agenda') {
      // Na agenda, vamos retroceder 2 semanas
      setCurrentDate(addDays(currentDate, -14));
    }
  };

  const goToNext = () => {
    if (viewMode === 'week') {
      setCurrentDate(addDays(currentDate, 7));
    } else if (viewMode === 'day') {
      setCurrentDate(addDays(currentDate, 1));
    } else if (viewMode === 'month') {
      // Ir para o próximo mês
      const nextMonth = new Date(currentDate);
      nextMonth.setMonth(nextMonth.getMonth() + 1);
      setCurrentDate(nextMonth);
    } else if (viewMode === 'agenda') {
      // Na agenda, vamos avançar 2 semanas
      setCurrentDate(addDays(currentDate, 14));
    }
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  // Get events for a specific day
  const getEventsForDay = (day: Date) => {
    if (!events) return [];

    // Regular events
    const regularEvents = events
      .filter((event: Event) => {
        const startDate = typeof event.start_date === 'string' 
          ? parseISO(event.start_date) 
          : event.start_date;
          
        const endDate = typeof event.end_date === 'string' 
          ? parseISO(event.end_date) 
          : event.end_date;
          
        // Check if the event falls on this day
        if (!startDate || !endDate) return false;
        
        return (
          (isSameDay(day, startDate) || isSameDay(day, endDate)) || 
          (day > startDate && day < endDate)
        );
      })
      .map((event: Event) => {
        // Add a color class based on event type
        const colorClass = EVENT_COLORS[event.type as keyof typeof EVENT_COLORS] || '#3B82F6';
        
        // Find client and project info for tooltip
        const projectInfo = event.project_id && projects ? 
          projects.find((p: any) => p.id === event.project_id) : null;
        
        const clientInfo = event.client_id && clients ? 
          clients.find((c: any) => c.id === event.client_id) : null;
            
        return { 
          ...event, 
          colorClass,
          projectName: projectInfo?.name || '',
          clientName: clientInfo?.name || '',
          eventType: 'regular'
        };
      });
      
    // Create events for task due dates
    const taskEvents = tasks ? tasks
      .filter((task: any) => {
        // Only include tasks with due dates
        if (!task.due_date) return false;
        
        const dueDate = typeof task.due_date === 'string'
          ? parseISO(task.due_date)
          : task.due_date;
          
        return isSameDay(day, dueDate);
      })
      .map((task: any) => {
        // Find project info
        const projectInfo = task.project_id && projects ? 
          projects.find((p: any) => p.id === task.project_id) : null;
            
        // Find assigned user
        const assignee = task.assigned_to && users ?
          users.find((u: any) => u.id === task.assigned_to) : null;
          
        // Get color based on task priority
        const colorClass = TASK_PRIORITY_COLORS[task.priority as keyof typeof TASK_PRIORITY_COLORS] || '#3B82F6';
        
        // Create a task-based event
        return {
          id: `task-${task.id}`,
          title: `Tarefa: ${task.title}`,
          description: task.description,
          start_date: task.due_date,
          end_date: task.due_date, // Same day
          type: 'prazo',
          colorClass,
          priority: task.priority,
          status: task.status,
          project_id: task.project_id,
          projectName: projectInfo?.name || '',
          assigneeName: assignee?.name || '',
          eventType: 'task',
          originalTask: task
        };
      }) : [];
      
    // Create events for project milestones
    const projectEvents = projects ? projects
      .filter((project: any) => {
        // Check if project start or end dates match this day
        const startDate = project.startDate ? 
          (typeof project.startDate === 'string' ? parseISO(project.startDate) : project.startDate) : null;
          
        const endDate = project.endDate ?
          (typeof project.endDate === 'string' ? parseISO(project.endDate) : project.endDate) : null;
          
        if (!startDate && !endDate) return false;
        
        return (startDate && isSameDay(day, startDate)) || (endDate && isSameDay(day, endDate));
      })
      .map((project: any) => {
        // Find client info
        const clientInfo = project.client_id && clients ? 
          clients.find((c: any) => c.id === project.client_id) : null;
          
        // Check if this is a start or end date
        const isStartDate = project.startDate && 
          isSameDay(day, typeof project.startDate === 'string' ? parseISO(project.startDate) : project.startDate);
        
        // Get relative position in the project
        const progress = project.progress || 0;
        
        return {
          id: `project-${project.id}-${isStartDate ? 'start' : 'end'}`,
          title: `${isStartDate ? 'Início' : 'Fim'}: ${project.name}`,
          description: project.description,
          start_date: isStartDate ? project.startDate : project.endDate,
          end_date: isStartDate ? project.startDate : project.endDate,
          type: isStartDate ? 'projeto' : 'entrega',
          colorClass: isStartDate ? EVENT_COLORS['projeto'] : EVENT_COLORS['entrega'],
          project_id: project.id,
          projectName: project.name,
          clientName: clientInfo?.name || '',
          progress,
          eventType: 'project',
          originalProject: project
        };
      }) : [];
      
    // Combine all event types
    return [...regularEvents, ...taskEvents, ...projectEvents];
  };

  // Get events grouped by hour for the timeline view
  const getHourlyEvents = () => {
    // Se não temos eventos ou dias do calendário, retorna estrutura vazia
    if (!events || !calendarDays || calendarDays.length === 0) {
      const hours = [];
      for (let i = 8; i <= 18; i++) {
        hours.push({
          hour: i,
          events: []
        });
      }
      return hours;
    }
    
    const hours = [];
    for (let i = 8; i <= 18; i++) {
      hours.push(i);
    }

    return hours.map(hour => {
      // Criar uma cópia da data atual para evitar mutação
      const currentDateCopy = new Date(currentDate);
      const hourDate = addHours(new Date(currentDateCopy.setHours(hour, 0, 0, 0)), 0);
      
      // Get all events that overlap with this hour
      const hourEvents = calendarDays.map(day => {
        try {
          const dayHour = new Date(
            day.getFullYear(), 
            day.getMonth(), 
            day.getDate(), 
            hour, 
            0, 
            0
          );
          
          const eventsForDay = getEventsForDay(day);
          
          if (!Array.isArray(eventsForDay)) {
            return [];
          }
          
          return eventsForDay
            .filter((event: EventWithColor) => {
              if (!event || !event.start_date || !event.end_date) return false;
              
              const startDate = typeof event.start_date === 'string' 
                ? parseISO(event.start_date) 
                : event.start_date;
                
              const endDate = typeof event.end_date === 'string' 
                ? parseISO(event.end_date) 
                : event.end_date;
              
              // Check if the event overlaps with this hour
              if (!startDate || !endDate) return false;
              
              try {
                return (
                  (startDate.getHours() <= hour && endDate.getHours() >= hour) ||
                  (startDate.getHours() === hour && startDate.getMinutes() < 60) ||
                  (endDate.getHours() === hour && endDate.getMinutes() > 0)
                );
              } catch (err) {
                return false;
              }
            })
            .map((event: EventWithColor) => {
              if (!event || !event.start_date || !event.end_date) {
                return {
                  ...event,
                  top: '0%',
                  height: '0%',
                  dayHour,
                  duration: 0
                };
              }
              
              const startDate = typeof event.start_date === 'string' 
                ? parseISO(event.start_date) 
                : event.start_date;
                
              const endDate = typeof event.end_date === 'string' 
                ? parseISO(event.end_date) 
                : event.end_date;
              
              // Calculate position and height for the event
              const starts = startDate.getHours() === hour 
                ? startDate.getMinutes() / 60 * 100 
                : 0;
                
              const ends = endDate.getHours() === hour 
                ? endDate.getMinutes() / 60 * 100 
                : 100;
                
              const height = ends - starts;
              
              // If the event spans multiple hours, adjust accordingly
              let duration = differenceInMinutes(endDate, startDate) / 60;
              if (duration > 1) {
                duration = 1; // Cap at 1 hour for this hour's cell
              }
              
              return {
                ...event,
                top: `${starts}%`,
                height: `${height}%`,
                dayHour,
                duration
              };
            });
        } catch (error) {
          return [];
        }
      });
      
      return {
        hour,
        events: hourEvents
      };
    });
  };

  // Filtrar eventos com base nos filtros selecionados
  const filterEvents = (events: any[]) => {
    if (!events) return [];
    
    return events.filter(event => {
      // Filtrar por projeto
      if (filterProject && event.project_id !== filterProject) {
        return false;
      }
      
      // Filtrar por responsável (apenas para tarefas)
      if (filterResponsible && event.eventType === 'task' && 
          event.originalTask && event.originalTask.assigned_to !== filterResponsible) {
        return false;
      }
      
      // Filtrar por tipo
      if (filterType && event.type !== filterType) {
        return false;
      }
      
      // Filtrar por status (apenas para tarefas)
      if (filterStatus && event.eventType === 'task' && event.status !== filterStatus) {
        return false;
      }
      
      return true;
    });
  };

  // Verificar se o dia é hoje
  const isToday = (day: Date) => {
    return isDayToday(day);
  };
  
  // Verificar se um evento está atrasado
  const isOverdue = (event: any) => {
    if (!event) return false;
    
    const now = new Date();
    const endDate = typeof event.end_date === 'string' 
      ? parseISO(event.end_date) 
      : event.end_date;
    
    return endDate < now && (
      (event.eventType === 'task' && event.status !== 'concluida') ||
      (event.eventType === 'regular')
    );
  };

  // Preparar todos os eventos para a visualização de agenda
  const getAgendaEvents = () => {
    if (!events || !tasks || !projects) return [];
    
    // Obtenha todas as datas para o período relevante (2 semanas antes e depois da data atual)
    const start = addDays(currentDate, -14);
    const end = addDays(currentDate, 14);
    const dates = eachDayOfInterval({ start, end });
    
    // Obtenha eventos para cada dia
    let allEvents: any[] = [];
    dates.forEach(date => {
      const dayEvents = getEventsForDay(date);
      allEvents = [...allEvents, ...dayEvents];
    });
    
    // Remover duplicatas (por ID)
    const uniqueEvents = allEvents.filter((event, index, self) => 
      index === self.findIndex(e => e.id === event.id)
    );
    
    // Ordenar por data
    return uniqueEvents.sort((a, b) => {
      const dateA = typeof a.start_date === 'string' ? parseISO(a.start_date) : a.start_date;
      const dateB = typeof b.start_date === 'string' ? parseISO(b.start_date) : b.start_date;
      return dateA.getTime() - dateB.getTime();
    });
  };

  return (
    <div className="w-full bg-white rounded-lg shadow-sm overflow-hidden">
      {/* Calendar header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <div className="flex items-center">
          <h2 className="text-lg font-semibold mr-4">
            {viewMode === 'week' && calendarDays.length > 0
              ? `${format(calendarDays[0], 'dd', { locale: ptBR })} - ${format(calendarDays[calendarDays.length - 1], 'dd MMM, yyyy', { locale: ptBR })}` 
              : viewMode === 'month'
                ? format(currentDate, 'MMMM yyyy', { locale: ptBR })
                : format(currentDate, 'dd MMMM, yyyy', { locale: ptBR })}
          </h2>
          <div className="flex space-x-1">
            <Button variant="outline" size="sm" onClick={goToPrevious}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={goToToday}>
              Hoje
            </Button>
            <Button variant="outline" size="sm" onClick={goToNext}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        <div className="flex space-x-2">
          <div className="flex bg-gray-100 rounded-md">
            <Button 
              variant={viewMode === 'day' ? 'secondary' : 'ghost'} 
              size="sm"
              onClick={() => setViewMode('day')}
              className="rounded-none border-r"
            >
              Dia
            </Button>
            <Button 
              variant={viewMode === 'week' ? 'secondary' : 'ghost'} 
              size="sm"
              onClick={() => setViewMode('week')}
              className="rounded-none border-r"
            >
              Semana
            </Button>
            <Button 
              variant={viewMode === 'month' ? 'secondary' : 'ghost'} 
              size="sm"
              onClick={() => setViewMode('month')}
              className="rounded-none border-r"
            >
              Mês
            </Button>
            <Button 
              variant={viewMode === 'agenda' ? 'secondary' : 'ghost'} 
              size="sm"
              onClick={() => setViewMode('agenda')}
              className="rounded-none"
            >
              Agenda
            </Button>
          </div>
          
          <Button
            onClick={() => setShowFilters(!showFilters)}
            variant="outline"
            size="sm"
            className="gap-1"
          >
            <div className={`transition-transform ${showFilters ? 'rotate-180' : ''}`}>
              <ChevronDown className="h-4 w-4" />
            </div>
            Filtros
          </Button>
          
          <Button
            onClick={() => onAddEvent && onAddEvent(currentDate)}
            size="sm"
          >
            <Plus className="h-4 w-4 mr-1" />
            Novo Evento
          </Button>
        </div>
      </div>

      {/* Filtros expandidos */}
      {showFilters && (
        <div className="p-4 border-b border-gray-200 bg-gray-50 grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="text-sm font-medium mb-1 block">Projeto</label>
            <select 
              className="w-full p-2 border border-gray-300 rounded-md text-sm"
              value={filterProject || ''}
              onChange={(e) => setFilterProject(e.target.value ? parseInt(e.target.value) : null)}
            >
              <option value="">Todos os projetos</option>
              {projects && Array.isArray(projects) && projects.map((project: any) => (
                <option key={project.id} value={project.id}>{project.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Responsável</label>
            <select 
              className="w-full p-2 border border-gray-300 rounded-md text-sm"
              value={filterResponsible || ''}
              onChange={(e) => setFilterResponsible(e.target.value ? parseInt(e.target.value) : null)}
            >
              <option value="">Todos os responsáveis</option>
              {users && Array.isArray(users) && users.map((user: any) => (
                <option key={user.id} value={user.id}>{user.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Tipo</label>
            <select 
              className="w-full p-2 border border-gray-300 rounded-md text-sm"
              value={filterType || ''}
              onChange={(e) => setFilterType(e.target.value || null)}
            >
              <option value="">Todos os tipos</option>
              {EVENT_TYPE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Status</label>
            <select 
              className="w-full p-2 border border-gray-300 rounded-md text-sm"
              value={filterStatus || ''}
              onChange={(e) => setFilterStatus(e.target.value || null)}
            >
              <option value="">Todos os status</option>
              <option value="Em progresso">Em progresso</option>
              <option value="Concluído">Concluído</option>
              <option value="Pendente">Pendente</option>
              <option value="Atrasado">Atrasado</option>
            </select>
          </div>
        </div>
      )}

      {/* Legenda */}
      <div className="px-4 py-2 border-b border-gray-200 flex flex-wrap gap-3 items-center text-xs">
        <div className="font-medium">Legenda:</div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: EVENT_COLORS['reuniao'] }}></div>
          <span>Reunião</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: EVENT_COLORS['gravacao'] }}></div>
          <span>Gravação</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: EVENT_COLORS['entrega'] }}></div>
          <span>Entrega</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: EVENT_COLORS['prazo'] }}></div>
          <span>Prazos</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: EVENT_COLORS['projeto'] }}></div>
          <span>Projetos</span>
        </div>
        <div className="flex items-center gap-1 ml-auto">
          <div className="w-3 h-3 rounded-full bg-red-500"></div>
          <span>Atrasados</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
          <span>Hoje</span>
        </div>
      </div>

      {/* Calendar grid - Exibido apenas para Day, Week e Month */}
      {viewMode !== 'agenda' && (
        <div className="w-full h-[calc(100vh-240px)] overflow-y-auto relative">
          {/* Month View */}
          {viewMode === 'month' && (
            <div className="grid grid-cols-7 divide-x divide-y divide-gray-200">
              {/* Day headers */}
              {WEEKDAYS.map((day, index) => (
                <div key={`header-${index}`} className="p-2 text-center font-medium">
                  {day}
                </div>
              ))}
              
              {/* Calendar cells */}
              {calendarDays.map((day) => {
                const dayEvents = getEventsForDay(day);
                const isCurrentMonth = day.getMonth() === currentDate.getMonth();
                return (
                  <div
                    key={day.toISOString()}
                    className={`min-h-[120px] p-2 relative ${
                      isToday(day) ? 'bg-yellow-50' : 
                      !isCurrentMonth ? 'bg-gray-50' : ''
                    } hover:bg-gray-50 transition-colors border-t border-gray-200`}
                    onDoubleClick={() => onAddEvent && onAddEvent(day)}
                  >
                    <div className={`text-right ${
                      isToday(day) 
                        ? 'bg-yellow-500 text-white w-6 h-6 rounded-full flex items-center justify-center ml-auto'
                        : !isCurrentMonth ? 'text-gray-400' : ''
                      }`}
                    >
                      <span className={isToday(day) ? 'text-xs' : ''}>
                        {format(day, 'd')}
                      </span>
                    </div>
                    
                    <div className="mt-1 space-y-1 max-h-[85px] overflow-y-auto">
                      {dayEvents.slice(0, 3).map((event: any, index: number) => (
                        <TooltipProvider key={`event-${event.id || index}`}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div
                                className="p-1 rounded text-xs cursor-pointer flex items-center mb-1 text-white"
                                style={{
                                  backgroundColor: event.colorClass
                                }}
                                onClick={() => {
                                  if (event.eventType === 'regular' && onEventClick && event.id) {
                                    onEventClick(event.id);
                                  }
                                }}
                              >
                                <div className="truncate">
                                  {event.title}
                                </div>
                              </div>
                            </TooltipTrigger>
                            <TooltipContent className="p-2 max-w-xs">
                              <div className="font-bold">{event.title}</div>
                              {event.description && <div className="text-xs">{event.description}</div>}
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      ))}
                      
                      {dayEvents.length > 3 && (
                        <div className="text-xs text-gray-500 font-medium">
                          + {dayEvents.length - 3} mais
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          
          {/* Week e Day View */}
          {(viewMode === 'week' || viewMode === 'day') && (
            <div className="grid grid-cols-1 divide-x divide-gray-200">
              <div className={`grid ${viewMode === 'week' ? 'grid-cols-7' : 'grid-cols-1'} divide-x divide-gray-200`}>
                {/* Time column */}
                <div className="min-w-[60px] bg-gray-50 p-2 sticky left-0 z-10 hidden">
                  <div className="text-center">
                    <span className="text-sm font-medium text-gray-500">Hora</span>
                  </div>
                </div>
                
                {/* Day columns */}
                {calendarDays.map((day, dayIndex) => (
                  <div 
                    key={day.toISOString()} 
                    className={`p-2 ${isToday(day) ? 'bg-blue-50' : ''}`}
                  >
                    <div className="text-center mb-1">
                      <span className="text-sm font-medium text-gray-700">
                        {WEEKDAYS[day.getDay()]}
                      </span>
                      <div className={`text-center ${isToday(day) ? 'bg-blue-500 text-white rounded-full w-7 h-7 mx-auto flex items-center justify-center' : ''}`}>
                        <span className="text-sm">
                          {format(day, 'd')}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              
              {/* Hourly rows */}
              <div className="flex flex-col divide-y divide-gray-200">
                {getHourlyEvents().map(({ hour, events }) => (
                  <div key={hour} className="flex">
                    {/* Time column */}
                    <div className="min-w-[60px] bg-gray-50 p-2 text-center sticky left-0 z-10">
                      <span className="text-xs font-medium text-gray-500">
                        {hour}:00
                      </span>
                    </div>
                    
                    {/* Event cells */}
                    <div className={`grid ${viewMode === 'week' ? 'grid-cols-7' : 'grid-cols-1'} flex-1 divide-x divide-gray-200`}>
                      {calendarDays.map((day, dayIndex) => {
                        // Create a copy of the date to avoid mutating the original
                        const dateCopy = new Date(day);
                        dateCopy.setHours(hour);
                        
                        return (
                          <div 
                            key={`${day.toISOString()}-${hour}`} 
                            className={`h-16 relative ${isToday(day) ? 'bg-blue-50/30' : ''}`}
                            onClick={() => onDateClick && onDateClick(dateCopy)}
                          >
                            {events[dayIndex] && Array.isArray(events[dayIndex]) ? 
                              events[dayIndex].map((event: any, eventIndex: number) => (
                                <TooltipProvider key={`event-${event.id || eventIndex}`}>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <div
                                        className={`absolute rounded p-1 left-1 right-1 overflow-hidden text-white text-xs cursor-pointer`}
                                        style={{
                                          top: event.top,
                                          height: event.height,
                                          backgroundColor: event.colorClass
                                        }}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          // Para eventos regulares, use o callback padrão
                                          if (event.eventType === 'regular' && onEventClick && event.id) {
                                            onEventClick(event.id);
                                          }
                                          // Para tarefas, redirecionar para a página de tarefas
                                          else if (event.eventType === 'task') {
                                            // Aqui poderia navegar para detalhes da tarefa
                                            console.log('Ver tarefa:', event.originalTask);
                                          }
                                          // Para projetos, redirecionar para a página de projetos
                                          else if (event.eventType === 'project') {
                                            // Aqui poderia navegar para detalhes do projeto
                                            console.log('Ver projeto:', event.originalProject);
                                          }
                                        }}
                                      >
                                        <div className="flex items-center gap-1">
                                          {event.eventType === 'task' && <CheckSquare className="h-3 w-3" />}
                                          {event.eventType === 'project' && <Briefcase className="h-3 w-3" />}
                                          <div className="truncate font-medium">
                                            {event.title}
                                          </div>
                                        </div>
                                        {event.eventType === 'regular' && (
                                          <div className="text-xs truncate opacity-90">
                                            {event.start_date && 
                                              format(new Date(event.start_date), 'HH:mm')} 
                                            {event.start_date && event.end_date && ' - '} 
                                            {event.end_date && 
                                              format(new Date(event.end_date), 'HH:mm')}
                                          </div>
                                        )}
                                        {event.eventType === 'task' && (
                                          <div className="text-xs truncate opacity-90">
                                            {event.projectName}
                                          </div>
                                        )}
                                        {event.eventType === 'project' && (
                                          <div className="text-xs truncate opacity-90">
                                            {event.clientName}
                                          </div>
                                        )}
                                      </div>
                                    </TooltipTrigger>
                                    <TooltipContent className="p-2 max-w-xs bg-white text-black shadow-lg rounded-md border border-gray-200">
                                      <div className="space-y-1">
                                        <div className="font-semibold">{event.title}</div>
                                        
                                        {/* Informações para todos os tipos de evento */}
                                        {event.description && (
                                          <div className="text-xs text-gray-600">{event.description}</div>
                                        )}
                                        
                                        {/* Horários para eventos regulares */}
                                        {event.eventType === 'regular' && (
                                          <div className="text-xs">
                                            <div className="flex items-center text-gray-600">
                                              <span className="font-medium">Horário:</span>&nbsp;
                                              {event.start_date && format(new Date(event.start_date), 'dd/MM/yyyy HH:mm')} 
                                              {event.start_date && event.end_date && ' - '} 
                                              {event.end_date && format(new Date(event.end_date), 'dd/MM/yyyy HH:mm')}
                                            </div>
                                            {event.location && (
                                              <div className="flex items-center text-gray-600">
                                                <span className="font-medium">Local:</span>&nbsp;{event.location}
                                              </div>
                                            )}
                                            {event.projectName && (
                                              <div className="flex items-center text-gray-600">
                                                <span className="font-medium">Projeto:</span>&nbsp;{event.projectName}
                                              </div>
                                            )}
                                            {event.clientName && (
                                              <div className="flex items-center text-gray-600">
                                                <span className="font-medium">Cliente:</span>&nbsp;{event.clientName}
                                              </div>
                                            )}
                                          </div>
                                        )}
                                        
                                        {/* Informações para tarefas */}
                                        {event.eventType === 'task' && (
                                          <div className="text-xs">
                                            <div className="flex items-center text-gray-600">
                                              <span className="font-medium">Prazo:</span>&nbsp;
                                              {event.start_date && format(new Date(event.start_date), 'dd/MM/yyyy')}
                                            </div>
                                            <div className="flex items-center text-gray-600">
                                              <span className="font-medium">Status:</span>&nbsp;
                                              <span className={`text-${TASK_STATUS_COLORS[event.status as keyof typeof TASK_STATUS_COLORS]}`}>
                                                {event.status}
                                              </span>
                                            </div>
                                            <div className="flex items-center text-gray-600">
                                              <span className="font-medium">Prioridade:</span>&nbsp;
                                              <span className={`text-${TASK_PRIORITY_COLORS[event.priority as keyof typeof TASK_PRIORITY_COLORS]}`}>
                                                {event.priority}
                                              </span>
                                            </div>
                                            {event.assigneeName && (
                                              <div className="flex items-center text-gray-600">
                                                <span className="font-medium">Responsável:</span>&nbsp;{event.assigneeName}
                                              </div>
                                            )}
                                            {event.projectName && (
                                              <div className="flex items-center text-gray-600">
                                                <span className="font-medium">Projeto:</span>&nbsp;{event.projectName}
                                              </div>
                                            )}
                                          </div>
                                        )}
                                        
                                        {/* Informações para projetos */}
                                        {event.eventType === 'project' && (
                                          <div className="text-xs">
                                            <div className="flex items-center text-gray-600">
                                              <span className="font-medium">Data:</span>&nbsp;
                                              {event.start_date && format(new Date(event.start_date), 'dd/MM/yyyy')}
                                            </div>
                                            {event.progress !== undefined && (
                                              <div className="flex items-center text-gray-600">
                                                <span className="font-medium">Progresso:</span>&nbsp;{event.progress}%
                                              </div>
                                            )}
                                            {event.clientName && (
                                              <div className="flex items-center text-gray-600">
                                                <span className="font-medium">Cliente:</span>&nbsp;{event.clientName}
                                              </div>
                                            )}
                                          </div>
                                        )}
                                      </div>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              )) : null}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
      
      {/* Visualização de Agenda */}
      {viewMode === 'agenda' && (
        <div className="w-full h-[calc(100vh-240px)] overflow-y-auto">
          <div className="divide-y divide-gray-200">
            {getAgendaEvents().map((event: any, index: number) => {
              const startDate = typeof event.start_date === 'string' 
                ? parseISO(event.start_date) 
                : event.start_date;
              
              const endDate = typeof event.end_date === 'string' 
                ? parseISO(event.end_date) 
                : event.end_date;
              
              const isOverdueEvent = isOverdue(event);
              const isTodayEvent = isToday(startDate);
              
              return (
                <div 
                  key={`agenda-event-${event.id || index}`}
                  className={`p-4 hover:bg-gray-50 transition-colors ${
                    isOverdueEvent ? 'border-l-4 border-red-500' : 
                    isTodayEvent ? 'border-l-4 border-yellow-500' : ''
                  }`}
                  onClick={() => {
                    if (event.eventType === 'regular' && onEventClick && event.id) {
                      onEventClick(event.id);
                    }
                  }}
                >
                  <div className="flex flex-col md:flex-row md:items-center gap-3">
                    <div className="flex-none w-32">
                      <div className="text-sm font-medium">
                        {format(startDate, 'dd MMM yyyy', { locale: ptBR })}
                      </div>
                      <div className="text-xs text-gray-500">
                        {format(startDate, 'HH:mm', { locale: ptBR })} - {format(endDate, 'HH:mm', { locale: ptBR })}
                      </div>
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-3 h-3 rounded-full flex-none"
                          style={{ backgroundColor: event.colorClass }}
                        ></span>
                        <span className="font-medium">{event.title}</span>
                      </div>
                      {event.description && (
                        <div className="text-sm text-gray-600 mt-1">{event.description}</div>
                      )}
                    </div>
                    
                    <div className="flex-none flex flex-col md:items-end gap-1">
                      {event.eventType === 'regular' && (
                        <>
                          {event.location && (
                            <div className="text-xs text-gray-600 flex items-center gap-1">
                              <Info className="h-3 w-3" />
                              {event.location}
                            </div>
                          )}
                          {event.projectName && (
                            <div className="text-xs text-gray-600 flex items-center gap-1">
                              <Briefcase className="h-3 w-3" />
                              {event.projectName}
                            </div>
                          )}
                        </>
                      )}
                      
                      {event.eventType === 'task' && (
                        <>
                          <Badge variant="outline" className={`text-xs bg-${TASK_STATUS_COLORS[event.status as keyof typeof TASK_STATUS_COLORS]} text-white`}>
                            {event.status}
                          </Badge>
                          {event.assigneeName && (
                            <div className="text-xs text-gray-600 flex items-center gap-1">
                              <User className="h-3 w-3" />
                              {event.assigneeName}
                            </div>
                          )}
                        </>
                      )}
                      
                      {event.eventType === 'project' && (
                        <>
                          <Badge variant="outline" className="text-xs">
                            {event.type === 'projeto' ? 'Início' : 'Entrega'}
                          </Badge>
                          {event.clientName && (
                            <div className="text-xs text-gray-600 flex items-center gap-1">
                              <User className="h-3 w-3" />
                              {event.clientName}
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
            
            {getAgendaEvents().length === 0 && (
              <div className="p-10 text-center text-gray-500">
                Nenhum evento encontrado para este período.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Botão "Hoje" fixo no canto inferior direito */}
      <div className="fixed bottom-6 right-6">
        <Button 
          onClick={goToToday} 
          size="lg" 
          className="rounded-full shadow-lg h-14 w-14 flex items-center justify-center p-0"
        >
          <CalendarIcon className="h-6 w-6" />
        </Button>
      </div>
    </div>
  );
}