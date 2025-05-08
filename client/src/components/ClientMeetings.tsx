import React, { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ClientMeeting } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { format, isToday, isYesterday, isTomorrow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
import { insertClientMeetingSchema } from "@shared/schema";
import { 
  Calendar, 
  Clock, 
  MapPin, 
  Plus,
  User,
  Trash2,
  Edit,
  Check,
  X
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { 
  Tooltip, 
  TooltipContent, 
  TooltipProvider, 
  TooltipTrigger 
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

// Form schema for creating meetings
const meetingSchema = insertClientMeetingSchema.extend({
  meetingTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, {
    message: "Formato de hora inválido. Use o formato HH:MM"
  })
});

type MeetingFormValues = z.infer<typeof meetingSchema>;

// Format relative date for display
const formatRelativeDate = (date: Date): string => {
  if (isToday(date)) {
    return `Hoje, ${format(date, 'HH:mm')}`;
  } else if (isYesterday(date)) {
    return `Ontem, ${format(date, 'HH:mm')}`;
  } else if (isTomorrow(date)) {
    return `Amanhã, ${format(date, 'HH:mm')}`;
  } else {
    return format(date, 'dd/MM/yyyy HH:mm');
  }
};

// Get color for badge based on meeting status
const getStatusColor = (status: string) => {
  switch (status) {
    case 'scheduled':
      return 'bg-blue-500';
    case 'completed':
      return 'bg-green-500';
    case 'cancelled':
      return 'bg-red-500';
    case 'rescheduled':
      return 'bg-amber-500';
    default:
      return 'bg-slate-500';
  }
};

interface ClientMeetingsProps {
  clientId: number;
  clientName: string;
  meetings: ClientMeeting[];
  users: any[]; // User type should be defined in your schema
  isLoading: boolean;
}

export default function ClientMeetings({
  clientId,
  clientName,
  meetings,
  users,
  isLoading
}: ClientMeetingsProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [openCreateDialog, setOpenCreateDialog] = useState(false);
  const [openEditDialog, setOpenEditDialog] = useState(false);
  const [selectedMeeting, setSelectedMeeting] = useState<ClientMeeting | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  
  // Form for creating new meetings
  const createForm = useForm<MeetingFormValues>({
    resolver: zodResolver(meetingSchema),
    defaultValues: {
      client_id: clientId,
      title: "",
      meeting_date: format(new Date(), 'yyyy-MM-dd'),
      meetingTime: format(new Date(), 'HH:mm'),
      duration_minutes: 60,
      status: "scheduled",
      meeting_type: "standard",
      location: "",
      notes: ""
    }
  });
  
  // Form for editing meetings
  const editForm = useForm<MeetingFormValues>({
    resolver: zodResolver(meetingSchema),
    defaultValues: {
      client_id: clientId,
      title: "",
      meeting_date: "",
      meetingTime: "",
      duration_minutes: 60,
      status: "scheduled",
      meeting_type: "standard",
      location: "",
      notes: ""
    }
  });
  
  // Initialize edit form when a meeting is selected
  const handleEditMeeting = (meeting: ClientMeeting) => {
    const meetingDate = new Date(meeting.meeting_date);
    
    setSelectedMeeting(meeting);
    editForm.reset({
      client_id: meeting.client_id,
      title: meeting.title,
      meeting_date: format(meetingDate, 'yyyy-MM-dd'),
      meetingTime: format(meetingDate, 'HH:mm'),
      duration_minutes: meeting.duration_minutes,
      status: meeting.status,
      meeting_type: meeting.meeting_type,
      location: meeting.location || "",
      notes: meeting.notes || ""
    });
    
    setOpenEditDialog(true);
  };
  
  // Handle meeting creation
  const handleCreateMeeting = async (values: MeetingFormValues) => {
    try {
      // Combine date and time into a single Date object
      const [year, month, day] = values.meeting_date.split('-').map(Number);
      const [hours, minutes] = values.meetingTime.split(':').map(Number);
      const meetingDate = new Date(year, month - 1, day, hours, minutes);
      
      const response = await apiRequest('POST', '/api/client-meetings', {
        ...values,
        meeting_date: meetingDate.toISOString(),
        // Remove the time field as it's combined into meeting_date
        meetingTime: undefined
      });
      
      if (!response.ok) {
        throw new Error('Falha ao criar reunião');
      }
      
      // Close dialog and reset form
      setOpenCreateDialog(false);
      createForm.reset({
        ...createForm.getValues(),
        title: "",
        location: "",
        notes: ""
      });
      
      // Refresh meetings list
      queryClient.invalidateQueries({ queryKey: [`/api/client/${clientId}/meetings`] });
      
      toast({
        title: "Reunião agendada com sucesso",
        description: "A reunião foi adicionada ao calendário.",
      });
    } catch (error) {
      console.error('Erro ao criar reunião:', error);
      toast({
        title: "Erro ao agendar reunião",
        description: "Ocorreu um erro ao tentar agendar a reunião. Tente novamente.",
        variant: "destructive",
      });
    }
  };
  
  // Handle meeting update
  const handleUpdateMeeting = async (values: MeetingFormValues) => {
    if (!selectedMeeting) return;
    
    try {
      // Combine date and time into a single Date object
      const [year, month, day] = values.meeting_date.split('-').map(Number);
      const [hours, minutes] = values.meetingTime.split(':').map(Number);
      const meetingDate = new Date(year, month - 1, day, hours, minutes);
      
      const response = await apiRequest('PATCH', `/api/client-meetings/${selectedMeeting.id}`, {
        ...values,
        meeting_date: meetingDate.toISOString(),
        // Remove the time field as it's combined into meeting_date
        meetingTime: undefined
      });
      
      if (!response.ok) {
        throw new Error('Falha ao atualizar reunião');
      }
      
      // Close dialog and reset selected meeting
      setOpenEditDialog(false);
      setSelectedMeeting(null);
      
      // Refresh meetings list
      queryClient.invalidateQueries({ queryKey: [`/api/client/${clientId}/meetings`] });
      
      toast({
        title: "Reunião atualizada com sucesso",
        description: "As alterações foram salvas no calendário.",
      });
    } catch (error) {
      console.error('Erro ao atualizar reunião:', error);
      toast({
        title: "Erro ao atualizar reunião",
        description: "Ocorreu um erro ao tentar atualizar a reunião. Tente novamente.",
        variant: "destructive",
      });
    }
  };
  
  // Handle meeting deletion
  const handleDeleteMeeting = async (meetingId: number) => {
    setDeletingId(meetingId);
    
    try {
      const response = await apiRequest('DELETE', `/api/client-meetings/${meetingId}`);
      
      if (!response.ok) {
        throw new Error('Falha ao excluir reunião');
      }
      
      // Refresh meetings list
      queryClient.invalidateQueries({ queryKey: [`/api/client/${clientId}/meetings`] });
      
      toast({
        title: "Reunião excluída com sucesso",
        description: "A reunião foi removida do calendário.",
      });
    } catch (error) {
      console.error('Erro ao excluir reunião:', error);
      toast({
        title: "Erro ao excluir reunião",
        description: "Ocorreu um erro ao tentar excluir a reunião. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setDeletingId(null);
    }
  };
  
  // Find username by ID
  const getUsernameById = (userId: number): string => {
    const user = users.find(u => u.id === userId);
    return user ? user.name : 'Usuário desconhecido';
  };
  
  // Format meeting status for display
  const formatStatus = (status: string): string => {
    const statusMap: Record<string, string> = {
      'scheduled': 'Agendada',
      'completed': 'Concluída',
      'cancelled': 'Cancelada',
      'rescheduled': 'Reagendada'
    };
    
    return statusMap[status] || status;
  };
  
  // Format meeting type for display
  const formatMeetingType = (type: string): string => {
    const typeMap: Record<string, string> = {
      'standard': 'Padrão',
      'sales': 'Vendas',
      'kickoff': 'Kickoff',
      'presentation': 'Apresentação',
      'feedback': 'Feedback'
    };
    
    return typeMap[type] || type;
  };

  return (
    <Card className="w-full">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-xl">Reuniões</CardTitle>
            <CardDescription>
              Histórico e agendamento de reuniões com {clientName}
            </CardDescription>
          </div>
          <Dialog open={openCreateDialog} onOpenChange={setOpenCreateDialog}>
            <DialogTrigger asChild>
              <Button className="gap-1">
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">Agendar Reunião</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Agendar Nova Reunião</DialogTitle>
                <DialogDescription>
                  Agende uma nova reunião com o cliente.
                </DialogDescription>
              </DialogHeader>
              <Form {...createForm}>
                <form
                  onSubmit={createForm.handleSubmit(handleCreateMeeting)}
                  className="space-y-4"
                >
                  <FormField
                    control={createForm.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Título da Reunião</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Ex: Briefing de Projeto"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={createForm.control}
                      name="meeting_date"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Data</FormLabel>
                          <FormControl>
                            <Input
                              type="date"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={createForm.control}
                      name="meetingTime"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Horário</FormLabel>
                          <FormControl>
                            <Input
                              type="time"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={createForm.control}
                      name="duration_minutes"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Duração (minutos)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min="15"
                              step="15"
                              {...field}
                              onChange={(e) => field.onChange(parseInt(e.target.value))}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={createForm.control}
                      name="meeting_type"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Tipo de Reunião</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Selecione o tipo" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="standard">Padrão</SelectItem>
                              <SelectItem value="sales">Vendas</SelectItem>
                              <SelectItem value="kickoff">Kickoff</SelectItem>
                              <SelectItem value="presentation">Apresentação</SelectItem>
                              <SelectItem value="feedback">Feedback</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <FormField
                    control={createForm.control}
                    name="location"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Local (opcional)</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Ex: Sala de Reuniões, Zoom, Google Meet"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={createForm.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Observações (opcional)</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Informações adicionais sobre a reunião"
                            className="resize-none"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <DialogFooter className="mt-6">
                    <DialogClose asChild>
                      <Button 
                        type="button" 
                        variant="outline"
                      >
                        Cancelar
                      </Button>
                    </DialogClose>
                    <Button type="submit">
                      Agendar Reunião
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
          
          {/* Edit Meeting Dialog */}
          <Dialog open={openEditDialog} onOpenChange={setOpenEditDialog}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Editar Reunião</DialogTitle>
                <DialogDescription>
                  Atualize os detalhes da reunião agendada.
                </DialogDescription>
              </DialogHeader>
              <Form {...editForm}>
                <form
                  onSubmit={editForm.handleSubmit(handleUpdateMeeting)}
                  className="space-y-4"
                >
                  <FormField
                    control={editForm.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Título da Reunião</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Ex: Briefing de Projeto"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={editForm.control}
                      name="meeting_date"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Data</FormLabel>
                          <FormControl>
                            <Input
                              type="date"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={editForm.control}
                      name="meetingTime"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Horário</FormLabel>
                          <FormControl>
                            <Input
                              type="time"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={editForm.control}
                      name="duration_minutes"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Duração (minutos)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min="15"
                              step="15"
                              {...field}
                              onChange={(e) => field.onChange(parseInt(e.target.value))}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={editForm.control}
                      name="status"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Status</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Selecione o status" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="scheduled">Agendada</SelectItem>
                              <SelectItem value="completed">Concluída</SelectItem>
                              <SelectItem value="cancelled">Cancelada</SelectItem>
                              <SelectItem value="rescheduled">Reagendada</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <FormField
                    control={editForm.control}
                    name="meeting_type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tipo de Reunião</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione o tipo" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="standard">Padrão</SelectItem>
                            <SelectItem value="sales">Vendas</SelectItem>
                            <SelectItem value="kickoff">Kickoff</SelectItem>
                            <SelectItem value="presentation">Apresentação</SelectItem>
                            <SelectItem value="feedback">Feedback</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={editForm.control}
                    name="location"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Local (opcional)</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Ex: Sala de Reuniões, Zoom, Google Meet"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={editForm.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Observações (opcional)</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Informações adicionais sobre a reunião"
                            className="resize-none"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <DialogFooter className="mt-6">
                    <DialogClose asChild>
                      <Button 
                        type="button" 
                        variant="outline"
                      >
                        Cancelar
                      </Button>
                    </DialogClose>
                    <Button type="submit">
                      Salvar Alterações
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[365px] w-full pr-4">
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-56" />
                    <Skeleton className="h-4 w-32" />
                  </div>
                </div>
              ))}
            </div>
          ) : meetings.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
              <Calendar className="h-16 w-16 mb-4 opacity-30" />
              <h3 className="text-lg font-medium">Nenhuma reunião agendada</h3>
              <p className="max-w-xs mt-2">
                Este cliente ainda não possui reuniões agendadas.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {meetings.map((meeting) => (
                <div 
                  key={meeting.id} 
                  className={cn(
                    "relative group rounded-lg border p-4 transition-all",
                    meeting.status === 'cancelled' ? "opacity-60" : ""
                  )}
                >
                  <div className="flex flex-col space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="text-base font-medium">{meeting.title}</h4>
                      <Badge 
                        className={cn(getStatusColor(meeting.status), "text-white")}
                      >
                        {formatStatus(meeting.status)}
                      </Badge>
                    </div>
                    
                    <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        <span>{formatRelativeDate(new Date(meeting.meeting_date))}</span>
                      </div>
                      
                      <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        <span>{meeting.duration_minutes} minutos</span>
                      </div>
                      
                      {meeting.location && (
                        <div className="flex items-center gap-1">
                          <MapPin className="h-4 w-4" />
                          <span>{meeting.location}</span>
                        </div>
                      )}
                      
                      <div className="flex items-center gap-1">
                        <User className="h-4 w-4" />
                        <span>{getUsernameById(meeting.organized_by)}</span>
                      </div>
                    </div>
                    
                    {meeting.notes && (
                      <p className="text-sm mt-2 text-muted-foreground">{meeting.notes}</p>
                    )}
                    
                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => handleEditMeeting(meeting)}
                            >
                              <Edit className="h-3.5 w-3.5" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Editar reunião</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-red-600"
                              onClick={() => handleDeleteMeeting(meeting.id)}
                              disabled={deletingId === meeting.id}
                            >
                              {deletingId === meeting.id ? (
                                <div className="h-3.5 w-3.5 animate-spin rounded-full border-b-2 border-red-600" />
                              ) : (
                                <Trash2 className="h-3.5 w-3.5" />
                              )}
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Excluir reunião</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      
                      {meeting.status === 'scheduled' && (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-green-600"
                                onClick={() => {
                                  handleEditMeeting(meeting);
                                  editForm.setValue('status', 'completed');
                                }}
                              >
                                <Check className="h-3.5 w-3.5" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Marcar como concluída</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                      
                      {meeting.status === 'scheduled' && (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-amber-600"
                                onClick={() => {
                                  handleEditMeeting(meeting);
                                  editForm.setValue('status', 'cancelled');
                                }}
                              >
                                <X className="h-3.5 w-3.5" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Cancelar reunião</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
      <CardFooter className="pt-0 pb-4 text-xs text-muted-foreground">
        <div className="flex items-center">
          <Calendar className="h-3 w-3 mr-1" />
          <span>
            Última atualização: {meetings.length > 0 
              ? format(new Date(meetings[0].meeting_date), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })
              : "N/A"
            }
          </span>
        </div>
      </CardFooter>
    </Card>
  );
}