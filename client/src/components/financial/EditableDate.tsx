import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Calendar as CalendarIcon, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { showSuccessToast } from "@/lib/utils";

interface EditableDateProps {
  documentId: number;
  currentDate: string | null;
  fieldName: 'issue_date' | 'due_date';
  fieldLabel: string;
}

export function EditableDate({ documentId, currentDate, fieldName, fieldLabel }: EditableDateProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(
    currentDate ? new Date(currentDate) : undefined
  );
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const updateDateMutation = useMutation({
    mutationFn: async (date: Date | null) => {
      console.log(`[EditableDate] Atualizando ${fieldName} do documento ${documentId}:`, date);
      
      const updateData = {
        [fieldName]: date ? date.toISOString() : null
      };
      
      const response = await apiRequest("PATCH", `/api/financial-documents/${documentId}`, updateData);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Falha na atualização');
      }
      return await response.json();
    },
    onSuccess: (updatedDocument) => {
      console.log(`[EditableDate] ${fieldLabel} atualizada com sucesso:`, updatedDocument);
      
      // Invalidar múltiplas queries relacionadas
      queryClient.invalidateQueries({ queryKey: ['/api/financial-documents'] });
      queryClient.invalidateQueries({ queryKey: ['/api/financial-documents', documentId] });
      
      // Forçar refetch imediato
      queryClient.refetchQueries({ queryKey: ['/api/financial-documents'] });
      
      showSuccessToast(toast, `${fieldLabel} atualizada com sucesso`);
      setIsEditing(false);
    },
    onError: (error: Error) => {
      console.error(`[EditableDate] Erro ao atualizar ${fieldLabel}:`, error);
      toast({
        title: `Erro ao atualizar ${fieldLabel}`,
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSave = () => {
    updateDateMutation.mutate(selectedDate || null);
  };

  const handleCancel = () => {
    setSelectedDate(currentDate ? new Date(currentDate) : undefined);
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <div className="flex items-center gap-2">
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className="w-32 justify-start text-left font-normal"
              size="sm"
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {selectedDate ? format(selectedDate, "dd/MM/yyyy") : "Selecionar"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={setSelectedDate}
              initialFocus
              locale={ptBR}
            />
          </PopoverContent>
        </Popover>
        
        <Button
          size="sm"
          onClick={handleSave}
          disabled={updateDateMutation.isPending}
          className="h-8 w-8 p-0"
        >
          <Check className="h-4 w-4" />
        </Button>
        
        <Button
          variant="outline"
          size="sm"
          onClick={handleCancel}
          disabled={updateDateMutation.isPending}
          className="h-8 w-8 p-0"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <div 
      className="group cursor-pointer hover:bg-muted/50 p-1 rounded"
      onClick={() => setIsEditing(true)}
    >
      {currentDate ? (
        <span className="group-hover:underline">
          {format(new Date(currentDate), 'dd/MM/yyyy')}
        </span>
      ) : (
        <Badge variant="outline" className="text-xs border-orange-200 text-orange-700 bg-orange-50 group-hover:border-orange-400">
          Sem data - Clique para definir
        </Badge>
      )}
    </div>
  );
}