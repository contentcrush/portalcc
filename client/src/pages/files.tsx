import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { 
  FileIcon, 
  FolderUp,
  FileText, 
  FileImage, 
  FileSpreadsheet, 
  FileArchive, 
  FileAudio, 
  FileVideo,
  ExternalLink,
  Download
} from "lucide-react";
import { cn } from "@/lib/utils";
import FileManager from "@/components/FileManager";
import AdvancedFileUpload from "@/components/AdvancedFileUpload";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { formatFileSize } from "@/lib/utils";

// Interface para apresentar anexos de forma unificada
interface UnifiedAttachment {
  id: number;
  type: 'client' | 'project' | 'task';
  entity_id: number;
  entity_name?: string;
  file_name: string;
  file_size: number;
  file_type: string;
  file_url: string;
  uploaded_by: number | null;
  uploaded_at: string;
  description?: string | null;
  tags?: string[] | null;
  uploader?: any;
}

// Página principal de gerenciamento de arquivos
export default function FilesPage() {
  const { user } = useAuth();
  const [selectedFile, setSelectedFile] = useState<UnifiedAttachment | null>(null);
  const [showFileDetails, setShowFileDetails] = useState(false);

  const handleFileSelect = (file: UnifiedAttachment) => {
    setSelectedFile(file);
    setShowFileDetails(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-2">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Gerenciamento de Arquivos</h1>
          <p className="text-muted-foreground">
            Visualize, organize e gerencie todos os arquivos do sistema em um só lugar.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Dialog>
            <DialogTrigger asChild>
              <Button className="flex items-center gap-2">
                <FolderUp className="h-4 w-4" />
                Upload Rápido
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Upload Rápido</DialogTitle>
                <DialogDescription>
                  Envie um arquivo rapidamente para o sistema.
                </DialogDescription>
              </DialogHeader>
              <div className="py-4">
                <AdvancedFileUpload
                  buttonText="Selecionar Arquivo"
                  buttonClassName="w-full"
                  buttonVariant="outline"
                />
              </div>
              <DialogFooter className="sm:justify-start">
                <DialogDescription className="text-xs text-muted-foreground">
                  Você também pode usar o Upload Avançado para adicionar tags e descrições detalhadas.
                </DialogDescription>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Gerenciador de arquivos avançado */}
      <FileManager 
        showTabs={true}
        showFilters={true}
        showSearch={true}
        showPagination={true}
        showViewToggle={true}
        pageSize={12}
        onSelectFile={handleFileSelect}
      />

      {/* Dialog para detalhes do arquivo selecionado */}
      {selectedFile && (
        <Dialog open={showFileDetails} onOpenChange={setShowFileDetails}>
          <DialogContent className="sm:max-w-[550px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-3">
                {getFileIcon(selectedFile.file_type)}
                <span className="truncate">{selectedFile.file_name}</span>
              </DialogTitle>
              <DialogDescription>
                {selectedFile.type === 'client' ? 'Cliente' : selectedFile.type === 'project' ? 'Projeto' : 'Tarefa'}: {selectedFile.entity_name}
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="text-sm font-medium mb-1">Tipo de Arquivo</h4>
                  <p className="text-sm text-muted-foreground">{selectedFile.file_type}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium mb-1">Tamanho</h4>
                  <p className="text-sm text-muted-foreground">{formatFileSize(selectedFile.file_size)}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium mb-1">Data de Upload</h4>
                  <p className="text-sm text-muted-foreground">
                    {new Date(selectedFile.uploaded_at).toLocaleDateString('pt-BR')}
                  </p>
                </div>
                <div>
                  <h4 className="text-sm font-medium mb-1">Enviado por</h4>
                  <p className="text-sm text-muted-foreground">
                    {selectedFile.uploader?.name || 'Usuário desconhecido'}
                  </p>
                </div>
              </div>
              
              {selectedFile.description && (
                <div>
                  <h4 className="text-sm font-medium mb-1">Descrição</h4>
                  <p className="text-sm text-muted-foreground">{selectedFile.description}</p>
                </div>
              )}
              
              {selectedFile.tags && selectedFile.tags.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium mb-1">Tags</h4>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {selectedFile.tags.map((tag, index) => (
                      <Badge key={index} variant="secondary" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
            
            {/* Visualização prévia do arquivo */}
            <div className="mt-4 border rounded-md p-2">
              <h4 className="text-sm font-medium mb-2">Visualização do arquivo</h4>
              <FilePreview file={selectedFile} />
            </div>
            
            <DialogFooter className="mt-4">
              <Button
                variant="outline"
                onClick={() => {
                  const url = `/api/attachments/${selectedFile.type}s/${selectedFile.entity_id}/download/${selectedFile.id}`;
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = selectedFile.file_name;
                  document.body.appendChild(a);
                  a.click();
                  document.body.removeChild(a);
                }}
              >
                Download
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

// Componente de visualização de arquivos
interface FilePreviewProps {
  file: UnifiedAttachment;
}

function FilePreview({ file }: FilePreviewProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const fileUrl = `/api/attachments/${file.type}s/${file.entity_id}/download/${file.id}`;

  const isImage = file.file_type.startsWith('image/');
  const isPdf = file.file_type.includes('pdf');
  const isAudio = file.file_type.startsWith('audio/');
  const isVideo = file.file_type.startsWith('video/');
  const isText = file.file_type.includes('text') || file.file_type.includes('document');

  const handleImageLoad = () => {
    setLoading(false);
  };

  const handleImageError = () => {
    setLoading(false);
    setError('Não foi possível carregar a imagem');
  };

  return (
    <div className="w-full">
      {/* Visualizadores específicos por tipo */}
      {isImage && (
        <div className={cn("relative flex justify-center", loading ? "min-h-[200px]" : "")}>
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          )}
          <img 
            src={fileUrl} 
            alt={file.file_name} 
            className="max-w-full max-h-[300px] object-contain rounded-md"
            onLoad={handleImageLoad}
            onError={handleImageError}
          />
        </div>
      )}

      {isPdf && (
        <div className="flex flex-col items-center justify-center p-4 bg-muted rounded-md">
          <FileText className="h-12 w-12 text-red-500 mb-2" />
          <p className="text-sm text-center mb-2">Visualização de PDF incorporada não disponível</p>
          <Button variant="outline" size="sm" asChild>
            <a href={fileUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1">
              <ExternalLink className="h-4 w-4" />
              Abrir PDF
            </a>
          </Button>
        </div>
      )}

      {isAudio && (
        <div className="w-full">
          <audio controls className="w-full" src={fileUrl}>
            Seu navegador não suporta o elemento de áudio.
          </audio>
        </div>
      )}

      {isVideo && (
        <div className="w-full">
          <video 
            controls 
            className="w-full max-h-[300px] rounded-md" 
            src={fileUrl}
          >
            Seu navegador não suporta o elemento de vídeo.
          </video>
        </div>
      )}

      {!isImage && !isPdf && !isAudio && !isVideo && (
        <div className="flex flex-col items-center justify-center p-6 bg-muted rounded-md">
          {getFileIcon(file.file_type, "h-12 w-12 mb-2")}
          <p className="text-sm text-center">Visualização não disponível para este tipo de arquivo</p>
          <p className="text-xs text-muted-foreground mb-3">Clique em download para baixar o arquivo</p>
        </div>
      )}

      {error && (
        <div className="p-4 bg-destructive/10 text-destructive text-sm rounded-md mt-2">
          {error}
        </div>
      )}
    </div>
  );
}

// Função auxiliar para obter ícone de arquivo
function getFileIcon(fileType: string, className = "h-5 w-5") {
  if (fileType.startsWith('image/')) return <FileImage className={cn(className, "text-blue-500")} />;
  if (fileType.includes('pdf') || fileType.includes('text')) return <FileText className={cn(className, "text-red-500")} />;
  if (fileType.includes('spreadsheet') || fileType.includes('excel')) return <FileSpreadsheet className={cn(className, "text-green-500")} />;
  if (fileType.includes('zip') || fileType.includes('compressed')) return <FileArchive className={cn(className, "text-purple-500")} />;
  if (fileType.startsWith('audio/')) return <FileAudio className={cn(className, "text-yellow-500")} />;
  if (fileType.startsWith('video/')) return <FileVideo className={cn(className, "text-pink-500")} />;
  return <FileIcon className={cn(className, "text-gray-500")} />;
}