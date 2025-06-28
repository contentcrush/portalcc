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

export function EditableDateFixed({ documentId, currentDate, fieldName, fieldLabel }: EditableDateProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(
    currentDate ? new Date(currentDate) : undefined
  );
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const updateDateMutation = useMutation({
    mutationFn: async (date: Date | null) => {
      console.log(`[DEBUG_ISSUE_DATE_FRONTEND] ===== INÍCIO updateDateMutation =====`);
      console.log(`[DEBUG_ISSUE_DATE_FRONTEND] DocumentId: ${documentId}`);
      console.log(`[DEBUG_ISSUE_DATE_FRONTEND] FieldName: ${fieldName}`);
      console.log(`[DEBUG_ISSUE_DATE_FRONTEND] Date recebida:`, date);
      console.log(`[DEBUG_ISSUE_DATE_FRONTEND] Date tipo:`, typeof date);
      
      const updateData = {
        [fieldName]: date ? date.toISOString() : null
      };
      
      console.log(`[DEBUG_ISSUE_DATE_FRONTEND] updateData construído:`, JSON.stringify(updateData, null, 2));
      console.log(`[DEBUG_ISSUE_DATE_FRONTEND] Fazendo PATCH para: /api/financial-documents/${documentId}`);
      
      const response = await apiRequest("PATCH", `/api/financial-documents/${documentId}`, updateData);
      
      console.log(`[DEBUG_ISSUE_DATE_FRONTEND] Response status:`, response.status);
      console.log(`[DEBUG_ISSUE_DATE_FRONTEND] Response ok:`, response.ok);
      
      if (!response.ok) {
        const errorData = await response.json();
        console.log(`[DEBUG_ISSUE_DATE_FRONTEND] ERRO response:`, errorData);
        throw new Error(errorData.message || 'Falha na atualização');
      }
      
      const result = await response.json();
      console.log(`[DEBUG_ISSUE_DATE_FRONTEND] Response data:`, JSON.stringify(result, null, 2));
      console.log(`[DEBUG_ISSUE_DATE_FRONTEND] ===== FIM updateDateMutation =====`);
      return result;
    },
    onSuccess: (updatedDocument) => {
      console.log(`[EditableDateFixed] ${fieldLabel} atualizada com sucesso:`, updatedDocument);
      
      // Estratégia robusta de invalidação de cache
      queryClient.invalidateQueries({ queryKey: ['/api/financial-documents'] });
      
      // Aguardar um momento e forçar refetch
      setTimeout(() => {
        queryClient.refetchQueries({ queryKey: ['/api/financial-documents'] });
      }, 100);
      
      showSuccessToast(toast, `${fieldLabel} atualizada com sucesso`);
      setIsEditing(false);
    },
    onError: (error: Error) => {
      console.error(`[EditableDateFixed] Erro ao atualizar ${fieldLabel}:`, error);
      toast({
        title: "Erro na atualização",
        description: error.message || `Falha ao atualizar ${fieldLabel}`,
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
        <span className="text-sm text-muted-foreground">
          {format(new Date(currentDate), "dd/MM/yyyy")}
        </span>
      ) : (
        <Badge variant="outline" className="text-orange-600 border-orange-300 bg-orange-50">
          Sem data
        </Badge>
      )}
    </div>
  );
}