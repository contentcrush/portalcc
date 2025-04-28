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
  CheckSquare
} from "lucide-react";
import { WEEKDAYS, EVENT_COLORS, TASK_PRIORITY_COLORS, TASK_STATUS_COLORS } from "@/lib/constants";

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
  const [viewMode, setViewMode] = useState<'day' | 'week' | 'month'>('week');

  // Fetch events, tasks and projects
  const { data: events } = useQuery({
    queryKey: ['/api/events'],
  });
  
  const { data: tasks } = useQuery({
    queryKey: ['/api/tasks'],
  });
  
  const { data: projects } = useQuery({
    queryKey: ['/api/projects'],
  });
  
  const { data: users } = useQuery({
    queryKey: ['/api/users'],
  });
  
  const { data: clients } = useQuery({
    queryKey: ['/api/clients'],
  });

  // Generate calendar days based on current date and view mode
  useEffect(() => {
    if (viewMode === 'week') {
      const start = startOfWeek(currentDate, { weekStartsOn: 1 }); // Monday
      const end = endOfWeek(currentDate, { weekStartsOn: 1 }); // Sunday
      setCalendarDays(eachDayOfInterval({ start, end }));
    } else if (viewMode === 'day') {
      setCalendarDays([currentDate]);
    }
  }, [currentDate, viewMode]);

  // Navigation functions
  const goToPrevious = () => {
    if (viewMode === 'week') {
      setCurrentDate(addDays(currentDate, -7));
    } else if (viewMode === 'day') {
      setCurrentDate(addDays(currentDate, -1));
    }
  };

  const goToNext = () => {
    if (viewMode === 'week') {
      setCurrentDate(addDays(currentDate, 7));
    } else if (viewMode === 'day') {
      setCurrentDate(addDays(currentDate, 1));
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

  const isToday = (day: Date) => {
    return isDayToday(day);
  };

  return (
    <div className="w-full bg-white rounded-lg shadow-sm overflow-hidden">
      {/* Calendar header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <div className="flex items-center">
          <h2 className="text-lg font-semibold mr-4">
            {viewMode === 'week' && calendarDays.length > 0
              ? `${format(calendarDays[0], 'dd', { locale: ptBR })} - ${format(calendarDays[calendarDays.length - 1], 'dd MMM, yyyy', { locale: ptBR })}` 
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
              className="rounded-r-none"
            >
              Dia
            </Button>
            <Button 
              variant={viewMode === 'week' ? 'secondary' : 'ghost'} 
              size="sm"
              onClick={() => setViewMode('week')}
              className="rounded-l-none"
            >
              Semana
            </Button>
          </div>
          
          <Button
            onClick={() => onAddEvent && onAddEvent(currentDate)}
            size="sm"
          >
            <Plus className="h-4 w-4 mr-1" />
            Novo Evento
          </Button>
        </div>
      </div>

      {/* Calendar grid */}
      <div className="w-full h-[calc(100vh-240px)] overflow-y-auto">
        {/* Week days header */}
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
      </div>
    </div>
  );
}
