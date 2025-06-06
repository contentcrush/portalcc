import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { onWebSocketMessage } from "@/lib/socket";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { parseISO, format } from "date-fns";
import { toZonedTime } from "date-fns-tz";
import { motion } from "framer-motion";
import { 
  formatDate, 
  formatDueDateWithDaysRemaining, 
  isTaskOverdue, 
  isTaskDueSoon, 
  getTaskSortFunction,
  truncateText,
  getInitials,
  generateAvatarColor,
  showSuccessToast,
  animations
} from "@/lib/utils";
import { AnimatedElement } from "@/components/ui/animated-element";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import TaskDetailSidebarNew from "@/components/TaskDetailSidebarNew";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { insertTaskSchema } from "@shared/schema";
import {
  Plus,
  Search,
  Calendar,
  CalendarDays,
  MessageSquare,
  Paperclip,
  User,
  MoreHorizontal,
  Clock,
  CheckCircle,
  AlarmClock,
  Trash2,
  ChevronUp,
  ChevronDown
} from "lucide-react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { TASK_STATUS_OPTIONS, TASK_PRIORITY_OPTIONS } from "@/lib/constants";
// Já importado anteriormente
import { TaskWithDetails } from "@/lib/types";
import { UserAvatar } from "@/components/UserAvatar";
import { ClientAvatar } from "@/components/ClientAvatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import PriorityBadge from "@/components/PriorityBadge";

// Form schema for task creation and editing
const taskFormSchema = insertTaskSchema.extend({
  title: z.string().min(3, {
    message: "O título deve ter pelo menos 3 caracteres",
  }),
  // Schema already handles date transformations
  
  // Campo temporário usado apenas para capturar a hora durante a edição do formulário
  // Não será enviado para o backend
  due_time_temp: z.string().nullable().optional(),
});

export default function Tasks() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [projectFilter, setProjectFilter] = useState("all");
  const [userFilter, setUserFilter] = useState("all");
  const [clientFilter, setClientFilter] = useState("all");
  // Estado para controlar a exibição das tarefas concluídas
  const [showAllCompleted, setShowAllCompleted] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<TaskWithDetails | null>(null);
  const [taskDetailId, setTaskDetailId] = useState<number | null>(null);
  
  // Estados para o diálogo de confirmação de exclusão
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState<number | null>(null);

  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Task form
  const form = useForm<z.infer<typeof taskFormSchema>>({
    resolver: zodResolver(taskFormSchema),
    defaultValues: {
      title: "",
      description: "",
      priority: "media",
      status: "pendente",
      project_id: undefined,
      assigned_to: undefined,
      estimated_hours: undefined,
      due_date: undefined,
      start_date: undefined,
      due_time_temp: undefined,
    },
  });

  // Fetch tasks com otimizações de caching e performance
  const { data: tasks = [], isLoading: isLoadingTasks } = useQuery<TaskWithDetails[]>({
    queryKey: ['/api/tasks'],
    staleTime: 30 * 1000, // 30 segundos antes de considerar os dados obsoletos
    gcTime: 5 * 60 * 1000, // 5 minutos de cache
    refetchOnWindowFocus: true, // Recarrega quando a janela recebe foco
    onSuccess: (data) => {
      // Removendo logs de depuração que não são mais necessários
      // e podem prejudicar a performance
    }
  });

  // Fetch projects for dropdown com otimizações
  const { data: projects = [] } = useQuery<any[]>({
    queryKey: ['/api/projects'],
    staleTime: 5 * 60 * 1000, // 5 minutos antes de considerar os dados obsoletos
    gcTime: 10 * 60 * 1000, // 10 minutos de cache (dados que mudam pouco)
    refetchOnWindowFocus: false // Projetos não precisam ser recarregados ao focar a janela
  });

  // Fetch users for dropdown com otimizações
  const { data: users = [] } = useQuery<any[]>({
    queryKey: ['/api/users'],
    staleTime: 10 * 60 * 1000, // 10 minutos antes de considerar os dados obsoletos
    gcTime: 15 * 60 * 1000, // 15 minutos de cache (dados que mudam raramente)
    refetchOnWindowFocus: false // Usuários não precisam ser recarregados ao focar a janela
  });
  
  // Fetch clients for dropdown com otimizações
  const { data: clients = [] } = useQuery<any[]>({
    queryKey: ['/api/clients'],
    staleTime: 5 * 60 * 1000, // 5 minutos antes de considerar os dados obsoletos
    gcTime: 10 * 60 * 1000, // 10 minutos de cache (dados que mudam pouco)
    refetchOnWindowFocus: false // Clientes não precisam ser recarregados ao focar a janela
  });

  // Listener para notificações de tarefas via WebSocket
  const setupTaskWebSocketListener = () => {
    // Remover handlers existentes para evitar duplicações
    const cleanupFn = onWebSocketMessage('task_created', (data) => {
      // Atualizar cache sem fazer nova requisição
      queryClient.setQueryData(['/api/tasks'], (oldData: TaskWithDetails[] | undefined) => {
        if (!oldData) return [data.task];
        return [...oldData, data.task];
      });
    });
    
    return cleanupFn;
  };
  
  // Configurar o listener WebSocket quando o componente for montado
  // e limpá-lo quando for desmontado
  useEffect(() => {
    const cleanupListener = setupTaskWebSocketListener();
    return () => cleanupListener();
  }, []);

  // Create task mutation com suporte a atualização otimista
  const createTaskMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest('POST', '/api/tasks', data);
    },
    onMutate: async (newTaskData) => {
      // Cancelar qualquer requisição em andamento
      await queryClient.cancelQueries({ queryKey: ['/api/tasks'] });
      
      // Salvar o estado anterior
      const previousTasks = queryClient.getQueryData(['/api/tasks']);
      
      // Criar ID temporário para a nova tarefa
      const tempId = Date.now();
      
      // Criar objeto de tarefa temporário
      const tempTask: TaskWithDetails = {
        id: tempId,
        title: newTaskData.title,
        description: newTaskData.description || "",
        status: newTaskData.status || "pendente",
        priority: newTaskData.priority || "media",
        due_date: newTaskData.due_date || null,
        start_date: newTaskData.start_date || null,
        estimated_hours: newTaskData.estimated_hours || null,
        completed: newTaskData.completed || false,
        project_id: newTaskData.project_id || null,
        assigned_to: newTaskData.assigned_to || null,
        creation_date: new Date().toISOString(),
        // Adicionar dados de projeto e usuário, se disponíveis
        project: newTaskData.project_id ? 
          projects.find(p => p.id === parseInt(newTaskData.project_id)) : undefined,
        assignedUser: newTaskData.assigned_to ? 
          users.find(u => u.id === parseInt(newTaskData.assigned_to)) : undefined,
        // Flag para indicar que é uma tarefa temporária
        _isOptimistic: true
      };
      
      // Atualizar o cache com a nova tarefa
      queryClient.setQueryData(['/api/tasks'], (old: any[] = []) => {
        return [...old, tempTask];
      });
      
      // Mostrar toast imediatamente
      showSuccessToast({
        title: "Tarefa adicionada",
        description: "A tarefa foi adicionada e está sendo salva...",
      });
      
      // Fechar o diálogo imediatamente
      setIsDialogOpen(false);
      form.reset();
      
      // Retornar o estado anterior para caso de rollback
      return { previousTasks };
    },
    onError: (error, newTask, context) => {
      // Reverter para o estado anterior em caso de erro
      if (context?.previousTasks) {
        queryClient.setQueryData(['/api/tasks'], context.previousTasks);
      }
      
      // Mostrar mensagem de erro
      toast({
        title: "Erro ao criar tarefa",
        description: error.message,
        variant: "destructive",
      });
      
      // Reabrir o diálogo com os dados preenchidos
      setIsDialogOpen(true);
      form.reset(newTask);
    },
    onSuccess: (response) => {
      // Invalidar o cache para atualizar a lista com a versão real do servidor
      queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
      
      // Mostrar toast de confirmação final
      showSuccessToast({
        title: "Tarefa salva",
        description: "Tarefa criada com sucesso no servidor",
      });
    },
  });

  // Update task mutation
  const updateTaskMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      return apiRequest('PATCH', `/api/tasks/${id}`, data);
    },
    onSuccess: () => {
      // Invalidar todas as queries relacionadas a tarefas para atualizar tanto a página quanto a sidebar
      queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
      queryClient.invalidateQueries({ queryKey: ['/api/tasks'], exact: false });
      
      showSuccessToast({ 
        title: "Tarefa atualizada", 
        description: "Tarefa atualizada com sucesso" 
      });
      setIsDialogOpen(false);
      setSelectedTask(null);
      form.reset();
    },
    onError: (error) => {
      toast({
        title: "Erro ao atualizar tarefa",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Delete task mutation
  const deleteTaskMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest('DELETE', `/api/tasks/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
      showSuccessToast({
        title: "Tarefa excluída",
        description: "Tarefa excluída com sucesso",
      });
      
      // Se a tarefa que está sendo excluída é a que está sendo visualizada no detalhe
      if (taskDetailId === taskToDelete) {
        setTaskDetailId(null);
      }
      
      setTaskToDelete(null);
      setShowDeleteConfirmation(false);
    },
    onError: (error) => {
      toast({
        title: "Erro ao excluir tarefa",
        description: error.message,
        variant: "destructive",
      });
      setShowDeleteConfirmation(false);
    },
  });

  // Toggle task completion mutation
  const toggleTaskCompletionMutation = useMutation({
    mutationFn: async ({ id, completed }: { id: number; completed: boolean }) => {
      // Quando a tarefa é marcada como concluída, também mudamos o status para "concluido"
      // Quando é desmarcada, voltamos para o status "pendente"
      // Estratégia 3: Deixamos o servidor definir a data de conclusão
      const completionData = { 
        completed: completed,
        // Atualiza o status baseado no estado de conclusão
        status: completed ? "concluido" : "pendente"
        // Não enviamos o completion_date - o servidor já tem lógica para definir isso
      };
      
      return apiRequest('PATCH', `/api/tasks/${id}`, completionData);
    },
    // Usar otimistic updates para atualização imediata na UI
    onMutate: async ({ id, completed }) => {
      // Cancelar consultas pendentes para evitar sobrescrever o update otimista
      await queryClient.cancelQueries({ queryKey: ['/api/tasks'] });
      
      // Guardar estado anterior para fallback em caso de erro
      const previousTasks = queryClient.getQueryData(['/api/tasks']);
      
      // Atualizar a tarefa no cache de forma otimista
      queryClient.setQueryData(['/api/tasks'], (old: any) => {
        if (!Array.isArray(old)) return old;
        return old.map((task: any) => {
          if (task.id === id) {
            return { 
              ...task, 
              completed: completed,
              status: completed ? "concluido" : "pendente",
              // Na UI, mostramos uma data provisória para feedback imediato
              // Esta data será substituída pelo valor real do servidor
              completion_date: completed ? new Date().toISOString() : null
            };
          }
          return task;
        });
      });
      
      return { previousTasks };
    },
    onSuccess: () => {
      // Ainda invalidamos a query para garantir sincronização com o servidor
      // mas o usuário já viu a mudança instantaneamente
      queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
      showSuccessToast({ 
        title: "Tarefa atualizada", 
        description: "Status de conclusão atualizado com sucesso" 
      });
    },
    onError: (error, _variables, context) => {
      // Em caso de erro, restaurar os dados ao estado anterior
      if (context?.previousTasks) {
        queryClient.setQueryData(['/api/tasks'], context.previousTasks);
      }
      
      toast({
        title: "Erro ao atualizar tarefa",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Form submission handler
  const onSubmit = (data: z.infer<typeof taskFormSchema>) => {
    // Criamos uma cópia dos dados para processar
    const processedData = { ...data };
    
    // Adicionando logs para depuração
    console.log("Dados recebidos do formulário:", JSON.stringify(data, null, 2));
    
    // Processar a data e hora de entrega
    const dueTimeTemp = processedData.due_time_temp;
    delete processedData.due_time_temp; // Remover campo temporário
    
    try {
      // Caso 1: Não temos data de entrega, mas temos data de início e hora
      if (!processedData.due_date && processedData.start_date && dueTimeTemp) {
        console.log("Caso 1: Usando start_date como due_date com hora específica");
        
        // Criar data base a partir da data de início (que deve estar em formato YYYY-MM-DD)
        const startDateStr = processedData.start_date as string;
        
        // Dividir a hora em horas e minutos
        const [hours, minutes] = dueTimeTemp.split(':').map(Number);
        
        // Criar objeto de data a partir da data de início
        const baseDate = new Date(`${startDateStr}T00:00:00`);
        
        // Definir as horas e minutos
        baseDate.setHours(hours, minutes, 0, 0);
        
        processedData.due_date = baseDate;
        console.log("Data base criada:", baseDate.toISOString());
      }
      // Caso 2: Temos data de entrega e hora
      else if (processedData.due_date && dueTimeTemp) {
        console.log("Caso 2: Combinando due_date existente com hora específica");
        
        let baseDate: Date;
        
        // Verificar se a data está em formato string ou já é um objeto Date
        if (typeof processedData.due_date === 'string') {
          // Se for uma string ISO, parseamos diretamente
          if (processedData.due_date.includes('T')) {
            baseDate = new Date(processedData.due_date);
          } 
          // Se for uma string simples (YYYY-MM-DD), criamos uma data às 00:00
          else {
            baseDate = new Date(`${processedData.due_date}T00:00:00`);
          }
        } else {
          // Se já for um objeto Date, usamos diretamente
          baseDate = new Date(processedData.due_date);
        }
        
        // Dividir a hora em horas e minutos
        const [hours, minutes] = dueTimeTemp.split(':').map(Number);
        
        // Atualizar apenas as horas e minutos, mantendo a data
        baseDate.setHours(hours, minutes, 0, 0);
        
        processedData.due_date = baseDate;
        console.log("Data combinada:", baseDate.toISOString());
      }
    } catch (error) {
      console.error("Erro ao processar data/hora:", error);
      // Em caso de erro, mantenha os dados originais
    }
    
    // Log final dos dados processados antes de enviar
    console.log("Dados finais para envio:", JSON.stringify(processedData, null, 2));
    
    if (selectedTask) {
      updateTaskMutation.mutate({ id: selectedTask.id, data: processedData });
    } else {
      createTaskMutation.mutate(processedData);
    }
  };

  // New task handler
  const handleNewTask = () => {
    setSelectedTask(null);
    form.reset({
      title: "",
      description: "",
      priority: "media",
      status: "pendente",
      project_id: undefined,
      assigned_to: undefined,
      estimated_hours: undefined,
      due_date: undefined,
      start_date: undefined,
      due_time_temp: undefined,
    });
    setIsDialogOpen(true);
  };

  // Task selection handler for editing via dialog
  const handleEditTask = (taskId: number) => {
    const task = tasks?.find((t: TaskWithDetails) => t.id === taskId);
    if (task) {
      setSelectedTask(task);
      
      // Extrai a hora da data de vencimento (se disponível)
      let due_time_temp = undefined;
      let formattedDueDate = undefined;
      
      if (task.due_date) {
        const dueDate = new Date(task.due_date);
        const localDueDate = toZonedTime(dueDate, Intl.DateTimeFormat().resolvedOptions().timeZone);
        
        // Para o campo de data, formatamos apenas a data (YYYY-MM-DD)
        formattedDueDate = format(localDueDate, 'yyyy-MM-dd');
        
        // Se o horário não for meia-noite, extraímos ele para o campo de horas
        const hours = localDueDate.getHours();
        const minutes = localDueDate.getMinutes();
        
        if (hours !== 0 || minutes !== 0) {
          due_time_temp = format(localDueDate, 'HH:mm');
        }
      }
      
      // Format dates for form input using date-fns to handle timezone properly
      const formattedTask = {
        ...task,
        // Converte de UTC para o timezone local e formata como YYYY-MM-DD para o input date
        due_date: formattedDueDate,
        start_date: task.start_date 
          ? format(toZonedTime(new Date(task.start_date), Intl.DateTimeFormat().resolvedOptions().timeZone), 'yyyy-MM-dd')
          : undefined,
        // Campo temporário para edição de horas
        due_time_temp: due_time_temp,
      };
      
      form.reset(formattedTask);
      setIsDialogOpen(true);
    }
  };
  
  // Task selection handler for viewing details
  const handleViewTaskDetails = (taskId: number) => {
    setTaskDetailId(taskId);
  };
  
  // Close task details sidebar
  const handleCloseTaskDetails = () => {
    setTaskDetailId(null);
  };

  // Handler para abrir o diálogo de confirmação de exclusão
  const handleDeleteTask = (taskId: number) => {
    setTaskToDelete(taskId);
    setShowDeleteConfirmation(true);
  };
  
  // Handler para confirmar a exclusão da tarefa
  const confirmDeleteTask = () => {
    if (taskToDelete) {
      deleteTaskMutation.mutate(taskToDelete);
    }
  };
  
  // Handle task checkbox toggle
  const handleToggleTaskCompletion = (taskId: number, currentStatus: boolean | null) => {
    toggleTaskCompletionMutation.mutate({
      id: taskId,
      completed: !(currentStatus || false)
    });
  };

  // Filter tasks based on criteria
  let filteredTasks = tasks?.filter((task: TaskWithDetails) => {
    // Search term filter
    if (searchTerm && !task.title.toLowerCase().includes(searchTerm.toLowerCase())) {
      return false;
    }
    
    // Status filter
    if (statusFilter !== "all" && task.status !== statusFilter) {
      return false;
    }
    
    // Priority filter
    if (priorityFilter !== "all" && task.priority !== priorityFilter) {
      return false;
    }
    
    // Project filter
    if (projectFilter !== "all" && task.project_id !== parseInt(projectFilter)) {
      return false;
    }
    
    // User filter
    if (userFilter !== "all" && task.assigned_to !== parseInt(userFilter)) {
      return false;
    }
    
    // Client filter
    if (clientFilter !== "all") {
      // Precisamos verificar o cliente associado ao projeto
      const project = projects.find(p => p.id === task.project_id);
      if (!project || project.client_id !== parseInt(clientFilter)) {
        return false;
      }
    }
    
    // Removemos os filtros baseados no activeTab para permitir
    // que ambas as seções (pendentes e concluídas) sejam exibidas simultaneamente
    
    return true;
  });
  
  // Sort tasks by the intelligent priority algorithm
  if (filteredTasks) {
    filteredTasks = [...filteredTasks].sort(getTaskSortFunction());
  }

  return (
    <div className="space-y-4 relative">
      {/* Task Detail Sidebar */}
      {taskDetailId && (
        <TaskDetailSidebarNew
          taskId={taskDetailId}
          onClose={handleCloseTaskDetails}
          onEdit={handleEditTask}
        />
      )}
      
      {/* Diálogo de confirmação para exclusão de tarefa */}
      <AlertDialog open={showDeleteConfirmation} onOpenChange={(open) => setShowDeleteConfirmation(open)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Você tem certeza que deseja excluir esta tarefa? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDeleteTask}
              className="bg-red-600 text-white hover:bg-red-700"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      <div>
        {/* Cabeçalho com título e botão de Nova Tarefa */}
        <div className="flex justify-between items-center mb-2">
          <div>
            <h1 className="text-2xl font-bold">Tarefas</h1>
            <p className="text-sm text-gray-500">Gerenciamento de tarefas da equipe</p>
          </div>
          <Button onClick={handleNewTask} className="bg-primary hover:bg-primary/90">
            <Plus className="h-4 w-4 mr-2" />
            Nova Tarefa
          </Button>
        </div>
        
        {/* Lista de tarefas */}
        <Card className="overflow-hidden">
          <div className="bg-gray-50 p-4 flex items-center gap-2 border-b border-gray-200">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-600">
              <line x1="8" y1="6" x2="21" y2="6" />
              <line x1="8" y1="12" x2="21" y2="12" />
              <line x1="8" y1="18" x2="21" y2="18" />
              <line x1="3" y1="6" x2="3.01" y2="6" />
              <line x1="3" y1="12" x2="3.01" y2="12" />
              <line x1="3" y1="18" x2="3.01" y2="18" />
            </svg>
            <h2 className="text-sm font-medium text-gray-700">Lista</h2>
          </div>
          
          {/* Tarefas Pendentes */}
          <CardContent className="p-6">
            <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-5">
              <div className="flex items-center gap-3">
                <AlarmClock className="h-5 w-5 text-amber-500" />
                <h2 className="text-lg font-semibold">Tarefas Pendentes</h2>
                {tasks && (
                  <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                    {tasks.filter(t => !t.completed).length}
                  </Badge>
                )}
              </div>
              
              <div className="flex flex-col md:flex-row items-start md:items-center gap-3">
                {/* Filtros - primeira linha (em mobile) ou todos em linha (desktop) */}
                <div className="flex flex-wrap w-full md:w-auto items-center gap-2">
                  {/* Campo de busca */}
                  <div className="relative w-full sm:w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Buscar tarefas..."
                      className="pl-9 bg-gray-50 border-gray-200"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                  
                  {/* Filtro por Prioridade */}
                  <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                    <SelectTrigger className="w-full sm:w-40 bg-gray-50 border-gray-200">
                      <SelectValue placeholder="Prioridade" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas</SelectItem>
                      {TASK_PRIORITY_OPTIONS.map(option => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  
                  {/* Filtro por Cliente */}
                  <Select value={clientFilter} onValueChange={setClientFilter}>
                    <SelectTrigger className="w-full sm:w-40 bg-gray-50 border-gray-200">
                      <SelectValue placeholder="Cliente" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      {clients.map(client => (
                        <SelectItem key={client.id} value={client.id.toString()}>
                          {client.shortName || client.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </header>
            
            {/* Tasks List */}
            <div className="space-y-3">
              {isLoadingTasks ? (
                <div className="flex justify-center items-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
                </div>
              ) : filteredTasks && filteredTasks.filter(task => !task.completed).length > 0 ? (
                filteredTasks.filter(task => !task.completed).map(task => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    onToggleComplete={() => handleToggleTaskCompletion(task.id, task.completed)}
                    onView={() => handleViewTaskDetails(task.id)}
                    onDelete={() => handleDeleteTask(task.id)}
                    onEdit={() => handleEditTask(task.id)}
                  />
                ))
              ) : (
                <div className="bg-gray-50 rounded-lg p-8 text-center">
                  <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
                    <CheckCircle className="h-6 w-6 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-1">Nenhuma tarefa pendente</h3>
                  <p className="text-gray-500 text-sm mb-4">
                    Todas as tarefas foram concluídas ou não correspondem aos filtros aplicados.
                  </p>
                  <Button onClick={handleNewTask}>Criar nova tarefa</Button>
                </div>
              )}
            </div>
          </CardContent>
          
          {/* Tarefas Concluídas */}
          <CardContent className="border-t border-gray-200 bg-gray-50 p-6">
            <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-5">
              <div className="flex items-center gap-3">
                <CheckCircle className="h-5 w-5 text-green-500" />
                <h2 className="text-lg font-semibold">Tarefas Concluídas</h2>
                {tasks && (
                  <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                    {tasks.filter(t => t.completed).length}
                  </Badge>
                )}
              </div>
              <div className="flex justify-end">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setShowAllCompleted(!showAllCompleted)} 
                  className="text-xs text-muted-foreground hover:text-primary bg-white"
                >
                  {showAllCompleted ? (
                    <>
                      <ChevronUp className="h-3.5 w-3.5 mr-1" />
                      Mostrar menos
                    </>
                  ) : (
                    <>
                      <ChevronDown className="h-3.5 w-3.5 mr-1" />
                      Mostrar todas
                    </>
                  )}
                </Button>
              </div>
            </header>
            
            {/* Lista de Tarefas Concluídas */}
            {showAllCompleted ? (
              <div className="space-y-3">
                {isLoadingTasks ? (
                  <div className="flex justify-center items-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
                  </div>
                ) : filteredTasks && filteredTasks.filter(task => task.completed).length > 0 ? (
                  filteredTasks.filter(task => task.completed).map(task => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      onToggleComplete={() => handleToggleTaskCompletion(task.id, task.completed)}
                      onDelete={() => handleDeleteTask(task.id)}
                      onView={() => handleViewTaskDetails(task.id)}
                      onEdit={() => handleEditTask(task.id)}
                    />
                  ))
                ) : (
                  <div className="bg-white rounded-lg p-8 text-center">
                    <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
                      <AlarmClock className="h-6 w-6 text-gray-400" />
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 mb-1">Nenhuma tarefa concluída</h3>
                    <p className="text-gray-500 text-sm mb-4">
                      Você ainda não concluiu nenhuma tarefa ou elas não correspondem aos filtros aplicados.
                    </p>
                  </div>
                )}
              </div>
            ) : (
              // Preview of Completed Tasks (mostrando até 6 tarefas)
              <div className="space-y-3">
                {filteredTasks && filteredTasks.filter(task => task.completed).slice(0, 6).map(task => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    onDelete={() => handleDeleteTask(task.id)}
                    onToggleComplete={() => handleToggleTaskCompletion(task.id, task.completed)}
                    onView={() => handleViewTaskDetails(task.id)}
                    onEdit={() => handleEditTask(task.id)}
                  />
                ))}
                
                {filteredTasks && filteredTasks.filter(task => task.completed).length > 6 && (
                  <Button 
                    variant="outline" 
                    className="w-full text-sm text-muted-foreground hover:text-primary bg-white"
                    onClick={() => setShowAllCompleted(true)}
                  >
                    <ChevronDown className="h-4 w-4 mr-1" />
                    Ver todas as {filteredTasks.filter(task => task.completed).length} tarefas concluídas
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      
        {/* Task Create/Edit Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={(open) => setIsDialogOpen(open)}>
          <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{selectedTask ? "Editar Tarefa" : "Nova Tarefa"}</DialogTitle>
              <DialogDescription>
                {selectedTask ? "Edite os detalhes da tarefa abaixo." : "Adicione uma nova tarefa ao sistema."}
              </DialogDescription>
            </DialogHeader>
            
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pb-4">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Título</FormLabel>
                      <FormControl>
                        <Input placeholder="Título da tarefa" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Descrição</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Descreva os detalhes da tarefa"
                          className="resize-none min-h-[100px]"
                          {...field}
                          value={field.value || ''}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="project_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Projeto</FormLabel>
                        <FormControl>
                          <Select
                            value={field.value?.toString()}
                            onValueChange={(value) => field.onChange(parseInt(value))}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Selecionar projeto" />
                            </SelectTrigger>
                            <SelectContent>
                              {projects?.map((project: any) => (
                                <SelectItem key={project.id} value={project.id.toString()}>
                                  {project.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="assigned_to"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Responsável</FormLabel>
                        <FormControl>
                          <Select
                            value={field.value?.toString()}
                            onValueChange={(value) => field.onChange(parseInt(value))}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Atribuir a" />
                            </SelectTrigger>
                            <SelectContent>
                              {users?.map((user: any) => (
                                <SelectItem key={user.id} value={user.id.toString()}>
                                  {user.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="priority"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Prioridade</FormLabel>
                        <FormControl>
                          <Select
                            value={field.value}
                            onValueChange={field.onChange}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione a prioridade" />
                            </SelectTrigger>
                            <SelectContent>
                              {TASK_PRIORITY_OPTIONS.map(option => (
                                <SelectItem key={option.value} value={option.value}>
                                  {option.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="status"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Status</FormLabel>
                        <FormControl>
                          <Select
                            value={field.value}
                            onValueChange={field.onChange}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione o status" />
                            </SelectTrigger>
                            <SelectContent>
                              {TASK_STATUS_OPTIONS.map(option => (
                                <SelectItem key={option.value} value={option.value}>
                                  {option.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="start_date"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Data de início</FormLabel>
                        <FormControl>
                          <Input 
                            type="date" 
                            {...field}
                            value={field.value || ''}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="due_date"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Data de entrega</FormLabel>
                        <FormControl>
                          <Input 
                            type="date" 
                            {...field}
                            value={field.value || ''}
                          />
                        </FormControl>
                        <FormDescription>
                          {!field.value && form.getValues("due_time_temp") && (
                            <div className="text-amber-500 text-xs mt-1">
                              ⚠️ Preencha a data ou a hora será aplicada à data de início.
                            </div>
                          )}
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="due_time_temp"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Hora de entrega</FormLabel>
                        <FormControl>
                          <Input 
                            type="time" 
                            {...field}
                            value={field.value || ''}
                            onChange={(e) => {
                              // Atualizar o valor do campo
                              field.onChange(e.target.value);
                              
                              // Se temos hora de entrega mas não temos data de entrega, usar data de início
                              if (e.target.value && !form.getValues("due_date") && form.getValues("start_date")) {
                                form.setValue("due_date", form.getValues("start_date"));
                              }
                            }}
                          />
                        </FormControl>
                        <FormDescription>
                          Especifique a hora limite para entrega da tarefa.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <FormField
                  control={form.control}
                  name="estimated_hours"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Horas estimadas</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          step="0.5"
                          placeholder="Ex.: 4.5" 
                          {...field}
                          value={field.value || ''}
                          onChange={(e) => {
                            const value = e.target.value === '' ? undefined : parseFloat(e.target.value);
                            field.onChange(value);
                          }}
                        />
                      </FormControl>
                      <FormDescription>
                        Tempo estimado para conclusão (em horas)
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                {selectedTask && (
                  <FormField
                    control={form.control}
                    name="completed"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>
                            Marcar como concluída
                          </FormLabel>
                          <FormDescription>
                            A data de conclusão será definida automaticamente
                          </FormDescription>
                        </div>
                      </FormItem>
                    )}
                  />
                )}
                
                <div className="pt-5 pb-4">
                  {form.getValues("due_time_temp") && !form.getValues("due_date") && form.getValues("start_date") && (
                    <div className="px-3 py-2 mb-3 rounded bg-amber-50 border border-amber-200">
                      <p className="text-xs text-amber-700">
                        <strong>⚠️ Aviso:</strong> Quando você especifica apenas uma hora de entrega sem data, o sistema usará a data de início como referência.
                      </p>
                    </div>
                  )}
                  <DialogFooter className="flex flex-row justify-end gap-2">
                    <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                      Cancelar
                    </Button>
                    <Button type="submit" disabled={createTaskMutation.isPending || updateTaskMutation.isPending}>
                      {createTaskMutation.isPending || updateTaskMutation.isPending ? (
                        <>
                          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Salvando...
                        </>
                      ) : selectedTask ? 'Salvar alterações' : 'Criar tarefa'}
                    </Button>
                  </DialogFooter>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

// Task Card Component
interface TaskCardProps {
  task: TaskWithDetails;
  onToggleComplete: () => void;
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

function TaskCard({ task, onToggleComplete, onView, onEdit, onDelete }: TaskCardProps) {
  // Check if task has related entity data
  const hasProject = !!task.project;
  const hasAssignee = !!task.assignedUser;
  const hasComments = task.comments && task.comments.length > 0;
  const hasAttachments = task.attachments && task.attachments.length > 0;
  
  // Calculate task status
  const isOverdue = isTaskOverdue(task);
  const isDueSoon = isTaskDueSoon(task);
  const isCompleted = task.completed;
  
  // Referência para controlar animação
  const cardRef = useRef<HTMLDivElement>(null);
  
  // Handler para toggle com animação
  const handleToggleComplete = () => {
    // Aplicar animação baseada no novo status (inverso do atual)
    if (cardRef.current) {
      const animationType = !isCompleted ? 'taskComplete' : 'fadeIn';
      
      // Usando animação CSS em vez de motion.animate que está causando erros
      const element = cardRef.current;
      if (!isCompleted) {
        element.classList.add('animate-pulse');
      } else {
        element.classList.add('animate-fade-in');
      }
      
      // Remover classes de animação após terminar (tempo reduzido para 400ms)
      setTimeout(() => {
        element.classList.remove('animate-pulse');
        element.classList.remove('animate-fade-in');
      }, 400);
    }
    
    // Chamar handler original imediatamente
    onToggleComplete();
  };
  
  return (
    <Card 
      ref={cardRef}
      className={cn(
        "border overflow-hidden transition-all duration-200",
        {
          "border-green-300 bg-green-50": isCompleted,
          "border-red-300 bg-red-50": !isCompleted && isOverdue,
          "border-amber-300 bg-amber-50": !isCompleted && !isOverdue && isDueSoon,
          "border-gray-200 hover:border-gray-300": !isCompleted && !isOverdue && !isDueSoon,
        }
      )}
    >
      <CardContent className="px-4 py-3" onClick={onView}>
        <div className="flex items-start gap-4">
          {/* Task Completion Checkbox */}
          <div className="pt-1" onClick={(e) => e.stopPropagation()}>
            <Checkbox 
              checked={isCompleted} 
              onCheckedChange={handleToggleComplete}
              className={cn(
                "transition-colors duration-200",
                isCompleted ? "text-green-500 border-green-500" : ""
              )}
            />
          </div>
          
          {/* Task Content */}
          <div className="flex-1 min-w-0">
            {/* Title and Project */}
            <div className="mb-1">
              <h3 className="text-sm font-medium leading-tight">{task.title}</h3>
              
              {/* Project info if available */}
              {hasProject && (
                <div className="flex items-center gap-1 mt-1 text-xs text-gray-500">
                  <span>
                    Projeto: {task.project?.name}
                  </span>
                </div>
              )}
            </div>
            
            {/* Description preview */}
            {task.description && (
              <p className="text-xs text-gray-500 line-clamp-2 mb-2">
                {truncateText(task.description, 120)}
              </p>
            )}
            
            {/* Task Metadata */}
            <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
              {/* Priority */}
              <PriorityBadge priority={task.priority} size="sm" />
              
              {/* Due date */}
              {task.due_date && (
                <div className={cn(
                  "flex items-center gap-1", 
                  isOverdue && !isCompleted ? "text-red-600" : "",
                  isDueSoon && !isCompleted && !isOverdue ? "text-amber-600" : ""
                )}>
                  <Calendar 
                    className="h-3 w-3 mr-0.5"
                  />
                  <span className="whitespace-nowrap">
                    {/* Usar formatDateWithTime que já detecta se tem hora específica */}
                    {task.due_date ? (
                      <>
                        {formatDueDateWithDaysRemaining(task.due_date)}
                        {new Date(task.due_date).getUTCHours() !== 23 && (
                          <span className="ml-1 font-medium">
                            às {format(new Date(task.due_date), 'HH:mm')}
                          </span>
                        )}
                      </>
                    ) : '-'}
                  </span>
                </div>
              )}
              
              {/* Estimated hours */}
              {task.estimated_hours && (
                <div className="flex items-center gap-1 mr-3">
                  <AlarmClock className="h-3 w-3" />
                  <span>Estimativa: {task.estimated_hours}h</span>
                </div>
              )}
              
              {/* Comments */}
              {hasComments && (
                <div className="flex items-center text-xs mr-2">
                  <MessageSquare className="h-3 w-3 mr-0.5" />
                  <span>{task.comments?.length}</span>
                </div>
              )}
              
              {/* Attachments */}
              {hasAttachments && (
                <div className="flex items-center text-xs">
                  <Paperclip className="h-3 w-3 mr-0.5" />
                  <span>{task.attachments?.length}</span>
                </div>
              )}
              
              {/* Completion date for completed tasks (condensed) */}
              {isCompleted && task.completion_date && (
                <div className="flex items-center gap-1 text-green-600 ml-auto">
                  <CheckCircle className="h-3 w-3" />
                  <span>{formatDate(task.completion_date)}</span>
                </div>
              )}
            </div>
          </div>
          
          {/* Right side: assignee and actions */}
          <div className="flex flex-col items-end gap-2">
            {/* Assignee */}
            {hasAssignee && (
              <div className="flex items-center">
                <UserAvatar
                  user={task.assignedUser}
                  size="sm"
                />
              </div>
            )}
            
            {/* Actions dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={onView}>
                  Ver detalhes
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onEdit}>
                  Editar
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={onToggleComplete}>
                  {isCompleted ? "Marcar como pendente" : "Marcar como concluída"}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  onClick={onDelete}
                  className="text-red-600"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Excluir
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Helper function for conditional classNames
function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}