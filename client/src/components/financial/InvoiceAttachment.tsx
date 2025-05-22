import React, { useState, useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Paperclip, FileText, Upload, X, Eye, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { apiRequest } from '@/lib/queryClient';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { showSuccessToast } from '@/lib/utils';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

interface InvoiceAttachmentProps {
  documentId: number;
  documentType: 'financial_document' | 'expense';
  invoiceFile?: string | null;
  invoiceFileName?: string | null;
  onUpdated?: () => void;
}

export function InvoiceAttachment({ 
  documentId, 
  documentType, 
  invoiceFile, 
  invoiceFileName,
  onUpdated 
}: InvoiceAttachmentProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const hasInvoice = !!invoiceFile;

  // Obter a extensão do arquivo
  const getFileExtension = (filename?: string | null) => {
    if (!filename) return null;
    return filename.split('.').pop()?.toLowerCase();
  };

  // Verificar se é um arquivo de imagem
  const isImageFile = (filename?: string | null) => {
    const ext = getFileExtension(filename);
    return ext && ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext);
  };

  // Verificar se é um arquivo PDF
  const isPdfFile = (filename?: string | null) => {
    const ext = getFileExtension(filename);
    return ext === 'pdf';
  };

  // Mutação para upload de nota fiscal
  const uploadMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const endpoint = documentType === 'financial_document' 
        ? `/api/financial-documents/${documentId}/invoice` 
        : `/api/expenses/${documentId}/invoice`;
      
      const response = await apiRequest('POST', endpoint, undefined, {
        customConfig: { 
          body: formData,
          // Não definir Content-Type para que o navegador configure com o boundary correto
          headers: {} 
        }
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.message || 'Erro ao fazer upload da nota fiscal');
      }

      return await response.json();
    },
    onSuccess: () => {
      showSuccessToast({
        title: 'Nota fiscal anexada com sucesso',
        description: 'O arquivo foi anexado ao registro financeiro.'
      });
      
      // Invalidar consultas para atualizar a UI
      if (documentType === 'financial_document') {
        queryClient.invalidateQueries({ queryKey: ['/api/financial-documents'] });
      } else {
        queryClient.invalidateQueries({ queryKey: ['/api/expenses'] });
      }
      
      // Notificar componente pai se necessário
      if (onUpdated) {
        onUpdated();
      }
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao anexar nota fiscal',
        description: error.message,
        variant: 'destructive'
      });
    },
    onSettled: () => {
      setIsUploading(false);
    }
  });

  // Mutação para excluir nota fiscal
  const deleteMutation = useMutation({
    mutationFn: async () => {
      const endpoint = documentType === 'financial_document' 
        ? `/api/financial-documents/${documentId}/invoice` 
        : `/api/expenses/${documentId}/invoice`;
      
      const response = await apiRequest('DELETE', endpoint);

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.message || 'Erro ao remover a nota fiscal');
      }

      return true;
    },
    onSuccess: () => {
      showSuccessToast({
        title: 'Nota fiscal removida com sucesso',
        description: 'O arquivo foi desvinculado do registro financeiro.'
      });
      
      // Invalidar consultas para atualizar a UI
      if (documentType === 'financial_document') {
        queryClient.invalidateQueries({ queryKey: ['/api/financial-documents'] });
      } else {
        queryClient.invalidateQueries({ queryKey: ['/api/expenses'] });
      }
      
      // Notificar componente pai se necessário
      if (onUpdated) {
        onUpdated();
      }
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao remover nota fiscal',
        description: error.message,
        variant: 'destructive'
      });
    }
  });

  // Handler para seleção de arquivo
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Verificar o tamanho do arquivo (máximo 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: 'Arquivo muito grande',
        description: 'O tamanho máximo permitido é 10MB.',
        variant: 'destructive'
      });
      return;
    }

    // Criar FormData e adicionar o arquivo
    const formData = new FormData();
    formData.append('invoice', file);
    
    // Iniciar upload
    setIsUploading(true);
    uploadMutation.mutate(formData);
  };

  // Handler para iniciar upload
  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  // Handler para download da nota fiscal
  const handleDownload = () => {
    if (!invoiceFile) return;
    
    // Criar um link temporário para download
    const link = document.createElement('a');
    link.href = invoiceFile;
    link.download = invoiceFileName || 'nota-fiscal.pdf';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Renderizar conteúdo com base no status
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <Label className="text-sm font-medium">Nota Fiscal / Comprovante</Label>
        
        {hasInvoice && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm">
                <Paperclip className="h-4 w-4 mr-1" />
                Opções
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setIsPreviewOpen(true)}>
                <Eye className="h-4 w-4 mr-2" />
                Visualizar
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleDownload}>
                <Download className="h-4 w-4 mr-2" />
                Download
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => setDeleteDialogOpen(true)}
                className="text-destructive focus:text-destructive"
              >
                <X className="h-4 w-4 mr-2" />
                Remover
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {isUploading ? (
        <Skeleton className="h-24 w-full" />
      ) : hasInvoice ? (
        <Card className="overflow-hidden">
          <CardContent className="p-3">
            <div className="flex items-center">
              <div className="bg-primary/10 p-2 rounded mr-3">
                <FileText className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate" title={invoiceFileName || 'Nota Fiscal'}>
                  {invoiceFileName || 'Nota Fiscal'}
                </p>
                <p className="text-xs text-muted-foreground">
                  Clique em Opções para visualizar ou baixar
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="border border-dashed rounded-md p-6 flex flex-col items-center justify-center text-center">
          <div className="bg-primary/10 p-3 rounded-full mb-3">
            <Upload className="h-6 w-6 text-primary" />
          </div>
          <p className="mb-1 text-sm font-medium">Nenhuma nota fiscal anexada</p>
          <p className="text-xs text-muted-foreground mb-3">
            Anexe o arquivo da nota fiscal para este registro financeiro
          </p>
          <Button onClick={handleUploadClick} size="sm" className="mt-2">
            Anexar Nota Fiscal
          </Button>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            className="hidden"
            accept=".pdf,.jpg,.jpeg,.png"
          />
        </div>
      )}

      {/* Diálogo de confirmação para exclusão */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover nota fiscal?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação irá remover o arquivo de nota fiscal anexado a este registro.
              Você poderá fazer upload de outro arquivo posteriormente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => deleteMutation.mutate()}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? 'Removendo...' : 'Remover'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Modal para visualização do arquivo */}
      <AlertDialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <AlertDialogContent className="max-w-3xl h-[80vh] flex flex-col">
          <AlertDialogHeader>
            <AlertDialogTitle>
              {invoiceFileName || 'Nota Fiscal'}
            </AlertDialogTitle>
          </AlertDialogHeader>
          
          <div className="flex-1 overflow-auto bg-muted/30 rounded-md">
            {invoiceFile && (
              isImageFile(invoiceFileName) ? (
                <img 
                  src={invoiceFile} 
                  alt="Nota Fiscal" 
                  className="max-w-full h-auto mx-auto"
                  style={{ maxHeight: 'calc(80vh - 180px)' }}
                />
              ) : isPdfFile(invoiceFileName) ? (
                <iframe 
                  src={`${invoiceFile}#toolbar=0&navpanes=0`} 
                  className="w-full h-full border-0"
                  title="Visualização de PDF"
                />
              ) : (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center p-4">
                    <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
                    <p>Este tipo de arquivo não pode ser visualizado diretamente.</p>
                    <Button onClick={handleDownload} size="sm" className="mt-4">
                      <Download className="h-4 w-4 mr-2" />
                      Download
                    </Button>
                  </div>
                </div>
              )
            )}
          </div>
          
          <AlertDialogFooter className="mt-4">
            <Button onClick={handleDownload} variant="outline" className="mr-auto">
              <Download className="h-4 w-4 mr-2" />
              Download
            </Button>
            <AlertDialogCancel>Fechar</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}