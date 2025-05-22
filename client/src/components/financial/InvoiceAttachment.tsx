import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  Upload, 
  File, 
  FileText, 
  Trash2, 
  Download,
  AlertCircle 
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
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
import { showSuccessToast } from "@/lib/utils";

interface InvoiceAttachmentProps {
  type: "document" | "expense";
  recordId: number;
  invoiceFile: string | null;
  invoiceFileName: string | null;
  invoiceUploadedAt: string | null;
  onInvoiceUpdated: () => void;
}

export const InvoiceAttachment = ({
  type,
  recordId,
  invoiceFile,
  invoiceFileName,
  invoiceUploadedAt,
  onInvoiceUpdated
}: InvoiceAttachmentProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploading, setUploading] = useState(false);

  // URL base para uploads e ações
  const apiBaseUrl = type === "document" 
    ? `/api/financial-documents/${recordId}/invoice` 
    : `/api/expenses/${recordId}/invoice`;

  // Mutation para fazer upload de nota fiscal
  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      setUploading(true);
      setUploadProgress(10);
      
      const formData = new FormData();
      formData.append('invoice', file);
      
      // Simulação de progresso para melhor UX
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 500);
      
      try {
        const response = await fetch(apiBaseUrl, {
          method: 'POST',
          body: formData,
          credentials: 'include'
        });
        
        clearInterval(progressInterval);
        
        if (!response.ok) {
          // Verificar se a resposta é JSON antes de tentar parsear
          const contentType = response.headers.get("content-type");
          if (contentType && contentType.includes("application/json")) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Erro ao fazer upload da nota fiscal');
          } else {
            const textError = await response.text();
            console.error("Erro de resposta não-JSON:", textError);
            throw new Error("Erro no servidor ao processar arquivo. Tente novamente.");
          }
        }
        
        setUploadProgress(100);
        return await response.json();
      } catch (error) {
        setUploadProgress(0);
        throw error;
      } finally {
        setUploading(false);
      }
    },
    onSuccess: () => {
      showSuccessToast({
        title: "Nota fiscal anexada com sucesso",
        description: "O arquivo foi vinculado ao registro financeiro"
      });
      
      // Invalidar queries para atualizar os dados
      if (type === "document") {
        queryClient.invalidateQueries({ queryKey: ['/api/financial-documents'] });
      } else {
        queryClient.invalidateQueries({ queryKey: ['/api/expenses'] });
      }
      
      // Notificar o componente pai
      onInvoiceUpdated();
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao anexar nota fiscal",
        description: error.message || "Não foi possível fazer o upload do arquivo",
        variant: "destructive",
      });
    },
  });

  // Mutation para remover nota fiscal
  const deleteMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(apiBaseUrl, {
        method: 'DELETE',
        credentials: 'include'
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Erro ao remover nota fiscal');
      }
      
      return await response.json();
    },
    onSuccess: () => {
      showSuccessToast({
        title: "Nota fiscal removida",
        description: "O arquivo foi desvinculado do registro"
      });
      
      // Invalidar queries para atualizar os dados
      if (type === "document") {
        queryClient.invalidateQueries({ queryKey: ['/api/financial-documents'] });
      } else {
        queryClient.invalidateQueries({ queryKey: ['/api/expenses'] });
      }
      
      // Notificar o componente pai
      onInvoiceUpdated();
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao remover nota fiscal",
        description: error.message || "Não foi possível remover o arquivo",
        variant: "destructive",
      });
    },
  });

  // Handler para upload de arquivo
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;
    
    const file = files[0];
    
    // Verifica tamanho do arquivo (máximo 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "Arquivo muito grande",
        description: "O tamanho máximo permitido é 10MB",
        variant: "destructive",
      });
      return;
    }
    
    // Verifica tipos de arquivo permitidos
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
    if (!allowedTypes.includes(file.type)) {
      toast({
        title: "Tipo de arquivo não suportado",
        description: "Formatos aceitos: PDF, JPG, JPEG e PNG",
        variant: "destructive",
      });
      return;
    }
    
    uploadMutation.mutate(file);
  };

  // Função para gerar o link para download
  const getDownloadLink = () => {
    if (!invoiceFile) return '#';
    
    return `/${invoiceFile}`;
  };

  // Renderização de acordo com o estado (com ou sem nota fiscal)
  if (invoiceFile && invoiceFileName) {
    return (
      <div className="space-y-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center space-x-2">
                <FileText className="h-10 w-10 text-primary" />
                <div className="space-y-1">
                  <h4 className="text-sm font-semibold">{invoiceFileName}</h4>
                  {invoiceUploadedAt && (
                    <p className="text-xs text-muted-foreground">
                      Anexado em {
                        (() => {
                          try {
                            return format(new Date(invoiceUploadedAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
                          } catch (e) {
                            return "data não disponível";
                          }
                        })()
                      }
                    </p>
                  )}
                </div>
              </div>
              <div className="flex space-x-2">
                <a href={getDownloadLink()} target="_blank" rel="noopener noreferrer" download>
                  <Button variant="ghost" size="sm">
                    <Download className="h-4 w-4 mr-1" />
                    Baixar
                  </Button>
                </a>
                <Button variant="ghost" size="sm" onClick={() => setConfirmDelete(true)}>
                  <Trash2 className="h-4 w-4 mr-1 text-destructive" />
                  Remover
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Diálogo de confirmação para exclusão */}
        <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Remover nota fiscal?</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja remover esta nota fiscal? Esta ação não pode ser desfeita.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={() => {
                  setConfirmDelete(false);
                  deleteMutation.mutate();
                }}
              >
                Remover
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    );
  }

  // Interface para upload quando não há nota fiscal
  return (
    <div className="space-y-4">
      <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-lg border-muted-foreground/20 text-center">
        <Upload className="h-10 w-10 text-muted-foreground mb-2" />
        <h3 className="text-lg font-medium mb-1">
          {type === "document" ? "Anexar Nota Fiscal" : "Anexar Recibo/NF"}
        </h3>
        <p className="text-sm text-muted-foreground mb-4">
          Arraste e solte um arquivo ou clique para selecionar
        </p>
        
        <div className="relative">
          <input
            type="file"
            id="invoice-upload"
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            accept=".pdf,.jpg,.jpeg,.png"
            onChange={handleFileUpload}
            disabled={uploading}
          />
          <Button 
            className="w-full" 
            disabled={uploading}
          >
            {uploading ? `Enviando (${uploadProgress}%)` : "Selecionar arquivo"}
          </Button>
        </div>
        
        {uploading && (
          <div className="w-full mt-4 bg-muted h-2 rounded-full overflow-hidden">
            <div 
              className="h-full bg-primary transition-all duration-300 ease-in-out"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
        )}
        
        <p className="text-xs text-muted-foreground mt-4">
          Formatos suportados: PDF, JPG, JPEG, PNG (máx. 10MB)
        </p>
      </div>
    </div>
  );
};