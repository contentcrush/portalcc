import { FC, useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, FileSpreadsheet, FileImage, File, Upload, Download, Plus, Trash2, FileArchive, FileAudio, FileVideo, Eye } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { formatFileSize } from '@/lib/utils';
import FilePreview from '@/components/FilePreview';
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

// Interface para anexos que vem da API
export interface ApiAttachment {
  id: number;
  file_name: string;
  file_size: number;
  file_type: string;
  file_url: string;
  description?: string | null;
  tags?: string[] | null;
  created_at?: string;
  updated_at?: string;
  uploaded_by?: number | null;
  // Campos específicos do tipo de anexo
  client_id?: number;
  project_id?: number;
  task_id?: number;
}

export interface FileAttachmentsProps {
  entityId: number; // ID do cliente, projeto ou tarefa
  entityType: 'client' | 'project' | 'task'; // Tipo de entidade
  className?: string;
  onUploadSuccess?: (attachment: ApiAttachment) => void;
  onDeleteSuccess?: (attachmentId: number) => void;
  autoFetch?: boolean; // Se verdadeiro, busca anexos automaticamente
  initialAttachments?: ApiAttachment[]; // Anexos iniciais, se disponíveis
}

/**
 * Componente que permite fazer upload e download de anexos conectado com a API
 */
export const FileAttachments: FC<FileAttachmentsProps> = ({
  entityId,
  entityType,
  className = "",
  onUploadSuccess,
  onDeleteSuccess,
  autoFetch = true,
  initialAttachments
}) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isUploading, setIsUploading] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<ApiAttachment | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [attachmentToDelete, setAttachmentToDelete] = useState<ApiAttachment | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Construa a chave de consulta baseada no tipo de entidade e ID
  const queryKey = [`/api/attachments/${entityType}s/${entityId}`];
  
  // Buscar anexos da API
  const { data: attachments, isLoading } = useQuery<ApiAttachment[]>({
    queryKey,
    enabled: autoFetch && !!entityId,
    initialData: initialAttachments,
  });

  // Mutation para upload de arquivos
  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await fetch(`/api/attachments/${entityType}s/${entityId}/upload`, {
        method: 'POST',
        body: formData,
        credentials: 'include'
      });
      
      if (!response.ok) {
        // Verificar se a resposta é JSON antes de tentar parsear
        const contentType = response.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Erro ao fazer upload do arquivo');
        } else {
          const textError = await response.text();
          console.error("Erro de resposta não-JSON:", textError);
          throw new Error("Erro no servidor ao processar arquivo. Tente novamente.");
        }
      }
      
      return await response.json();
    },
    onSuccess: (data) => {
      // Atualizar o cache de consulta para incluir o novo anexo
      queryClient.invalidateQueries({ queryKey });
      
      // Notificar o componente pai sobre o upload bem-sucedido
      if (onUploadSuccess) {
        onUploadSuccess(data);
      }
      
      toast({
        title: "Arquivo enviado com sucesso",
        description: `O arquivo ${data.file_name} foi anexado com sucesso.`,
        variant: "default",
        className: "bg-green-100 border-green-400 text-green-900",
      });
    },
    onError: (error: Error) => {
      console.error('Erro ao fazer upload do arquivo:', error);
      toast({
        title: "Erro ao enviar arquivo",
        description: error.message || "Ocorreu um erro ao enviar o arquivo. Tente novamente.",
        variant: "destructive"
      });
    },
    onSettled: () => {
      setIsUploading(false);
      
      // Limpar o input de arquivo para permitir selecionar o mesmo arquivo novamente
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  });
  
  // Mutation para excluir anexos
  const deleteMutation = useMutation({
    mutationFn: async (attachmentId: number) => {
      const response = await apiRequest('DELETE', `/api/attachments/${entityType}s/${entityId}/${attachmentId}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Erro ao excluir anexo');
      }
      
      return attachmentId;
    },
    onSuccess: (attachmentId) => {
      // Atualizar o cache de consulta para remover o anexo
      queryClient.invalidateQueries({ queryKey });
      
      // Notificar o componente pai sobre a exclusão bem-sucedida
      if (onDeleteSuccess) {
        onDeleteSuccess(attachmentId);
      }
      
      toast({
        title: "Arquivo excluído",
        description: "O arquivo foi excluído com sucesso.",
        variant: "default",
        className: "bg-green-100 border-green-400 text-green-900",
      });
    },
    onError: (error: Error) => {
      console.error('Erro ao excluir o arquivo:', error);
      toast({
        title: "Erro ao excluir arquivo",
        description: error.message || "Ocorreu um erro ao excluir o arquivo. Tente novamente.",
        variant: "destructive"
      });
    }
  });

  // Função para iniciar o processo de upload
  const handleUploadClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  // Função para processar o arquivo selecionado
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    uploadMutation.mutate(file);
  };

  // Função para download de arquivo
  const handleDownload = (e: React.MouseEvent, attachment: ApiAttachment) => {
    e.stopPropagation();
    const downloadUrl = `/api/attachments/${entityType}s/${entityId}/download/${attachment.id}`;
    
    // Criar um link temporário para download
    const a = document.createElement('a');
    a.href = downloadUrl;
    a.download = attachment.file_name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // Função para abrir a visualização do arquivo
  const handlePreview = (attachment: ApiAttachment) => {
    setSelectedFile(attachment);
    setPreviewOpen(true);
  };

  // Função para iniciar o processo de exclusão
  const handleDelete = (e: React.MouseEvent, attachment: ApiAttachment) => {
    e.stopPropagation();
    setAttachmentToDelete(attachment);
    setDeleteDialogOpen(true);
  };
  
  // Função para confirmar a exclusão do anexo
  const confirmDelete = () => {
    if (attachmentToDelete) {
      deleteMutation.mutate(attachmentToDelete.id);
      setDeleteDialogOpen(false);
      setAttachmentToDelete(null);
    }
  };

  // Determinar o ícone baseado no tipo de arquivo
  const getFileIcon = (type: string) => {
    const iconClassName = "h-5 w-5";
    
    if (type.startsWith('image/')) {
      return <FileImage className={iconClassName} />;
    }
    
    if (type.includes('pdf')) {
      return <FileText className={iconClassName} />;
    }
    
    if (type.includes('spreadsheet') || type.includes('excel') || type.includes('csv')) {
      return <FileSpreadsheet className={iconClassName} />;
    }
    
    if (type.includes('document') || type.includes('word') || type.includes('text/')) {
      return <FileText className={iconClassName} />;
    }
    
    if (type.includes('zip') || type.includes('compressed') || type.includes('archive')) {
      return <FileArchive className={iconClassName} />;
    }
    
    if (type.startsWith('audio/')) {
      return <FileAudio className={iconClassName} />;
    }
    
    if (type.startsWith('video/')) {
      return <FileVideo className={iconClassName} />;
    }
    
    return <File className={iconClassName} />;
  };

  // Determinar a cor de fundo baseada no tipo de arquivo
  const getFileColor = (type: string) => {
    if (type.includes('pdf')) {
      return "bg-red-100";
    }
    
    if (type.includes('spreadsheet') || type.includes('excel') || type.includes('csv')) {
      return "bg-green-100";
    }
    
    if (type.includes('document') || type.includes('word') || type.includes('text/')) {
      return "bg-blue-100";
    }
    
    if (type.includes('presentation') || type.includes('powerpoint')) {
      return "bg-yellow-100";
    }
    
    if (type.startsWith('image/')) {
      return "bg-purple-100";
    }
    
    if (type.includes('zip') || type.includes('compressed') || type.includes('archive')) {
      return "bg-orange-100";
    }
    
    if (type.startsWith('audio/')) {
      return "bg-pink-100";
    }
    
    if (type.startsWith('video/')) {
      return "bg-indigo-100";
    }
    
    return "bg-gray-100";
  };
  
  // Determinar a cor do texto baseada no tipo de arquivo
  const getFileTextColor = (type: string) => {
    if (type.includes('pdf')) {
      return "text-red-500";
    }
    
    if (type.includes('spreadsheet') || type.includes('excel') || type.includes('csv')) {
      return "text-green-500";
    }
    
    if (type.includes('document') || type.includes('word') || type.includes('text/')) {
      return "text-blue-500";
    }
    
    if (type.includes('presentation') || type.includes('powerpoint')) {
      return "text-yellow-500";
    }
    
    if (type.startsWith('image/')) {
      return "text-purple-500";
    }
    
    if (type.includes('zip') || type.includes('compressed') || type.includes('archive')) {
      return "text-orange-500";
    }
    
    if (type.startsWith('audio/')) {
      return "text-pink-500";
    }
    
    if (type.startsWith('video/')) {
      return "text-indigo-500";
    }
    
    return "text-gray-500";
  };

  return (
    <Card className={className}>
      <CardHeader className="px-6 py-4">
        <div className="flex justify-between items-center">
          <CardTitle className="text-sm font-medium uppercase text-gray-500">ANEXOS</CardTitle>
          <Button 
            variant="outline" 
            size="sm" 
            className="h-8 text-xs flex items-center"
            onClick={handleUploadClick}
            disabled={isUploading}
          >
            {isUploading ? (
              <>
                <div className="animate-spin h-3 w-3 mr-2 border-2 border-gray-500 border-t-transparent rounded-full"></div>
                Enviando...
              </>
            ) : (
              <>
                <Plus className="h-3.5 w-3.5 mr-1" />
                Adicionar
              </>
            )}
          </Button>
          <input 
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            className="hidden"
          />
        </div>
      </CardHeader>
      
      <CardContent className="px-6 pb-4 pt-0 space-y-3">
        {isLoading ? (
          <div className="flex justify-center py-4">
            <div className="animate-spin h-5 w-5 border-2 border-gray-500 border-t-transparent rounded-full"></div>
          </div>
        ) : attachments && attachments.length > 0 ? (
          attachments.map((attachment) => (
            <div 
              key={attachment.id} 
              className="flex items-center justify-between py-1.5 hover:bg-gray-50 rounded-md px-2 cursor-pointer" 
              onClick={() => handlePreview(attachment)}
            >
              <div className="flex items-center flex-1 min-w-0">
                <div className={`${getFileColor(attachment.file_type)} ${getFileTextColor(attachment.file_type)} p-1.5 rounded mr-3 flex-shrink-0`}>
                  {getFileIcon(attachment.file_type)}
                </div>
                <div className="min-w-0">
                  <p className="font-medium text-sm truncate">{attachment.file_name}</p>
                  <p className="text-xs text-gray-500">{formatFileSize(attachment.file_size)}</p>
                </div>
              </div>
              <div className="flex items-center space-x-1 ml-2">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={(e) => {
                    e.stopPropagation();
                    handlePreview(attachment);
                  }}
                  className="h-8 w-8 hover:bg-blue-100 hover:text-blue-500"
                  title="Visualizar"
                >
                  <Eye className="h-4 w-4" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={(e) => handleDownload(e, attachment)}
                  className="h-8 w-8 hover:bg-gray-100"
                  title="Baixar"
                >
                  <Download className="h-4 w-4" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={(e) => handleDelete(e, attachment)}
                  className="h-8 w-8 hover:bg-red-100 hover:text-red-500"
                  title="Excluir"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))
        ) : (
          <div className="flex flex-col items-center justify-center py-8 text-gray-500">
            <Upload className="h-12 w-12 mb-2 text-gray-300" />
            <p>Nenhum arquivo anexado</p>
            <p className="text-xs text-gray-400 mt-1">Adicione arquivos clicando no botão acima</p>
          </div>
        )}
      </CardContent>

      {/* Diálogo de confirmação para exclusão */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
            <AlertDialogDescription>
              {attachmentToDelete && `O arquivo "${attachmentToDelete.file_name}" será excluído permanentemente.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-red-500 hover:bg-red-600">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Componente de visualização de arquivo */}
      {selectedFile && (
        <FilePreview
          open={previewOpen}
          onOpenChange={setPreviewOpen}
          file={{
            id: selectedFile.id,
            name: selectedFile.file_name,
            type: selectedFile.file_type,
            entity_id: entityId,
            uploaded_at: selectedFile.created_at || new Date().toISOString(),
          }}
          downloadUrl={`/api/attachments/${entityType}s/${entityId}/download/${selectedFile.id}`}
        />
      )}
    </Card>
  );
};

export default FileAttachments;