import React, { useState, useEffect } from 'react';
import { Event } from '@shared/schema';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format, setHours, setMinutes, addHours, isBefore } from 'date-fns';
import { CalendarIcon, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface EventDialogProps {
  isOpen: boolean;
  onClose: () => void;
  event: Event | null;
  isCreateMode: boolean;
  initialDate?: Date | null;
  onSave: (eventData: Partial<Event>) => void;
  onDelete?: (eventId: number) => void;
}

// Schema de validação para o formulário
const eventFormSchema = z.object({
  title: z.string().min(1, 'Título é obrigatório'),
  description: z.string().optional(),
  type: z.string().min(1, 'Tipo é obrigatório'),
  start_date: z.date({
    required_error: 'Data de início é obrigatória',
  }),
  end_date: z.date({
    required_error: 'Data de término é obrigatória',
  }).refine(
    (data) => true, // Validação será feita no onSubmit
    {
      message: 'Data de término deve ser posterior à data de início',
    }
  ),
  all_day: z.boolean().default(false),
  location: z.string().optional(),
  color: z.string().optional(),
});

type EventFormValues = z.infer<typeof eventFormSchema>;

// Opções de tipo de evento
const eventTypes = [
  { id: 'meeting', label: 'Reunião' },
  { id: 'deadline', label: 'Prazo' },
  { id: 'task', label: 'Tarefa' },
  { id: 'appointment', label: 'Compromisso' },
  { id: 'reminder', label: 'Lembrete' },
  { id: 'other', label: 'Outro' }
];

// Lista de horários para os selects
const timeOptions = Array.from({ length: 24 * 4 }, (_, i) => {
  const hour = Math.floor(i / 4);
  const minute = (i % 4) * 15;
  return {
    value: `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`,
    label: `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
  };
});

const EventDialog: React.FC<EventDialogProps> = ({
  isOpen,
  onClose,
  event,
  isCreateMode,
  initialDate,
  onSave,
  onDelete
}) => {
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('10:00');
  
  // Configurar o formulário
  const form = useForm<EventFormValues>({
    resolver: zodResolver(eventFormSchema),
    defaultValues: {
      title: '',
      description: '',
      type: 'meeting',
      start_date: initialDate || new Date(),
      end_date: initialDate ? addHours(initialDate, 1) : addHours(new Date(), 1),
      all_day: false,
      location: '',
      color: '',
    }
  });
  
  // Atualizar o formulário quando o evento ou modo muda
  useEffect(() => {
    if (isCreateMode) {
      // Novo evento com data inicial (se fornecida)
      const defaultStartDate = initialDate || new Date();
      const defaultEndDate = initialDate ? addHours(initialDate, 1) : addHours(new Date(), 1);
      
      form.reset({
        title: '',
        description: '',
        type: 'meeting',
        start_date: defaultStartDate,
        end_date: defaultEndDate,
        all_day: false,
        location: '',
        color: '',
      });
      
      // Configurar horários
      setStartTime(format(defaultStartDate, 'HH:mm'));
      setEndTime(format(defaultEndDate, 'HH:mm'));
    } else if (event) {
      // Evento existente
      form.reset({
        title: event.title,
        description: event.description || '',
        type: event.type,
        start_date: new Date(event.start_date),
        end_date: new Date(event.end_date),
        all_day: event.all_day || false,
        location: event.location || '',
        color: event.color || '',
      });
      
      // Configurar horários
      if (!event.all_day) {
        setStartTime(format(new Date(event.start_date), 'HH:mm'));
        setEndTime(format(new Date(event.end_date), 'HH:mm'));
      } else {
        setStartTime('00:00');
        setEndTime('23:59');
      }
    }
  }, [form, event, isCreateMode, initialDate]);
  
  // Aplicar o horário à data
  const applyTimeToDate = (date: Date, timeString: string): Date => {
    const [hours, minutes] = timeString.split(':').map(Number);
    const newDate = new Date(date);
    return setMinutes(setHours(newDate, hours), minutes);
  };
  
  // Manipular envio do formulário
  const onSubmit = (data: EventFormValues) => {
    // Aplicar horários às datas
    let startDate = data.start_date;
    let endDate = data.end_date;
    
    if (!data.all_day) {
      startDate = applyTimeToDate(data.start_date, startTime);
      endDate = applyTimeToDate(data.end_date, endTime);
    } else {
      // Para eventos de dia inteiro, definir início às 00:00 e fim às 23:59
      startDate = applyTimeToDate(data.start_date, '00:00');
      endDate = applyTimeToDate(data.end_date, '23:59');
    }
    
    // Validar que a data de término é posterior à de início
    if (isBefore(endDate, startDate)) {
      form.setError('end_date', {
        type: 'manual',
        message: 'A data/hora de término deve ser posterior à data/hora de início'
      });
      return;
    }
    
    // Preparar dados para salvar
    const eventData: Partial<Event> = {
      ...data,
      start_date: startDate,
      end_date: endDate,
      // Adicionar IDs, se o evento já existir
      ...(event ? {
        id: event.id,
        user_id: event.user_id,
        project_id: event.project_id,
        client_id: event.client_id,
        task_id: event.task_id
      } : { 
        user_id: 5 // ID do usuário atual (temporário - deve vir do contexto)
      })
    };
    
    // Chamar função para salvar
    onSave(eventData);
  };
  
  // Manipular exclusão de evento
  const handleDelete = () => {
    if (event && onDelete) {
      onDelete(event.id);
      setIsDeleteDialogOpen(false);
    }
  };
  
  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>
              {isCreateMode ? 'Criar Novo Evento' : 'Editar Evento'}
            </DialogTitle>
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
                      <Textarea 
                        placeholder="Descrição do evento" 
                        className="resize-none" 
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
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      defaultValue={field.value}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o tipo de evento" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {eventTypes.map((type) => (
                          <SelectItem key={type.id} value={type.id}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="start_date"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Data de início</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              className={cn(
                                "w-full pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              {field.value ? (
                                format(field.value, "dd/MM/yyyy")
                              ) : (
                                <span>Selecione uma data</span>
                              )}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="end_date"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Data de término</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              className={cn(
                                "w-full pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              {field.value ? (
                                format(field.value, "dd/MM/yyyy")
                              ) : (
                                <span>Selecione uma data</span>
                              )}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            initialFocus
                            disabled={(date) => isBefore(date, form.getValues('start_date'))}
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <FormField
                control={form.control}
                name="all_day"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                    <div className="space-y-0.5">
                      <FormLabel>Dia inteiro</FormLabel>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              
              {!form.watch('all_day') && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <FormLabel>Horário de início</FormLabel>
                    <Select 
                      value={startTime} 
                      onValueChange={setStartTime}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Horário" />
                      </SelectTrigger>
                      <SelectContent>
                        {timeOptions.map((time) => (
                          <SelectItem key={time.value} value={time.value}>
                            {time.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <FormLabel>Horário de término</FormLabel>
                    <Select 
                      value={endTime} 
                      onValueChange={setEndTime}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Horário" />
                      </SelectTrigger>
                      <SelectContent>
                        {timeOptions.map((time) => (
                          <SelectItem key={time.value} value={time.value}>
                            {time.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}
              
              <FormField
                control={form.control}
                name="location"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Localização</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Local do evento" 
                        {...field} 
                        value={field.value || ''}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <DialogFooter className="gap-2 sm:gap-0">
                {!isCreateMode && onDelete && (
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={() => setIsDeleteDialogOpen(true)}
                    className="mr-auto"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Excluir
                  </Button>
                )}
                
                <DialogClose asChild>
                  <Button type="button" variant="secondary">
                    Cancelar
                  </Button>
                </DialogClose>
                
                <Button type="submit">
                  {isCreateMode ? 'Criar' : 'Salvar'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
      
      {/* Diálogo de confirmação para exclusão */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Tem certeza?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O evento será excluído permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default EventDialog;