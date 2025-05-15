import { FC, useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, FileSpreadsheet, FileImage, File, Upload, Download, Plus, Trash2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface Attachment {
  id: string;
  name: string;
  size: string;
  type: string;
  downloadUrl: string;
}

interface FileAttachmentsProps {
  attachments?: Attachment[];
  entityId: number; // ID do cliente, projeto ou tarefa
  entityType: 'client' | 'project' | 'task'; // Tipo de entidade
  className?: string;
  onUploadSuccess?: (attachment: Attachment) => void;
  onDeleteSuccess?: (attachmentId: string) => void;
}

/**
 * Componente que permite fazer upload e download de anexos
 */
const FileAttachments: FC<FileAttachmentsProps> = ({
  attachments = [],
  entityId,
  entityType,
  className = "",
  onUploadSuccess,
  onDeleteSuccess
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Determinar o ícone baseado no tipo de arquivo
  const getFileIcon = (type: string) => {
    const iconClassName = "h-5 w-5";
    
    if (type.includes('excel') || type.includes('spreadsheet') || type.endsWith('.xlsx') || type.endsWith('.xls')) {
      return <FileSpreadsheet className={iconClassName} />;
    }
    
    if (type.includes('image') || type.includes('jpg') || type.includes('jpeg') || type.includes('png') || type.includes('gif')) {
      return <FileImage className={iconClassName} />;
    }
    
    if (type.includes('pdf')) {
      return <FileText className={iconClassName} />;
    }
    
    if (type.includes('document') || type.includes('doc') || type.includes('docx')) {
      return <FileText className={iconClassName} />;
    }
    
    return <File className={iconClassName} />;
  };

  // Determinar a cor de fundo baseada no tipo de arquivo
  const getFileColor = (type: string) => {
    if (type.includes('pdf') || type.endsWith('.pdf')) {
      return "bg-red-100";
    }
    if (type.includes('excel') || type.includes('spreadsheet') || type.endsWith('.xlsx') || type.endsWith('.xls')) {
      return "bg-green-100";
    }
    if (type.includes('word') || type.includes('document') || type.endsWith('.docx') || type.endsWith('.doc')) {
      return "bg-blue-100";
    }
    if (type.includes('presentation') || type.endsWith('.pptx') || type.endsWith('.ppt')) {
      return "bg-yellow-100";
    }
    
    return "bg-gray-100";
  };
  
  const getFileTextColor = (type: string) => {
    if (type.includes('pdf') || type.endsWith('.pdf')) {
      return "text-red-500";
    }
    if (type.includes('excel') || type.includes('spreadsheet') || type.endsWith('.xlsx') || type.endsWith('.xls')) {
      return "text-green-500";
    }
    if (type.includes('word') || type.includes('document') || type.endsWith('.docx') || type.endsWith('.doc')) {
      return "text-blue-500";
    }
    if (type.includes('presentation') || type.endsWith('.pptx') || type.endsWith('.ppt')) {
      return "text-yellow-500";
    }
    
    return "text-gray-500";
  };

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

    try {
      // Simular o upload do arquivo
      // Em uma implementação real, você enviaria o arquivo para o servidor
      // e receberia a URL de download
      setTimeout(() => {
        const newAttachment: Attachment = {
          id: `temp-${Date.now()}`,
          name: file.name,
          size: formatFileSize(file.size),
          type: file.type || getExtension(file.name),
          downloadUrl: '#' // Placeholder
        };

        // Notificar o componente pai sobre o upload bem-sucedido
        if (onUploadSuccess) {
          onUploadSuccess(newAttachment);
        }

        toast({
          title: "Arquivo enviado com sucesso",
          description: `O arquivo ${file.name} foi anexado com sucesso.`,
          variant: "success"
        });

        setIsUploading(false);
        
        // Limpar o input de arquivo para permitir selecionar o mesmo arquivo novamente
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }, 1500);
    } catch (error) {
      console.error('Erro ao fazer upload do arquivo:', error);
      toast({
        title: "Erro ao enviar arquivo",
        description: "Ocorreu um erro ao enviar o arquivo. Tente novamente.",
        variant: "destructive"
      });
      setIsUploading(false);
    }
  };

  // Função para download de arquivo
  const handleDownload = (attachment: Attachment) => {
    // Se o anexo tiver uma URL válida, abra em nova aba
    if (attachment.downloadUrl && attachment.downloadUrl !== '#') {
      window.open(attachment.downloadUrl, '_blank');
    } else {
      toast({
        title: "Download não disponível",
        description: "Este arquivo ainda não está disponível para download.",
        variant: "default"
      });
    }
  };

  // Função para excluir um anexo
  const handleDelete = async (attachment: Attachment) => {
    try {
      // Simular a exclusão do arquivo
      // Em uma implementação real, você enviaria uma requisição para excluir o arquivo no servidor
      setTimeout(() => {
        // Notificar o componente pai sobre a exclusão bem-sucedida
        if (onDeleteSuccess) {
          onDeleteSuccess(attachment.id);
        }

        toast({
          title: "Arquivo excluído",
          description: `O arquivo ${attachment.name} foi excluído com sucesso.`,
          variant: "default"
        });
      }, 500);
    } catch (error) {
      console.error('Erro ao excluir o arquivo:', error);
      toast({
        title: "Erro ao excluir arquivo",
        description: "Ocorreu um erro ao excluir o arquivo. Tente novamente.",
        variant: "destructive"
      });
    }
  };

  // Formatação do tamanho do arquivo
  const formatFileSize = (sizeInBytes: number): string => {
    if (sizeInBytes < 1024) {
      return `${sizeInBytes} B`;
    } else if (sizeInBytes < 1024 * 1024) {
      return `${Math.round(sizeInBytes / 1024)} KB`;
    } else {
      return `${Math.round(sizeInBytes / (1024 * 1024) * 10) / 10} MB`;
    }
  };

  // Obter a extensão de um arquivo a partir do nome
  const getExtension = (filename: string): string => {
    return filename.slice((filename.lastIndexOf(".") - 1 >>> 0) + 2);
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
        {attachments.length > 0 ? (
          attachments.map((attachment) => (
            <div key={attachment.id} className="flex items-center justify-between py-1.5">
              <div className="flex items-center flex-1 min-w-0">
                <div className={`${getFileColor(attachment.type)} ${getFileTextColor(attachment.type)} p-1.5 rounded mr-3 flex-shrink-0`}>
                  {getFileIcon(attachment.type)}
                </div>
                <div className="min-w-0">
                  <p className="font-medium text-sm truncate">{attachment.name}</p>
                  <p className="text-xs text-gray-500">{attachment.size}</p>
                </div>
              </div>
              <div className="flex items-center space-x-1 ml-2">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => handleDownload(attachment)}
                  className="h-8 w-8 hover:bg-gray-100"
                >
                  <Download className="h-4 w-4" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => handleDelete(attachment)}
                  className="h-8 w-8 hover:bg-red-100 hover:text-red-500"
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
    </Card>
  );
};

export default FileAttachments;