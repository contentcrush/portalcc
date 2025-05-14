import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import {
  Plus,
  ListTodo,
  Users,
  Calendar as CalendarIcon,
  Clock,
  AlertCircle,
  Check
} from "lucide-react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isBefore } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn, formatDateWithTime } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { PRIORITY_COLOR_CLASSES } from "@/lib/constants";
import PriorityBadge from "@/components/PriorityBadge";

export default function QuickActions() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [_, navigate] = useLocation();

  // Gerar dias do mês para o mini-calendário
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calendarDays = eachDayOfInterval({ start: monthStart, end: monthEnd });
  
  // Navegar para a página correspondente
  const handleNewProject = () => navigate("/projects/new");
  const handleNewTask = () => navigate("/tasks/new");
  const handleNewClient = () => navigate("/clients/new");
  
  // Quando um dia é clicado no mini calendário
  const handleDayClick = (day: Date) => {
    // Navega para a página de calendário com a data selecionada
    navigate(`/calendar?date=${format(day, 'yyyy-MM-dd')}`);
  };

  // Definir a interface para as tarefas
  interface Task {
    id: number;
    title: string;
    description?: string;
    status: string;
    priority: string;
    due_date: string;
    due_time?: string;
    completed?: boolean;
    project_id?: number;
    project?: {
      id: number;
      name: string;
      client_id: number;
    };
    assigned_to?: number;
    assignedUser?: {
      id: number;
      name: string;
    };
    // Campos mapeados do projeto e responsável
    projectName?: string;
    assigneeName?: string;
  }
  
  // Buscar as próximas tarefas a vencer
  const { data: tasks, isLoading, error } = useQuery<Task[]>({
    queryKey: ['/api/tasks'],
    select: (data: Task[]) => {
      // Incluir apenas tarefas não concluídas
      const pendingTasks = [...data].filter(task => 
        task.status !== 'concluido' && !task.completed && task.due_date
      );
      
      // Mapear tarefas com informações de projeto e responsável
      const tasksWithDetails = pendingTasks.map(task => {
        return {
          ...task,
          projectName: task.project?.name || 'Sem projeto',
          assigneeName: task.assignedUser?.name || 'Não atribuído'
        };
      });
      
      // Ordenar por data de vencimento (tarefas atrasadas primeiro, depois as mais próximas)
      const sortedTasks = tasksWithDetails.sort((a, b) => {
        const dateA = new Date(a.due_date);
        const dateB = new Date(b.due_date);
        return dateA.getTime() - dateB.getTime();
      });
      
      // Retornar sempre as 5 primeiras tarefas
      return sortedTasks.slice(0, 5);
    }
  });
  
  // Cores baseadas no status da tarefa
  const getStatusColor = (status: string) => {
    switch(status) {
      case 'pendente': return 'bg-amber-500';
      case 'em_andamento': return 'bg-blue-500';
      case 'concluído': return 'bg-green-500';
      case 'atrasado': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };
  
  // Tradução dos status para exibição
  const getStatusText = (status: string) => {
    switch(status) {
      case 'pendente': return 'Pendente';
      case 'em_andamento': return 'Em Andamento';
      case 'concluído': return 'Concluído';
      case 'atrasado': return 'Atrasado';
      default: return status;
    }
  };
  
  // Não precisamos mais dessa função pois estamos usando o componente PriorityBadge
  
  // Verificar se uma tarefa está atrasada
  const isTaskOverdue = (dueDate: string) => {
    return isBefore(new Date(dueDate), new Date()) && new Date(dueDate).setHours(0,0,0,0) < new Date().setHours(0,0,0,0);
  };

  // Determinar se um dia é hoje
  const isToday = (day: Date) => isSameDay(day, new Date());

  return (
    <div className="p-4 space-y-8">
      {/* Ações Rápidas */}
      <div>
        <h2 className="text-sm font-medium text-gray-500 uppercase mb-3">AÇÕES RÁPIDAS</h2>
        <div className="space-y-2">
          <Button 
            variant="default" 
            className="w-full justify-start" 
            size="lg"
            onClick={handleNewProject}
          >
            <Plus className="mr-2 h-5 w-5" />
            Novo Projeto
          </Button>
          <Button 
            variant="outline" 
            className="w-full justify-start bg-gray-50 text-gray-800" 
            size="lg"
            onClick={handleNewTask}
          >
            <ListTodo className="mr-2 h-5 w-5" />
            Nova Tarefa
          </Button>
          <Button 
            variant="outline" 
            className="w-full justify-start bg-gray-50 text-gray-800" 
            size="lg"
            onClick={handleNewClient}
          >
            <Users className="mr-2 h-5 w-5" />
            Novo Cliente
          </Button>
        </div>
      </div>

      {/* Mini Calendário */}
      <div>
        <h2 className="text-sm font-medium text-gray-500 uppercase mb-3">CALENDÁRIO</h2>
        <div className="bg-gray-50 rounded-md p-4">
          <div className="text-center mb-3">
            <h3 className="font-medium">{format(currentDate, 'MMMM yyyy', { locale: ptBR })}</h3>
          </div>
          
          {/* Dias da semana */}
          <div className="grid grid-cols-7 text-center text-xs font-medium text-gray-500 mb-1">
            {["D", "S", "T", "Q", "Q", "S", "S"].map((day, index) => (
              <div key={index}>{day}</div>
            ))}
          </div>
          
          {/* Grid do calendário */}
          <div className="grid grid-cols-7 gap-1 text-center">
            {/* Espaços vazios para o início do mês */}
            {Array.from({ length: monthStart.getDay() }).map((_, index) => (
              <div key={`empty-start-${index}`} className="h-6"></div>
            ))}
            
            {/* Dias do mês */}
            {calendarDays.map((day) => (
              <div 
                key={day.toISOString()} 
                className={cn(
                  "h-6 w-6 mx-auto text-xs rounded-full flex items-center justify-center cursor-pointer",
                  isToday(day) ? "bg-blue-500 text-white" : "hover:bg-gray-200"
                )}
                onClick={() => handleDayClick(day)}
              >
                {format(day, 'd')}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Próximas Tarefas */}
      <div>
        <h2 className="text-sm font-medium text-gray-500 uppercase mb-3">PRÓXIMAS TAREFAS</h2>
        
        {isLoading && (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="flex flex-col space-y-2 p-2">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-4 w-2/3" />
              </div>
            ))}
          </div>
        )}
        
        {error && (
          <div className="text-center py-4 text-red-500 flex flex-col items-center">
            <AlertCircle className="h-10 w-10 mb-2" />
            <p>Erro ao carregar tarefas</p>
          </div>
        )}
        
        {!isLoading && !error && tasks?.length === 0 && (
          <div className="text-center py-4 text-gray-500 flex flex-col items-center">
            <Check className="h-10 w-10 mb-2" />
            <p>Não há tarefas pendentes!</p>
          </div>
        )}
        
        <div>
          {tasks?.map(task => {
            const dueDate = new Date(task.due_date);
            const isOverdue = isTaskOverdue(task.due_date);
            const statusClass = isOverdue ? 'bg-red-500' : getStatusColor(task.status);
            
            return (
              <div 
                key={task.id} 
                className="p-4 mb-2 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer border border-gray-100"
                onClick={() => navigate(`/tasks/${task.id}`)}
              >
                <div className="flex justify-between items-center">
                  <h3 className="font-medium text-base truncate flex-1">{task.title}</h3>
                  <div 
                    className={`h-4 w-4 rounded-full ml-2 ${statusClass}`}
                    title={isOverdue ? 'Atrasado' : getStatusText(task.status)}
                  ></div>
                </div>
                
                <div className="text-xs text-gray-500 mt-1.5">
                  Projeto: <span className="text-gray-600">{task.projectName || 'Sem projeto'}</span>
                </div>
                
                <div className="text-xs text-gray-500 mt-0.5">
                  Responsável: <span className="text-gray-600">{task.assigneeName || 'Não atribuído'}</span>
                </div>
                
                <div className="flex justify-between items-center mt-2">
                  <div className="flex items-center text-xs text-gray-500">
                    <Clock className="h-3 w-3 mr-1" />
                    <span title={formatDateWithTime(task.due_date)}>
                      {format(dueDate, 'dd/MM/yyyy')}
                      {task.due_time && (
                        <span className="ml-1 font-medium">
                          às {task.due_time}
                        </span>
                      )}
                    </span>
                  </div>
                  
                  <PriorityBadge 
                    priority={task.priority}
                    size="sm"
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}