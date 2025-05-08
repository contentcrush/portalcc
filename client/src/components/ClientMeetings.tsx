import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { 
  AlertCircle, 
  Calendar, 
  Clock, 
  Map, 
  Video, 
  Plus, 
  Trash2,
  Edit
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ClientMeeting } from '@shared/schema';
import { apiRequest } from '@/lib/queryClient';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { format, addMinutes, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { formatDateToPtBr } from "@/lib/utils";

// Tipos de reunião
const meetingTypes = [
  { value: "presencial", label: "Presencial" },
  { value: "zoom", label: "Zoom" },
  { value: "teams", label: "Microsoft Teams" },
  { value: "meet", label: "Google Meet" },
  { value: "outro", label: "Outro" }
];

// Schema de validação com Zod
const meetingFormSchema = z.object({
  title: z.string().min(3, { message: "O título deve ter pelo menos 3 caracteres" }),
  description: z.string().optional(),
  meeting_date: z.string().refine(val => !isNaN(Date.parse(val)), {
    message: "Data inválida",
  }),
  duration_minutes: z.coerce.number().int().min(15, { message: "A duração mínima é de 15 minutos" }),
  location: z.string().optional(),
  meeting_type: z.string().min(1, { message: "Selecione um tipo de reunião" }),
});

type MeetingFormValues = z.infer<typeof meetingFormSchema>;

interface ClientMeetingsProps {
  clientId: number;
}

const ClientMeetings: React.FC<ClientMeetingsProps> = ({ clientId }) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedMeeting, setSelectedMeeting] = useState<ClientMeeting | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Form para nova reunião
  const form = useForm<MeetingFormValues>({
    resolver: zodResolver(meetingFormSchema),
    defaultValues: {
      title: "",
      description: "",
      meeting_date: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
      duration_minutes: 60,
      location: "",
      meeting_type: "presencial",
    },
  });

  // Query para buscar reuniões do cliente
  const { data: meetings = [], isLoading, error } = useQuery<ClientMeeting[]>({
    queryKey: ['/api/clients', clientId, 'meetings'],
    enabled: !!clientId,
  });

  // Mutation para criar/editar reunião
  const meetingMutation = useMutation({
    mutationFn: async (values: MeetingFormValues) => {
      const endpoint = selectedMeeting 
        ? `/api/clients/${clientId}/meetings/${selectedMeeting.id}` 
        : `/api/clients/${clientId}/meetings`;
      
      const method = selectedMeeting ? "PATCH" : "POST";
      
      const response = await apiRequest(method, endpoint, values);
      return response.json();
    },
    onSuccess: () => {
      setIsDialogOpen(false);
      setSelectedMeeting(null);
      form.reset();
      queryClient.invalidateQueries({ queryKey: ['/api/clients', clientId, 'meetings'] });
      
      toast({
        title: selectedMeeting ? "Reunião atualizada" : "Reunião agendada",
        description: selectedMeeting 
          ? "A reunião foi atualizada com sucesso" 
          : "Reunião agendada com sucesso",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao agendar reunião",
        description: error.message || "Ocorreu um erro ao agendar a reunião. Tente novamente.",
        variant: "destructive",
      });
    },
  });

  // Mutation para deletar reunião
  const deleteMutation = useMutation({
    mutationFn: async (meetingId: number) => {
      const response = await apiRequest(
        "DELETE",
        `/api/clients/${clientId}/meetings/${meetingId}`
      );
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/clients', clientId, 'meetings'] });
      toast({
        title: "Reunião cancelada",
        description: "A reunião foi cancelada com sucesso.",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao cancelar reunião",
        description: error.message || "Ocorreu um erro ao cancelar a reunião. Tente novamente.",
        variant: "destructive",
      });
    },
  });

  const handleDelete = (meetingId: number) => {
    if (window.confirm("Tem certeza que deseja cancelar esta reunião?")) {
      deleteMutation.mutate(meetingId);
    }
  };

  const handleEdit = (meeting: ClientMeeting) => {
    setSelectedMeeting(meeting);
    
    form.reset({
      title: meeting.title,
      description: meeting.description || "",
      meeting_date: format(new Date(meeting.meeting_date), "yyyy-MM-dd'T'HH:mm"),
      duration_minutes: meeting.duration_minutes,
      location: meeting.location || "",
      meeting_type: meeting.meeting_type,
    });
    
    setIsDialogOpen(true);
  };

  const onDialogOpenChange = (open: boolean) => {
    if (!open) {
      // Resetar o form quando o dialog é fechado
      form.reset();
      setSelectedMeeting(null);
    }
    setIsDialogOpen(open);
  };

  const onSubmit = (values: MeetingFormValues) => {
    meetingMutation.mutate(values);
  };

  const getMeetingTypeIcon = (type: string) => {
    switch (type) {
      case 'presencial':
        return <Map className="h-4 w-4" />;
      case 'zoom':
      case 'teams':
      case 'meet':
        return <Video className="h-4 w-4" />;
      default:
        return <Calendar className="h-4 w-4" />;
    }
  };

  const getMeetingTypeLabel = (typeValue: string) => {
    const type = meetingTypes.find(t => t.value === typeValue);
    return type ? type.label : typeValue;
  };

  if (isLoading) {
    return <div className="p-4 text-center text-muted-foreground">Carregando reuniões...</div>;
  }

  if (error) {
    return (
      <Alert variant="destructive" className="mb-4">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Erro</AlertTitle>
        <AlertDescription>
          Erro ao carregar as reuniões. Por favor, tente novamente mais tarde.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium">Reuniões</h3>
          <p className="text-sm text-muted-foreground">
            Agende e gerencie reuniões com este cliente
          </p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={onDialogOpenChange}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Calendar className="mr-2 h-4 w-4" />
              Agendar Reunião
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {selectedMeeting ? "Editar reunião" : "Agendar nova reunião"}
              </DialogTitle>
              <DialogDescription>
                {selectedMeeting 
                  ? "Modifique os detalhes da reunião existente." 
                  : "Preencha os detalhes para agendar uma nova reunião."}
              </DialogDescription>
            </DialogHeader>
            
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Título</FormLabel>
                      <FormControl>
                        <Input placeholder="Nome da reunião" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="meeting_date"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Data e Hora</FormLabel>
                        <FormControl>
                          <Input type="datetime-local" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="duration_minutes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Duração (minutos)</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            min={15} 
                            step={15} 
                            {...field} 
                          />
                        </FormControl>
                        <FormDescription>
                          Mínimo 15 minutos
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <FormField
                  control={form.control}
                  name="meeting_type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tipo de Reunião</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione o tipo de reunião" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectGroup>
                            {meetingTypes.map((type) => (
                              <SelectItem key={type.value} value={type.value}>
                                {type.label}
                              </SelectItem>
                            ))}
                          </SelectGroup>
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
                      <FormLabel>Local / Link</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Local físico ou link da videochamada" 
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
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Descrição (opcional)</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Pauta e outros detalhes da reunião"
                          className="min-h-[80px]"
                          {...field}
                          value={field.value || ''}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsDialogOpen(false)}
                    disabled={meetingMutation.isPending}
                  >
                    Cancelar
                  </Button>
                  <Button 
                    type="submit"
                    disabled={meetingMutation.isPending}
                  >
                    {meetingMutation.isPending 
                      ? "Salvando..." 
                      : selectedMeeting 
                        ? "Atualizar Reunião" 
                        : "Agendar Reunião"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>
      
      <Separator />
      
      {meetings.length === 0 ? (
        <div className="flex flex-col items-center justify-center space-y-3 p-8 text-center">
          <Calendar className="h-12 w-12 text-muted-foreground opacity-40" />
          <div>
            <p className="text-lg font-medium">Nenhuma reunião agendada</p>
            <p className="text-sm text-muted-foreground">
              Este cliente não possui reuniões agendadas
            </p>
          </div>
          <Button 
            variant="outline" 
            onClick={() => setIsDialogOpen(true)}
            className="mt-2"
          >
            <Plus className="mr-2 h-4 w-4" />
            Agendar Reunião
          </Button>
        </div>
      ) : (
        <ScrollArea className="h-[320px]">
          <div className="grid grid-cols-1 gap-4">
            {meetings.map((meeting) => {
              const meetingDate = new Date(meeting.meeting_date);
              const endTime = addMinutes(meetingDate, meeting.duration_minutes);
              
              return (
                <Card key={meeting.id}>
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-start">
                      <CardTitle className="text-base">{meeting.title}</CardTitle>
                      <Badge 
                        variant="outline"
                        className="flex items-center space-x-1"
                      >
                        {getMeetingTypeIcon(meeting.meeting_type)}
                        <span className="ml-1">{getMeetingTypeLabel(meeting.meeting_type)}</span>
                      </Badge>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="pb-2 space-y-2">
                    <div className="flex items-center text-sm">
                      <Calendar className="mr-2 h-4 w-4 text-muted-foreground" />
                      <span>
                        {formatDateToPtBr(meetingDate, 'dd MMM yyyy')}
                      </span>
                    </div>
                    
                    <div className="flex items-center text-sm">
                      <Clock className="mr-2 h-4 w-4 text-muted-foreground" />
                      <span>
                        {format(meetingDate, 'HH:mm')} - {format(endTime, 'HH:mm')} 
                        ({meeting.duration_minutes} min)
                      </span>
                    </div>
                    
                    {meeting.location && (
                      <div className="flex items-center text-sm">
                        <Map className="mr-2 h-4 w-4 text-muted-foreground" />
                        <span className="truncate">{meeting.location}</span>
                      </div>
                    )}
                    
                    {meeting.description && (
                      <p className="text-sm text-muted-foreground mt-2">
                        {meeting.description}
                      </p>
                    )}
                  </CardContent>
                  
                  <CardFooter className="flex justify-between pt-2">
                    <div className="text-xs text-muted-foreground">
                      Criada em {formatDateToPtBr(new Date(meeting.created_at), 'dd MMM yyyy')}
                    </div>
                    
                    <div className="flex space-x-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(meeting)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(meeting.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardFooter>
                </Card>
              );
            })}
          </div>
        </ScrollArea>
      )}
    </div>
  );
};

export default ClientMeetings;