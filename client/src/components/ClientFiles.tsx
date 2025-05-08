import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { FileUpload } from '@/components/ui/file-upload';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, Trash2, Eye } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { formatDate } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

interface ClientFile {
  id: number;
  client_id: number;
  name: string;
  path: string;
  size: number;
  type: string;
  upload_date: string;
}

interface ClientFilesProps {
  clientId: number;
  clientName: string;
}

export default function ClientFiles({ clientId, clientName }: ClientFilesProps) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [fileToDelete, setFileToDelete] = useState<ClientFile | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: files = [], isLoading } = useQuery<ClientFile[]>({
    queryKey: ['/api/clients', clientId, 'files'],
    queryFn: async () => {
      const res = await apiRequest('GET', `/api/clients/${clientId}/files`);
      return res.json();
    }
  });

  const uploadMutation = useMutation({
    mutationFn: async (files: File[]) => {
      const formData = new FormData();
      files.forEach(file => {
        formData.append('files', file);
      });
      
      setUploading(true);
      setProgress(0);
      
      const xhr = new XMLHttpRequest();
      const promise = new Promise<ClientFile[]>((resolve, reject) => {
        xhr.open('POST', `/api/clients/${clientId}/files`);
        
        // Configurar token de autenticação se necessário
        const token = document.cookie.split('; ').find(row => row.startsWith('authToken='));
        if (token) {
          xhr.setRequestHeader('Authorization', `Bearer ${token.split('=')[1]}`);
        }
        
        xhr.upload.addEventListener('progress', (event) => {
          if (event.lengthComputable) {
            const percentComplete = Math.round((event.loaded / event.total) * 100);
            setProgress(percentComplete);
          }
        });
        
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve(JSON.parse(xhr.response));
          } else {
            reject(new Error(`Upload failed with status: ${xhr.status}`));
          }
          setUploading(false);
        };
        
        xhr.onerror = () => {
          reject(new Error('Network error during upload'));
          setUploading(false);
        };
        
        xhr.send(formData);
      });
      
      return promise;
    },
    onSuccess: () => {
      toast({
        title: "Arquivos enviados com sucesso",
        description: "Os arquivos foram adicionados ao cliente",
        variant: "success",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/clients', clientId, 'files'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao enviar arquivos",
        description: error.message,
        variant: "destructive",
      });
      setUploading(false);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (fileId: number) => {
      await apiRequest('DELETE', `/api/clients/${clientId}/files/${fileId}`);
    },
    onSuccess: () => {
      toast({
        title: "Arquivo excluído",
        description: "O arquivo foi removido com sucesso",
        variant: "success",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/clients', clientId, 'files'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao excluir arquivo",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  const handleUpload = (selectedFiles: File[]) => {
    uploadMutation.mutate(selectedFiles);
  };

  const handleDeleteFile = (file: ClientFile) => {
    setFileToDelete(file);
  };

  const confirmDelete = () => {
    if (fileToDelete) {
      deleteMutation.mutate(fileToDelete.id);
      setFileToDelete(null);
    }
  };

  const handleViewFile = (file: ClientFile) => {
    window.open(`/api/clients/${clientId}/files/${file.id}/view`, '_blank');
  };

  const getFileIcon = (fileType: string) => {
    const type = fileType.split('/')[0];
    return type;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} bytes`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex justify-between items-center">
          <span>Arquivos</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <FileUpload
          onUpload={handleUpload}
          uploading={uploading}
          progress={progress}
          className="h-auto"
          maxFiles={5}
          maxSize={10 * 1024 * 1024} // 10MB
          accept={{
            'image/*': ['.jpeg', '.jpg', '.png', '.gif'],
            'application/pdf': ['.pdf'],
            'application/msword': ['.doc'],
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
            'application/vnd.ms-excel': ['.xls'],
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
            'text/plain': ['.txt'],
          }}
        />

        {isLoading ? (
          <div className="flex justify-center py-4">
            <div className="h-6 w-6 animate-spin rounded-full border-b-2 border-primary"></div>
          </div>
        ) : files.length > 0 ? (
          <div className="space-y-2 mt-4">
            <h4 className="text-sm font-medium">Arquivos do cliente</h4>
            <div className="rounded-md border overflow-hidden">
              <div className="divide-y">
                {files.map((file) => (
                  <div key={file.id} className="bg-background p-3 flex items-center justify-between">
                    <div className="flex items-start space-x-3">
                      <div className={`p-2 rounded-md bg-${getFileIcon(file.type)}-100 text-${getFileIcon(file.type)}-700`}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/>
                          <polyline points="14 2 14 8 20 8"/>
                        </svg>
                      </div>
                      <div>
                        <p className="text-sm font-medium">{file.name}</p>
                        <div className="flex space-x-2 text-xs text-muted-foreground">
                          <span>{formatFileSize(file.size)}</span>
                          <span>•</span>
                          <span>{formatDate(file.upload_date)}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex space-x-1">
                      <Button 
                        variant="ghost" 
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={() => handleViewFile(file)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={() => window.open(`/api/clients/${clientId}/files/${file.id}/download`, '_self')}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => handleDeleteFile(file)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-6 text-muted-foreground">
            Nenhum arquivo enviado para este cliente.
          </div>
        )}
      </CardContent>

      <AlertDialog open={!!fileToDelete} onOpenChange={(open) => !open && setFileToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o arquivo <strong>{fileToDelete?.name}</strong>?
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}