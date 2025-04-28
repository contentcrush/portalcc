import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import TaskItem from "@/components/TaskItem";
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
  Filter,
  Clock,
  Calendar,
  CalendarDays,
  MessageSquare,
  Paperclip,
  ArrowUpDown
} from "lucide-react";
import { TASK_STATUS_OPTIONS, TASK_PRIORITY_OPTIONS } from "@/lib/constants";
import { TaskWithDetails } from "@/lib/types";
import { getTaskSortFunction, sortTasksByPriority } from "@/lib/utils";

// Form schema for task creation and editing
const taskFormSchema = insertTaskSchema.extend({
  title: z.string().min(3, {
    message: "O título deve ter pelo menos 3 caracteres",
  }),
  // Não precisamos converter datas, o schema já tem transformação
});

export default function Tasks() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [projectFilter, setProjectFilter] = useState("all");
  const [userFilter, setUserFilter] = useState("all");
  const [activeTab, setActiveTab] = useState("pendentes");
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
      // Vamos ver quais dados estão sendo enviados
      console.log("Enviando dados para o servidor:", JSON.stringify(data, null, 2));
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
      // Os dados já foram convertidos no onSubmit
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

  // Form submission handler
  const onSubmit = (data: z.infer<typeof taskFormSchema>) => {
    // Não precisamos converter as datas manualmente, o schema faz isso
    // Apenas enviamos os dados como estão
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
  const handleSelectTask = (taskId: number) => {
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
    
    // Tab filter
    if (activeTab === "pendentes" && task.completed) {
      return false;
    }
    
    if (activeTab === "concluidas" && !task.completed) {
      return false;
    }
    
    return true;
  });
  
  // Sort tasks by the intelligent priority algorithm
  // This will ensure the most important tasks appear at the top of the list
  if (filteredTasks) {
    // Use the smart sorting function that considers multiple factors
    filteredTasks = [...filteredTasks].sort(getTaskSortFunction());
  }

  return (
    <div className="space-y-6 relative">
      {/* Task Detail Sidebar */}
      {taskDetailId && (
        <TaskDetailSidebar
          taskId={taskDetailId}
          onClose={handleCloseTaskDetails}
        />
      )}
      
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center space-y-4 md:space-y-0">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tarefas</h1>
          <p className="text-sm text-gray-500">Gerenciamento de tarefas de equipe</p>
        </div>
        
        <div className="flex items-center space-x-3">
          <Button 
            onClick={handleNewTask} 
            className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm flex items-center"
          >
            <Plus className="h-5 w-5 mr-2" />
            <span className="relative pr-5">
              Nova Tarefa
              {/* Avatar que aparece sobreposto ao texto do botão */}
              <span className="absolute -right-4 -top-1 h-7 w-7 rounded-full bg-teal-500 text-white flex items-center justify-center text-xs font-medium overflow-hidden">
                ZP
              </span>
            </span>
          </Button>
        </div>
      </div>
      
      {/* Filter and search */}
      <div className="flex flex-wrap items-center justify-between bg-white p-4 rounded-lg shadow-sm space-y-4 md:space-y-0">
        <div className="w-full md:w-auto mb-3 md:mb-0">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar tarefas..."
              className="pl-10 w-full md:w-80"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        
        <div className="flex flex-wrap gap-2 w-full md:w-auto">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {TASK_STATUS_OPTIONS.map(option => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Select value={priorityFilter} onValueChange={setPriorityFilter}>
            <SelectTrigger className="w-32">
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
          
          <Select value={projectFilter} onValueChange={setProjectFilter}>
            <SelectTrigger className="w-36">
              <SelectValue placeholder="Projeto" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {projects?.map(project => (
                <SelectItem key={project.id} value={project.id.toString()}>
                  {project.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Select value={userFilter} onValueChange={setUserFilter}>
            <SelectTrigger className="w-36">
              <SelectValue placeholder="Responsável" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {users?.map(user => (
                <SelectItem key={user.id} value={user.id.toString()}>
                  {user.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      
      {/* Ordem Inteligente Info */}
      <div className="bg-muted/30 p-3 rounded-lg border border-border flex items-center space-x-3">
        <ArrowUpDown className="h-5 w-5 text-primary" />
        <div>
          <h3 className="text-sm font-medium">Ordenação Inteligente</h3>
          <p className="text-xs text-muted-foreground">
            As tarefas são ordenadas automaticamente por data de vencimento, prioridade e status, priorizando tarefas que vencem antes.
          </p>
        </div>
      </div>
      
      {/* Visualização Tabs */}
      <Tabs defaultValue="lista" className="mb-6">
        <TabsList className="bg-muted/50 border border-gray-200">
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
        
        <TabsContent value="lista" className="mt-6">
          {/* Status Tabs */}
          <div className="mb-6">
            <div className="flex items-center gap-1 mb-4">
              <div className={`flex items-center gap-2 cursor-pointer p-2 rounded-md 
                ${activeTab === 'pendentes' ? 'bg-amber-50 text-amber-600' : ''}
              `} onClick={() => setActiveTab('pendentes')}>
                <div className="w-6 h-6 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center">
                  <span>!</span>
                </div>
                <span className="font-medium">Tarefas Pendentes</span>
                {tasks && (
                  <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-100 px-2 text-xs text-amber-600">
                    {tasks.filter(t => !t.completed).length}
                  </span>
                )}
              </div>
              
              <div className={`flex items-center gap-2 cursor-pointer p-2 rounded-md 
                ${activeTab === 'concluidas' ? 'bg-green-50 text-green-600' : ''}
              `} onClick={() => setActiveTab('concluidas')}>
                <div className="w-6 h-6 rounded-full bg-green-100 text-green-600 flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>
                <span className="font-medium">Tarefas Concluídas</span>
                {tasks && (
                  <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-green-100 px-2 text-xs text-green-600">
                    {tasks.filter(t => t.completed).length}
                  </span>
                )}
              </div>
            </div>
            
            {/* Sort/Filter header */}
            <div className="flex justify-between items-center mb-2">
              <div className="text-sm text-gray-500">
                {filteredTasks?.length || 0} {activeTab === 'pendentes' ? 'tarefas pendentes' : 'tarefas concluídas'}
              </div>
              <div className="flex items-center gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="h-8 text-xs flex items-center gap-1"
                >
                  <CalendarDays className="h-3.5 w-3.5" />
                  Data
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="h-8 text-xs flex items-center gap-1"
                >
                  Prioridade
                </Button>
              </div>
            </div>
            
            {/* Task list */}
            <div>
              {isLoadingTasks ? (
                <div className="flex justify-center items-center h-32">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                </div>
              ) : filteredTasks?.length === 0 ? (
                <div className="bg-white rounded-lg shadow-sm border border-dashed border-gray-300 p-8 text-center">
                  <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                    <Filter className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="text-lg font-medium mb-2">
                    {activeTab === 'pendentes' ? 'Nenhuma tarefa pendente' : 'Nenhuma tarefa concluída'}
                  </h3>
                  <p className="text-muted-foreground mb-4">
                    {activeTab === 'pendentes' 
                      ? 'Tente ajustar os filtros ou adicione uma nova tarefa.' 
                      : 'As tarefas concluídas aparecerão aqui.'
                    }
                  </p>
                  {activeTab === 'pendentes' && (
                    <Button 
                      onClick={handleNewTask}
                      className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
                    >
                      <Plus className="h-5 w-5 mr-2" />
                      <span className="relative pr-5">
                        Nova Tarefa
                        <span className="absolute -right-4 -top-1 h-7 w-7 rounded-full bg-teal-500 text-white flex items-center justify-center text-xs font-medium overflow-hidden">
                          ZP
                        </span>
                      </span>
                    </Button>
                  )}
                </div>
              ) : (
                <div>
                  {filteredTasks?.map(task => (
                    <TaskItem 
                      key={task.id} 
                      task={task} 
                      onSelect={handleViewTaskDetails}
                      onEdit={handleSelectTask}
                      isCompleted={activeTab === 'concluidas'}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </TabsContent>
        
        <TabsContent value="quadro" className="mt-6 min-h-[300px]">
          <div className="bg-white p-6 rounded-lg shadow-sm border border-dashed border-gray-300 text-center">
            <h3 className="text-lg font-medium mb-2">Visualização em Quadro</h3>
            <p className="text-muted-foreground">
              A visualização em quadro Kanban será implementada em breve, permitindo arrastar e soltar tarefas entre colunas de status.
            </p>
          </div>
        </TabsContent>
        
        <TabsContent value="calendario" className="mt-6 min-h-[300px]">
          <div className="bg-white p-6 rounded-lg shadow-sm border border-dashed border-gray-300 text-center">
            <h3 className="text-lg font-medium mb-2">Visualização em Calendário</h3>
            <p className="text-muted-foreground">
              A visualização em calendário será implementada em breve, permitindo visualizar tarefas organizadas por dia/semana/mês.
            </p>
          </div>
        </TabsContent>
      </Tabs>
      
      {/* Task Form Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>{selectedTask ? "Editar Tarefa" : "Nova Tarefa"}</DialogTitle>
            <DialogDescription>
              {selectedTask ? "Atualize os detalhes da tarefa abaixo." : "Preencha os campos abaixo para criar uma nova tarefa."}
            </DialogDescription>
          </DialogHeader>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Título*</FormLabel>
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
                      <Textarea placeholder="Descrição detalhada da tarefa" {...field} />
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
                      <Select
                        value={field.value?.toString()}
                        onValueChange={(value) => field.onChange(value ? parseInt(value) : undefined)}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione um projeto" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="none">Nenhum</SelectItem>
                          {projects?.map(project => (
                            <SelectItem key={project.id} value={project.id.toString()}>
                              {project.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
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
                      <Select
                        value={field.value?.toString()}
                        onValueChange={(value) => field.onChange(value ? parseInt(value) : undefined)}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione um responsável" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="none">Ninguém</SelectItem>
                          {users?.map(user => (
                            <SelectItem key={user.id} value={user.id.toString()}>
                              {user.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status</FormLabel>
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione um status" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {TASK_STATUS_OPTIONS.map(option => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="priority"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Prioridade</FormLabel>
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione uma prioridade" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {TASK_PRIORITY_OPTIONS.map(option => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="start_date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Data de Início</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} value={field.value || ''} />
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
                      <FormLabel>Data de Entrega</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} value={field.value || ''} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="estimated_hours"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Horas Estimadas</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          step="0.5" 
                          min="0" 
                          placeholder="0.0" 
                          {...field}
                          value={field.value || ''}
                          onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              {selectedTask && (
                <FormField
                  control={form.control}
                  name="completed"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <FormLabel className="font-normal cursor-pointer">
                        Marcar como concluída
                      </FormLabel>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
              
              <DialogFooter>
                <Button 
                  variant="outline" 
                  type="button" 
                  onClick={() => setIsDialogOpen(false)}
                >
                  Cancelar
                </Button>
                <Button 
                  type="submit" 
                  disabled={createTaskMutation.isPending || updateTaskMutation.isPending}
                >
                  {(createTaskMutation.isPending || updateTaskMutation.isPending) && (
                    <div className="mr-2 animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  )}
                  {selectedTask ? "Atualizar" : "Criar"} Tarefa
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
      
      {/* Task Detail Sidebar */}
      {taskDetailId && (
        <TaskDetailSidebar
          taskId={taskDetailId}
          onClose={handleCloseTaskDetails}
          onEdit={handleSelectTask}
        />
      )}
    </div>
  );
}
