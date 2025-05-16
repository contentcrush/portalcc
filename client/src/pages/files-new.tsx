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
} from "lucide-react";
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
            
            <DialogFooter>
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

// Função auxiliar para obter ícone de arquivo
function getFileIcon(fileType: string) {
  if (fileType.startsWith('image/')) return <FileImage className="h-5 w-5 text-blue-500" />;
  if (fileType.includes('pdf') || fileType.includes('text')) return <FileText className="h-5 w-5 text-red-500" />;
  if (fileType.includes('spreadsheet') || fileType.includes('excel')) return <FileSpreadsheet className="h-5 w-5 text-green-500" />;
  if (fileType.includes('zip') || fileType.includes('compressed')) return <FileArchive className="h-5 w-5 text-purple-500" />;
  if (fileType.startsWith('audio/')) return <FileAudio className="h-5 w-5 text-yellow-500" />;
  if (fileType.startsWith('video/')) return <FileVideo className="h-5 w-5 text-pink-500" />;
  return <FileIcon className="h-5 w-5 text-gray-500" />;
}