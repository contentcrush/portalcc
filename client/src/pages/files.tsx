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
const FilesList = ({ 
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
        const dateA = new Date(parseISO(format(new Date(a), 'yyyy-MM-dd')));
        const dateB = new Date(parseISO(format(new Date(b), 'yyyy-MM-dd')));
        return dateB.getTime() - dateA.getTime();
      })
      .map(([month, files]) => ({
        month: month.charAt(0).toUpperCase() + month.slice(1),
        files
      }));
  })();

  if (view === 'grid') {
    return (
      <div className="space-y-8">
        {groupedAttachments.map((group) => (
          <div key={group.month} className="space-y-3">
            <h3 className="text-sm font-medium capitalize">{group.month}</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
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
  }

  return (
    <div className="space-y-6">
      {groupedAttachments.map((group) => (
        <div key={group.month} className="space-y-2">
          <h3 className="text-sm font-medium capitalize">{group.month}</h3>
          <div className="border rounded-md overflow-hidden">
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
        </div>
      ))}
    </div>
  );
};

export default function FilesPage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [clientId, setClientId] = useState<string>("all");
  const [projectId, setProjectId] = useState<string>("all");
  const [attachmentType, setAttachmentType] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [uploading, setUploading] = useState<boolean>(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [selectedFiles, setSelectedFiles] = useState<number[]>([]);
  
  // Busca clientes para o filtro
  const { data: clients = [] } = useQuery({
    queryKey: ["/api/clients"],
    staleTime: 5 * 60 * 1000, // 5 minutos
  });
  
  // Busca projetos para o filtro
  const { data: projects = [] } = useQuery({
    queryKey: ["/api/projects"],
    staleTime: 5 * 60 * 1000, // 5 minutos
  });
  
  // Busca anexos do cliente (todos os clientes quando clientId é 'all')
  const {
    data: clientAttachments = [],
    isLoading: clientLoading,
    isError: clientError,
  } = useQuery({
    queryKey: ["/api/attachments/clients", clientId === 'all' ? undefined : clientId],
    queryFn: async () => {
      // Se não tiver ID específico, obter para todos os clientes
      if (clientId === 'all') {
        // Obter todos os IDs de clientes
        const clientIds = clients.map((client: any) => client.id);
        
        // Para cada cliente, fazer uma requisição de anexos e combinar os resultados
        const allClientAttachments = await Promise.all(
          clientIds.map(async (id: number) => {
            try {
              const response = await fetch(`/api/attachments/clients/${id}`);
              if (!response.ok) return [];
              return await response.json();
            } catch {
              return [];
            }
          })
        );
        
        // Combinar todos os resultados em um único array
        return allClientAttachments.flat();
      } else {
        // Se tiver um cliente específico, obter apenas os anexos desse cliente
        const response = await fetch(`/api/attachments/clients/${clientId}`);
        if (!response.ok) throw new Error('Falha ao obter anexos do cliente');
        return await response.json();
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao carregar anexos de clientes",
        description: error.message,
        variant: "destructive",
      });
    },
    enabled: clients.length > 0, // Só executa quando a lista de clientes estiver carregada
  });
  
  // Busca anexos de projeto
  const {
    data: projectAttachments = [],
    isLoading: projectLoading,
    isError: projectError,
  } = useQuery({
    queryKey: ["/api/attachments/projects", projectId === 'all' ? undefined : projectId],
    queryFn: async () => {
      // Se não tiver ID específico, obter para todos os projetos
      if (projectId === 'all') {
        // Obter todos os IDs de projetos
        const projectIds = projects.map((project: any) => project.id);
        
        // Para cada projeto, fazer uma requisição de anexos e combinar os resultados
        const allProjectAttachments = await Promise.all(
          projectIds.map(async (id: number) => {
            try {
              const response = await fetch(`/api/attachments/projects/${id}`);
              if (!response.ok) return [];
              return await response.json();
            } catch {
              return [];
            }
          })
        );
        
        // Combinar todos os resultados em um único array
        return allProjectAttachments.flat();
      } else {
        // Se tiver um projeto específico, obter apenas os anexos desse projeto
        const response = await fetch(`/api/attachments/projects/${projectId}`);
        if (!response.ok) throw new Error('Falha ao obter anexos do projeto');
        return await response.json();
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao carregar anexos de projetos",
        description: error.message,
        variant: "destructive",
      });
    },
    enabled: projects.length > 0, // Só executa quando a lista de projetos estiver carregada
  });
  
  // Busca anexos de tarefas
  const {
    data: taskAttachments = [],
    isLoading: taskLoading,
    isError: taskError,
  } = useQuery({
    queryKey: ["/api/attachments/tasks"],
    queryFn: async () => {
      // Obter todos os IDs de tarefas (sem filtro específico por enquanto)
      // Poderíamos melhorar isso com um endpoint para listar todas as tarefas ou filtradas
      const tasksResponse = await fetch(`/api/tasks`);
      if (!tasksResponse.ok) return [];
      const tasks = await tasksResponse.json();
      
      // Para cada tarefa, fazer uma requisição de anexos e combinar os resultados
      const allTaskAttachments = await Promise.all(
        tasks.map(async (task: any) => {
          try {
            const response = await fetch(`/api/attachments/tasks/${task.id}`);
            if (!response.ok) return [];
            const attachments = await response.json();
            // Adicionar título da tarefa aos anexos para referência
            return attachments.map((att: any) => ({
              ...att,
              task_title: task.title
            }));
          } catch {
            return [];
          }
        })
      );
      
      // Combinar todos os resultados em um único array
      return allTaskAttachments.flat();
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao carregar anexos de tarefas",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Carrega metadados completos para cada anexo
  useEffect(() => {
    // Aqui poderia ter uma lógica para carregar dados adicionais como thumbnails
    // ou metadados mais detalhados para cada anexo
  }, [clientAttachments, projectAttachments, taskAttachments]);
  
  // Unifica os anexos em um único array com tipagem consistente
  const unifiedAttachments: UnifiedAttachment[] = [
    ...clientAttachments.map((att: ClientAttachment) => ({
      ...att,
      type: 'client' as const,
      entity_name: clients.find((c: any) => c.id === att.client_id)?.name || 'Cliente não encontrado'
    })),
    ...projectAttachments.map((att: ProjectAttachment) => ({
      ...att,
      type: 'project' as const,
      entity_name: projects.find((p: any) => p.id === att.project_id)?.name || 'Projeto não encontrado'
    })),
    ...taskAttachments.map((att: TaskAttachment) => ({
      ...att,
      type: 'task' as const,
      entity_name: att.task_title || 'Tarefa não encontrada'
    }))
  ];
  
  // Filtra os anexos com base nos critérios selecionados
  const filteredAttachments = unifiedAttachments.filter(att => {
    // Filtrar por cliente
    if (clientId !== 'all') {
      if (att.type === 'client' && att.entity_id.toString() !== clientId) {
        return false;
      }
      
      if (att.type === 'project') {
        const project = projects.find((p: any) => p.id === att.entity_id);
        if (!project || project.client_id.toString() !== clientId) {
          return false;
        }
      }
      
      if (att.type === 'task') {
        // Aqui precisaria de uma lógica para relacionar tarefas com clientes
        // Por exemplo, através do projeto vinculado à tarefa
        // const task = tasks.find(t => t.id === att.entity_id);
        // if (!task || task.project.client_id.toString() !== clientId) {
        //   return false;
        // }
      }
    }
    
    // Filtrar por projeto
    if (projectId !== 'all') {
      if (att.type === 'project' && att.entity_id.toString() !== projectId) {
        return false;
      }
      
      if (att.type === 'task') {
        // Simplificando por enquanto, sem verificação de projeto vinculado à tarefa
        // const task = tasks.find(t => t.id === att.entity_id);
        // if (!task || task.project_id.toString() !== projectId) {
        //   return false;
        // }
      }
      
      if (att.type === 'client') {
        return false; // Anexos de clientes não estão diretamente vinculados a projetos
      }
    }
    
    // Filtrar por tipo de entidade
    if (attachmentType !== 'all' && att.type !== attachmentType) {
      return false;
    }
    
    // Filtrar por termo de busca (no nome do arquivo, descrição ou tags)
    if (searchTerm && searchTerm.trim() !== '') {
      const term = searchTerm.toLowerCase();
      const nameMatch = att.file_name.toLowerCase().includes(term);
      const descMatch = att.description ? att.description.toLowerCase().includes(term) : false;
      const tagsMatch = att.tags ? att.tags.some(tag => tag.toLowerCase().includes(term)) : false;
      const entityMatch = att.entity_name ? att.entity_name.toLowerCase().includes(term) : false;
      
      if (!nameMatch && !descMatch && !tagsMatch && !entityMatch) {
        return false;
      }
    }
    
    return true;
  });
  
  // Obtém o ícone apropriado com base no tipo de arquivo
  const getFileIcon = (fileType: string): JSX.Element => {
    const size = 32;
    
    if (fileType.startsWith('image/')) {
      return <FileImage size={size} className="text-blue-500" />;
    }
    if (fileType.includes('pdf')) {
      return <FileText size={size} className="text-red-500" />;
    }
    if (fileType.includes('excel') || fileType.includes('spreadsheet')) {
      return <FileSpreadsheet size={size} className="text-green-500" />;
    }
    if (fileType.includes('zip') || fileType.includes('compressed')) {
      return <FileArchive size={size} className="text-purple-500" />;
    }
    if (fileType.startsWith('audio/')) {
      return <FileAudio size={size} className="text-yellow-500" />;
    }
    if (fileType.startsWith('video/')) {
      return <FileVideo size={size} className="text-pink-500" />;
    }
    if (fileType.includes('word') || fileType.includes('document')) {
      return <FileText size={size} className="text-sky-500" />;
    }
    
    return <FileIcon size={size} className="text-gray-500" />;
  };
  
  // Mutation para excluir um anexo
  const deleteMutation = useMutation({
    mutationFn: async ({ id, type }: { id: number; type: string }) => {
      let endpoint = '';
      
      switch (type) {
        case 'client':
          endpoint = `/api/client-attachments/${id}`;
          break;
        case 'project':
          endpoint = `/api/project-attachments/${id}`;
          break;
        case 'task':
          endpoint = `/api/task-attachments/${id}`;
          break;
        default:
          throw new Error('Tipo de anexo inválido');
      }
      
      await apiRequest('DELETE', endpoint);
      return { id, type };
    },
    onSuccess: ({ type }) => {
      toast({
        title: "Arquivo excluído",
        description: "O arquivo foi excluído com sucesso",
        variant: "default",
        className: "bg-green-50 text-green-900 border-green-200",
      });
      
      // Invalidar a consulta para recarregar os dados
      switch (type) {
        case 'client':
          queryClient.invalidateQueries({ queryKey: ["/api/client-attachments"] });
          break;
        case 'project':
          queryClient.invalidateQueries({ queryKey: ["/api/project-attachments"] });
          break;
        case 'task':
          queryClient.invalidateQueries({ queryKey: ["/api/task-attachments"] });
          break;
      }
      
      // Limpar seleção de arquivos
      setSelectedFiles(prev => prev.filter(id => id !== id));
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao excluir arquivo",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Mutation para upload de arquivos
  const uploadMutation = useMutation({
    mutationFn: async ({
      entityType,
      entityId,
      formData
    }: {
      entityType: 'client' | 'project' | 'task';
      entityId: string;
      formData: FormData;
    }) => {
      // Constrói o endpoint correto baseado no tipo de entidade
      const endpoint = `/api/attachments/${entityType}s/${entityId}`;
      
      const response = await apiRequest('POST', endpoint, formData, {
        // Remove os headers padrão para que o navegador configure corretamente o Content-Type
        // para FormData com boundary apropriado para upload de arquivos
        headers: {},
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Erro ao fazer upload do arquivo');
      }
      
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Upload concluído",
        description: "Os arquivos foram enviados com sucesso",
        variant: "default",
        className: "bg-green-50 text-green-900 border-green-200",
      });
      
      // Invalidar as consultas para recarregar os dados
      queryClient.invalidateQueries({ queryKey: ["/api/attachments/clients"] });
      queryClient.invalidateQueries({ queryKey: ["/api/attachments/projects"] });
      queryClient.invalidateQueries({ queryKey: ["/api/attachments/tasks"] });
      
      setUploading(false);
      setUploadProgress(0);
      
      // Limpar o input de arquivo
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Erro no upload",
        description: error.message,
        variant: "destructive",
      });
      
      setUploading(false);
      setUploadProgress(0);
    },
  });
  
  // Gerencia o upload de arquivos
  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    
    // Verifica se temos pelo menos um tipo de entidade e ID para associar o arquivo
    let entityType: 'client' | 'project' | 'task';
    let entityId: string;
    
    if (attachmentType === 'client' && clientId !== 'all') {
      entityType = 'client';
      entityId = clientId;
    } else if (attachmentType === 'project' && projectId !== 'all') {
      entityType = 'project';
      entityId = projectId;
    } else if (clientId !== 'all') { 
      // Se um cliente específico estiver selecionado, usá-lo como padrão
      entityType = 'client';
      entityId = clientId;
    } else if (projectId !== 'all') {
      // Se um projeto específico estiver selecionado, usá-lo como padrão
      entityType = 'project';
      entityId = projectId;
    } else {
      // Se nenhuma entidade for selecionada, mostrar mensagem de erro
      toast({
        title: "Seleção necessária",
        description: "Por favor, selecione um cliente ou projeto para associar o arquivo",
        variant: "destructive",
      });
      return;
    }
    
    setUploading(true);
    setUploadProgress(10);
    
    const formData = new FormData();
    
    // Adiciona o arquivo ao FormData - importante: nosso backend espera um único arquivo com o campo 'file'
    formData.append('file', files[0]);
    
    // Adiciona descrição ou informações adicionais se necessário
    if (user) {
      formData.append('description', `Arquivo enviado por ${user.name}`);
    }
    
    setUploadProgress(30);
    
    // Simula um progresso gradual durante o upload
    const progressInterval = setInterval(() => {
      setUploadProgress(prev => {
        if (prev >= 90) {
          clearInterval(progressInterval);
          return prev;
        }
        return prev + 10;
      });
    }, 500);
    
    try {
      await uploadMutation.mutateAsync({
        entityType,
        entityId,
        formData
      });
      
      clearInterval(progressInterval);
      setUploadProgress(100);
    } catch (error) {
      clearInterval(progressInterval);
      console.error('Erro no upload:', error);
    }
  };
  
  // Configura evento de arrastar e soltar arquivos
  useEffect(() => {
    const handleDragOver = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(true);
    };
    
    const handleDragLeave = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
    };
    
    const handleDrop = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
      
      if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
        handleFileUpload(e.dataTransfer.files);
      }
    };
    
    window.addEventListener('dragover', handleDragOver);
    window.addEventListener('dragleave', handleDragLeave);
    window.addEventListener('drop', handleDrop);
    
    return () => {
      window.removeEventListener('dragover', handleDragOver);
      window.removeEventListener('dragleave', handleDragLeave);
      window.removeEventListener('drop', handleDrop);
    };
  }, [clientId, projectId, user]);
  
  // Função para baixar um arquivo
  const handleDownload = (attachment: UnifiedAttachment) => {
    // Criação de um link temporário para download
    const link = document.createElement('a');
    link.href = attachment.file_url;
    link.download = attachment.file_name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  // Função para excluir um arquivo
  const handleDelete = (attachment: UnifiedAttachment) => {
    deleteMutation.mutate({ id: attachment.id, type: attachment.type });
  };
  
  // Função para visualizar um arquivo
  const handleView = (attachment: UnifiedAttachment) => {
    window.open(attachment.file_url, '_blank');
  };
  
  // Função para selecionar/deselecionar um arquivo
  const handleSelectFile = (id: number, selected: boolean) => {
    if (selected) {
      setSelectedFiles(prev => [...prev, id]);
    } else {
      setSelectedFiles(prev => prev.filter(fileId => fileId !== id));
    }
  };
  
  // Função para excluir arquivos selecionados
  const handleDeleteSelected = () => {
    const selectedAttachments = unifiedAttachments.filter(att => selectedFiles.includes(att.id));
    
    // Confirmação de exclusão
    if (window.confirm(`Tem certeza que deseja excluir ${selectedFiles.length} arquivos?`)) {
      // Excluir cada arquivo selecionado
      selectedAttachments.forEach(att => {
        deleteMutation.mutate({ id: att.id, type: att.type });
      });
      
      // Limpar seleção
      setSelectedFiles([]);
    }
  };
  
  // Determina o status de loading
  const isLoading = clientLoading || projectLoading || taskLoading;
  
  return (
    <div className={`relative min-h-screen`}>
      {/* Área de upload por drag-and-drop */}
      {isDragging && (
        <div className="fixed inset-0 bg-primary-100/90 z-50 flex items-center justify-center">
          <div className="bg-white p-10 rounded-lg shadow-xl text-center">
            <Upload className="h-16 w-16 mx-auto text-primary mb-4" />
            <h2 className="text-2xl font-semibold">Solte os arquivos aqui</h2>
            <p className="mt-2 text-gray-500">Os arquivos serão enviados para a entidade selecionada</p>
          </div>
        </div>
      )}
      
      {/* Indicador de progresso do upload */}
      {uploading && (
        <div className="fixed bottom-4 right-4 w-80 bg-white rounded-lg shadow-lg p-4 z-50">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-medium">Enviando arquivos...</h3>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setUploading(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <Progress value={uploadProgress} className="mb-2" />
          <p className="text-sm text-gray-500">{uploadProgress}% concluído</p>
        </div>
      )}
      
      <div className="container mx-auto py-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Arquivos</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Gerencie todos os arquivos do sistema em um único lugar
            </p>
          </div>
          
          <div className="mt-4 md:mt-0 flex gap-2">
            <Button 
              variant="outline"
              size="sm"
              onClick={() => setView(view === 'grid' ? 'list' : 'grid')}
              className="flex items-center gap-1"
            >
              {view === 'grid' ? (
                <>
                  <List className="h-4 w-4" />
                  Lista
                </>
              ) : (
                <>
                  <Grid className="h-4 w-4" />
                  Grade
                </>
              )}
            </Button>
            
            <Button 
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1"
            >
              <Upload className="h-4 w-4" />
              Enviar
            </Button>
            
            {selectedFiles.length > 0 && (
              <Button 
                variant="destructive"
                size="sm"
                onClick={handleDeleteSelected}
                className="flex items-center gap-1"
              >
                <Trash2 className="h-4 w-4" />
                Excluir ({selectedFiles.length})
              </Button>
            )}
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 mb-6">
          <div className="md:col-span-12">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Pesquisar arquivos..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
              
              <Select
                value={clientId}
                onValueChange={setClientId}
              >
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="Todos os clientes" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os clientes</SelectItem>
                  {clients.map((client: any) => (
                    <SelectItem key={client.id} value={client.id.toString()}>
                      {client.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Select
                value={projectId}
                onValueChange={setProjectId}
              >
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="Todos os projetos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os projetos</SelectItem>
                  {projects.map((project: any) => (
                    <SelectItem key={project.id} value={project.id.toString()}>
                      {project.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Select
                value={attachmentType}
                onValueChange={setAttachmentType}
              >
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="Todos os tipos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os tipos</SelectItem>
                  <SelectItem value="client">Clientes</SelectItem>
                  <SelectItem value="project">Projetos</SelectItem>
                  <SelectItem value="task">Tarefas</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        
        {/* Exibição dos arquivos */}
        <div className="bg-white p-6 rounded-lg border">
          <FilesList
            attachments={filteredAttachments}
            isLoading={isLoading}
            onDownload={handleDownload}
            onDelete={handleDelete}
            getFileIcon={getFileIcon}
            view={view}
            selectedFiles={selectedFiles}
            onSelect={handleSelectFile}
          />
        </div>
      </div>
      
      {/* Input oculto para upload de arquivos */}
      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        multiple
        onChange={(e) => handleFileUpload(e.target.files)}
      />
    </div>
  );
}