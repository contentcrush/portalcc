import React, { useState } from 'react';
import { Trash2, RotateCcw, Search, Clock, X, AlertTriangle, FileIcon, FileText, FileImage, FileSpreadsheet, FileArchive, FileAudio, FileVideo } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from '@/hooks/use-toast';
import { formatFileSize, cn } from '@/lib/utils';

// Tipo para os arquivos excluídos recentemente
interface DeletedFile {
  id: number | string;
  name: string;
  type: string;
  size: number;
  deletedAt: string;
  entityType: 'client' | 'project' | 'task';
  entityId: number | string;
  entityName: string;
  path: string;
  thumbnailUrl?: string;
}

interface FileTrashBinProps {
  open: boolean;
  onClose: () => void;
  deletedFiles: DeletedFile[];
  onRestore: (fileIds: (number | string)[]) => Promise<void>;
  onDeletePermanently: (fileIds: (number | string)[]) => Promise<void>;
  isLoading?: boolean;
}

// Função utilitária para obter o ícone apropriado com base no tipo de arquivo
const getFileIcon = (fileType: string) => {
  if (fileType.startsWith('image/')) {
    return <FileImage className="h-5 w-5 text-blue-500" />;
  } else if (fileType === 'application/pdf') {
    return <FileText className="h-5 w-5 text-red-500" />;
  } else if (
    fileType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
    fileType === 'application/vnd.ms-excel' ||
    fileType === 'text/csv'
  ) {
    return <FileSpreadsheet className="h-5 w-5 text-green-500" />;
  } else if (
    fileType === 'application/zip' ||
    fileType === 'application/x-zip-compressed' ||
    fileType === 'application/x-rar-compressed'
  ) {
    return <FileArchive className="h-5 w-5 text-orange-500" />;
  } else if (fileType.startsWith('audio/')) {
    return <FileAudio className="h-5 w-5 text-purple-500" />;
  } else if (fileType.startsWith('video/')) {
    return <FileVideo className="h-5 w-5 text-pink-500" />;
  } else {
    return <FileIcon className="h-5 w-5 text-gray-500" />;
  }
};

const FileTrashBin: React.FC<FileTrashBinProps> = ({
  open,
  onClose,
  deletedFiles,
  onRestore,
  onDeletePermanently,
  isLoading = false,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<Set<number | string>>(new Set());
  const [sortBy, setSortBy] = useState<'date' | 'name' | 'size'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  
  // Função para filtrar os arquivos com base no termo de busca
  const filteredFiles = deletedFiles.filter(file => 
    file.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    file.entityName.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  // Função para ordenar os arquivos
  const sortedFiles = [...filteredFiles].sort((a, b) => {
    if (sortBy === 'date') {
      const dateA = new Date(a.deletedAt).getTime();
      const dateB = new Date(b.deletedAt).getTime();
      return sortOrder === 'asc' ? dateA - dateB : dateB - dateA;
    } else if (sortBy === 'name') {
      return sortOrder === 'asc' 
        ? a.name.localeCompare(b.name) 
        : b.name.localeCompare(a.name);
    } else if (sortBy === 'size') {
      return sortOrder === 'asc' ? a.size - b.size : b.size - a.size;
    }
    return 0;
  });
  
  // Verificar se todos os arquivos estão selecionados
  const isAllSelected = sortedFiles.length > 0 && selectedFiles.size === sortedFiles.length;
  
  // Função para lidar com a seleção/desseleção de todos os arquivos
  const handleSelectAll = (selected: boolean) => {
    if (selected) {
      const newSelected = new Set<number | string>();
      sortedFiles.forEach(file => newSelected.add(file.id));
      setSelectedFiles(newSelected);
    } else {
      setSelectedFiles(new Set());
    }
  };
  
  // Função para lidar com a seleção/desseleção de um arquivo específico
  const handleSelectFile = (fileId: number | string, selected: boolean) => {
    const newSelected = new Set(selectedFiles);
    if (selected) {
      newSelected.add(fileId);
    } else {
      newSelected.delete(fileId);
    }
    setSelectedFiles(newSelected);
  };
  
  // Função para restaurar os arquivos selecionados
  const handleRestore = async () => {
    if (selectedFiles.size === 0) {
      toast({
        title: "Nenhum arquivo selecionado",
        description: "Selecione pelo menos um arquivo para restaurar",
        variant: "destructive",
      });
      return;
    }
    
    try {
      await onRestore(Array.from(selectedFiles));
      
      toast({
        title: "Arquivos restaurados",
        description: `${selectedFiles.size} ${selectedFiles.size === 1 ? 'arquivo foi' : 'arquivos foram'} restaurados com sucesso`,
      });
      
      setSelectedFiles(new Set());
    } catch (error) {
      console.error('Erro ao restaurar arquivos:', error);
      toast({
        title: "Erro ao restaurar arquivos",
        description: "Ocorreu um erro ao tentar restaurar os arquivos selecionados",
        variant: "destructive",
      });
    }
  };
  
  // Função para excluir permanentemente os arquivos selecionados
  const handleDeletePermanently = async () => {
    if (selectedFiles.size === 0) {
      toast({
        title: "Nenhum arquivo selecionado",
        description: "Selecione pelo menos um arquivo para excluir permanentemente",
        variant: "destructive",
      });
      return;
    }
    
    setConfirmDeleteOpen(true);
  };
  
  // Função para confirmar a exclusão permanente
  const confirmDelete = async () => {
    try {
      await onDeletePermanently(Array.from(selectedFiles));
      
      toast({
        title: "Arquivos excluídos permanentemente",
        description: `${selectedFiles.size} ${selectedFiles.size === 1 ? 'arquivo foi' : 'arquivos foram'} excluídos permanentemente`,
      });
      
      setSelectedFiles(new Set());
      setConfirmDeleteOpen(false);
    } catch (error) {
      console.error('Erro ao excluir arquivos permanentemente:', error);
      toast({
        title: "Erro ao excluir arquivos",
        description: "Ocorreu um erro ao tentar excluir permanentemente os arquivos selecionados",
        variant: "destructive",
      });
      setConfirmDeleteOpen(false);
    }
  };
  
  // Função para cancelar a exclusão permanente
  const cancelDelete = () => {
    setConfirmDeleteOpen(false);
  };
  
  // Alternar a ordem de classificação para o campo atual
  const toggleSortOrder = (field: 'date' | 'name' | 'size') => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc'); // Default to descending when changing fields
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="sm:max-w-[900px] max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Trash2 className="h-5 w-5" />
              Lixeira
            </DialogTitle>
            <DialogDescription>
              Arquivos excluídos recentemente. Você pode restaurá-los ou excluí-los permanentemente.
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex items-center justify-between mb-4">
            <div className="relative w-72">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar arquivos excluídos..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
            
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => toggleSortOrder('name')}
                className={cn(
                  "text-xs",
                  sortBy === 'name' && "bg-accent"
                )}
              >
                Nome {sortBy === 'name' && (sortOrder === 'asc' ? '↑' : '↓')}
              </Button>
              
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => toggleSortOrder('date')}
                className={cn(
                  "text-xs",
                  sortBy === 'date' && "bg-accent"
                )}
              >
                Data {sortBy === 'date' && (sortOrder === 'asc' ? '↑' : '↓')}
              </Button>
              
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => toggleSortOrder('size')}
                className={cn(
                  "text-xs",
                  sortBy === 'size' && "bg-accent"
                )}
              >
                Tamanho {sortBy === 'size' && (sortOrder === 'asc' ? '↑' : '↓')}
              </Button>
            </div>
          </div>
          
          <div className="flex-grow overflow-auto">
            <ScrollArea className="h-[calc(80vh-200px)]">
              {sortedFiles.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-40 text-center p-4">
                  <Trash2 className="h-12 w-12 text-muted-foreground mb-2" />
                  <h3 className="text-lg font-medium">Lixeira vazia</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    {searchTerm 
                      ? "Nenhum arquivo excluído corresponde à sua pesquisa" 
                      : "Não há arquivos na lixeira"}
                  </p>
                </div>
              ) : (
                <div>
                  <div className="flex items-center py-2 px-4 bg-muted/40 rounded-t-md">
                    <div className="flex items-center gap-2 w-12">
                      <Checkbox 
                        checked={isAllSelected} 
                        onCheckedChange={handleSelectAll} 
                        id="select-all"
                      />
                      <Label htmlFor="select-all" className="sr-only">Selecionar todos</Label>
                    </div>
                    <div className="flex-grow">Nome</div>
                    <div className="w-32 text-sm">Excluído em</div>
                    <div className="w-24 text-sm">Tamanho</div>
                    <div className="w-40 text-sm">Vinculado a</div>
                    <div className="w-24">Ações</div>
                  </div>
                  
                  {sortedFiles.map((file) => (
                    <div 
                      key={file.id} 
                      className="flex items-center py-2 px-4 hover:bg-muted/20 border-b last:border-b-0"
                    >
                      <div className="flex items-center gap-2 w-12">
                        <Checkbox 
                          checked={selectedFiles.has(file.id)} 
                          onCheckedChange={(checked) => handleSelectFile(file.id, !!checked)} 
                          id={`file-${file.id}`}
                        />
                        <Label htmlFor={`file-${file.id}`} className="sr-only">{file.name}</Label>
                      </div>
                      
                      <div className="flex items-center gap-2 flex-grow overflow-hidden">
                        {getFileIcon(file.type)}
                        <span className="truncate">{file.name}</span>
                      </div>
                      
                      <div className="w-32 text-sm text-muted-foreground">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                <span>
                                  {format(new Date(file.deletedAt), 'dd/MM/yy', { locale: ptBR })}
                                </span>
                              </div>
                            </TooltipTrigger>
                            <TooltipContent>
                              {format(new Date(file.deletedAt), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                      
                      <div className="w-24 text-sm text-muted-foreground">
                        {formatFileSize(file.size)}
                      </div>
                      
                      <div className="w-40 flex items-center">
                        <Badge variant="outline" className="truncate">
                          {file.entityType === 'client' ? 'Cliente' : 
                           file.entityType === 'project' ? 'Projeto' : 'Tarefa'}: {file.entityName}
                        </Badge>
                      </div>
                      
                      <div className="w-24 flex items-center justify-end gap-1">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-8 w-8" 
                                onClick={() => handleSelectFile(file.id, true) && handleRestore()}
                              >
                                <RotateCcw className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Restaurar</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                        
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10" 
                                onClick={() => handleSelectFile(file.id, true) && setConfirmDeleteOpen(true)}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Excluir permanentemente</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>
          
          <DialogFooter className="gap-2 sm:gap-0">
            <div className="text-sm text-muted-foreground">
              {selectedFiles.size > 0 ? (
                <span>{selectedFiles.size} {selectedFiles.size === 1 ? 'arquivo selecionado' : 'arquivos selecionados'}</span>
              ) : (
                <span>{sortedFiles.length} {sortedFiles.length === 1 ? 'arquivo' : 'arquivos'} na lixeira</span>
              )}
            </div>
            
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={onClose}
                disabled={isLoading}
              >
                Fechar
              </Button>
              
              {selectedFiles.size > 0 && (
                <>
                  <Button
                    variant="default"
                    onClick={handleRestore}
                    disabled={isLoading}
                    className="gap-1"
                  >
                    <RotateCcw className="h-4 w-4" />
                    Restaurar selecionados
                  </Button>
                  
                  <Button
                    variant="destructive"
                    onClick={handleDeletePermanently}
                    disabled={isLoading}
                    className="gap-1"
                  >
                    <Trash2 className="h-4 w-4" />
                    Excluir permanentemente
                  </Button>
                </>
              )}
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <AlertDialog open={confirmDeleteOpen} onOpenChange={setConfirmDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Confirmação de exclusão permanente
            </AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Isso excluirá permanentemente 
              {' '}{selectedFiles.size}{' '}
              {selectedFiles.size === 1 ? 'arquivo selecionado' : 'arquivos selecionados'}
              {' '}da lixeira.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={cancelDelete} disabled={isLoading}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDelete} 
              disabled={isLoading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isLoading ? "Excluindo..." : "Sim, excluir permanentemente"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default FileTrashBin;