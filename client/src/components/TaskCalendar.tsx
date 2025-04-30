import { useState } from "react";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { TaskWithDetails } from "@/lib/types";
import {
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Calendar as CalendarIcon,
  CalendarDays,
  Filter,
  AlertCircle,
  Clock,
  Check
} from "lucide-react";
import { 
  Card, 
  CardContent
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  formatDate, 
  isTaskOverdue,
  isTaskDueSoon
} from "@/lib/utils";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import PriorityBadge from "@/components/PriorityBadge";
import StatusBadge from "@/components/StatusBadge";
import { ClientAvatar } from "@/components/ClientAvatar";
import { UserAvatar } from "@/components/UserAvatar";

// Importações para manipulação de datas
import { 
  addMonths, 
  endOfDay, 
  endOfMonth, 
  format, 
  getDate, 
  isWithinInterval, 
  parseISO, 
  startOfDay, 
  startOfMonth, 
  isSameDay,
  isSameMonth,
  subMonths
} from "date-fns";
import { pt } from "date-fns/locale";

interface TaskCalendarProps {
  tasks: TaskWithDetails[] | undefined;
  onViewTask: (taskId: number) => void;
  onEditTask: (taskId: number) => void;
  onDeleteTask: (taskId: number) => void;
  onToggleTaskCompletion: (taskId: number, currentStatus: boolean) => void;
}

export default function TaskCalendar({
  tasks,
  onViewTask,
  onEditTask,
  onDeleteTask,
  onToggleTaskCompletion
}: TaskCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [showFilters, setShowFilters] = useState(false);
  const [showLegend, setShowLegend] = useState(false);
  const [filterCompleted, setFilterCompleted] = useState(false);
  const [selectedPriority, setSelectedPriority] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<number | null>(null);
  const [selectedProject, setSelectedProject] = useState<number | null>(null);

  // Função para agrupar tarefas por data
  const getTasksByDate = (date: Date) => {
    if (!tasks) return [];

    return tasks.filter((task) => {
      // Se não tiver data de vencimento, não entra no calendário
      if (!task.due_date) return false;

      // Se estiver filtrando por tarefas completas/incompletas
      if (filterCompleted && !task.completed) return false;
      if (!filterCompleted && task.completed) return false;

      // Filtro por prioridade
      if (selectedPriority && task.priority !== selectedPriority) return false;

      // Filtro por usuário
      if (selectedUser && task.assigned_to !== selectedUser) return false;

      // Filtro por projeto
      if (selectedProject && task.project_id !== selectedProject) return false;

      // Verifica se a tarefa está na data selecionada
      const taskDate = parseISO(task.due_date.toString());
      return isSameDay(taskDate, date);
    });
  };

  // Navegar para o mês anterior
  const previousMonth = () => {
    setCurrentMonth((prev) => subMonths(prev, 1));
  };

  // Navegar para o próximo mês
  const nextMonth = () => {
    setCurrentMonth((prev) => addMonths(prev, 1));
  };

  // Ir para o mês atual
  const goToCurrentMonth = () => {
    setCurrentMonth(new Date());
    setSelectedDate(new Date());
  };

  // Função para renderizar indicadores de tarefas no calendário
  const renderDayIndicators = (date: Date) => {
    const dayTasks = getTasksByDate(date);
    if (dayTasks.length === 0) return null;

    // Contadores por prioridade
    const priorityCounts = {
      baixa: 0,
      media: 0,
      alta: 0,
      critica: 0
    };

    dayTasks.forEach(task => {
      const priority = task.priority || "media";
      if (priority in priorityCounts) {
        priorityCounts[priority as keyof typeof priorityCounts]++;
      }
    });

    // Definir um limite máximo para manter a aparência clean
    const maxIndicators = 3;
    
    return (
      <div className="absolute bottom-0 left-0 right-0 flex justify-center gap-[2px] pb-1">
        {priorityCounts.critica > 0 && (
          <div className="bg-red-500 w-[5px] h-[5px] rounded-full" />
        )}
        {priorityCounts.alta > 0 && (
          <div className="bg-orange-500 w-[5px] h-[5px] rounded-full" />
        )}
        {priorityCounts.media > 0 && (
          <div className="bg-amber-500 w-[5px] h-[5px] rounded-full" />
        )}
        {priorityCounts.baixa > 0 && (
          <div className="bg-emerald-500 w-[5px] h-[5px] rounded-full" />
        )}
      </div>
    );
  };

  // Renderizar contagem de tarefas no dia
  const renderTaskCount = (date: Date) => {
    const dayTasks = getTasksByDate(date);
    if (dayTasks.length === 0) return null;

    return (
      <div 
        className={cn(
          "absolute top-0 right-0 text-[8px] font-bold rounded-full h-[14px] min-w-[14px] flex items-center justify-center",
          dayTasks.some(task => isTaskOverdue(task) && !task.completed) 
            ? "bg-red-100 text-red-700" 
            : dayTasks.some(task => isTaskDueSoon(task) && !task.completed) 
              ? "bg-amber-100 text-amber-700" 
              : "bg-blue-100 text-blue-700"
        )}
      >
        {dayTasks.length}
      </div>
    );
  };

  // Função para estilizar dias com tarefas
  const getDayClassNames = (date: Date) => {
    const dayTasks = getTasksByDate(date);
    
    if (dayTasks.length === 0) return "";
    
    // Verificar se há tarefas atrasadas ou próximas do vencimento
    const hasOverdue = dayTasks.some(task => isTaskOverdue(task) && !task.completed);
    const hasDueSoon = dayTasks.some(task => isTaskDueSoon(task) && !task.completed);
    
    if (hasOverdue) {
      return "border-l-2 border-l-red-500";
    } else if (hasDueSoon) {
      return "border-l-2 border-l-amber-500";
    } else {
      return "border-l-2 border-l-blue-500";
    }
  };

  // Função para renderizar informações complementares da célula do calendário
  const renderCellContent = (date: Date) => {
    // Só adiciona o conteúdo personalizado para o mês atual
    if (!isSameMonth(date, currentMonth)) return null;
    
    return (
      <>
        {renderTaskCount(date)}
        {renderDayIndicators(date)}
      </>
    );
  };

  // Renderiza a lista de tarefas para a data selecionada
  const renderSelectedDateTasks = () => {
    if (!selectedDate) return null;
    
    const dateTasks = getTasksByDate(selectedDate);
    
    if (dateTasks.length === 0) {
      return (
        <div className="text-center py-6 px-4">
          <AlertCircle className="w-10 h-10 text-gray-300 mx-auto mb-2" />
          <h3 className="text-lg font-medium text-gray-700">Nenhuma tarefa para esta data</h3>
          <p className="text-sm text-gray-500 mt-1">
            Selecione outra data ou ajuste os filtros para visualizar tarefas.
          </p>
        </div>
      );
    }
    
    return (
      <div className="space-y-3 max-h-[400px] overflow-y-auto p-4">
        {dateTasks.map(task => (
          <div
            key={task.id}
            className={cn(
              "border rounded-lg p-3 cursor-pointer transition-all hover:shadow-md",
              isTaskOverdue(task) && !task.completed ? "border-l-4 border-l-red-500" : 
              isTaskDueSoon(task) && !task.completed ? "border-l-4 border-l-amber-500" : 
              task.completed ? "border-l-4 border-l-green-500" : "border-l-4 border-l-blue-500",
              task.completed ? "bg-gray-50" : "bg-white"
            )}
            onClick={() => onViewTask(task.id)}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-start" onClick={(e) => e.stopPropagation()}>
                <Checkbox 
                  checked={task.completed || false}
                  onCheckedChange={() => onToggleTaskCompletion(task.id, !!task.completed)}
                  className="mr-2 mt-1"
                />
                <div>
                  <h3 className={cn(
                    "font-medium line-clamp-1",
                    task.completed ? "line-through text-gray-500" : "text-gray-900"
                  )}>
                    {task.title}
                  </h3>
                  {task.description && (
                    <p className="text-xs text-gray-500 line-clamp-1 mt-0.5">{task.description}</p>
                  )}
                  
                  <div className="flex flex-wrap items-center gap-2 mt-1.5">
                    {task.project && (
                      <div className="flex items-center gap-1">
                        {task.project.client_id && (
                          <ClientAvatar client_id={task.project.client_id} size="xs" />
                        )}
                        <Badge variant="outline" className="text-xs py-0 px-1.5 h-5 bg-blue-50 text-blue-700 border-blue-200">
                          {task.project.name}
                        </Badge>
                      </div>
                    )}
                    
                    <div className="flex items-center gap-1 text-xs text-gray-500">
                      <Clock className="h-3 w-3" />
                      <span>
                        {format(parseISO(task.due_date?.toString() || new Date().toISOString()), "HH:mm", { locale: pt })}h
                      </span>
                    </div>
                    
                    {task.completed && (
                      <div className="flex items-center gap-1 text-xs text-green-600">
                        <Check className="h-3 w-3" />
                        <span>Concluída</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="flex flex-col items-end gap-1">
                <PriorityBadge priority={task.priority || "media"} size="sm" />
                {task.assignedUser && (
                  <div className="h-6 w-6 rounded-full bg-gray-100 flex items-center justify-center text-xs overflow-hidden">
                    {task.assignedUser.avatar ? (
                      <img src={task.assignedUser.avatar} alt={task.assignedUser.name} className="h-full w-full object-cover" />
                    ) : (
                      <span className="font-semibold text-gray-600">
                        {task.assignedUser.name.substring(0, 2).toUpperCase()}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
      {/* Cabeçalho do Calendário */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between p-4 border-b border-gray-200">
        <div className="flex items-center mb-4 lg:mb-0">
          <h2 className="text-lg font-semibold text-gray-800 mr-2">
            {format(currentMonth, "MMMM yyyy", { locale: pt })}
          </h2>
          <div className="flex gap-1">
            <Button 
              variant="outline" 
              size="icon" 
              className="h-8 w-8"
              onClick={previousMonth}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button 
              variant="outline" 
              size="icon" 
              className="h-8 w-8"
              onClick={nextMonth}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              className="h-8 ml-1"
              onClick={goToCurrentMonth}
            >
              Hoje
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Popover open={showFilters} onOpenChange={setShowFilters}>
            <PopoverTrigger asChild>
              <Button 
                variant="outline" 
                size="sm"
                className={cn(
                  "flex items-center gap-1 h-8",
                  (filterCompleted || selectedPriority || selectedUser || selectedProject) && "bg-blue-50 border-blue-200 text-blue-700"
                )}
              >
                <Filter className="h-3.5 w-3.5" />
                <span>Filtros</span>
                <ChevronDown className="h-3.5 w-3.5 ml-1" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-4">
              <div className="space-y-4">
                <h3 className="font-medium text-sm">Filtrar tarefas</h3>
                
                <div className="space-y-2">
                  <h4 className="text-xs text-gray-500 font-medium">Status</h4>
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="completed" 
                      checked={filterCompleted}
                      onCheckedChange={(checked) => setFilterCompleted(!!checked)}
                    />
                    <label 
                      htmlFor="completed" 
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      Mostrar apenas tarefas concluídas
                    </label>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <h4 className="text-xs text-gray-500 font-medium">Prioridade</h4>
                  <Select 
                    value={selectedPriority || ""} 
                    onValueChange={(value) => setSelectedPriority(value || null)}
                  >
                    <SelectTrigger className="h-8">
                      <SelectValue placeholder="Qualquer prioridade" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Qualquer prioridade</SelectItem>
                      <SelectItem value="baixa">Baixa</SelectItem>
                      <SelectItem value="media">Média</SelectItem>
                      <SelectItem value="alta">Alta</SelectItem>
                      <SelectItem value="critica">Crítica</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="pt-2 flex items-center justify-end gap-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => {
                      setFilterCompleted(false);
                      setSelectedPriority(null);
                      setSelectedUser(null);
                      setSelectedProject(null);
                    }}
                  >
                    Limpar filtros
                  </Button>
                  <Button 
                    size="sm"
                    onClick={() => setShowFilters(false)}
                  >
                    Aplicar
                  </Button>
                </div>
              </div>
            </PopoverContent>
          </Popover>
          
          <Popover open={showLegend} onOpenChange={setShowLegend}>
            <PopoverTrigger asChild>
              <Button 
                variant="outline" 
                size="sm"
                className="flex items-center gap-1 h-8"
              >
                <AlertCircle className="h-3.5 w-3.5" />
                <span>Legenda</span>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64 p-4">
              <h3 className="font-medium text-sm mb-3">Legenda do Calendário</h3>
              <div className="space-y-2.5">
                <div className="flex items-center">
                  <div className="h-3 w-3 bg-red-500 rounded-full mr-2"></div>
                  <span className="text-xs">Tarefas críticas</span>
                </div>
                <div className="flex items-center">
                  <div className="h-3 w-3 bg-orange-500 rounded-full mr-2"></div>
                  <span className="text-xs">Tarefas alta prioridade</span>
                </div>
                <div className="flex items-center">
                  <div className="h-3 w-3 bg-amber-500 rounded-full mr-2"></div>
                  <span className="text-xs">Tarefas média prioridade</span>
                </div>
                <div className="flex items-center">
                  <div className="h-3 w-3 bg-emerald-500 rounded-full mr-2"></div>
                  <span className="text-xs">Tarefas baixa prioridade</span>
                </div>
                <div className="flex items-center pt-2">
                  <div className="w-4 border-l-2 border-l-red-500 h-4 mr-2"></div>
                  <span className="text-xs">Dia com tarefas atrasadas</span>
                </div>
                <div className="flex items-center">
                  <div className="w-4 border-l-2 border-l-amber-500 h-4 mr-2"></div>
                  <span className="text-xs">Dia com tarefas próximas do vencimento</span>
                </div>
                <div className="flex items-center">
                  <div className="w-4 border-l-2 border-l-blue-500 h-4 mr-2"></div>
                  <span className="text-xs">Dia com tarefas normais</span>
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-7">
        {/* Visualização do Calendário */}
        <div className="p-4 border-r border-gray-200 md:col-span-1 lg:col-span-5">
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={setSelectedDate}
            month={currentMonth}
            onMonthChange={setCurrentMonth}
            className="w-full"
          />
        </div>
        
        {/* Detalhes da Data Selecionada */}
        <div className="md:col-span-1 lg:col-span-2 border-t md:border-t-0">
          <div className="p-4 border-b border-gray-200">
            <h3 className="font-medium">
              {selectedDate ? (
                <div className="flex items-center">
                  <CalendarIcon className="h-4 w-4 mr-2 text-gray-500" />
                  <span>{format(selectedDate, "EEEE, dd 'de' MMMM", { locale: pt })}</span>
                </div>
              ) : (
                <span className="text-gray-500">Selecione uma data</span>
              )}
            </h3>
          </div>
          
          {selectedDate && renderSelectedDateTasks()}
        </div>
      </div>
    </div>
  );
}