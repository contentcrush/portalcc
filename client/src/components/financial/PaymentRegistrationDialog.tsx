import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { Check, Calendar as CalendarIcon } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { formatCurrency, showSuccessToast } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { 
  Popover,
  PopoverContent,
  PopoverTrigger 
} from "@/components/ui/popover";
import {
  Calendar
} from "@/components/ui/calendar";
import { cn } from "@/lib/utils";

// Tipos para os registros financeiros
interface FinancialDocument {
  id: number;
  document_type: string;
  document_number: string;
  client_id: number;
  project_id: number | null;
  amount: number;
  creation_date: string;
  due_date: string;
  description: string | null;
  paid: boolean;
  status: string;
}

interface Expense {
  id: number;
  project_id: number | null;
  category: string;
  amount: number;
  date: string;
  description: string;
  paid_by: number | null;
  approved: boolean;
}

type FinancialRecord = FinancialDocument | Expense;

// Schemas para validação
const paymentSchema = z.object({
  notes: z.string().optional(),
  payment_date: z.date().optional().nullable(),
});

interface PaymentRegistrationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  record: FinancialRecord | null;
  type: "document" | "expense";
}

export function PaymentRegistrationDialog({
  open,
  onOpenChange,
  record,
  type,
}: PaymentRegistrationDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Configurar o formulário
  const form = useForm<z.infer<typeof paymentSchema>>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      notes: "",
      payment_date: new Date(), // Data atual como padrão
    },
  });

  // Mutação para registrar pagamento
  const mutation = useMutation({
    mutationFn: async (data: z.infer<typeof paymentSchema>) => {
      if (!record) throw new Error("Registro não encontrado");
      
      const endpoint = type === "document" 
        ? `/api/financial-documents/${record.id}/pay` 
        : `/api/expenses/${record.id}/approve`;
      
      const response = await apiRequest("POST", endpoint, data);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || "Erro ao processar a solicitação");
      }
      
      return response.json().catch(() => ({}));
    },
    onSuccess: () => {
      showSuccessToast({
        title: type === "document" ? "Pagamento registrado" : "Despesa aprovada",
        description: type === "document" 
          ? "O pagamento foi registrado com sucesso." 
          : "A despesa foi aprovada com sucesso."
      });
      
      // Recarregar os dados
      if (type === "document") {
        queryClient.invalidateQueries({ queryKey: ['/api/financial-documents'] });
      } else {
        queryClient.invalidateQueries({ queryKey: ['/api/expenses'] });
      }
      
      onOpenChange(false);
      form.reset();
    },
    onError: (error) => {
      toast({
        title: type === "document" ? "Erro ao registrar pagamento" : "Erro ao aprovar despesa",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  if (!record) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[450px] p-0">
        <div className="bg-primary/5 p-6 border-b">
          <DialogHeader className="mb-3">
            <DialogTitle>
              {type === "document" ? "Registrar Pagamento" : "Aprovar Despesa"}
            </DialogTitle>
            <DialogDescription>
              {type === "document" 
                ? "Registre o pagamento para esta fatura" 
                : "Aprove esta despesa para processamento"}
            </DialogDescription>
          </DialogHeader>

          <div className="bg-background rounded-lg p-4 shadow-sm">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm text-muted-foreground">
                  {type === "document" 
                    ? `Fatura ${(record as FinancialDocument).document_number || `#${record.id}`}` 
                    : `Despesa #${record.id}`}
                </p>
                <p className="text-sm mt-1">
                  {record.description || (type === "expense" ? (record as Expense).category : "Sem descrição")}
                </p>
              </div>
              <div className="text-right">
                <Badge variant={type === "document" ? "outline" : "secondary"} className="mb-1">
                  {type === "document" ? "Documento" : "Despesa"}
                </Badge>
                <p className="text-lg font-semibold">{formatCurrency(record.amount)}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="p-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit((data) => mutation.mutate(data))} className="space-y-4">
              {/* Data Efetuada */}
              <FormField
                control={form.control}
                name="payment_date"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Data Efetuada</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant={"outline"}
                            className={cn(
                              "pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value ? (
                              format(field.value, "dd/MM/yyyy", { locale: ptBR })
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
                          selected={field.value || undefined}
                          onSelect={field.onChange}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              {/* Observações */}
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Observações (opcional)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Inserir observações ou comentários..."
                        className="min-h-[80px] resize-none"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter className="gap-2 sm:gap-0 mt-6">
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="w-full sm:w-auto">
                  Cancelar
                </Button>
                <Button type="submit" disabled={mutation.isPending} className="w-full sm:w-auto">
                  {mutation.isPending ? (
                    <span className="flex items-center gap-1">
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                      <span>Processando...</span>
                    </span>
                  ) : (
                    <span className="flex items-center gap-1">
                      <Check className="h-4 w-4" />
                      <span>
                        {type === "document" ? "Confirmar Pagamento" : "Aprovar Despesa"}
                      </span>
                    </span>
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </div>
      </DialogContent>
    </Dialog>
  );
}