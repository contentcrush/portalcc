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
  MessageSquare,
  Paperclip
} from "lucide-react";
import { TASK_STATUS_OPTIONS, TASK_PRIORITY_OPTIONS } from "@/lib/constants";
import { TaskWithDetails } from "@/lib/types";

// Form schema for task creation and editing
const taskFormSchema = insertTaskSchema.extend({
  title: z.string().min(3, {
    message: "O título deve ter pelo menos 3 caracteres",
  }),
  due_date: z.string().optional(),
  start_date: z.string().optional(),
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
    mutationFn: async (data: z.infer<typeof taskFormSchema>) => {
      // Convert string dates to ISO strings
      const formattedData = {
        ...data,
        due_date: data.due_date ? new Date(data.due_date).toISOString() : undefined,
        start_date: data.start_date ? new Date(data.start_date).toISOString() : undefined,
      };
      return apiRequest('POST', '/api/tasks', formattedData);
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
    mutationFn: async ({ id, data }: { id: number; data: Partial<z.infer<typeof taskFormSchema>> }) => {
      // Convert string dates to ISO strings
      const formattedData = {
        ...data,
        due_date: data.due_date ? new Date(data.due_date).toISOString() : undefined,
        start_date: data.start_date ? new Date(data.start_date).toISOString() : undefined,
      };
      return apiRequest('PATCH', `/api/tasks/${id}`, formattedData);
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

  // Task selection handler for editing
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

  // Filter tasks based on criteria
  const filteredTasks = tasks?.filter(task => {
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center space-y-4 md:space-y-0">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tarefas</h1>
          <p className="text-sm text-gray-500">Gerenciamento de tarefas de equipe</p>
        </div>
        
        <div className="flex items-center space-x-3">
          <Button onClick={handleNewTask}>
            <Plus className="h-4 w-4 mr-2" />
            Nova Tarefa
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
      
      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="pendentes">Tarefas Pendentes</TabsTrigger>
          <TabsTrigger value="concluidas">Tarefas Concluídas</TabsTrigger>
        </TabsList>
        
        <TabsContent value="pendentes" className="mt-6">
          {isLoadingTasks ? (
            <div className="flex justify-center items-center h-32">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
            </div>
          ) : filteredTasks?.length === 0 ? (
            <div className="bg-white rounded-lg shadow-sm border border-dashed border-gray-300 p-8 text-center">
              <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <Filter className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-lg font-medium mb-2">Nenhuma tarefa encontrada</h3>
              <p className="text-muted-foreground mb-4">
                Tente ajustar os filtros ou adicione uma nova tarefa.
              </p>
              <Button onClick={handleNewTask}>
                <Plus className="h-4 w-4 mr-2" />
                Nova Tarefa
              </Button>
            </div>
          ) : (
            <div>
              {filteredTasks?.map(task => (
                <TaskItem 
                  key={task.id} 
                  task={task} 
                  onSelect={handleSelectTask}
                />
              ))}
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="concluidas" className="mt-6">
          {isLoadingTasks ? (
            <div className="flex justify-center items-center h-32">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
            </div>
          ) : filteredTasks?.length === 0 ? (
            <div className="bg-white rounded-lg shadow-sm border border-dashed border-gray-300 p-8 text-center">
              <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <Filter className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-lg font-medium mb-2">Nenhuma tarefa concluída</h3>
              <p className="text-muted-foreground mb-4">
                As tarefas concluídas aparecerão aqui.
              </p>
            </div>
          ) : (
            <div>
              {filteredTasks?.map(task => (
                <TaskItem 
                  key={task.id} 
                  task={task}
                  onSelect={handleSelectTask} 
                />
              ))}
            </div>
          )}
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
                          <SelectItem value="">Nenhum</SelectItem>
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
                          <SelectItem value="">Ninguém</SelectItem>
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
    </div>
  );
}
