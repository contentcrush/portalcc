import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Pagination } from "@/components/ui/pagination";
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
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import {
  Download,
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
  Search,
  Grid3X3,
  List,
  SortAsc,
  SortDesc,
  Tag,
  CalendarIcon,
  User,
  RefreshCw,
  Image,
} from "lucide-react";

import AdvancedFileUpload from "./AdvancedFileUpload";
import FilePreview from "./FilePreview";
import { formatFileSize } from "@/lib/utils";
import { clientAttachments, projectAttachments, taskAttachments, clients, projects, tasks, users } from "@shared/schema";

// Tipos para as entidades do anexo
type ClientAttachment = typeof clientAttachments.$inferSelect;
type ProjectAttachment = typeof projectAttachments.$inferSelect;
type TaskAttachment = typeof taskAttachments.$inferSelect;

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

// Props para o componente FileManager
interface FileManagerProps {
  defaultTab?: string;
  defaultView?: "grid" | "list";
  defaultClientId?: number;
  defaultProjectId?: number;
  maxHeight?: string;
  showTabs?: boolean;
  showFilters?: boolean;
  showSearch?: boolean;
  showPagination?: boolean;
  showViewToggle?: boolean;
  pageSize?: number;
  entityType?: 'client' | 'project' | 'task' | 'all';
  entityId?: number;
  onSelectFile?: (file: UnifiedAttachment) => void;
  onUploadSuccess?: (file: UnifiedAttachment) => void;
  className?: string;
}

export default function FileManager({
  defaultTab = "all",
  defaultView = "grid",
  defaultClientId,
  defaultProjectId,
  maxHeight,
  showTabs = true,
  showFilters = true,
  showSearch = true,
  showPagination = true,
  showViewToggle = true,
  pageSize = 12,
  entityType = "all",
  entityId,
  onSelectFile,
  onUploadSuccess,
  className = "",
}: FileManagerProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [filter, setFilter] = useState<string>("all");
  const [activeTab, setActiveTab] = useState<string>(defaultTab);
  const [selectedClient, setSelectedClient] = useState<string | number | null>(defaultClientId?.toString() || "all");
  const [selectedProject, setSelectedProject] = useState<string | number | null>(defaultProjectId?.toString() || "all");
  const [currentPage, setCurrentPage] = useState(1);
  const [viewMode, setViewMode] = useState<"grid" | "list">(defaultView);
  const [sortField, setSortField] = useState<string>("date");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedFilePreview, setSelectedFilePreview] = useState<UnifiedAttachment | null>(null);
  const [previewOpen, setPreviewOpen] = useState<boolean>(false);
  
  // Estados para o diálogo de confirmação de exclusão
  const [deleteDialogOpen, setDeleteDialogOpen] = useState<boolean>(false);
  const [fileToDelete, setFileToDelete] = useState<UnifiedAttachment | null>(null);

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Redefinir página quando os filtros mudam
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filter, activeTab, selectedClient, selectedProject]);

  // Ajustar tab e filtros com base nos props
  useEffect(() => {
    if (entityType !== "all") {
      setActiveTab(entityType);
    }
  }, [entityType]);

  // Ajustar cliente/projeto selecionado com base nos props
  useEffect(() => {
    if (defaultClientId) {
      setSelectedClient(defaultClientId.toString());
    }
    if (defaultProjectId) {
      setSelectedProject(defaultProjectId.toString());
    }
  }, [defaultClientId, defaultProjectId]);

  // Consulta para buscar todos os anexos
  const { data: attachments = { clients: [], projects: [], tasks: [] }, isLoading: isLoadingAttachments, refetch } = useQuery<{
    clients: ClientAttachment[],
    projects: ProjectAttachment[],
    tasks: TaskAttachment[]
  }>({
    queryKey: ['/api/attachments/all']
  });

  // Buscar dados de clientes para mostrar nomes
  const { data: clientsData = [] } = useQuery({
    queryKey: ['/api/clients'],
  });
  const clients = Array.isArray(clientsData) ? clientsData : [];

  // Buscar dados de projetos para mostrar nomes
  const { data: projectsData = [] } = useQuery({
    queryKey: ['/api/projects'],
  });
  const projects = Array.isArray(projectsData) ? projectsData : [];
  
  // Buscar dados de tarefas para mostrar nomes
  const { data: tasksData = [] } = useQuery({
    queryKey: ['/api/tasks'],
  });
  const tasks = Array.isArray(tasksData) ? tasksData : [];

  // Buscar dados de usuários para mostrar nomes
  const { data: users } = useQuery({
    queryKey: ['/api/users'],
  });

  // Função para atualizar a lista de arquivos
  const refreshFiles = async () => {
    setIsRefreshing(true);
    await refetch();
    setIsRefreshing(false);
  };

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
        title: "Anexo excluído",
        description: "O anexo foi excluído com sucesso.",
        variant: "default",
        className: "bg-green-100 border-green-400 text-green-900",
      });
      
      // Atualizar a lista de anexos
      queryClient.invalidateQueries({ queryKey: ['/api/attachments/all'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao excluir anexo",
        description: error.message || "Ocorreu um erro ao excluir o anexo.",
        variant: "destructive",
      });
    }
  });

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
      const clientAttachments = attachments.clients
        .filter(att => !entityId || (entityType === 'client' && att.client_id === entityId))
        .map(att => ({
          ...att,
          type: 'client' as const,
          entity_id: att.client_id,
          entity_name: clientMap.get(att.client_id)?.name || `Cliente ${att.client_id}`,
          uploader: att.uploaded_by ? userMap.get(att.uploaded_by) : null,
          uploaded_at: att.created_at || att.upload_date || new Date().toISOString()
        }));
      
      allAttachments = [...allAttachments, ...clientAttachments];
    }

    // Processar anexos de projetos
    if (attachments.projects) {
      const projectAttachments = attachments.projects
        .filter(att => !entityId || (entityType === 'project' && att.project_id === entityId))
        .map(att => ({
          ...att,
          type: 'project' as const,
          entity_id: att.project_id,
          entity_name: projectMap.get(att.project_id)?.name || `Projeto ${att.project_id}`,
          uploader: att.uploaded_by ? userMap.get(att.uploaded_by) : null,
          uploaded_at: att.created_at || att.upload_date || new Date().toISOString()
        }));
      
      allAttachments = [...allAttachments, ...projectAttachments];
    }

    // Processar anexos de tarefas
    if (attachments.tasks) {
      const taskAttachments = attachments.tasks
        .filter(att => !entityId || (entityType === 'task' && att.task_id === entityId))
        .map(att => ({
          ...att,
          type: 'task' as const,
          entity_id: att.task_id,
          entity_name: taskMap.get(att.task_id)?.title || `Tarefa ${att.task_id}`,
          uploader: att.uploaded_by ? userMap.get(att.uploaded_by) : null,
          uploaded_at: att.created_at || att.upload_date || new Date().toISOString()
        }));
      
      allAttachments = [...allAttachments, ...taskAttachments];
    }

    return allAttachments;
  };

  // Filtrar e ordenar anexos
  const getFilteredAttachments = (): UnifiedAttachment[] => {
    const processed = processAttachments();
    if (!processed.length) return [];

    let filtered = processed;

    // Filtrar por termo de busca
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        att => 
          att.file_name.toLowerCase().includes(term) || 
          (att.entity_name && att.entity_name.toLowerCase().includes(term)) ||
          (att.description && att.description.toLowerCase().includes(term)) ||
          (att.tags && att.tags.some(tag => tag.toLowerCase().includes(term)))
      );
    }

    // Filtrar por tipo de anexo
    if (activeTab !== "all") {
      filtered = filtered.filter(att => att.type === activeTab);
    }

    // Aplicar filtros adicionais
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

    // Aplicar ordenação
    return filtered.sort((a, b) => {
      if (sortField === "date") {
        const dateA = new Date(a.uploaded_at).getTime();
        const dateB = new Date(b.uploaded_at).getTime();
        return sortDirection === "asc" ? dateA - dateB : dateB - dateA;
      } else if (sortField === "name") {
        return sortDirection === "asc" 
          ? a.file_name.localeCompare(b.file_name)
          : b.file_name.localeCompare(a.file_name);
      } else if (sortField === "size") {
        return sortDirection === "asc" 
          ? a.file_size - b.file_size
          : b.file_size - a.file_size;
      } else if (sortField === "type") {
        return sortDirection === "asc" 
          ? a.file_type.localeCompare(b.file_type)
          : b.file_type.localeCompare(a.file_type);
      }
      return 0;
    });
  };

  // Paginação
  const paginatedAttachments = () => {
    const filtered = getFilteredAttachments();
    const startIndex = (currentPage - 1) * pageSize;
    return filtered.slice(startIndex, startIndex + pageSize);
  };

  // Calcular número total de páginas
  const totalPages = Math.ceil(getFilteredAttachments().length / pageSize);

  // Função para obter o thumbnail ou ícone correto com base no tipo de arquivo
  const getFilePreview = (file: UnifiedAttachment) => {
    // Determinar o tipo de arquivo pelo nome se o mime type não for fornecido
    const fileName = file.file_name.toLowerCase();
    const isPdf = file.file_type.includes('pdf') || fileName.endsWith('.pdf');
    const isImage = file.file_type.startsWith('image/') || 
                    fileName.endsWith('.jpg') || 
                    fileName.endsWith('.jpeg') || 
                    fileName.endsWith('.png') || 
                    fileName.endsWith('.gif') || 
                    fileName.endsWith('.webp');
    
    // Se for uma imagem, mostrar thumbnail real
    if (isImage) {
      return (
        <div className="relative w-full h-full flex items-center justify-center overflow-hidden bg-muted/10 rounded-md">
          <img 
            src={`/api/attachments/${file.type}s/${file.entity_id}/download/${file.id}`} 
            alt={file.file_name}
            className="object-cover w-full h-full"
            onError={(e) => {
              // Se a imagem falhar, mostrar um ícone de imagem estilizado
              const parentDiv = e.currentTarget.parentElement;
              if (parentDiv) {
                e.currentTarget.style.display = 'none';
                const iconDiv = document.createElement('div');
                iconDiv.className = "w-full h-full flex items-center justify-center";
                iconDiv.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" class="text-emerald-500"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"></rect><circle cx="9" cy="9" r="2"></circle><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"></path></svg>';
                parentDiv.appendChild(iconDiv);
              }
            }}
          />
        </div>
      );
    }
    
    // PDF também pode ter preview via thumb
    if (isPdf) {
      return (
        <div className="w-full h-full flex items-center justify-center bg-muted/10 rounded-md border border-muted/5">
          <FileText className="w-5 h-5 text-red-500 stroke-[1.75]" />
        </div>
      );
    }
    
    // Ícones no estilo AirBnB (simples, uniformes e minimalistas)
    // Cores mais vibrantes e uniformes com tamanho consistente
    const getIconByType = () => {
      // Documentos de texto/escritório
      if (fileName.endsWith('.doc') || fileName.endsWith('.docx') || file.file_type.includes('word'))
        return <FileText className="w-5 h-5 text-blue-500 stroke-[1.75]" />;
      
      // Planilhas
      if (fileName.endsWith('.xls') || fileName.endsWith('.xlsx') || fileName.endsWith('.csv') || 
          file.file_type.includes('spreadsheet') || file.file_type.includes('excel') || file.file_type.includes('sheet'))
        return <FileSpreadsheet className="w-5 h-5 text-green-500 stroke-[1.75]" />;
      
      // Apresentações
      if (fileName.endsWith('.ppt') || fileName.endsWith('.pptx') || file.file_type.includes('presentation'))
        return <FileText className="w-5 h-5 text-orange-500 stroke-[1.75]" />;
        
      // Arquivos comprimidos
      if (fileName.endsWith('.zip') || fileName.endsWith('.rar') || fileName.endsWith('.7z') || 
          file.file_type.includes('zip') || file.file_type.includes('compressed'))
        return <FileArchive className="w-5 h-5 text-purple-500 stroke-[1.75]" />;
      
      // Áudio
      if (fileName.endsWith('.mp3') || fileName.endsWith('.wav') || fileName.endsWith('.ogg') || 
          file.file_type.startsWith('audio/'))
        return <FileAudio className="w-5 h-5 text-amber-500 stroke-[1.75]" />;
      
      // Vídeo
      if (fileName.endsWith('.mp4') || fileName.endsWith('.mov') || fileName.endsWith('.avi') || 
          file.file_type.startsWith('video/'))
        return <FileVideo className="w-5 h-5 text-blue-500 stroke-[1.75]" />;
      
      // Imagens (caso caia aqui apesar da verificação anterior)
      if (isImage || file.file_type.includes('image'))
        return <FileImage className="w-5 h-5 text-emerald-500 stroke-[1.75]" />;
      
      // Arquivo genérico
      return <FileIcon className="w-5 h-5 text-slate-500 stroke-[1.75]" />;
    };
    
    return (
      <div className="w-full h-full flex items-center justify-center bg-muted/10 rounded-md border border-muted/5">
        {getIconByType()}
      </div>
    );
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
  };

  // Função para lidar com a exclusão de um anexo
  const handleDelete = (e: React.MouseEvent, attachment: UnifiedAttachment) => {
    e.stopPropagation(); // Impede que o clique propague para o card e abra o preview
    setFileToDelete(attachment);
    setDeleteDialogOpen(true);
  };
  
  // Função para confirmar exclusão no diálogo
  const confirmDelete = () => {
    if (!fileToDelete) return;
    
    deleteMutation.mutate({
      type: fileToDelete.type,
      entityId: fileToDelete.entity_id,
      attachmentId: fileToDelete.id
    });
  };

  // Verificar se está carregando algum dado necessário
  const isLoading = isLoadingAttachments || 
                   !clients || 
                   !projects || 
                   !tasks || 
                   !users;

  // Função para alternar a direção da ordenação
  const toggleSortDirection = () => {
    setSortDirection(sortDirection === "asc" ? "desc" : "asc");
  };

  // Função para alterar o campo de ordenação
  const handleSortChange = (field: string) => {
    if (sortField === field) {
      toggleSortDirection();
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  // Renderizar visualização em grade
  const renderGridView = () => {
    const items = paginatedAttachments();
    
    if (items.length === 0) {
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
    
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map((attachment) => (
          <Card 
            key={`${attachment.type}-${attachment.id}`} 
            className="overflow-hidden hover:shadow-md transition-shadow flex flex-col cursor-pointer border-muted/80"
            onClick={() => {
              if (onSelectFile) {
                onSelectFile(attachment);
              } else {
                setSelectedFilePreview(attachment);
                setPreviewOpen(true);
              }
            }}
          >
            <div className="flex p-3 items-center gap-3">
              {/* Ícone do arquivo - Versão menor */}
              <div className="w-8 h-8 rounded-md overflow-hidden flex-shrink-0 bg-muted/15 flex items-center justify-center border border-muted/10">
                {getFilePreview(attachment)}
              </div>
              
              {/* Informações do arquivo */}
              <div className="flex-1 min-w-0">
                <h3 className="font-medium text-sm truncate" title={attachment.file_name}>
                  {attachment.file_name}
                </h3>
                <p className="text-xs text-muted-foreground truncate" title={attachment.entity_name}>
                  {attachment.entity_name}
                </p>
                {attachment.type !== 'client' && (
                  <p className="text-xs text-muted-foreground/70 truncate">
                    {clientsData?.find(c => 
                      (attachment.type === 'project' && clients?.find(p => p.id === attachment.entity_id)?.client_id === c.id) ||
                      (attachment.type === 'task' && tasks?.find(t => t.id === attachment.entity_id)?.project?.client_id === c.id)
                    )?.name || ''}
                  </p>
                )}
              </div>
            </div>
            
            {/* Metadados do arquivo */}
            <div className="px-3 pb-2">
              <div className="flex items-center gap-2 justify-between">
                <Badge variant="outline" className="text-xs py-0 h-5">
                  {attachment.type === 'client' ? 'Cliente' : attachment.type === 'project' ? 'Projeto' : 'Tarefa'}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {formatFileSize(attachment.file_size)}
                </span>
              </div>
              
              {/* Descrição (se houver) */}
              {attachment.description && (
                <div className="mt-2 text-xs line-clamp-1 text-muted-foreground" title={attachment.description}>
                  {attachment.description}
                </div>
              )}
              
              {/* Data de upload */}
              <div className="mt-1 text-xs text-muted-foreground">
                Adicionado em {format(new Date(attachment.uploaded_at), 'dd/MM/yyyy', { locale: ptBR })}
              </div>
              
              {/* Tags (se houver) */}
              {attachment.tags && attachment.tags.length > 0 && (
                <div className="mt-1 flex flex-wrap gap-1">
                  {attachment.tags.slice(0, 2).map((tag, index) => (
                    <Badge key={index} variant="secondary" className="text-xs py-0 h-5">
                      {tag}
                    </Badge>
                  ))}
                  {attachment.tags.length > 2 && (
                    <Badge variant="secondary" className="text-xs py-0 h-5">
                      +{attachment.tags.length - 2}
                    </Badge>
                  )}
                </div>
              )}
            </div>
            
            {/* Botões de ação */}
            <div className="mt-auto border-t flex text-xs">
              <Button 
                variant="ghost" 
                size="sm" 
                className="text-primary flex-1 h-8 rounded-none rounded-bl"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDownload(attachment);
                }}
              >
                <Download className="h-3.5 w-3.5 mr-1" />
                Download
              </Button>
              <div className="w-px bg-border h-8"></div>
              <Button 
                variant="ghost" 
                size="sm"
                className="text-destructive flex-1 h-8 rounded-none rounded-br"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDelete(e, attachment);
                }}
              >
                <Trash2 className="h-3.5 w-3.5 mr-1" />
                Excluir
              </Button>
            </div>
          </Card>
        ))}
      </div>
    );
  };

  // Renderizar visualização em lista
  const renderListView = () => {
    const items = paginatedAttachments();
    
    if (items.length === 0) {
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
    
    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[40px]"></TableHead>
            <TableHead className="cursor-pointer" onClick={() => handleSortChange("name")}>
              <div className="flex items-center">
                Nome do Arquivo
                {sortField === "name" && (
                  sortDirection === "asc" ? 
                    <SortAsc className="ml-1 h-4 w-4" /> : 
                    <SortDesc className="ml-1 h-4 w-4" />
                )}
              </div>
            </TableHead>
            <TableHead>Entidade</TableHead>
            <TableHead>Cliente</TableHead>
            <TableHead className="cursor-pointer" onClick={() => handleSortChange("type")}>
              <div className="flex items-center">
                Tipo
                {sortField === "type" && (
                  sortDirection === "asc" ? 
                    <SortAsc className="ml-1 h-4 w-4" /> : 
                    <SortDesc className="ml-1 h-4 w-4" />
                )}
              </div>
            </TableHead>
            <TableHead className="cursor-pointer" onClick={() => handleSortChange("size")}>
              <div className="flex items-center">
                Tamanho
                {sortField === "size" && (
                  sortDirection === "asc" ? 
                    <SortAsc className="ml-1 h-4 w-4" /> : 
                    <SortDesc className="ml-1 h-4 w-4" />
                )}
              </div>
            </TableHead>
            <TableHead className="cursor-pointer" onClick={() => handleSortChange("date")}>
              <div className="flex items-center">
                Data
                {sortField === "date" && (
                  sortDirection === "asc" ? 
                    <SortAsc className="ml-1 h-4 w-4" /> : 
                    <SortDesc className="ml-1 h-4 w-4" />
                )}
              </div>
            </TableHead>
            <TableHead>Tags</TableHead>
            <TableHead className="text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((attachment) => (
            <TableRow 
              key={`${attachment.type}-${attachment.id}`}
              className="cursor-pointer"
              onClick={() => {
                if (onSelectFile) {
                  onSelectFile(attachment);
                } else {
                  setSelectedFilePreview(attachment);
                  setPreviewOpen(true);
                }
              }}
            >
              <TableCell>
                <div className="flex items-center justify-center w-8 h-8 rounded-md overflow-hidden bg-muted/15 border border-muted/10">
                  {getFilePreview(attachment)}
                </div>
              </TableCell>
              <TableCell className="font-medium">
                <div className="truncate max-w-[200px]" title={attachment.file_name}>
                  {attachment.file_name}
                </div>
                {attachment.description && (
                  <div className="text-xs text-muted-foreground truncate max-w-[200px]" title={attachment.description}>
                    {attachment.description}
                  </div>
                )}
              </TableCell>
              <TableCell>
                <div className="flex flex-col">
                  <Badge variant="outline" className="w-fit mb-1">
                    {attachment.type === 'client' ? 'Cliente' : attachment.type === 'project' ? 'Projeto' : 'Tarefa'}
                  </Badge>
                  <span className="text-sm truncate max-w-[120px]" title={attachment.entity_name}>
                    {attachment.entity_name}
                  </span>
                </div>
              </TableCell>
              <TableCell>
                <span className="text-sm truncate max-w-[120px]" title={
                  attachment.type === 'client' 
                    ? attachment.entity_name 
                    : clientsData?.find(c => 
                        (attachment.type === 'project' && clients?.find(p => p.id === attachment.entity_id)?.client_id === c.id) ||
                        (attachment.type === 'task' && tasks?.find(t => t.id === attachment.entity_id)?.project?.client_id === c.id)
                      )?.name || ''
                }>
                  {attachment.type === 'client' 
                    ? attachment.entity_name 
                    : clientsData?.find(c => 
                        (attachment.type === 'project' && clients?.find(p => p.id === attachment.entity_id)?.client_id === c.id) ||
                        (attachment.type === 'task' && tasks?.find(t => t.id === attachment.entity_id)?.project?.client_id === c.id)
                      )?.name || '-'}
                </span>
              </TableCell>
              <TableCell>
                {attachment.file_type.split('/')[1] || attachment.file_type}
              </TableCell>
              <TableCell>{formatFileSize(attachment.file_size)}</TableCell>
              <TableCell>
                {format(new Date(attachment.uploaded_at), 'dd/MM/yyyy', { locale: ptBR })}
              </TableCell>
              <TableCell>
                <div className="flex flex-wrap gap-1">
                  {attachment.tags && attachment.tags.length > 0 ? (
                    attachment.tags.map((tag, index) => (
                      <Badge key={index} variant="secondary" className="text-xs">
                        {tag}
                      </Badge>
                    ))
                  ) : (
                    <span className="text-xs text-muted-foreground">-</span>
                  )}
                </div>
              </TableCell>
              <TableCell className="text-right">
                <div className="flex items-center justify-end space-x-1">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDownload(attachment);
                    }}
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(e, attachment);
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );
  };

  // Função para fechar a visualização do arquivo
  const handleClosePreview = () => {
    setPreviewOpen(false);
    setSelectedFilePreview(null);
  };

  return (
    <div className={className}>
      <div className="space-y-4">
        {/* Barra superior com ações */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          {/* Pesquisa */}
          {showSearch && (
            <div className="relative w-full md:w-96">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar arquivos..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
          )}
          
          <div className="flex items-center gap-2 ml-auto">
            {/* Botão de atualizar */}
            <Button
              variant="outline"
              size="icon"
              onClick={refreshFiles}
              disabled={isRefreshing}
              title="Atualizar lista"
            >
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            </Button>
            
            {/* Alternador de visualização */}
            {showViewToggle && (
              <div className="border rounded-md flex">
                <Button
                  variant={viewMode === "grid" ? "subtle" : "ghost"}
                  size="icon"
                  className="h-9 w-9 rounded-none rounded-l-md"
                  onClick={() => setViewMode("grid")}
                >
                  <Grid3X3 className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === "list" ? "subtle" : "ghost"}
                  size="icon"
                  className="h-9 w-9 rounded-none rounded-r-md"
                  onClick={() => setViewMode("list")}
                >
                  <List className="h-4 w-4" />
                </Button>
              </div>
            )}
            
            {/* Botão de upload avançado */}
            <AdvancedFileUpload
              onSuccess={(attachment) => {
                if (onUploadSuccess) {
                  onUploadSuccess(attachment as UnifiedAttachment);
                }
                refreshFiles();
              }}
              defaultEntityType={entityType !== "all" ? entityType : undefined}
              defaultEntityId={entityType !== "all" ? entityId : undefined}
            />
          </div>
        </div>
        
        {/* Tabs para filtrar por tipo de entidade */}
        {showTabs && (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="w-full md:w-auto">
              <TabsTrigger value="all" className="flex-1 md:flex-none">
                Todos
              </TabsTrigger>
              <TabsTrigger value="client" className="flex-1 md:flex-none">
                Clientes
              </TabsTrigger>
              <TabsTrigger value="project" className="flex-1 md:flex-none">
                Projetos
              </TabsTrigger>
              <TabsTrigger value="task" className="flex-1 md:flex-none">
                Tarefas
              </TabsTrigger>
            </TabsList>
          </Tabs>
        )}
        
        {/* Filtros adicionais */}
        {showFilters && (
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <Select value={filter} onValueChange={setFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filtrar por tipo de arquivo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os tipos</SelectItem>
                  <SelectItem value="images">Imagens</SelectItem>
                  <SelectItem value="documents">Documentos</SelectItem>
                  <SelectItem value="media">Mídia (Áudio/Vídeo)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex-1">
              <Select value={selectedClient?.toString()} onValueChange={setSelectedClient}>
                <SelectTrigger>
                  <SelectValue placeholder="Filtrar por cliente" />
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
            
            <div className="flex-1">
              <Select 
                value={selectedProject?.toString()} 
                onValueChange={setSelectedProject}
                disabled={!clients}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Filtrar por projeto" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os projetos</SelectItem>
                  {projects?.filter((project: any) => {
                    if (selectedClient && selectedClient !== "all") {
                      const clientId = typeof selectedClient === "number" 
                        ? selectedClient 
                        : parseInt(selectedClient);
                      return project.client_id === clientId;
                    }
                    return true;
                  }).map((project: any) => (
                    <SelectItem key={project.id} value={project.id.toString()}>
                      {project.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}
        
        {/* Conteúdo principal - lista de arquivos */}
        <div className={maxHeight ? `overflow-y-auto ${maxHeight}` : ""}>
          {isLoading ? (
            <div className="flex items-center justify-center h-60">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
            </div>
          ) : (
            viewMode === "grid" ? renderGridView() : renderListView()
          )}
        </div>
        
        {/* Paginação */}
        {showPagination && totalPages > 1 && (
          <div className="flex items-center justify-between py-4 border-t">
            <div className="text-sm text-muted-foreground">
              Mostrando {((currentPage - 1) * pageSize) + 1} a {Math.min(currentPage * pageSize, getFilteredAttachments().length)} de {getFilteredAttachments().length} arquivos
            </div>
            <Pagination>
              <Pagination.First
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
                className="cursor-pointer"
              />
              <Pagination.Prev
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="cursor-pointer"
              />
              <Pagination.Next
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="cursor-pointer"
              />
              <Pagination.Last
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage === totalPages}
                className="cursor-pointer"
              />
            </Pagination>
          </div>
        )}
      </div>
      
      {/* Diálogo de confirmação de exclusão */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o arquivo <span className="font-medium">{fileToDelete?.file_name}</span>?
              <br />Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      {/* Componente de visualização de arquivos */}
      <FilePreview 
        file={selectedFilePreview}
        open={previewOpen}
        onClose={handleClosePreview}
        onDownload={handleDownload}
      />
    </div>
  );
}