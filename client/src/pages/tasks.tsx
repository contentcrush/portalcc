import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  formatDate, 
  formatDueDateWithDaysRemaining, 
  isTaskOverdue, 
  isTaskDueSoon, 
  getTaskSortFunction,
  truncateText,
  getInitials,
  generateAvatarColor
} from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import TaskDetailSidebar from "@/components/TaskDetailSidebar";
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
  AlarmClock
} from "lucide-react";
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
});

export default function Tasks() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [projectFilter, setProjectFilter] = useState("all");
  const [userFilter, setUserFilter] = useState("all");
  const [activeTab, setActiveTab] = useState("pendentes");
  const [viewMode, setViewMode] = useState("lista");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<TaskWithDetails | null>(null);
  const [taskDetailId, setTaskDetailId] = useState<number | null>(null);

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
    },
  });

  // Fetch tasks
  const { data: tasks, isLoading: isLoadingTasks } = useQuery({
    queryKey: ['/api/tasks'],
  });

  // Fetch projects for dropdown
  const { data: projects } = useQuery({
    queryKey: ['/api/projects'],
  });

  // Fetch users for dropdown
  const { data: users } = useQuery({
    queryKey: ['/api/users'],
  });

  // Create task mutation
  const createTaskMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest('POST', '/api/tasks', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
      toast({
        title: "Tarefa criada",
        description: "Tarefa criada com sucesso",
      });
      setIsDialogOpen(false);
      form.reset();
    },
    onError: (error) => {
      toast({
        title: "Erro ao criar tarefa",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Update task mutation
  const updateTaskMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      return apiRequest('PATCH', `/api/tasks/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
      toast({
        title: "Tarefa atualizada",
        description: "Tarefa atualizada com sucesso",
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

  // Toggle task completion mutation
  const toggleTaskCompletionMutation = useMutation({
    mutationFn: async ({ id, completed }: { id: number; completed: boolean }) => {
      // Enviando apenas o campo completed - a data será definida no servidor
      const completionData = { 
        completed: completed 
      };
      
      return apiRequest('PATCH', `/api/tasks/${id}`, completionData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
      toast({
        title: "Tarefa atualizada",
        description: "Status de conclusão atualizado com sucesso",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao atualizar tarefa",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Form submission handler
  const onSubmit = (data: z.infer<typeof taskFormSchema>) => {
    if (selectedTask) {
      updateTaskMutation.mutate({ id: selectedTask.id, data });
    } else {
      createTaskMutation.mutate(data);
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
    });
    setIsDialogOpen(true);
  };

  // Task selection handler for editing via dialog
  const handleEditTask = (taskId: number) => {
    const task = tasks?.find((t) => t.id === taskId);
    if (task) {
      setSelectedTask(task);
      // Format dates for form input
      const formattedTask = {
        ...task,
        due_date: task.due_date ? new Date(task.due_date).toISOString().split('T')[0] : undefined,
        start_date: task.start_date ? new Date(task.start_date).toISOString().split('T')[0] : undefined,
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

  // Handle task checkbox toggle
  const handleToggleTaskCompletion = (taskId: number, currentStatus: boolean) => {
    toggleTaskCompletionMutation.mutate({
      id: taskId,
      completed: !currentStatus
    });
  };

  // Filter tasks based on criteria
  let filteredTasks = tasks?.filter(task => {
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
    
    // Tab filter - for main tabs (pendentes/concluidas)
    if (activeTab === "pendentes" && task.completed) {
      return false;
    }
    
    if (activeTab === "concluidas" && !task.completed) {
      return false;
    }
    
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
        <TaskDetailSidebar
          taskId={taskDetailId}
          onClose={handleCloseTaskDetails}
        />
      )}
      
      {/* Cabeçalho com título e botão de Nova Tarefa */}
      <div className="flex justify-between items-center mb-2">
        <div>
          <h1 className="text-2xl font-bold">Tarefas</h1>
          <p className="text-sm text-gray-500">Gerenciamento de tarefas da equipe</p>
        </div>
        <Button onClick={handleNewTask} className="bg-indigo-600 hover:bg-indigo-700">
          <Plus className="h-4 w-4 mr-2" />
          Nova Tarefa
        </Button>
      </div>
      
      {/* View Mode Tabs - Lista/Quadro/Calendário */}
      <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
        <Tabs value={viewMode} onValueChange={setViewMode}>
          <TabsList className="bg-white border border-gray-200">
            <TabsTrigger value="lista" className="flex items-center gap-1">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="8" y1="6" x2="21" y2="6" />
                <line x1="8" y1="12" x2="21" y2="12" />
                <line x1="8" y1="18" x2="21" y2="18" />
                <line x1="3" y1="6" x2="3.01" y2="6" />
                <line x1="3" y1="12" x2="3.01" y2="12" />
                <line x1="3" y1="18" x2="3.01" y2="18" />
              </svg>
              Lista
            </TabsTrigger>
            <TabsTrigger value="quadro" className="flex items-center gap-1">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="7" height="7" />
                <rect x="14" y="3" width="7" height="7" />
                <rect x="14" y="14" width="7" height="7" />
                <rect x="3" y="14" width="7" height="7" />
              </svg>
              Quadro
            </TabsTrigger>
            <TabsTrigger value="calendario" className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              Calendário
            </TabsTrigger>
          </TabsList>
        
          {/* Main Content */}
          <TabsContent value="lista" className="mt-4">
            {/* Task Status Tabs - Pendentes/Concluídas */}
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              {/* Pendentes Tab */}
              <div className="p-6">
                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center gap-3">
                    <AlarmClock className="h-5 w-5 text-amber-500" />
                    <h2 className="text-lg font-semibold">Tarefas Pendentes</h2>
                    {tasks && (
                      <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                        {tasks.filter(t => !t.completed).length}
                      </Badge>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <div className="relative w-64">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        placeholder="Buscar tarefas..."
                        className="pl-9 bg-gray-50 border-gray-200"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                      />
                    </div>
                    
                    <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                      <SelectTrigger className="w-40 bg-gray-50 border-gray-200">
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
                  </div>
                </div>
                
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
              </div>
              
              {/* Concluídas Section */}
              <div className="border-t border-gray-200 bg-gray-50 p-6">
                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center gap-3">
                    <CheckCircle className="h-5 w-5 text-green-500" />
                    <h2 className="text-lg font-semibold">Tarefas Concluídas</h2>
                    {tasks && (
                      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                        {tasks.filter(t => t.completed).length}
                      </Badge>
                    )}
                  </div>
                  
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="text-gray-500 hover:text-gray-700"
                    onClick={() => setActiveTab(activeTab === "pendentes" ? "concluidas" : "pendentes")}
                  >
                    {activeTab === "pendentes" ? "Ver todas" : "Ocultar"}
                  </Button>
                </div>
                
                {/* Completed Tasks (Limited or Full View) */}
                {activeTab === "concluidas" ? (
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
                  // Preview of Completed Tasks (3 max)
                  <div className="space-y-3">
                    {filteredTasks && filteredTasks.filter(task => task.completed).slice(0, 3).map(task => (
                      <TaskCard
                        key={task.id}
                        task={task}
                        onToggleComplete={() => handleToggleTaskCompletion(task.id, task.completed)}
                        onView={() => handleViewTaskDetails(task.id)}
                        onEdit={() => handleEditTask(task.id)}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="quadro" className="mt-4">
            <div className="bg-white rounded-lg p-8 text-center border border-gray-200">
              <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400">
                  <rect x="3" y="3" width="7" height="7" />
                  <rect x="14" y="3" width="7" height="7" />
                  <rect x="14" y="14" width="7" height="7" />
                  <rect x="3" y="14" width="7" height="7" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-1">Visualização em Quadro</h3>
              <p className="text-gray-500 text-sm mb-4">
                A visualização em quadro Kanban será implementada em breve.
              </p>
            </div>
          </TabsContent>
          
          <TabsContent value="calendario" className="mt-4">
            <div className="bg-white rounded-lg p-8 text-center border border-gray-200">
              <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
                <Calendar className="h-6 w-6 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-1">Visualização em Calendário</h3>
              <p className="text-gray-500 text-sm mb-4">
                A visualização em calendário será implementada em breve.
              </p>
            </div>
          </TabsContent>
        </Tabs>
      </div>
      
      {/* Task Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>{selectedTask ? "Editar Tarefa" : "Nova Tarefa"}</DialogTitle>
            <DialogDescription>
              {selectedTask ? "Edite os detalhes da tarefa abaixo." : "Adicione uma nova tarefa ao sistema."}
            </DialogDescription>
          </DialogHeader>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
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
                            {projects?.map(project => (
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
                            {users?.map(user => (
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
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
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
              
              <DialogFooter>
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
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Task Card Component
interface TaskCardProps {
  task: TaskWithDetails;
  onToggleComplete: () => void;
  onView: () => void;
  onEdit: () => void;
}

function TaskCard({ task, onToggleComplete, onView, onEdit }: TaskCardProps) {
  // Check if task has related entity data
  const hasProject = !!task.project;
  const hasAssignee = !!task.assignedUser;
  const hasComments = task.comments && task.comments.length > 0;
  const hasAttachments = task.attachments && task.attachments.length > 0;
  
  // Calculate task status
  const isOverdue = isTaskOverdue(task);
  const isDueSoon = isTaskDueSoon(task);
  const isCompleted = task.completed;
  
  return (
    <Card className={cn(
      "transition-all duration-200",
      isCompleted ? "bg-gray-50" : "bg-white",
      isCompleted ? "border-gray-200" : isOverdue ? "border-red-200" : isDueSoon ? "border-amber-200" : "border-gray-200",
      "hover:border-gray-300"
    )}>
      <CardContent className="p-3">
        <div className="flex flex-col gap-1">
          {/* Task Title Row */}
          <div className="flex items-start justify-between">
            <div className="flex items-start">
              <Checkbox 
                checked={isCompleted}
                onCheckedChange={onToggleComplete}
                className="mt-1 mr-2"
              />
              <div>
                <h3 className={cn(
                  "font-medium leading-tight",
                  isCompleted ? "text-gray-500 line-through" : "text-gray-900"
                )}>
                  {task.title}
                </h3>
                
                {task.description && (
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                    {task.description}
                  </p>
                )}
                
                {/* Project and Client */}
                {task.project?.client && (
                  <div className="flex items-center mt-1">
                    <div className="flex items-center text-xs text-gray-600">
                      <ClientAvatar 
                        name={task.project.client.name} 
                        logoUrl={task.project.client.logo} 
                        size="xs"
                        className="mr-1"
                      />
                      <span>{task.project.client.shortName || task.project.client.name}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            {/* Right side with priority badge and actions */}
            <div className="flex flex-col items-end gap-1">
              <div className="flex items-center gap-1">
                <PriorityBadge priority={task.priority} size="sm" />
                
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-6 w-6 p-0">
                      <MoreHorizontal className="h-3.5 w-3.5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={onView}>
                      Ver detalhes
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={onEdit}>
                      Editar tarefa
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={onToggleComplete}>
                      {isCompleted ? "Marcar como pendente" : "Marcar como concluída"}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              
              {/* User Avatar */}
              {hasAssignee && (
                <UserAvatar 
                  name={task.assignedUser?.name || ""} 
                  avatarUrl={task.assignedUser?.avatar} 
                  size="xs"
                />
              )}
            </div>
          </div>
          
          {/* Task Metadata */}
          <div className="flex items-center flex-wrap text-xs text-gray-500 mt-0.5 pl-6">
            {/* Due date */}
            {task.due_date && (
              <div className={cn(
                "flex items-center gap-1 mr-3",
                isOverdue && !isCompleted ? "text-red-600 font-medium" : "",
                isDueSoon && !isCompleted && !isOverdue ? "text-amber-600 font-medium" : ""
              )}>
                <Clock className="h-3 w-3" />
                <span>
                  {formatDueDateWithDaysRemaining(task.due_date)}
                </span>
              </div>
            )}
            
            {/* Estimated hours */}
            {task.estimated_hours && (
              <div className="flex items-center gap-1 mr-3">
                <AlarmClock className="h-3 w-3" />
                <span>{task.estimated_hours}h</span>
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
            {isCompleted && task.completed_at && (
              <div className="flex items-center gap-1 text-green-600 ml-auto">
                <CheckCircle className="h-3 w-3" />
                <span>{formatDate(task.completed_at)}</span>
              </div>
            )}
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