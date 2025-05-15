import { useState, useRef, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format, parseISO, isSameMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { ClientAttachment, ProjectAttachment, TaskAttachment } from "@shared/schema";
import { 
  Download as DownloadIcon, 
  Filter, 
  FileIcon, 
  Trash2, 
  FileText, 
  FileImage, 
  FileSpreadsheet, 
  FileArchive, 
  FileAudio, 
  FileVideo,
  Loader2,
  Upload,
  ChevronRight,
  Calendar,
  Grid,
  List,
  Search,
  Eye,
  Copy,
  Eye as ViewIcon,
  Info,
  CheckSquare,
  Square,
  MoreHorizontal,
  ChevronDown,
  Clock,
  User,
  HardDrive,
  Filter as FilterIcon,
  X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
  DrawerClose,
} from "@/components/ui/drawer";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { formatFileSize, cn } from "@/lib/utils";

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
  thumbnailUrl?: string;
  color?: string;
  origin_id?: string;
}

// Props para o componente FilesList
interface FilesListProps {
  attachments: UnifiedAttachment[];
  isLoading: boolean;
  onDownload: (attachment: UnifiedAttachment) => void;
  onDelete: (attachment: UnifiedAttachment) => void;
  getFileIcon: (fileType: string) => JSX.Element;
  view: 'grid' | 'list';
  selectedFiles: number[];
  onSelect: (id: number, selected: boolean) => void;
}

// Componente para exibição de um arquivo em formato de cartão (visualização em grade)
const FileCard = ({ 
  attachment, 
  isSelected, 
  onSelect, 
  onDownload, 
  onDelete, 
  onView, 
  getFileIcon 
}: { 
  attachment: UnifiedAttachment, 
  isSelected: boolean, 
  onSelect: (id: number, selected: boolean) => void, 
  onDownload: (attachment: UnifiedAttachment) => void, 
  onDelete: (attachment: UnifiedAttachment) => void, 
  onView: (attachment: UnifiedAttachment) => void,
  getFileIcon: (fileType: string) => JSX.Element 
}) => {
  const isImage = attachment.file_type.startsWith('image/');
  const typeColor = getTypeColor(attachment.file_type);
  
  return (
    <Card className={cn(
      "overflow-hidden transition-all group hover:shadow-md border-l-4",
      `border-l-${typeColor}-500`,
      isSelected ? "ring-2 ring-primary ring-offset-2" : ""
    )}>
      <div className="relative">
        {/* Thumbnail ou ícone */}
        <div className={cn(
          "w-full aspect-square flex items-center justify-center",
          `bg-${typeColor}-50`
        )}>
          {isImage && attachment.thumbnailUrl ? (
            <img 
              src={attachment.thumbnailUrl} 
              alt={attachment.file_name}
              className="object-cover w-full h-full"
            />
          ) : (
            <div className="flex items-center justify-center w-full h-full">
              {getFileIcon(attachment.file_type)}
            </div>
          )}
        </div>
        
        {/* Checkbox para seleção */}
        <div className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <Checkbox 
            checked={isSelected}
            onCheckedChange={(checked) => onSelect(attachment.id, !!checked)}
            className="h-5 w-5 bg-white/80"
          />
        </div>
        
        {/* Ações rápidas */}
        <div className="absolute bottom-0 right-0 p-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8 bg-black/20 text-white hover:bg-black/40 rounded-full"
                  onClick={() => onView(attachment)}
                >
                  <Eye className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Visualizar</TooltipContent>
            </Tooltip>
          </TooltipProvider>
          
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8 bg-black/20 text-white hover:bg-black/40 rounded-full"
                  onClick={() => onDownload(attachment)}
                >
                  <DownloadIcon className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Download</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>
      
      <CardHeader className="p-3 pb-2">
        <div className="flex flex-col">
          <CardTitle className="text-sm font-medium truncate" title={attachment.file_name}>
            {attachment.file_name}
          </CardTitle>
          <CardDescription className="text-xs truncate">
            {formatFileSize(attachment.file_size)}
          </CardDescription>
        </div>
      </CardHeader>
      
      <CardFooter className="p-3 pt-0 flex items-center justify-between">
        <div className="flex items-center gap-1">
          <Badge 
            variant="outline" 
            className={cn(
              "text-xs",
              `bg-${typeColor}-50 text-${typeColor}-700 border-${typeColor}-200`
            )}
          >
            {getDisplayType(attachment.type, attachment.file_type)}
          </Badge>
        </div>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onView(attachment)}>
              <ViewIcon className="mr-2 h-4 w-4" />
              <span>Visualizar</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onDownload(attachment)}>
              <DownloadIcon className="mr-2 h-4 w-4" />
              <span>Download</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => onDelete(attachment)} className="text-red-600">
              <Trash2 className="mr-2 h-4 w-4" />
              <span>Excluir</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </CardFooter>
    </Card>
  );
};

// Componente para exibição de um arquivo em formato de linha (visualização em lista)
const FileListItem = ({ 
  attachment, 
  isSelected, 
  onSelect, 
  onDownload, 
  onDelete, 
  onView, 
  getFileIcon 
}: { 
  attachment: UnifiedAttachment, 
  isSelected: boolean, 
  onSelect: (id: number, selected: boolean) => void, 
  onDownload: (attachment: UnifiedAttachment) => void, 
  onDelete: (attachment: UnifiedAttachment) => void, 
  onView: (attachment: UnifiedAttachment) => void,
  getFileIcon: (fileType: string) => JSX.Element 
}) => {
  const typeColor = getTypeColor(attachment.file_type);
  
  return (
    <div className={cn(
      "flex items-center p-2 hover:bg-gray-50 rounded-md group border-l-4",
      `border-l-${typeColor}-500`,
      isSelected ? "bg-primary/10" : ""
    )}>
      <div className="flex items-center flex-1 min-w-0">
        <Checkbox 
          checked={isSelected}
          onCheckedChange={(checked) => onSelect(attachment.id, !!checked)}
          className="mr-3"
        />
        
        <div className={cn(
          "flex items-center justify-center w-10 h-10 rounded",
          `bg-${typeColor}-50`
        )}>
          {getFileIcon(attachment.file_type)}
        </div>
        
        <div className="ml-3 flex-1 min-w-0">
          <p className="text-sm font-medium truncate" title={attachment.file_name}>
            {attachment.file_name}
          </p>
          <div className="flex items-center text-xs text-gray-500 mt-0.5">
            <Badge 
              variant="outline" 
              className={cn(
                "text-xs mr-2",
                `bg-${typeColor}-50 text-${typeColor}-700 border-${typeColor}-200`
              )}
            >
              {getDisplayType(attachment.type, attachment.file_type)}
            </Badge>
            <span className="truncate">{attachment.entity_name}</span>
          </div>
        </div>
      </div>
      
      <div className="flex items-center text-sm text-gray-500 mx-4 w-36">
        <span>{formatFileSize(attachment.file_size)}</span>
      </div>
      
      <div className="flex items-center text-sm text-gray-500 mx-4 w-48">
        <Calendar className="h-4 w-4 mr-1" />
        <span>{format(new Date(attachment.uploaded_at), 'dd/MM/yyyy', { locale: ptBR })}</span>
      </div>
      
      <div className="flex items-center gap-1">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8"
                onClick={() => onView(attachment)}
              >
                <Eye className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Visualizar</TooltipContent>
          </Tooltip>
        </TooltipProvider>
        
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8"
                onClick={() => onDownload(attachment)}
              >
                <DownloadIcon className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Download</TooltipContent>
          </Tooltip>
        </TooltipProvider>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onView(attachment)}>
              <ViewIcon className="mr-2 h-4 w-4" />
              <span>Visualizar</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onDownload(attachment)}>
              <DownloadIcon className="mr-2 h-4 w-4" />
              <span>Download</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => onDelete(attachment)} className="text-red-600">
              <Trash2 className="mr-2 h-4 w-4" />
              <span>Excluir</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
};

// Obtém a cor baseada no tipo de arquivo
const getTypeColor = (fileType: string): string => {
  if (fileType.startsWith('image/')) return 'blue';
  if (fileType.includes('pdf')) return 'red';
  if (fileType.includes('spreadsheet') || fileType.includes('excel')) return 'green';
  if (fileType.includes('zip') || fileType.includes('compressed')) return 'purple';
  if (fileType.startsWith('audio/')) return 'yellow';
  if (fileType.startsWith('video/')) return 'pink';
  if (fileType.includes('word') || fileType.includes('document')) return 'sky';
  return 'gray';
};

// Obtém um nome de exibição para o tipo de arquivo
const getDisplayType = (type: string, fileType: string): string => {
  if (fileType.startsWith('image/')) return 'Imagem';
  if (fileType.includes('pdf')) return 'PDF';
  if (fileType.includes('spreadsheet') || fileType.includes('excel')) return 'Planilha';
  if (fileType.includes('zip') || fileType.includes('compressed')) return 'Arquivo';
  if (fileType.startsWith('audio/')) return 'Áudio';
  if (fileType.startsWith('video/')) return 'Vídeo';
  if (fileType.includes('word') || fileType.includes('document')) return 'Documento';
  return type === 'client' ? 'Cliente' : type === 'project' ? 'Projeto' : 'Tarefa';
};

// Componente para exibir a lista de arquivos
const AttachmentsList = ({ 
  attachments, 
  isLoading, 
  onDownload, 
  onDelete, 
  getFileIcon,
  view = 'grid',
  selectedFiles = [],
  onSelect = () => {}
}: FilesListProps) => {
  // Função auxiliar para lidar com visualização
  const handleView = (attachment: UnifiedAttachment) => {
    // Como não foi fornecida a função onView diretamente, vamos simular
    // abrindo o arquivo em uma nova aba
    window.open(attachment.file_url, '_blank');
  };
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-40">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (attachments.length === 0) {
    return (
      <div className="text-center p-8 border rounded-lg bg-muted/20">
        <FileIcon className="h-10 w-10 mx-auto text-muted-foreground" />
        <h3 className="mt-4 text-lg font-medium">Nenhum arquivo encontrado</h3>
        <p className="text-sm text-muted-foreground">
          Nenhum arquivo corresponde aos filtros aplicados. Tente ajustar seus critérios de busca.
        </p>
      </div>
    );
  }

  // Agrupar anexos por mês para visualização em blocos
  const groupedAttachments = (() => {
    const groups: { [key: string]: UnifiedAttachment[] } = {};
    
    attachments.forEach(attachment => {
      const date = new Date(attachment.uploaded_at);
      const monthYear = format(date, 'MMMM yyyy', { locale: ptBR });
      
      if (!groups[monthYear]) {
        groups[monthYear] = [];
      }
      
      groups[monthYear].push(attachment);
    });
    
    // Ordenar os grupos por data (mais recente primeiro)
    return Object.entries(groups)
      .sort(([a], [b]) => {
        const dateA = new Date(a);
        const dateB = new Date(b);
        return dateB.getTime() - dateA.getTime();
      })
      .map(([month, files]) => ({
        month,
        files: files.sort((a, b) => new Date(b.uploaded_at).getTime() - new Date(a.uploaded_at).getTime())
      }));
  })();

  if (view === 'grid') {
    return (
      <div className="space-y-6">
        {groupedAttachments.map(group => (
          <div key={group.month} className="space-y-2">
            <h3 className="text-lg font-medium capitalize">{group.month}</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {group.files.map((attachment) => (
                <FileCard
                  key={`${attachment.type}-${attachment.id}`}
                  attachment={attachment}
                  isSelected={selectedFiles.includes(attachment.id)}
                  onSelect={onSelect}
                  onDownload={onDownload}
                  onDelete={onDelete}
                  onView={handleView}
                  getFileIcon={getFileIcon}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  } else {
    return (
      <div className="border rounded-lg overflow-hidden">
        <div className="bg-muted/20 py-2 px-3 border-b grid grid-cols-[auto_1fr_auto_auto] gap-4">
          <span className="w-10"></span>
          <span className="text-sm font-medium">Nome</span>
          <span className="text-sm font-medium w-36">Tamanho</span>
          <span className="text-sm font-medium w-48">Data de upload</span>
        </div>
        
        <ScrollArea className="h-[600px]">
          {groupedAttachments.map(group => (
            <div key={group.month}>
              <div className="bg-muted/10 py-1 px-3 border-b sticky top-0 z-10">
                <h3 className="text-sm font-medium capitalize">{group.month}</h3>
              </div>
              {group.files.map((attachment) => (
                <FileListItem
                  key={`${attachment.type}-${attachment.id}`}
                  attachment={attachment}
                  isSelected={selectedFiles.includes(attachment.id)}
                  onSelect={onSelect}
                  onDownload={onDownload}
                  onDelete={onDelete}
                  onView={handleView}
                  getFileIcon={getFileIcon}
                />
              ))}
            </div>
          ))}
        </ScrollArea>
      </div>
    );
  }
};

// Página principal de gerenciamento de arquivos
export default function FilesPage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [filter, setFilter] = useState<string>("all");
  const [activeTab, setActiveTab] = useState<string>("all");
  const [selectedClient, setSelectedClient] = useState<string | number | null>("all");
  const [selectedProject, setSelectedProject] = useState<string | number | null>("all");
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [selectedFiles, setSelectedFiles] = useState<number[]>([]);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [showDetailsDrawer, setShowDetailsDrawer] = useState(false);
  const [currentAttachment, setCurrentAttachment] = useState<UnifiedAttachment | null>(null);
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [totalUsage, setTotalUsage] = useState({ used: 0, total: 1024 * 1024 * 1024 * 5 }); // 5GB total por padrão
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropzoneRef = useRef<HTMLDivElement>(null);

  // Consulta para buscar todos os anexos
  const { data: attachments, isLoading: isLoadingAttachments } = useQuery<{
    clients: ClientAttachment[],
    projects: ProjectAttachment[],
    tasks: TaskAttachment[]
  }>({
    queryKey: ['/api/attachments/all'],
    onError: (error: Error) => {
      toast({
        title: "Erro ao carregar anexos",
        description: "Não foi possível carregar os anexos. Tente novamente mais tarde.",
        variant: "destructive",
      });
      console.error("Erro ao buscar anexos:", error);
    },
    onSuccess: (data) => {
      // Calcula o espaço total usado
      let totalSize = 0;
      data.clients.forEach(a => totalSize += a.file_size);
      data.projects.forEach(a => totalSize += a.file_size);
      data.tasks.forEach(a => totalSize += a.file_size);
      
      setTotalUsage(prev => ({ ...prev, used: totalSize }));
    }
  });

  // Buscar dados de clientes para mostrar nomes
  const { data: clients } = useQuery({
    queryKey: ['/api/clients'],
  });

  // Buscar dados de projetos para mostrar nomes
  const { data: projects } = useQuery({
    queryKey: ['/api/projects'],
  });
  
  // Buscar dados de tarefas para mostrar nomes
  const { data: tasks } = useQuery({
    queryKey: ['/api/tasks'],
  });

  // Buscar dados de usuários para mostrar nomes
  const { data: users } = useQuery({
    queryKey: ['/api/users'],
  });

  // Mutation para excluir um anexo
  const deleteMutation = useMutation({
    mutationFn: async ({ type, entityId, attachmentId }: { type: string, entityId: number, attachmentId: number }) => {
      const response = await apiRequest('DELETE', `/api/attachments/${type}s/${entityId}/${attachmentId}`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Erro ao excluir anexo');
      }
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Arquivo excluído",
        description: "O arquivo foi excluído com sucesso.",
        variant: "default",
        className: "bg-green-100 border-green-400 text-green-900",
      });
      
      // Atualizar a lista de anexos
      queryClient.invalidateQueries({ queryKey: ['/api/attachments/all'] });
      // Limpar a seleção atual
      setSelectedFiles([]);
      // Fechar o drawer se estiver aberto
      setShowDetailsDrawer(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao excluir arquivo",
        description: error.message || "Ocorreu um erro ao excluir o arquivo.",
        variant: "destructive",
      });
    }
  });

  // Mutation para excluir vários anexos de uma vez
  const batchDeleteMutation = useMutation({
    mutationFn: async (ids: number[]) => {
      // Obtém os dados dos arquivos selecionados
      const filesToDelete = processAttachments().filter(att => ids.includes(att.id));
      
      // Exclui os arquivos um por um (idealmente seria implementado um endpoint batch no backend)
      for (const file of filesToDelete) {
        await deleteMutation.mutateAsync({
          type: file.type,
          entityId: file.entity_id,
          attachmentId: file.id
        });
      }
    },
    onSuccess: () => {
      toast({
        title: `${selectedFiles.length} arquivos excluídos`,
        description: "Os arquivos selecionados foram excluídos com sucesso.",
        variant: "default",
        className: "bg-green-100 border-green-400 text-green-900",
      });
      
      // Limpar a seleção
      setSelectedFiles([]);
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao excluir arquivos",
        description: error.message || "Ocorreu um erro ao excluir os arquivos selecionados.",
        variant: "destructive",
      });
    }
  });

  // Função para upload simulado de arquivos
  const handleFileUpload = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    
    setIsUploadDialogOpen(true);
    
    // Simulação de upload com progresso
    let progress = 0;
    const interval = setInterval(() => {
      progress += 5;
      setUploadProgress(progress);
      
      if (progress >= 100) {
        clearInterval(interval);
        // Simulando um atraso para processamento no servidor
        setTimeout(() => {
          setIsUploadDialogOpen(false);
          setUploadProgress(0);
          toast({
            title: "Upload concluído",
            description: `${files.length} arquivo(s) enviado(s) com sucesso.`,
            variant: "default",
            className: "bg-green-100 border-green-400 text-green-900",
          });
          
          // Atualizar a lista de anexos
          queryClient.invalidateQueries({ queryKey: ['/api/attachments/all'] });
        }, 500);
      }
    }, 100);
  };

  // Configuração para o recurso de arrastar e soltar
  useEffect(() => {
    const dropzone = dropzoneRef.current;
    if (!dropzone) return;
    
    const handleDragOver = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      dropzone.classList.add('bg-primary/5', 'border-primary');
    };
    
    const handleDragLeave = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      dropzone.classList.remove('bg-primary/5', 'border-primary');
    };
    
    const handleDrop = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      dropzone.classList.remove('bg-primary/5', 'border-primary');
      
      if (e.dataTransfer?.files) {
        handleFileUpload(e.dataTransfer.files);
      }
    };
    
    dropzone.addEventListener('dragover', handleDragOver);
    dropzone.addEventListener('dragleave', handleDragLeave);
    dropzone.addEventListener('drop', handleDrop);
    
    return () => {
      dropzone.removeEventListener('dragover', handleDragOver);
      dropzone.removeEventListener('dragleave', handleDragLeave);
      dropzone.removeEventListener('drop', handleDrop);
    };
  }, []);

  // Função para processar anexos e normalizar dados
  const processAttachments = (): UnifiedAttachment[] => {
    if (!attachments || !clients || !projects || !tasks || !users) return [];

    const clientMap = new Map(clients?.map((client: any) => [client.id, client]) || []);
    const projectMap = new Map(projects?.map((project: any) => [project.id, project]) || []);
    const taskMap = new Map(tasks?.map((task: any) => [task.id, task]) || []);
    const userMap = new Map(users?.map((user: any) => [user.id, user]) || []);

    let allAttachments: UnifiedAttachment[] = [];

    // Processar anexos de clientes
    if (attachments.clients) {
      allAttachments = [
        ...allAttachments,
        ...attachments.clients.map(att => ({
          ...att,
          type: 'client' as const,
          entity_id: att.client_id,
          entity_name: clientMap.get(att.client_id)?.name || `Cliente ${att.client_id}`,
          uploader: att.uploaded_by ? userMap.get(att.uploaded_by) : null,
          uploaded_at: att.created_at || att.upload_date || new Date().toISOString(),
          // Adicionar nova propriedade para thumbnails
          thumbnailUrl: att.file_type.startsWith('image/') ? att.file_url : undefined,
          color: 'blue',
          tags: att.tags || []
        }))
      ];
    }

    // Processar anexos de projetos
    if (attachments.projects) {
      allAttachments = [
        ...allAttachments,
        ...attachments.projects.map(att => ({
          ...att,
          type: 'project' as const,
          entity_id: att.project_id,
          entity_name: projectMap.get(att.project_id)?.name || `Projeto ${att.project_id}`,
          uploader: att.uploaded_by ? userMap.get(att.uploaded_by) : null,
          uploaded_at: att.created_at || att.upload_date || new Date().toISOString(),
          thumbnailUrl: att.file_type.startsWith('image/') ? att.file_url : undefined,
          color: 'green',
          tags: att.tags || []
        }))
      ];
    }

    // Processar anexos de tarefas
    if (attachments.tasks) {
      allAttachments = [
        ...allAttachments,
        ...attachments.tasks.map(att => ({
          ...att,
          type: 'task' as const,
          entity_id: att.task_id,
          entity_name: taskMap.get(att.task_id)?.title || `Tarefa ${att.task_id}`,
          uploader: att.uploaded_by ? userMap.get(att.uploaded_by) : null,
          uploaded_at: att.created_at || att.upload_date || new Date().toISOString(),
          thumbnailUrl: att.file_type.startsWith('image/') ? att.file_url : undefined,
          color: 'amber',
          tags: att.tags || []
        }))
      ];
    }

    // Ordenar por data de upload (mais recente primeiro)
    return allAttachments.sort((a, b) => 
      new Date(b.uploaded_at).getTime() - new Date(a.uploaded_at).getTime()
    );
  };

  // Analisar o termo de busca para extrair filtros avançados
  const parseSearchQuery = useCallback((query: string) => {
    const result = {
      text: '',
      type: '',
      project: '',
      client: '',
      date: '',
      extension: ''
    };
    
    // Expressão regular para encontrar filtros como tipo:pdf projeto:"Banco Azul"
    const typeRegex = /tipo:([^\s"]+|"[^"]*")/g;
    const projectRegex = /projeto:([^\s"]+|"[^"]*")/g;
    const clientRegex = /cliente:([^\s"]+|"[^"]*")/g;
    const dateRegex = /data:([^\s"]+|"[^"]*")/g;
    const extensionRegex = /extensao:([^\s"]+|"[^"]*")/g;
    
    // Extrai todos os filtros e os remove da consulta original
    let cleanQuery = query;
    
    const typeMatch = query.match(typeRegex);
    if (typeMatch) {
      result.type = typeMatch[0].substring(5).replace(/"/g, '');
      cleanQuery = cleanQuery.replace(typeRegex, '');
    }
    
    const projectMatch = query.match(projectRegex);
    if (projectMatch) {
      result.project = projectMatch[0].substring(8).replace(/"/g, '');
      cleanQuery = cleanQuery.replace(projectRegex, '');
    }
    
    const clientMatch = query.match(clientRegex);
    if (clientMatch) {
      result.client = clientMatch[0].substring(8).replace(/"/g, '');
      cleanQuery = cleanQuery.replace(clientRegex, '');
    }
    
    const dateMatch = query.match(dateRegex);
    if (dateMatch) {
      result.date = dateMatch[0].substring(5).replace(/"/g, '');
      cleanQuery = cleanQuery.replace(dateRegex, '');
    }
    
    const extensionMatch = query.match(extensionRegex);
    if (extensionMatch) {
      result.extension = extensionMatch[0].substring(9).replace(/"/g, '');
      cleanQuery = cleanQuery.replace(extensionRegex, '');
    }
    
    // O que sobrar é o texto de busca
    result.text = cleanQuery.trim();
    
    return result;
  }, []);

  // Filtrar anexos com base no termo de busca e filtros
  const filteredAttachments = (): UnifiedAttachment[] => {
    const processed = processAttachments();
    if (!processed.length) return [];

    // Analisa a consulta de busca para extrair filtros avançados
    const searchFilters = parseSearchQuery(searchTerm);
    
    let filtered = processed;

    // Filtrar por texto de busca
    if (searchFilters.text) {
      const term = searchFilters.text.toLowerCase();
      filtered = filtered.filter(
        att => 
          att.file_name.toLowerCase().includes(term) || 
          (att.entity_name && att.entity_name.toLowerCase().includes(term)) ||
          (att.description && att.description.toLowerCase().includes(term)) ||
          (att.tags && att.tags.some(tag => tag.toLowerCase().includes(term)))
      );
    }
    
    // Filtrar por tipo de arquivo (dos filtros avançados)
    if (searchFilters.type) {
      filtered = filtered.filter(att => 
        getDisplayType(att.type, att.file_type).toLowerCase().includes(searchFilters.type.toLowerCase())
      );
    }
    
    // Filtrar por extensão
    if (searchFilters.extension) {
      filtered = filtered.filter(att => 
        att.file_name.toLowerCase().endsWith(`.${searchFilters.extension.toLowerCase()}`)
      );
    }
    
    // Filtrar por projeto (dos filtros avançados)
    if (searchFilters.project) {
      filtered = filtered.filter(att => 
        att.entity_name && att.entity_name.toLowerCase().includes(searchFilters.project.toLowerCase())
      );
    }
    
    // Filtrar por cliente (dos filtros avançados)
    if (searchFilters.client) {
      filtered = filtered.filter(att => {
        if (att.type === 'client') {
          return att.entity_name && att.entity_name.toLowerCase().includes(searchFilters.client.toLowerCase());
        } else if (att.type === 'project' && clients && projects) {
          const project = projects.find((p: any) => p.id === att.entity_id);
          if (project && project.client_id) {
            const client = clients.find((c: any) => c.id === project.client_id);
            return client && client.name.toLowerCase().includes(searchFilters.client.toLowerCase());
          }
        }
        return false;
      });
    }

    // Filtrar por tipo de anexo (das tabs)
    if (activeTab !== "all") {
      filtered = filtered.filter(att => att.type === activeTab);
    }

    // Aplicar filtros adicionais do dropdown
    if (filter === "images") {
      filtered = filtered.filter(att => att.file_type.startsWith('image/'));
    } else if (filter === "documents") {
      filtered = filtered.filter(att => 
        att.file_type.includes('pdf') || 
        att.file_type.includes('word') || 
        att.file_type.includes('document') ||
        att.file_type.includes('text') ||
        att.file_type.includes('sheet')
      );
    } else if (filter === "media") {
      filtered = filtered.filter(att => 
        att.file_type.startsWith('video/') || 
        att.file_type.startsWith('audio/')
      );
    }

    if (!clients || !projects || !tasks) return filtered;
    
    const clientMap = new Map(clients?.map((client: any) => [client.id, client]) || []);
    const projectMap = new Map(projects?.map((project: any) => [project.id, project]) || []);
    const taskMap = new Map(tasks?.map((task: any) => [task.id, task]) || []);

    // Filtrar por cliente selecionado
    if (selectedClient && selectedClient !== "all") {
      const clientId = typeof selectedClient === 'number' ? selectedClient : parseInt(selectedClient);
      filtered = filtered.filter(att => {
        if (att.type === 'client') {
          return att.entity_id === clientId;
        } else if (att.type === 'project') {
          const project = projectMap.get(att.entity_id);
          return project && project.client_id === clientId;
        } else if (att.type === 'task') {
          const task = taskMap.get(att.entity_id);
          if (task && task.project_id) {
            const project = projectMap.get(task.project_id);
            return project && project.client_id === clientId;
          }
        }
        return false;
      });
    }

    // Filtrar por projeto selecionado
    if (selectedProject && selectedProject !== "all") {
      const projectId = typeof selectedProject === 'number' ? selectedProject : parseInt(selectedProject);
      filtered = filtered.filter(att => {
        if (att.type === 'project') {
          return att.entity_id === projectId;
        } else if (att.type === 'task') {
          const task = taskMap.get(att.entity_id);
          return task && task.project_id === projectId;
        }
        return false;
      });
    }

    return filtered;
  };

  // Função para obter o ícone correto com base no tipo de arquivo
  const getFileIcon = (fileType: string): JSX.Element => {
    const size = "h-6 w-6";
    
    if (fileType.startsWith('image/')) {
      return <FileImage className={`${size} text-blue-500`} />;
    } else if (fileType.includes('pdf')) {
      return <FileText className={`${size} text-red-500`} />;
    } else if (fileType.includes('spreadsheet') || fileType.includes('excel')) {
      return <FileSpreadsheet className={`${size} text-green-500`} />;
    } else if (fileType.includes('zip') || fileType.includes('compressed')) {
      return <FileArchive className={`${size} text-purple-500`} />;
    } else if (fileType.startsWith('audio/')) {
      return <FileAudio className={`${size} text-yellow-500`} />;
    } else if (fileType.startsWith('video/')) {
      return <FileVideo className={`${size} text-pink-500`} />;
    } else {
      return <FileIcon className={`${size} text-gray-500`} />;
    }
  };

  // Função para lidar com o download de um arquivo
  const handleDownload = (attachment: UnifiedAttachment) => {
    const url = `/api/attachments/${attachment.type}s/${attachment.entity_id}/download/${attachment.id}`;
    // Criar um link temporário para download
    const a = document.createElement('a');
    a.href = url;
    a.download = attachment.file_name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    
    toast({
      title: "Download iniciado",
      description: `O download de "${attachment.file_name}" foi iniciado.`,
      variant: "default",
      className: "bg-green-100 border-green-400 text-green-900",
    });
  };

  // Função para lidar com a exclusão de um anexo
  const handleDelete = (attachment: UnifiedAttachment) => {
    deleteMutation.mutate({
      type: attachment.type,
      entityId: attachment.entity_id,
      attachmentId: attachment.id
    });
  };
  
  // Função para visualizar detalhes de um anexo
  const handleView = (attachment: UnifiedAttachment) => {
    setCurrentAttachment(attachment);
    setShowDetailsDrawer(true);
  };

  // Função para selecionar/deselecionar um arquivo
  const handleSelect = (id: number, selected: boolean) => {
    if (selected) {
      setSelectedFiles(prev => [...prev, id]);
    } else {
      setSelectedFiles(prev => prev.filter(fileId => fileId !== id));
    }
  };
  
  // Função para selecionar/deselecionar todos os arquivos
  const handleSelectAll = (selected: boolean) => {
    if (selected) {
      const files = filteredAttachments();
      setSelectedFiles(files.map(att => att.id));
    } else {
      setSelectedFiles([]);
    }
  };
  
  // Função para download em lote
  const handleBatchDownload = () => {
    const selectedAttachments = filteredAttachments().filter(att => 
      selectedFiles.includes(att.id)
    );
    
    // Em um sistema real, ofereceriamos um arquivo ZIP
    // Por enquanto, vamos baixar um por um com um pequeno atraso
    selectedAttachments.forEach((att, index) => {
      setTimeout(() => handleDownload(att), index * 300);
    });
    
    toast({
      title: "Download em lote iniciado",
      description: `${selectedAttachments.length} arquivos serão baixados sequencialmente.`,
      variant: "default",
      className: "bg-green-100 border-green-400 text-green-900",
    });
  };
  
  // Função para excluir em lote
  const handleBatchDelete = () => {
    batchDeleteMutation.mutate(selectedFiles);
  };

  // Agrupar anexos por mês para visualização em blocos
  const groupedAttachments = React.useMemo(() => {
    const files = filteredAttachments();
    const groups: { [key: string]: UnifiedAttachment[] } = {};
    
    files.forEach(attachment => {
      const date = new Date(attachment.uploaded_at);
      const monthYear = format(date, 'MMMM yyyy', { locale: ptBR });
      
      if (!groups[monthYear]) {
        groups[monthYear] = [];
      }
      
      groups[monthYear].push(attachment);
    });
    
    // Ordenar os grupos por data (mais recente primeiro)
    return Object.entries(groups)
      .sort(([a], [b]) => {
        const dateA = parseISO(groups[a][0].uploaded_at);
        const dateB = parseISO(groups[b][0].uploaded_at);
        return dateB.getTime() - dateA.getTime();
      })
      .map(([month, files]) => ({
        month,
        files: files.sort((a, b) => 
          new Date(b.uploaded_at).getTime() - new Date(a.uploaded_at).getTime()
        )
      }));
  }, [filteredAttachments]);

  // Verificar se está carregando algum dado necessário
  const isLoading = isLoadingAttachments || 
                   !clients || 
                   !projects || 
                   !tasks || 
                   !users;

  // Calcular a porcentagem de uso do espaço
  const usagePercentage = Math.min(100, (totalUsage.used / totalUsage.total) * 100);

  // Lista de arquivos filtrados
  const files = filteredAttachments();

  return (
    <div 
      className="space-y-4 pb-10" 
      ref={dropzoneRef}
    >
      {/* Barra superior fixa com espaço utilizado e botão de upload */}
      <div className="bg-white border-b sticky top-0 z-10 py-2 px-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 text-sm text-muted-foreground">
            <HardDrive className="h-4 w-4" />
            <span>{formatFileSize(totalUsage.used)} de {formatFileSize(totalUsage.total)} utilizados</span>
            <Progress value={usagePercentage} className="w-32" />
          </div>
          
          <input
            type="file"
            multiple
            className="hidden"
            ref={fileInputRef}
            onChange={(e) => handleFileUpload(e.target.files)}
          />
          
          <Button 
            size="sm"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="h-4 w-4 mr-2" />
            Upload
          </Button>
        </div>
      </div>
      
      <div className="px-4 space-y-4">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Gerenciamento de Arquivos</h1>
            <p className="text-muted-foreground">
              Visualize, organize e gerencie todos os arquivos do sistema em um só lugar.
            </p>
          </div>
          
          {/* Botões de ação em lote (aparecem quando há arquivos selecionados) */}
          {selectedFiles.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">{selectedFiles.length} selecionados</span>
              
              <Button variant="outline" size="sm" onClick={handleBatchDownload}>
                <DownloadIcon className="h-4 w-4 mr-2" />
                Download
              </Button>
              
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" size="sm">
                    <Trash2 className="h-4 w-4 mr-2" />
                    Excluir
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Excluir arquivos selecionados?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Esta ação não pode ser desfeita. Isso excluirá permanentemente
                      os {selectedFiles.length} arquivos selecionados.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={handleBatchDelete}>
                      Excluir
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
              
              <Button variant="ghost" size="sm" onClick={() => setSelectedFiles([])}>
                <X className="h-4 w-4" />
                <span className="sr-only">Limpar seleção</span>
              </Button>
            </div>
          )}
        </div>

        {/* Barra de busca inteligente com sugestão de filtros */}
        <div className="relative">
          <div className="flex space-x-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder='Busque por nome ou use filtros tipo:pdf projeto:"Banco Azul" cliente:"Seara"'
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-10"
              />
              {searchTerm && (
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="absolute right-1 top-1 h-8 w-8" 
                  onClick={() => setSearchTerm("")}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
            
            {/* Alternador de visualização (grade/lista) */}
            <div className="flex items-center border rounded-md">
              <Button
                variant={view === 'grid' ? 'default' : 'ghost'}
                size="icon"
                className="h-10 w-10 rounded-none rounded-l-md"
                onClick={() => setView('grid')}
              >
                <Grid className="h-4 w-4" />
              </Button>
              <Separator orientation="vertical" className="h-6" />
              <Button
                variant={view === 'list' ? 'default' : 'ghost'}
                size="icon"
                className="h-10 w-10 rounded-none rounded-r-md"
                onClick={() => setView('list')}
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
            
            {/* Botão de filtros */}
            <Button
              variant="outline"
              onClick={() => setIsFilterOpen(!isFilterOpen)}
              className="flex items-center gap-2"
            >
              <FilterIcon className="h-4 w-4" />
              <span className="hidden sm:inline">Filtros</span>
              <ChevronDown className={cn(
                "h-4 w-4 transition-transform", 
                isFilterOpen ? "rotate-180" : ""
              )} />
            </Button>
          </div>
          
          {/* Painel de filtros expansível */}
          <Collapsible open={isFilterOpen} className="mt-2">
            <CollapsibleContent>
              <div className="border rounded-md p-4 bg-muted/20 grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Filtro por tipo */}
                <div>
                  <Label htmlFor="type-filter" className="text-sm font-medium mb-1 block">
                    Tipo de arquivo
                  </Label>
                  <Tabs 
                    value={activeTab} 
                    onValueChange={setActiveTab}
                    className="w-full"
                  >
                    <TabsList className="grid grid-cols-3 w-full">
                      <TabsTrigger value="all">Todos</TabsTrigger>
                      <TabsTrigger value="client">Clientes</TabsTrigger>
                      <TabsTrigger value="project">Projetos</TabsTrigger>
                    </TabsList>
                  </Tabs>
                </div>
                
                {/* Filtro por cliente */}
                <div>
                  <Label htmlFor="client-filter" className="text-sm font-medium mb-1 block">
                    Cliente
                  </Label>
                  <Select 
                    value={selectedClient?.toString() || "all"}
                    onValueChange={(value) => {
                      setSelectedClient(value === "all" ? "all" : parseInt(value));
                      // Resetar o projeto selecionado quando o cliente muda
                      setSelectedProject("all");
                    }}
                  >
                    <SelectTrigger id="client-filter">
                      <SelectValue placeholder="Todos os clientes" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos os clientes</SelectItem>
                      {clients?.map((client: any) => (
                        <SelectItem key={client.id} value={client.id.toString()}>
                          {client.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                {/* Filtro por projeto */}
                <div>
                  <Label htmlFor="project-filter" className="text-sm font-medium mb-1 block">
                    Projeto
                  </Label>
                  <Select 
                    value={selectedProject?.toString() || "all"}
                    onValueChange={(value) => setSelectedProject(value === "all" ? "all" : parseInt(value))}
                    disabled={selectedClient === "all"}
                  >
                    <SelectTrigger id="project-filter">
                      <SelectValue placeholder={selectedClient !== "all" ? "Selecione um projeto" : "Selecione um cliente primeiro"} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos os projetos</SelectItem>
                      {projects && selectedClient !== "all" && 
                        projects
                          .filter((project: any) => {
                            const clientId = typeof selectedClient === 'number' ? selectedClient : parseInt(selectedClient);
                            return project.client_id === clientId;
                          })
                          .map((project: any) => (
                            <SelectItem key={project.id} value={project.id.toString()}>
                              {project.name}
                            </SelectItem>
                          ))
                      }
                    </SelectContent>
                  </Select>
                </div>
                
                {/* Filtro adicional por tipo de arquivo */}
                <div>
                  <Label htmlFor="filter-type" className="text-sm font-medium mb-1 block">
                    Categoria
                  </Label>
                  <Select
                    value={filter}
                    onValueChange={setFilter}
                  >
                    <SelectTrigger id="filter-type" className="w-full">
                      <SelectValue placeholder="Tipo de arquivo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos os arquivos</SelectItem>
                      <SelectItem value="images">Apenas imagens</SelectItem>
                      <SelectItem value="documents">Documentos</SelectItem>
                      <SelectItem value="media">Mídia (Áudio/Vídeo)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>
        </div>
        
        {/* Breadcrumb de navegação */}
        <div className="flex items-center text-sm text-muted-foreground">
          <span className="font-medium text-foreground">Todos os arquivos</span>
          {activeTab !== 'all' && (
            <>
              <ChevronRight className="h-4 w-4 mx-1" />
              <span className="font-medium text-foreground">
                {activeTab === 'client' ? 'Clientes' : activeTab === 'project' ? 'Projetos' : 'Tarefas'}
              </span>
            </>
          )}
          {selectedClient !== 'all' && clients && (
            <>
              <ChevronRight className="h-4 w-4 mx-1" />
              <span className="font-medium text-foreground">
                {clients.find((c: any) => c.id === Number(selectedClient))?.name}
              </span>
            </>
          )}
          {selectedProject !== 'all' && projects && (
            <>
              <ChevronRight className="h-4 w-4 mx-1" />
              <span className="font-medium text-foreground">
                {projects.find((p: any) => p.id === Number(selectedProject))?.name}
              </span>
            </>
          )}
        </div>
        
        {/* Contador de resultados / seleção em massa */}
        <div className="flex justify-between items-center">
          <div className="text-sm text-muted-foreground">
            {files.length} {files.length === 1 ? 'arquivo encontrado' : 'arquivos encontrados'}
          </div>
          
          {files.length > 0 && (
            <div className="flex items-center">
              <Checkbox 
                id="select-all"
                className="mr-2"
                checked={selectedFiles.length === files.length && files.length > 0}
                onCheckedChange={handleSelectAll}
              />
              <Label htmlFor="select-all" className="text-sm">
                Selecionar todos
              </Label>
            </div>
          )}
        </div>

        {/* Lista de arquivos - visualização condicional em grade ou lista */}
        <div>
          {isLoading ? (
            <div className="flex items-center justify-center h-60">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
            </div>
          ) : files.length === 0 ? (
            <div className="text-center p-8 border rounded-lg bg-muted/20">
              <FileIcon className="h-10 w-10 mx-auto text-muted-foreground" />
              <h3 className="mt-4 text-lg font-medium">Nenhum arquivo encontrado</h3>
              <p className="text-sm text-muted-foreground">
                Nenhum arquivo corresponde aos filtros aplicados. Tente ajustar seus critérios de busca.
              </p>
            </div>
          ) : view === 'grid' ? (
            // Visualização em grade agrupada por mês
            <div className="space-y-6">
              {groupedAttachments.map(group => (
                <div key={group.month} className="space-y-2">
                  <h3 className="text-lg font-medium capitalize">{group.month}</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {group.files.map((attachment) => (
                      <FileCard
                        key={`${attachment.type}-${attachment.id}`}
                        attachment={attachment}
                        isSelected={selectedFiles.includes(attachment.id)}
                        onSelect={handleSelect}
                        onDownload={handleDownload}
                        onDelete={handleDelete}
                        onView={handleView}
                        getFileIcon={getFileIcon}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            // Visualização em lista
            <div className="border rounded-lg overflow-hidden">
              <div className="bg-muted/20 py-2 px-3 border-b grid grid-cols-[auto_1fr_auto_auto] gap-4">
                <span className="w-10"></span>
                <span className="text-sm font-medium">Nome</span>
                <span className="text-sm font-medium w-36">Tamanho</span>
                <span className="text-sm font-medium w-48">Data de upload</span>
              </div>
              
              <ScrollArea className="h-[600px]">
                {groupedAttachments.map(group => (
                  <div key={group.month}>
                    <div className="bg-muted/10 py-1 px-3 border-b sticky top-0 z-10">
                      <h3 className="text-sm font-medium capitalize">{group.month}</h3>
                    </div>
                    {group.files.map((attachment) => (
                      <FileListItem
                        key={`${attachment.type}-${attachment.id}`}
                        attachment={attachment}
                        isSelected={selectedFiles.includes(attachment.id)}
                        onSelect={handleSelect}
                        onDownload={handleDownload}
                        onDelete={handleDelete}
                        onView={handleView}
                        getFileIcon={getFileIcon}
                      />
                    ))}
                  </div>
                ))}
              </ScrollArea>
            </div>
          )}
        </div>
      </div>
      
      {/* Drawer para visualizar detalhes do arquivo */}
      <Drawer open={showDetailsDrawer} onOpenChange={setShowDetailsDrawer}>
        <DrawerContent className="max-h-[85vh]">
          <DrawerHeader className="border-b">
            <DrawerTitle>Detalhes do arquivo</DrawerTitle>
            <DrawerDescription>
              Visualize e gerencie as informações do arquivo
            </DrawerDescription>
          </DrawerHeader>
          
          {currentAttachment && (
            <ScrollArea className="p-4 h-full max-h-[calc(85vh-120px)]">
              <div className="space-y-4">
                {/* Pré-visualização do arquivo */}
                <div className="rounded-lg border overflow-hidden">
                  <div className="aspect-video bg-muted flex items-center justify-center">
                    {currentAttachment.file_type.startsWith('image/') ? (
                      <img 
                        src={currentAttachment.file_url} 
                        alt={currentAttachment.file_name}
                        className="max-h-full max-w-full object-contain"
                      />
                    ) : (
                      <div className="text-center p-4">
                        {getFileIcon(currentAttachment.file_type)}
                        <p className="mt-2 text-sm text-muted-foreground">
                          Pré-visualização não disponível
                        </p>
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Informações do arquivo */}
                <div className="space-y-2">
                  <h3 className="text-lg font-medium">{currentAttachment.file_name}</h3>
                  
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <p className="text-muted-foreground">Tipo</p>
                      <p>{getDisplayType(currentAttachment.type, currentAttachment.file_type)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Tamanho</p>
                      <p>{formatFileSize(currentAttachment.file_size)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Entidade</p>
                      <p>{currentAttachment.entity_name}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Data de upload</p>
                      <p>{format(new Date(currentAttachment.uploaded_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })}</p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-muted-foreground">Descrição</p>
                      <p>{currentAttachment.description || "Sem descrição"}</p>
                    </div>
                  </div>
                </div>
                
                {/* Tags */}
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Tags</p>
                  <div className="flex flex-wrap gap-1">
                    {currentAttachment.tags && currentAttachment.tags.length > 0 ? (
                      currentAttachment.tags.map((tag, index) => (
                        <Badge key={index} variant="outline">{tag}</Badge>
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground">Sem tags</p>
                    )}
                  </div>
                </div>
                
                {/* Enviado por */}
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Enviado por</p>
                  <div className="flex items-center">
                    {currentAttachment.uploader ? (
                      <>
                        <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center mr-2">
                          <User className="h-4 w-4" />
                        </div>
                        <span>{currentAttachment.uploader.name}</span>
                      </>
                    ) : (
                      <span>Sistema</span>
                    )}
                  </div>
                </div>
              </div>
            </ScrollArea>
          )}
          
          <DrawerFooter className="border-t">
            <div className="flex justify-between items-center">
              <Button variant="outline" onClick={() => setShowDetailsDrawer(false)}>
                Fechar
              </Button>
              
              <div className="flex gap-2">
                {currentAttachment && (
                  <>
                    <Button variant="outline" onClick={() => handleDownload(currentAttachment)}>
                      <DownloadIcon className="h-4 w-4 mr-2" />
                      Download
                    </Button>
                    
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="destructive">
                          <Trash2 className="h-4 w-4 mr-2" />
                          Excluir
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Excluir arquivo?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Esta ação não pode ser desfeita. Isso excluirá permanentemente
                            o arquivo "{currentAttachment.file_name}".
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction onClick={() => {
                            handleDelete(currentAttachment);
                            setShowDetailsDrawer(false);
                          }}>
                            Excluir
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </>
                )}
              </div>
            </div>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
      
      {/* Dialog de upload com barra de progresso */}
      <Dialog open={isUploadDialogOpen} onOpenChange={setIsUploadDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Enviando arquivos</DialogTitle>
            <DialogDescription>
              Por favor, aguarde enquanto seus arquivos são enviados.
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Progresso</span>
                <span>{uploadProgress}%</span>
              </div>
              <Progress value={uploadProgress} className="w-full" />
            </div>
          </div>
          
          <DialogFooter>
            <Button 
              variant="outline" 
              disabled={uploadProgress < 100} 
              onClick={() => setIsUploadDialogOpen(false)}
            >
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Componente para renderizar a lista de arquivos
interface FilesListProps {
  attachments: UnifiedAttachment[];
  isLoading: boolean;
  onDownload: (attachment: UnifiedAttachment) => void;
  onDelete: (attachment: UnifiedAttachment) => void;
  getFileIcon: (fileType: string) => JSX.Element;
}

function FilesList({ attachments, isLoading, onDownload, onDelete, getFileIcon }: FilesListProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-40">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (attachments.length === 0) {
    return (
      <div className="text-center p-8 border rounded-lg bg-gray-50">
        <FileIcon className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-sm font-semibold text-gray-900">Nenhum arquivo encontrado</h3>
        <p className="mt-1 text-sm text-gray-500">
          Não há arquivos disponíveis com os filtros selecionados.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {attachments.map((attachment) => (
        <Card key={`${attachment.type}-${attachment.id}`} className="overflow-hidden transition-all hover:shadow-md">
          <CardHeader className="p-4 pb-2">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                {getFileIcon(attachment.file_type)}
                <div>
                  <CardTitle className="text-base truncate max-w-[200px]">{attachment.file_name}</CardTitle>
                  <CardDescription className="text-xs">
                    {formatFileSize(attachment.file_size)} • {attachment.file_type.split('/')[1].toUpperCase()}
                  </CardDescription>
                </div>
              </div>
              <Badge 
                variant="outline"
                className={cn(
                  "text-xs uppercase",
                  attachment.type === 'client' && "bg-blue-50 text-blue-700 border-blue-200",
                  attachment.type === 'project' && "bg-green-50 text-green-700 border-green-200",
                  attachment.type === 'task' && "bg-amber-50 text-amber-700 border-amber-200",
                )}
              >
                {attachment.type === 'client' ? 'Cliente' : 
                 attachment.type === 'project' ? 'Projeto' : 'Tarefa'}
              </Badge>
            </div>
          </CardHeader>
          
          <CardContent className="p-4 pt-2">
            <div className="mt-1">
              <p className="text-sm font-medium">{attachment.entity_name}</p>
              {attachment.description && (
                <p className="text-sm text-gray-500 mt-1 truncate">{attachment.description}</p>
              )}
              {attachment.tags && attachment.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {attachment.tags.map((tag, index) => (
                    <Badge key={index} variant="secondary" className="text-xs">{tag}</Badge>
                  ))}
                </div>
              )}
            </div>
            
            <div className="mt-3 flex items-center text-sm text-gray-500">
              <span className="flex items-center gap-1">
                {attachment.uploader ? (
                  <>
                    <UserAvatar 
                      user={attachment.uploader} 
                      className="h-5 w-5" 
                    />
                    <span>{attachment.uploader.name}</span>
                  </>
                ) : (
                  "Sistema"
                )}
              </span>
              <span className="mx-1">•</span>
              <span>
                {format(new Date(attachment.uploaded_at), "dd MMM yyyy", { locale: ptBR })}
              </span>
            </div>
          </CardContent>
          
          <CardFooter className="p-0 border-t">
            <div className="grid grid-cols-2 w-full divide-x">
              <Button 
                variant="ghost" 
                className="rounded-none h-10"
                onClick={() => onDownload(attachment)}
              >
                <DownloadIcon className="mr-1 h-4 w-4" />
                <span>Download</span>
              </Button>
              <Button 
                variant="ghost" 
                className="rounded-none h-10 text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={() => onDelete(attachment)}
              >
                <Trash2 className="mr-1 h-4 w-4" />
                <span>Excluir</span>
              </Button>
            </div>
          </CardFooter>
        </Card>
      ))}
    </div>
  );
}