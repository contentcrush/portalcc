import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { insertEventSchema } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import CalendarView from "@/components/CalendarView";
import { EVENT_TYPE_OPTIONS } from "@/lib/constants";

// Event form schema
const eventFormSchema = insertEventSchema.extend({
  title: z.string().min(3, {
    message: "O título deve ter pelo menos 3 caracteres",
  }),
  // Não precisamos mais fazer typecasting para strings já que o schema agora aceita string ou Date
  all_day: z.boolean().default(false),
  color: z.string().optional(),
});

export default function CalendarPage() {
  const [isCreateEventDialogOpen, setIsCreateEventDialogOpen] = useState(false);
  const [isViewEventDialogOpen, setIsViewEventDialogOpen] = useState(false);
  const [selectedEventId, setSelectedEventId] = useState<number | null>(null);
  const [selectedDate, setSelectedDate] = useState(new Date());
  
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Event form
  const form = useForm<z.infer<typeof eventFormSchema>>({
    resolver: zodResolver(eventFormSchema),
    defaultValues: {
      title: "",
      description: "",
      type: "reuniao",
      user_id: 1, // Default to current user
      start_date: "",
      end_date: "",
      all_day: false,
      location: "",
    },
  });

  // Fetch data
  const { data: events } = useQuery({
    queryKey: ['/api/events']
  });
  
  const { data: users } = useQuery({
    queryKey: ['/api/users']
  });
  
  const { data: projects } = useQuery({
    queryKey: ['/api/projects']
  });
  
  const { data: clients } = useQuery({
    queryKey: ['/api/clients']
  });
  
  const { data: selectedEvent, isLoading: isLoadingEvent } = useQuery({
    queryKey: [`/api/events/${selectedEventId}`],
    enabled: !!selectedEventId
  });

  // Create event mutation
  const createEventMutation = useMutation({
    mutationFn: async (data: z.infer<typeof eventFormSchema>) => {
      // Não precisamos mais converter as datas - o schema Zod faz isso automaticamente
      return apiRequest('POST', '/api/events', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/events'] });
      toast({
        title: "Evento criado",
        description: "Evento criado com sucesso",
      });
      setIsCreateEventDialogOpen(false);
      form.reset();
    },
    onError: (error) => {
      toast({
        title: "Erro ao criar evento",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Handle new event
  const handleAddEvent = (date: Date) => {
    const startDate = new Date(date);
    const endDate = new Date(date);
    endDate.setHours(date.getHours() + 1);
    
    form.reset({
      title: "",
      description: "",
      type: "reuniao",
      user_id: 1, // Default to current user
      start_date: startDate.toISOString().slice(0, 16), // Format: YYYY-MM-DDTHH:MM
      end_date: endDate.toISOString().slice(0, 16),
      all_day: false,
      location: "",
    });
    
    setIsCreateEventDialogOpen(true);
  };

  // Handle event click
  const handleEventClick = (eventId: number) => {
    setSelectedEventId(eventId);
    setIsViewEventDialogOpen(true);
  };

  // Form submission handler
  const onSubmit = (data: z.infer<typeof eventFormSchema>) => {
    createEventMutation.mutate(data);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center space-y-4 md:space-y-0">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Calendário Integrado</h1>
          <p className="text-sm text-gray-500">Visão geral de todas as atividades agendadas</p>
        </div>
        
        <div className="flex items-center space-x-3">
          <Button onClick={() => handleAddEvent(new Date())}>
            Novo Evento
          </Button>
        </div>
      </div>
      
      <CalendarView 
        onEventClick={handleEventClick}
        onDateClick={setSelectedDate}
        onAddEvent={handleAddEvent}
      />
      
      {/* Task List for the day */}
      <div className="grid gap-6 grid-cols-1 md:grid-cols-3">
        <Card className="col-span-1 p-4">
          <h3 className="font-semibold mb-3">Tarefas do Dia</h3>
          <div className="space-y-3">
            <div className="flex items-center">
              <Checkbox id="task1" className="mr-2" />
              <label htmlFor="task1" className="text-sm">Finalizar edição do teaser - Banco Azul</label>
            </div>
            <div className="flex items-center">
              <Checkbox id="task2" className="mr-2" />
              <label htmlFor="task2" className="text-sm">Enviar fatura - Tech Courses Inc.</label>
            </div>
            <div className="flex items-center">
              <Checkbox id="task3" className="mr-2" />
              <label htmlFor="task3" className="text-sm">Agendar equipe para gravação externa</label>
            </div>
            <div className="flex items-center">
              <Checkbox id="task4" className="mr-2" />
              <label htmlFor="task4" className="text-sm">Preparar apresentação para cliente</label>
            </div>
          </div>
          <Button variant="ghost" size="sm" className="w-full mt-4 text-xs">
            Adicionar nova tarefa
          </Button>
        </Card>
        
        <Card className="col-span-1 p-4">
          <h3 className="font-semibold mb-3">Financeiro</h3>
          <div className="space-y-2">
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">Receitas</span>
              <span className="font-medium text-green-600">R$ 68.500</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">Despesas</span>
              <span className="font-medium text-red-600">R$ 26.000</span>
            </div>
            <div className="border-t border-gray-200 my-2 pt-2">
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Saldo</span>
                <span className="font-medium text-primary">R$ 42.500</span>
              </div>
            </div>
          </div>
          <div className="mt-3 space-y-2">
            <h4 className="text-xs font-medium uppercase text-muted-foreground">Próximos Pagamentos</h4>
            <div className="flex justify-between items-center text-sm">
              <span>Banco Azul</span>
              <span className="font-medium">R$ 18.000</span>
              <span className="text-xs text-muted-foreground">05/05</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span>Tech Courses Inc.</span>
              <span className="font-medium">R$ 12.500</span>
              <span className="text-xs text-muted-foreground">15/05</span>
            </div>
          </div>
        </Card>
        
        <Card className="col-span-1 p-4">
          <h3 className="font-semibold mb-3">Equipe</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center">
                <div className="w-6 h-6 rounded-full bg-green-100 mr-2 flex items-center justify-center text-green-600 text-xs">B</div>
                <span>Bruno Silva</span>
              </div>
              <span className="text-green-600 bg-green-50 px-2 py-0.5 rounded-full text-xs">Diretor</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center">
                <div className="w-6 h-6 rounded-full bg-blue-100 mr-2 flex items-center justify-center text-blue-600 text-xs">A</div>
                <span>Ana Oliveira</span>
              </div>
              <span className="text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full text-xs">Editora</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center">
                <div className="w-6 h-6 rounded-full bg-yellow-100 mr-2 flex items-center justify-center text-yellow-600 text-xs">C</div>
                <span>Carlos Mendes</span>
              </div>
              <span className="text-yellow-600 bg-yellow-50 px-2 py-0.5 rounded-full text-xs">Fotógrafo</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center">
                <div className="w-6 h-6 rounded-full bg-purple-100 mr-2 flex items-center justify-center text-purple-600 text-xs">J</div>
                <span>Julia Santos</span>
              </div>
              <span className="text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full text-xs">Produtora</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center">
                <div className="w-6 h-6 rounded-full bg-red-100 mr-2 flex items-center justify-center text-red-600 text-xs">M</div>
                <span>Marcos Pereira</span>
              </div>
              <span className="text-red-600 bg-red-50 px-2 py-0.5 rounded-full text-xs">Roteirista</span>
            </div>
          </div>
          <div className="mt-3">
            <h4 className="text-xs font-medium uppercase text-muted-foreground mb-2">Próximas Reuniões</h4>
            <div className="flex justify-between items-center text-sm">
              <span>Daily Standup</span>
              <span className="text-xs text-muted-foreground">Hoje, 09:30 - 10:00</span>
            </div>
            <div className="flex justify-between items-center text-sm mt-1">
              <span>Revisão do Projeto</span>
              <span className="text-xs text-muted-foreground">Amanhã, 14:00 - 15:30</span>
            </div>
          </div>
        </Card>
      </div>
      
      {/* Create Event Dialog */}
      <Dialog open={isCreateEventDialogOpen} onOpenChange={setIsCreateEventDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Novo Evento</DialogTitle>
            <DialogDescription>
              Preencha os campos abaixo para criar um novo evento no calendário.
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
                      <Input placeholder="Título do evento" {...field} />
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
                      <Textarea placeholder="Descrição do evento" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tipo de evento</FormLabel>
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione um tipo" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {EVENT_TYPE_OPTIONS.map(option => (
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
                  name="location"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Local</FormLabel>
                      <FormControl>
                        <Input placeholder="Local do evento" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="project_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Projeto relacionado</FormLabel>
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
                  name="client_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cliente relacionado</FormLabel>
                      <Select
                        value={field.value?.toString()}
                        onValueChange={(value) => field.onChange(value ? parseInt(value) : undefined)}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione um cliente" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="none">Nenhum</SelectItem>
                          {clients?.map(client => (
                            <SelectItem key={client.id} value={client.id.toString()}>
                              {client.name}
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
                  name="start_date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Data e hora de início*</FormLabel>
                      <FormControl>
                        <Input type="datetime-local" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="end_date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Data e hora de término*</FormLabel>
                      <FormControl>
                        <Input type="datetime-local" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <FormField
                control={form.control}
                name="all_day"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <FormLabel className="font-normal">
                      Evento de dia inteiro
                    </FormLabel>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <DialogFooter>
                <Button 
                  variant="outline" 
                  type="button" 
                  onClick={() => setIsCreateEventDialogOpen(false)}
                >
                  Cancelar
                </Button>
                <Button 
                  type="submit" 
                  disabled={createEventMutation.isPending}
                >
                  {createEventMutation.isPending && (
                    <div className="mr-2 animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  )}
                  Criar Evento
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
      
      {/* View Event Dialog */}
      <Dialog open={isViewEventDialogOpen} onOpenChange={setIsViewEventDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          {isLoadingEvent ? (
            <div className="flex justify-center items-center h-32">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
            </div>
          ) : selectedEvent ? (
            <>
              <DialogHeader>
                <DialogTitle>{selectedEvent.title}</DialogTitle>
                <DialogDescription>
                  {selectedEvent.type === 'reuniao' ? 'Reunião' : 
                   selectedEvent.type === 'gravacao' ? 'Gravação' : 
                   selectedEvent.type === 'entrega' ? 'Entrega' : 
                   selectedEvent.type === 'edicao' ? 'Edição' : 'Evento'}
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4">
                {selectedEvent.description && (
                  <div>
                    <h4 className="text-sm font-medium">Descrição</h4>
                    <p className="text-sm text-muted-foreground">{selectedEvent.description}</p>
                  </div>
                )}
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h4 className="text-sm font-medium">Data/hora de início</h4>
                    <p className="text-sm text-muted-foreground">
                      {new Date(selectedEvent.start_date).toLocaleString('pt-BR')}
                    </p>
                  </div>
                  
                  <div>
                    <h4 className="text-sm font-medium">Data/hora de término</h4>
                    <p className="text-sm text-muted-foreground">
                      {new Date(selectedEvent.end_date).toLocaleString('pt-BR')}
                    </p>
                  </div>
                </div>
                
                {selectedEvent.location && (
                  <div>
                    <h4 className="text-sm font-medium">Local</h4>
                    <p className="text-sm text-muted-foreground">{selectedEvent.location}</p>
                  </div>
                )}
                
                {selectedEvent.project_id && (
                  <div>
                    <h4 className="text-sm font-medium">Projeto</h4>
                    <p className="text-sm text-muted-foreground">
                      {projects?.find(p => p.id === selectedEvent.project_id)?.name || 'Projeto não encontrado'}
                    </p>
                  </div>
                )}
                
                {selectedEvent.client_id && (
                  <div>
                    <h4 className="text-sm font-medium">Cliente</h4>
                    <p className="text-sm text-muted-foreground">
                      {clients?.find(c => c.id === selectedEvent.client_id)?.name || 'Cliente não encontrado'}
                    </p>
                  </div>
                )}
              </div>
              
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsViewEventDialogOpen(false)}>
                  Fechar
                </Button>
                <Button variant="default">
                  Editar Evento
                </Button>
              </DialogFooter>
            </>
          ) : (
            <div className="text-center py-6">
              <p>Evento não encontrado</p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
