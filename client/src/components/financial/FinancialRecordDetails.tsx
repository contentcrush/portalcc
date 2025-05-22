import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { X, Receipt } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { InvoiceAttachment } from "./InvoiceAttachment";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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

interface FinancialRecordDetailsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  record: FinancialRecord | null;
  type: "document" | "expense";
}

export function FinancialRecordDetails({
  open,
  onOpenChange,
  record,
  type,
}: FinancialRecordDetailsProps) {
  // Buscar informações relacionadas
  const { data: clients } = useQuery({
    queryKey: ['/api/clients'],
    enabled: open && record !== null,
  });

  const { data: projects } = useQuery({
    queryKey: ['/api/projects'],
    enabled: open && record !== null,
  });

  const { data: users } = useQuery({
    queryKey: ['/api/users'],
    enabled: open && record !== null && type === "expense",
  });

  // Funções para obter informações relacionadas
  const getClientName = (clientId: number) => {
    if (!clients) return "...";
    const client = clients.find((c: any) => c.id === clientId);
    return client ? client.name : "Cliente não encontrado";
  };

  const getProjectName = (projectId: number | null) => {
    if (!projectId || !projects) return "Nenhum projeto";
    const project = projects.find((p: any) => p.id === projectId);
    return project ? project.name : "Projeto não encontrado";
  };

  const getUserName = (userId: number | null) => {
    if (!userId || !users) return "Não especificado";
    const user = users.find((u: any) => u.id === userId);
    return user ? user.name : "Usuário não encontrado";
  };

  const getCategoryName = (categoryId: string) => {
    const categoryMap: {[key: string]: string} = {
      "equipment": "Equipamentos",
      "software": "Software",
      "location": "Locação",
      "personnel": "Pessoal",
      "marketing": "Marketing",
      "travel": "Viagens",
      "office": "Escritório",
      "utilities": "Utilidades",
      "other": "Outros",
    };
    
    return categoryMap[categoryId] || categoryId;
  };

  const getStatusBadge = () => {
    if (!record) return null;
    
    if (type === "document") {
      const doc = record as FinancialDocument;
      if (doc.paid) {
        return <Badge className="bg-green-500 hover:bg-green-600">Pago</Badge>;
      }
      
      const status = doc.status;
      switch (status) {
        case "pending":
          return <Badge className="bg-amber-500 hover:bg-amber-600">Pendente</Badge>;
        case "overdue":
          return <Badge className="bg-red-500 hover:bg-red-600">Atrasado</Badge>;
        case "canceled":
          return <Badge className="bg-gray-500 hover:bg-gray-600">Cancelado</Badge>;
        default:
          return <Badge>{status}</Badge>;
      }
    } else {
      const expense = record as Expense;
      if (expense.approved) {
        return <Badge className="bg-green-500 hover:bg-green-600">Aprovado</Badge>;
      } else {
        return <Badge className="bg-amber-500 hover:bg-amber-600">Pendente</Badge>;
      }
    }
  };

  const queryClient = useQueryClient();
  
  // Função para atualizar o registro após o upload de nota fiscal
  const handleInvoiceUpdated = () => {
    // Aqui você poderia invalidar queries ou atualizar o estado conforme necessário
    if (type === "document") {
      queryClient.invalidateQueries({ queryKey: ['/api/financial-documents'] });
    } else {
      queryClient.invalidateQueries({ queryKey: ['/api/expenses'] });
    }
  };

  if (!record) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>
            {type === "document" ? "Detalhes da Receita" : "Detalhes da Despesa"}
          </DialogTitle>
          <DialogDescription>
            Informações completas sobre o registro financeiro.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="details" className="w-full">
          <TabsList className="grid grid-cols-2">
            <TabsTrigger value="details">Detalhes</TabsTrigger>
            <TabsTrigger value="invoice">Nota Fiscal</TabsTrigger>
          </TabsList>
          
          <TabsContent value="details" className="space-y-4 mt-4">
            <div className="flex justify-between items-center">
              <div>
                <span className="text-sm text-muted-foreground">ID: {record.id}</span>
              </div>
              <div>
                {getStatusBadge()}
              </div>
            </div>

            <Separator />

            {type === "document" && (
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <h3 className="text-sm font-medium">Documento</h3>
                  <p className="text-base">
                    {(record as FinancialDocument).document_number || "Sem número"}
                  </p>
                </div>
                
                <div>
                  <h3 className="text-sm font-medium">Cliente</h3>
                  <p className="text-base">
                    {getClientName((record as FinancialDocument).client_id)}
                  </p>
                </div>
                
                {(record as FinancialDocument).project_id && (
                  <div>
                    <h3 className="text-sm font-medium">Projeto</h3>
                    <p className="text-base">
                      {getProjectName((record as FinancialDocument).project_id)}
                    </p>
                  </div>
                )}
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h3 className="text-sm font-medium">Data de Emissão</h3>
                    <p className="text-base">
                      {format(new Date((record as FinancialDocument).creation_date), "dd/MM/yyyy", { locale: ptBR })}
                    </p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium">Data de Vencimento</h3>
                    <p className="text-base">
                      {format(new Date((record as FinancialDocument).due_date), "dd/MM/yyyy", { locale: ptBR })}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {type === "expense" && (
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <h3 className="text-sm font-medium">Categoria</h3>
                  <p className="text-base">
                    {getCategoryName((record as Expense).category)}
                  </p>
                </div>
                
                {(record as Expense).project_id && (
                  <div>
                    <h3 className="text-sm font-medium">Projeto</h3>
                    <p className="text-base">
                      {getProjectName((record as Expense).project_id)}
                    </p>
                  </div>
                )}
                
                <div>
                  <h3 className="text-sm font-medium">Data</h3>
                  <p className="text-base">
                    {format(new Date((record as Expense).date), "dd/MM/yyyy", { locale: ptBR })}
                  </p>
                </div>
                
                {(record as Expense).paid_by && (
                  <div>
                    <h3 className="text-sm font-medium">Pago por</h3>
                    <p className="text-base">
                      {getUserName((record as Expense).paid_by)}
                    </p>
                  </div>
                )}
              </div>
            )}

            <Separator />

            <div>
              <h3 className="text-sm font-medium">Valor</h3>
              <p className="text-xl font-semibold text-primary">
                {formatCurrency(record.amount)}
              </p>
            </div>

            {record.description && (
              <div>
                <h3 className="text-sm font-medium">Descrição</h3>
                <p className="text-base whitespace-pre-wrap">
                  {record.description}
                </p>
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="invoice" className="space-y-4 mt-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium">Nota Fiscal / Comprovante</h3>
              <Badge variant={record.invoice_file ? "success" : "outline"}>
                {record.invoice_file ? "Anexado" : "Pendente"}
              </Badge>
            </div>
            
            <p className="text-sm text-muted-foreground mb-4">
              {record.invoice_file 
                ? "Aqui você pode gerenciar a nota fiscal ou comprovante anexado a este registro financeiro." 
                : "Anexe a nota fiscal ou comprovante relacionado a este registro financeiro."}
            </p>
            
            <InvoiceAttachment 
              documentId={record.id}
              documentType={type === "document" ? "financial_document" : "expense"}
              invoiceFile={record.invoice_file}
              invoiceFileName={record.invoice_file_name}
              onUpdated={handleInvoiceUpdated}
            />
          </TabsContent>
        </Tabs>

        <DialogFooter className="mt-6">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}