import { useState } from 'react';
import { Task } from '@shared/schema';
import { format, startOfWeek, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay } from 'date-fns';
import { pt } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { DatePickerWithYearNavigation } from '@/components/ui/date-picker-with-navigation';
import ClientAvatar from '@/components/ClientAvatar';
import StatusBadge from '@/components/StatusBadge';
import PriorityBadge from '@/components/PriorityBadge';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Filter, ArrowDownWideNarrow, ChevronsUpDown } from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// Views disponíveis para o calendário
type CalendarView = 'month' | 'week' | 'day' | 'agenda';

// Propriedades para legendas de status/prioridade
type LegendItemProps = {
  label: string;
  color: string;
};

const LegendItem = ({ label, color }: LegendItemProps) => (
  <div className="flex items-center gap-2">
    <div className={`w-4 h-4 rounded ${color}`}></div>
    <span className="text-xs">{label}</span>
  </div>
);

// Interface para o componente
interface TaskCalendarViewProps {
  tasks: Task[];
  onToggleComplete: (taskId: number) => void;
  onView: (taskId: number) => void;
  onEdit: (taskId: number) => void;
  onDelete: (taskId: number) => void;
  onDateClick?: (date: Date) => void;
}

export default function TaskCalendarView({ tasks, onView, onToggleComplete, onEdit, onDelete, onDateClick }: TaskCalendarViewProps) {
  // Estado para gerenciar a visualização atual e a data selecionada
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [viewType, setViewType] = useState<CalendarView>('month');
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [filters, setFilters] = useState({
    priority: [] as string[],
    status: [] as string[],
    clientId: null as number | null,
  });

  // Função para navegar entre períodos (mês/semana/dia)
  const navigatePeriod = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    
    if (viewType === 'month') {
      newDate.setMonth(
        direction === 'next' 
          ? currentDate.getMonth() + 1 
          : currentDate.getMonth() - 1
      );
    } else if (viewType === 'week') {
      newDate.setDate(
        direction === 'next' 
          ? currentDate.getDate() + 7 
          : currentDate.getDate() - 7
      );
    } else if (viewType === 'day') {
      newDate.setDate(
        direction === 'next' 
          ? currentDate.getDate() + 1 
          : currentDate.getDate() - 1
      );
    }
    
    setCurrentDate(newDate);
  };

  // Função para ir para o dia atual
  const goToToday = () => {
    setCurrentDate(new Date());
  };

  // Identificar tarefas para o dia selecionado
  const getTodayTasks = (date: Date) => {
    return tasks.filter(task => {
      const dueDate = task.due_date ? new Date(task.due_date) : null;
      return dueDate && isSameDay(dueDate, date);
    });
  };

  // Filtrar tarefas com base nos filtros aplicados
  const getFilteredTasks = () => {
    return tasks.filter(task => {
      // Filtro de prioridade
      if (filters.priority.length > 0 && task.priority && !filters.priority.includes(task.priority)) {
        return false;
      }
      
      // Filtro de status
      if (filters.status.length > 0 && task.status && !filters.status.includes(task.status)) {
        return false;
      }
      
      // Filtro de cliente
      if (filters.clientId && task.client_id !== filters.clientId) {
        return false;
      }
      
      return true;
    });
  };

  // Agrupar tarefas por data para visualização de agenda
  const getTasksByDate = () => {
    const filtered = getFilteredTasks();
    const tasksByDate = new Map<string, Task[]>();
    
    filtered.forEach(task => {
      if (task.due_date) {
        const dateKey = format(new Date(task.due_date), 'yyyy-MM-dd');
        if (!tasksByDate.has(dateKey)) {
          tasksByDate.set(dateKey, []);
        }
        tasksByDate.get(dateKey)?.push(task);
      }
    });
    
    // Ordenar por data
    return new Map([...tasksByDate.entries()].sort());
  };

  // Renderizar dias do mês com suas tarefas
  const renderMonthView = () => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const startDate = startOfWeek(monthStart, { weekStartsOn: 1 }); // Segunda como primeiro dia da semana
    
    const days = eachDayOfInterval({ start: startDate, end: monthEnd });
    const weeks = [];
    
    // Adicionar mais dias para completar o grid da última semana, se necessário
    while (days.length % 7 !== 0) {
      const lastDay = days[days.length - 1];
      const nextDay = new Date(lastDay);
      nextDay.setDate(lastDay.getDate() + 1);
      days.push(nextDay);
    }
    
    // Dividir os dias em semanas
    for (let i = 0; i < days.length; i += 7) {
      weeks.push(days.slice(i, i + 7));
    }
    
    return (
      <div className="bg-background border rounded-md">
        {/* Dias da semana */}
        <div className="grid grid-cols-7 text-xs font-medium text-muted-foreground border-b">
          {['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'].map((day, i) => (
            <div key={i} className="py-2 text-center">
              {day}
            </div>
          ))}
        </div>
        
        {/* Células do mês */}
        <div className="grid grid-cols-7 grid-rows-6 h-[calc(100vh-300px)]">
          {weeks.flat().map((day, i) => {
            const isToday = isSameDay(day, new Date());
            const isCurrentMonth = day.getMonth() === currentDate.getMonth();
            const dayTasks = getTodayTasks(day);
            
            return (
              <div 
                key={i} 
                className={cn(
                  "border-r border-b p-1 overflow-hidden relative",
                  !isCurrentMonth && "opacity-40 bg-muted/20",
                  isToday && "bg-muted/50"
                )}
                onClick={() => {
                  setSelectedDate(day);
                  if (onDateClick) onDateClick(day);
                }}
              >
                <div className="text-xs mb-1 sticky top-0">
                  <span className={cn(
                    "inline-flex items-center justify-center rounded-full w-6 h-6",
                    isToday && "bg-primary text-primary-foreground font-medium"
                  )}>
                    {format(day, 'd')}
                  </span>
                </div>
                
                <ScrollArea className="h-[calc(100%-24px)]">
                  {dayTasks.slice(0, 5).map((task) => (
                    <div 
                      key={task.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        onView(task.id);
                      }}
                      className="text-xs mb-1 p-1 truncate rounded cursor-pointer hover:bg-muted"
                    >
                      <div className="flex items-center gap-1">
                        <PriorityBadge priority={task.priority || 'baixa'} size="xs" />
                        <span className="truncate">{task.title}</span>
                      </div>
                    </div>
                  ))}
                  {dayTasks.length > 5 && (
                    <div className="text-xs text-muted-foreground">
                      + {dayTasks.length - 5} mais
                    </div>
                  )}
                </ScrollArea>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // Renderizar visualização de agenda
  const renderAgendaView = () => {
    const tasksByDate = getTasksByDate();
    
    if (tasksByDate.size === 0) {
      return (
        <div className="text-center py-8 text-muted-foreground">
          Nenhuma tarefa encontrada no período selecionado.
        </div>
      );
    }
    
    return (
      <div className="space-y-4">
        {Array.from(tasksByDate.entries()).map(([dateKey, dateTasks]) => {
          const date = new Date(dateKey);
          const isToday = isSameDay(date, new Date());
          
          return (
            <Card key={dateKey} className={cn(isToday && "border-primary")}>
              <CardHeader className="py-3">
                <CardTitle className="text-md flex items-center gap-2">
                  {isToday && <Badge variant="outline" className="bg-primary/10">Hoje</Badge>}
                  {format(date, "EEEE, d 'de' MMMM", { locale: pt })}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {dateTasks.map(task => (
                  <div 
                    key={task.id}
                    className="p-2 border rounded-md cursor-pointer hover:bg-muted/50"
                    onClick={() => onView(task.id)}
                  >
                    <div className="flex justify-between items-start">
                      <div className="space-y-1">
                        <div className="font-medium">{task.title}</div>
                        {task.description && (
                          <div className="text-sm text-muted-foreground line-clamp-1">
                            {task.description}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <StatusBadge status={task.status || "pendente"} size="sm" />
                        <PriorityBadge priority={task.priority || "baixa"} size="sm" />
                      </div>
                    </div>
                    <div className="mt-2 flex items-center text-xs text-muted-foreground">
                      {task.client_id && <ClientAvatar client_id={task.client_id} size="xs" />}
                      <span className="ml-2">{task.project_name || "Sem projeto"}</span>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          );
        })}
      </div>
    );
  };

  const renderHeader = () => (
    <div className="flex flex-col md:flex-row justify-between gap-4 items-start md:items-center mb-4">
      <div className="flex items-center gap-2">
        <Button
          variant="outline" 
          size="icon"
          onClick={() => navigatePeriod('prev')}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="font-normal justify-start">
              <CalendarIcon className="mr-2 h-4 w-4" />
              {viewType === 'month' && format(currentDate, 'MMMM yyyy', { locale: pt })}
              {viewType === 'week' && `Semana de ${format(currentDate, 'd MMM', { locale: pt })}`}
              {viewType === 'day' && format(currentDate, "EEEE, d 'de' MMMM", { locale: pt })}
              {viewType === 'agenda' && 'Agenda'}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <DatePickerWithYearNavigation
              date={selectedDate}
              setDate={(date) => {
                setSelectedDate(date);
                if (date) {
                  setCurrentDate(date);
                  if (onDateClick) onDateClick(date);
                }
              }}
              fromYear={2020}
              toYear={new Date().getFullYear() + 5}
            />
          </PopoverContent>
        </Popover>
        
        <Button
          variant="outline" 
          size="icon"
          onClick={() => navigatePeriod('next')}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
        
        <Button 
          variant="outline" 
          size="sm"
          onClick={goToToday}
          className="ml-2"
        >
          Hoje
        </Button>
      </div>
      
      <div className="flex items-center gap-2">
        <Select
          value={viewType}
          onValueChange={(value) => setViewType(value as CalendarView)}
        >
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Visualização" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="month">Mês</SelectItem>
            <SelectItem value="week">Semana</SelectItem>
            <SelectItem value="day">Dia</SelectItem>
            <SelectItem value="agenda">Agenda</SelectItem>
          </SelectContent>
        </Select>
        
        <Popover open={isFilterOpen} onOpenChange={setIsFilterOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="ml-auto">
              <Filter className="h-4 w-4 mr-2" />
              Filtros
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80">
            <div className="space-y-4">
              <h4 className="font-medium leading-none">Filtros</h4>
              <Separator />
              
              <div className="space-y-2">
                <h5 className="text-sm font-medium leading-none">Prioridade</h5>
                <div className="flex flex-wrap gap-2">
                  {['baixa', 'media', 'alta', 'critica'].map(priority => (
                    <Badge 
                      key={priority}
                      variant={filters.priority.includes(priority) ? "default" : "outline"}
                      className="cursor-pointer"
                      onClick={() => {
                        setFilters(prev => ({
                          ...prev,
                          priority: prev.priority.includes(priority)
                            ? prev.priority.filter(p => p !== priority)
                            : [...prev.priority, priority]
                        }));
                      }}
                    >
                      {priority.charAt(0).toUpperCase() + priority.slice(1)}
                    </Badge>
                  ))}
                </div>
              </div>
              
              <div className="space-y-2">
                <h5 className="text-sm font-medium leading-none">Status</h5>
                <div className="flex flex-wrap gap-2">
                  {['pendente', 'em_andamento', 'concluida', 'atrasada', 'cancelada'].map(status => (
                    <Badge 
                      key={status}
                      variant={filters.status.includes(status) ? "default" : "outline"}
                      className="cursor-pointer"
                      onClick={() => {
                        setFilters(prev => ({
                          ...prev,
                          status: prev.status.includes(status)
                            ? prev.status.filter(s => s !== status)
                            : [...prev.status, status]
                        }));
                      }}
                    >
                      {status.replace('_', ' ').charAt(0).toUpperCase() + status.replace('_', ' ').slice(1)}
                    </Badge>
                  ))}
                </div>
              </div>
              
              <div className="flex justify-between pt-2">
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => {
                    setFilters({ priority: [], status: [], clientId: null });
                  }}
                >
                  Limpar
                </Button>
                <Button 
                  size="sm"
                  onClick={() => setIsFilterOpen(false)}
                >
                  Aplicar
                </Button>
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );

  // Renderizar legenda das cores
  const renderLegend = () => (
    <div className="mt-4 border rounded-md p-3 bg-background">
      <h4 className="text-sm font-medium mb-2">Legenda</h4>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div>
          <h5 className="text-xs font-medium mb-1">Prioridade</h5>
          <div className="flex flex-col gap-1">
            <LegendItem label="Baixa" color="bg-emerald-500" />
            <LegendItem label="Média" color="bg-amber-500" />
            <LegendItem label="Alta" color="bg-orange-500" />
            <LegendItem label="Crítica" color="bg-red-600" />
          </div>
        </div>
        
        <div>
          <h5 className="text-xs font-medium mb-1">Status</h5>
          <div className="flex flex-col gap-1">
            <LegendItem label="Pendente" color="bg-gray-400" />
            <LegendItem label="Em Andamento" color="bg-blue-500" />
            <LegendItem label="Concluída" color="bg-green-500" />
            <LegendItem label="Atrasada" color="bg-red-500" />
            <LegendItem label="Cancelada" color="bg-red-300" />
          </div>
        </div>
      </div>
    </div>
  );
  
  return (
    <div className="space-y-4">
      {renderHeader()}
      
      {viewType === 'month' && renderMonthView()}
      {viewType === 'agenda' && renderAgendaView()}
      
      {renderLegend()}
    </div>
  );
}