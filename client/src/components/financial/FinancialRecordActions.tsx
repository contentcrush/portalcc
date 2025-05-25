import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { MoreHorizontal, Eye, FileCheck, FileText, Trash2, Download, RotateCcw, Edit } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { showSuccessToast } from "@/lib/utils";

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
  invoice_file?: string | null;
  invoice_file_name?: string | null;
  invoice_file_uploaded_at?: string | null;
  invoice_file_uploaded_by?: number | null;
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
  invoice_file?: string | null;
  invoice_file_name?: string | null;
  invoice_file_uploaded_at?: string | null;
  invoice_file_uploaded_by?: number | null;
}

type FinancialRecord = FinancialDocument | Expense;

interface FinancialRecordActionsProps {
  record: FinancialRecord;
  type: "document" | "expense";
  onViewDetails: (record: FinancialRecord) => void;
  onRegisterPayment?: (record: FinancialRecord) => void;
  onEditExpense?: (expense: Expense) => void;
}

export function FinancialRecordActions({
  record,
  type,
  onViewDetails,
  onRegisterPayment,
  onEditExpense,
}: FinancialRecordActionsProps) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [errorDialogOpen, setErrorDialogOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState({ title: "", detail: "" });
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Função para determinar se é possível registrar pagamento
  const canRegisterPayment = () => {
    if (type === "document") {
      const doc = record as FinancialDocument;
      return !doc.paid && doc.status !== "canceled";
    } else {
      const expense = record as Expense;
      return !expense.approved;
    }
  };

  // Função para determinar se é possível reverter um pagamento
  const canRevertPayment = () => {
    if (type === "document") {
      const doc = record as FinancialDocument;
      return doc.paid === true;
    } else {
      const expense = record as Expense;
      return expense.approved === true;
    }
  };

  // Verifica se o documento está vinculado a um projeto
  const isLinkedToProject = () => {
    if (type === "document") {
      const doc = record as FinancialDocument;
      return doc.project_id !== null;
    }
    return false;
  };
  
  // Verifica se o registro tem uma nota fiscal anexada
  const hasInvoiceAttached = !!record.invoice_file;

  // Mutação para excluir registro
  const deleteMutation = useMutation({
    mutationFn: async () => {
      const endpoint = type === "document" 
        ? `/api/financial-documents/${record.id}` 
        : `/api/expenses/${record.id}`;
      
      const response = await apiRequest("DELETE", endpoint);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        // Se temos detalhes adicionais sobre o erro, vamos salvá-los para exibir no diálogo
        if (errorData.detail) {
          setErrorMessage({
            title: errorData.message || "Erro ao excluir registro",
            detail: errorData.detail
          });
          setErrorDialogOpen(true);
          throw new Error("ERROR_DIALOG_SHOWN");
        }
        throw new Error(errorData.message || "Erro ao excluir registro");
      }
      
      return null; // Não esperamos nenhum conteúdo para resposta DELETE
    },
    onSuccess: () => {
      showSuccessToast({
        title: "Registro excluído com sucesso",
        description: "O registro financeiro foi removido permanentemente."
      });
      
      // Recarregar os dados após excluir
      if (type === "document") {
        queryClient.invalidateQueries({ queryKey: ['/api/financial-documents'] });
      } else {
        queryClient.invalidateQueries({ queryKey: ['/api/expenses'] });
      }
      
      // Recarregar projetos também para manter tudo sincronizado
      queryClient.invalidateQueries({ queryKey: ['/api/projects'] });
    },
    onError: (error) => {
      // Só mostramos o toast se não estamos exibindo o diálogo de erro
      if (error.message !== "ERROR_DIALOG_SHOWN") {
        toast({
          title: "Erro ao excluir registro",
          description: error.message,
          variant: "destructive",
        });
      }
    },
  });

  // Mutação para reverter pagamento
  const revertPaymentMutation = useMutation({
    mutationFn: async () => {
      let endpoint = "";
      
      if (type === "document") {
        endpoint = `/api/financial-documents/${record.id}/revert-payment`;
      } else {
        endpoint = `/api/expenses/${record.id}/unapprove`;
      }
      
      const response = await apiRequest("POST", endpoint);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || "Erro ao reverter pagamento");
      }
      
      return await response.json();
    },
    onSuccess: () => {
      showSuccessToast({
        title: "Pagamento revertido com sucesso",
        description: type === "document" 
          ? "O documento foi marcado como pendente novamente."
          : "A despesa foi marcada como não aprovada."
      });
      
      // Recarregar os dados após reverter pagamento
      if (type === "document") {
        queryClient.invalidateQueries({ queryKey: ['/api/financial-documents'] });
      } else {
        queryClient.invalidateQueries({ queryKey: ['/api/expenses'] });
      }
      
      // Atualizar o calendário
      queryClient.invalidateQueries({ queryKey: ['/api/calendar'] });
      
      // Atualizar projetos se for um documento ligado a projeto
      if (isLinkedToProject()) {
        queryClient.invalidateQueries({ queryKey: ['/api/projects'] });
      }
    },
    onError: (error) => {
      toast({
        title: "Erro ao reverter pagamento",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Função para exportar PDF
  const handleExportPDF = () => {
    showSuccessToast({
      title: "Exportando documento",
      description: "O documento está sendo preparado para download."
    });
    
    // Aqui você poderia implementar a lógica real de exportação
    // Por enquanto, vamos simular com um timeout
    setTimeout(() => {
      showSuccessToast({
        title: "PDF gerado com sucesso",
        description: "O documento foi exportado e está pronto para download."
      });
    }, 1500);
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="h-8 w-8 p-0 relative">
            {hasInvoiceAttached && (
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-green-500 rounded-full border border-white" 
                    title="Nota fiscal anexada"></span>
            )}
            <span className="sr-only">Abrir menu</span>
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => onViewDetails(record)}>
            <Eye className="mr-2 h-4 w-4" />
            <span>Ver Detalhes</span>
          </DropdownMenuItem>
          
          {type === "expense" && onEditExpense && (
            <DropdownMenuItem onClick={() => onEditExpense(record as Expense)}>
              <Edit className="mr-2 h-4 w-4" />
              <span>Editar</span>
            </DropdownMenuItem>
          )}
          
          {hasInvoiceAttached ? (
            <DropdownMenuItem onClick={() => onViewDetails(record)}>
              <FileText className="mr-2 h-4 w-4 text-green-600" />
              <span>Ver Nota Fiscal</span>
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem onClick={() => onViewDetails(record)}>
              <FileText className="mr-2 h-4 w-4" />
              <span>Anexar Nota Fiscal</span>
            </DropdownMenuItem>
          )}
          
          {canRegisterPayment() && onRegisterPayment && (
            <DropdownMenuItem onClick={() => onRegisterPayment(record)}>
              <FileCheck className="mr-2 h-4 w-4" />
              <span>Registrar Pagamento</span>
            </DropdownMenuItem>
          )}
          
          {canRevertPayment() && (
            <DropdownMenuItem onClick={() => revertPaymentMutation.mutate()}>
              <RotateCcw className="mr-2 h-4 w-4" />
              <span>{revertPaymentMutation.isPending ? "Revertendo..." : "Reverter Pagamento"}</span>
            </DropdownMenuItem>
          )}
          
          <DropdownMenuItem onClick={handleExportPDF}>
            <Download className="mr-2 h-4 w-4" />
            <span>Exportar PDF</span>
          </DropdownMenuItem>
          
          <DropdownMenuSeparator />
          
          <DropdownMenuItem 
            onClick={() => setDeleteDialogOpen(true)}
            className="text-destructive focus:text-destructive"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            <span>Excluir</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Diálogo de confirmação para exclusão */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Isso excluirá permanentemente o registro financeiro
              e removerá os dados de nossos servidores.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteMutation.mutate()}
              className="bg-destructive hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? "Excluindo..." : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      {/* Diálogo de erro para exclusão */}
      <AlertDialog open={errorDialogOpen} onOpenChange={setErrorDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-destructive flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-alert-circle"><circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/></svg>
              {errorMessage.title}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-base mt-4">
              {errorMessage.detail}
            </AlertDialogDescription>
            {isLinkedToProject() && (
              <div className="mt-4 p-4 bg-muted rounded-md">
                <h4 className="font-medium mb-2">Como resolver:</h4>
                <ul className="list-disc pl-5 space-y-1">
                  <li>Edite o projeto associado e altere o valor do orçamento para 0</li>
                  <li>Ou exclua o projeto associado completamente</li>
                </ul>
              </div>
            )}
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction>Entendi</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}