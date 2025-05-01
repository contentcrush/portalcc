import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { MoreHorizontal, Eye, FileCheck, FileText, Trash2, Download } from "lucide-react";
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

interface FinancialRecordActionsProps {
  record: FinancialRecord;
  type: "document" | "expense";
  onViewDetails: (record: FinancialRecord) => void;
  onRegisterPayment?: (record: FinancialRecord) => void;
}

export function FinancialRecordActions({
  record,
  type,
  onViewDetails,
  onRegisterPayment,
}: FinancialRecordActionsProps) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
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

  // Mutação para excluir registro
  const deleteMutation = useMutation({
    mutationFn: async () => {
      const endpoint = type === "document" 
        ? `/api/financial-documents/${record.id}` 
        : `/api/expenses/${record.id}`;
      
      const response = await apiRequest("DELETE", endpoint);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || "Erro ao excluir registro");
      }
      
      return null; // Não esperamos nenhum conteúdo para resposta DELETE
    },
    onSuccess: () => {
      toast({
        title: "Registro excluído com sucesso",
        description: "O registro financeiro foi removido permanentemente.",
      });
      
      // Recarregar os dados após excluir
      if (type === "document") {
        queryClient.invalidateQueries({ queryKey: ['/api/financial-documents'] });
      } else {
        queryClient.invalidateQueries({ queryKey: ['/api/expenses'] });
      }
    },
    onError: (error) => {
      toast({
        title: "Erro ao excluir registro",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Função para exportar PDF
  const handleExportPDF = () => {
    toast({
      title: "Exportando documento",
      description: "O documento está sendo preparado para download.",
    });
    
    // Aqui você poderia implementar a lógica real de exportação
    // Por enquanto, vamos simular com um timeout
    setTimeout(() => {
      toast({
        title: "PDF gerado com sucesso",
        description: "O documento foi exportado e está pronto para download.",
      });
    }, 1500);
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="h-8 w-8 p-0">
            <span className="sr-only">Abrir menu</span>
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => onViewDetails(record)}>
            <Eye className="mr-2 h-4 w-4" />
            <span>Ver Detalhes</span>
          </DropdownMenuItem>
          
          {canRegisterPayment() && onRegisterPayment && (
            <DropdownMenuItem onClick={() => onRegisterPayment(record)}>
              <FileCheck className="mr-2 h-4 w-4" />
              <span>Registrar Pagamento</span>
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
    </>
  );
}