import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Trash, Eye, Download, Upload, FileText, FileImage, FileArchive, RefreshCcw, X } from 'lucide-react';
import { Spinner } from '@/components/ui/spinner';
import { toast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { FileUpload } from '@/components/ui/file-upload';

interface ClientFile {
  id: number;
  client_id: number;
  name: string;
  path: string;
  size: number;
  type: string;
  upload_date: string;
  uploaded_by: number | null;
  description: string;
}

interface ClientFilesProps {
  clientId: number;
  clientName: string;
}

export default function ClientFiles({ clientId, clientName }: ClientFilesProps) {
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [viewFile, setViewFile] = useState<ClientFile | null>(null);
  const queryClient = useQueryClient();

  // Buscar arquivos do cliente
  const { data: files = [], isLoading, error } = useQuery<ClientFile[]>({
    queryKey: ['/api/clients', clientId, 'files'],
    queryFn: async () => {
      const response = await apiRequest('GET', `/api/clients/${clientId}/files`);
      return response.json();
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao carregar arquivos',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Mutação para upload de arquivos
  const uploadMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      // Não definimos o Content-Type manualmente para que o navegador defina o boundary correto
      try {
        const response = await apiRequest('POST', `/api/clients/${clientId}/files`, undefined, {
          body: formData,
          // Aqui removemos a definição do headers completamente para deixar o navegador cuidar disso
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          console.error('Erro no upload:', errorData);
          throw new Error(errorData.message || 'Erro ao fazer upload de arquivos');
        }
        
        return response.json();
      } catch (error) {
        console.error('Erro ao processar upload:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/clients', clientId, 'files'] });
      setUploadDialogOpen(false);
      toast({
        title: 'Upload realizado com sucesso',
        description: 'Os arquivos foram adicionados ao cliente.',
      });
    },
    onError: (error: Error) => {
      console.error('Erro no uploadMutation:', error);
      toast({
        title: 'Erro no upload',
        description: error.message || 'Ocorreu um erro ao fazer o upload dos arquivos',
        variant: 'destructive',
      });
    },
  });

  // Mutação para deletar arquivo
  const deleteMutation = useMutation({
    mutationFn: async (fileId: number) => {
      await apiRequest('DELETE', `/api/clients/${clientId}/files/${fileId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/clients', clientId, 'files'] });
      toast({
        title: 'Arquivo excluído',
        description: 'O arquivo foi removido com sucesso.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao excluir arquivo',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const handleDeleteFile = (file: ClientFile) => {
    if (confirm(`Tem certeza que deseja excluir o arquivo "${file.name}"?`)) {
      deleteMutation.mutate(file.id);
    }
  };

  const handleViewFile = (file: ClientFile) => {
    setViewFile(file);
    // Abrir em uma nova aba
    window.open(`/api/clients/${clientId}/files/${file.id}/view`, '_blank');
  };

  const handleDownloadFile = (file: ClientFile) => {
    window.open(`/api/clients/${clientId}/files/${file.id}/download`, '_blank');
  };

  const handleUpload = (files: File[]) => {
    if (files.length === 0) return;

    const formData = new FormData();
    // Anexar cada arquivo com nome 'files' (importante: este nome deve corresponder ao esperado pelo multer no servidor)
    files.forEach(file => {
      formData.append('files', file);
    });
    
    console.log('Enviando arquivos:', files.map(f => f.name));
    uploadMutation.mutate(formData);
  };

  // Função para formatar o tamanho do arquivo
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${parseFloat((bytes / Math.pow(1024, i)).toFixed(2))} ${sizes[i]}`;
  };

  // Função para obter o ícone baseado no tipo do arquivo
  const getFileIcon = (type: string) => {
    if (type.startsWith('image/')) return <FileImage className="h-5 w-5" />;
    if (type.includes('pdf') || type.includes('document') || type.includes('text')) return <FileText className="h-5 w-5" />;
    if (type.includes('zip') || type.includes('compressed') || type.includes('archive')) return <FileArchive className="h-5 w-5" />;
    return <FileText className="h-5 w-5" />;
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <FileText className="mr-2 h-5 w-5" />
            Arquivos do Cliente
          </CardTitle>
        </CardHeader>
        <CardContent className="flex justify-center py-8">
          <Spinner size="lg" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <FileText className="mr-2 h-5 w-5" />
            Arquivos do Cliente
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <X className="h-10 w-10 text-destructive mb-2" />
            <p className="text-lg font-medium">Erro ao carregar arquivos</p>
            <p className="text-sm text-muted-foreground mt-1">{error.message}</p>
            <Button 
              variant="outline" 
              className="mt-4"
              onClick={() => queryClient.invalidateQueries({ queryKey: ['/api/clients', clientId, 'files'] })}
            >
              <RefreshCcw className="mr-2 h-4 w-4" />
              Tentar novamente
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center">
            <FileText className="mr-2 h-5 w-5" />
            Arquivos do Cliente
          </div>
          <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="ml-auto">
                <Upload className="mr-2 h-4 w-4" />
                Adicionar Arquivos
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl w-full max-h-[90vh] overflow-y-auto">
              <DialogHeader className="mb-4">
                <DialogTitle>Fazer upload de arquivos</DialogTitle>
                <DialogDescription>
                  Arraste arquivos para esta área ou clique para selecionar arquivos do seu dispositivo.
                </DialogDescription>
              </DialogHeader>
              <div className="py-2">
                <FileUpload
                  onUpload={handleUpload}
                  isUploading={uploadMutation.isPending}
                  maxFiles={5}
                  maxSize={10 * 1024 * 1024} // 10MB
                  accept={{
                    'application/pdf': ['.pdf'],
                    'application/msword': ['.doc'],
                    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
                    'application/vnd.ms-excel': ['.xls'],
                    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
                    'application/vnd.ms-powerpoint': ['.ppt'],
                    'application/vnd.openxmlformats-officedocument.presentationml.presentation': ['.pptx'],
                    'image/*': ['.jpg', '.jpeg', '.png', '.gif'],
                    'text/plain': ['.txt'],
                    'application/zip': ['.zip'],
                    'application/x-zip-compressed': ['.zip'],
                    'application/x-rar-compressed': ['.rar'],
                    'application/json': ['.json'],
                  }}
                />
              </div>
              <DialogFooter className="mt-6">
                <Button 
                  variant="outline" 
                  onClick={() => setUploadDialogOpen(false)}
                  disabled={uploadMutation.isPending}
                >
                  Cancelar
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardTitle>
      </CardHeader>

      <CardContent>
        {files.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center border border-dashed rounded-md">
            <FileText className="h-10 w-10 text-muted-foreground mb-2" />
            <p className="text-lg font-medium">Nenhum arquivo encontrado</p>
            <p className="text-sm text-muted-foreground mt-1">Adicione arquivos para este cliente</p>
            <Button 
              variant="outline" 
              className="mt-4"
              onClick={() => setUploadDialogOpen(true)}
            >
              <Upload className="mr-2 h-4 w-4" />
              Fazer Upload
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {files.map((file) => (
              <div 
                key={file.id}
                className="flex items-center justify-between p-3 border rounded-md hover:bg-accent/50 transition-colors"
              >
                <div className="flex items-center gap-3 overflow-hidden">
                  <div className="flex-shrink-0 h-10 w-10 bg-muted rounded-md flex items-center justify-center">
                    {getFileIcon(file.type)}
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium truncate" title={file.name}>
                      {file.name}
                    </p>
                    <div className="flex items-center text-xs text-muted-foreground">
                      <span className="mr-2">{formatFileSize(file.size)}</span>
                      <span>
                        {file.upload_date && formatDistanceToNow(new Date(file.upload_date), {
                          addSuffix: true,
                          locale: ptBR
                        })}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 ml-4">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleViewFile(file)}
                    title="Visualizar"
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDownloadFile(file)}
                    title="Baixar"
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDeleteFile(file)}
                    title="Excluir"
                  >
                    <Trash className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
      <CardFooter className="text-xs text-muted-foreground">
        Total: {files.length} arquivo{files.length !== 1 ? 's' : ''}
      </CardFooter>
    </Card>
  );
}