import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { z } from "zod";
import { CalendarIcon, Check, CreditCard, ArrowDownToLine, ChevronsUpDown, Banknote } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { formatCurrency, cn } from "@/lib/utils";

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
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import { Textarea } from "@/components/ui/textarea";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";

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
const documentPaymentSchema = z.object({
  payment_date: z.date({
    required_error: "Data de pagamento é obrigatória",
  }),
  notes: z.string().optional(),
});

const expenseApprovalSchema = z.object({
  approval_date: z.date({
    required_error: "Data de aprovação é obrigatória",
  }),
  notes: z.string().optional(),
});

// Lista de métodos de pagamento comuns
const PAYMENT_METHODS = [
  { value: "pix", label: "PIX", icon: <ArrowDownToLine className="mr-2 h-4 w-4" /> },
  { value: "credit_card", label: "Cartão de Crédito", icon: <CreditCard className="mr-2 h-4 w-4" /> },
  { value: "debit_card", label: "Cartão de Débito", icon: <CreditCard className="mr-2 h-4 w-4" /> },
  { value: "bank_transfer", label: "Transferência Bancária", icon: <ArrowDownToLine className="mr-2 h-4 w-4" /> },
  { value: "cash", label: "Dinheiro", icon: <Banknote className="mr-2 h-4 w-4" /> },
];

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

  // Definir o schema correto com base no tipo de registro
  const schema = type === "document" ? documentPaymentSchema : expenseApprovalSchema;

  // Nenhum campo personalizado necessário
  
  // Configurar o formulário
  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: {
      payment_date: type === "document" ? new Date() : undefined,
      approval_date: type === "expense" ? new Date() : undefined,
      notes: "",
    },
  });

  // Mutação para registrar pagamento
  const mutation = useMutation({
    mutationFn: async (data: z.infer<typeof schema>) => {
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
      toast({
        title: type === "document" ? "Pagamento registrado" : "Despesa aprovada",
        description: type === "document" 
          ? "O pagamento foi registrado com sucesso." 
          : "A despesa foi aprovada com sucesso.",
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
              {type === "document" && (
                <>
                  {/* Data do pagamento */}
                  <FormField
                    control={form.control}
                    name="payment_date"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>Data do Pagamento</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant={"outline"}
                                className={cn(
                                  "w-full pl-3 text-left font-normal",
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
                              selected={field.value}
                              onSelect={field.onChange}
                              disabled={(date) =>
                                date > new Date() || date < new Date("1900-01-01")
                              }
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    )}
                  />


                </>
              )}

              {type === "expense" && (
                /* Data de aprovação */
                <FormField
                  control={form.control}
                  name="approval_date"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Data de Aprovação</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant={"outline"}
                              className={cn(
                                "w-full pl-3 text-left font-normal",
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
                            selected={field.value}
                            onSelect={field.onChange}
                            disabled={(date) =>
                              date > new Date() || date < new Date("1900-01-01")
                            }
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

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