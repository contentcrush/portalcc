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
  const { data: attachments, isLoading: isLoadingAttachments, refetch } = useQuery<{
    clients: ClientAttachment[],
    projects: ProjectAttachment[],
    tasks: TaskAttachment[]
  }>({
    queryKey: ['/api/attachments/all'],
    onError: () => {
      toast({
        title: "Erro ao carregar anexos",
        description: "Não foi possível carregar os anexos. Tente novamente mais tarde.",
        variant: "destructive",
      });
    }
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
    // Se for uma imagem, mostrar thumbnail real
    if (file.file_type.startsWith('image/')) {
      return (
        <div className="relative w-full h-full flex items-center justify-center overflow-hidden bg-muted rounded-md">
          <img 
            src={`/api/attachments/${file.type}s/${file.entity_id}/download/${file.id}`} 
            alt={file.file_name}
            className="object-cover w-full h-full"
            onError={(e) => {
              e.currentTarget.onerror = null;
              e.currentTarget.src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><circle cx="10" cy="13" r="2"/><path d="m20 17-1.09-1.09a2 2 0 0 0-2.82 0L10 22"/></svg>';
            }}
          />
        </div>
      );
    }
    
    // Para outros tipos de arquivo, mostrar ícones apropriados
    let icon;
    if (file.file_type.includes('pdf')) 
      icon = <FileText className="w-8 h-8 text-red-500" />;
    else if (file.file_type.includes('spreadsheet') || file.file_type.includes('excel') || file.file_type.includes('sheet')) 
      icon = <FileSpreadsheet className="w-8 h-8 text-green-500" />;
    else if (file.file_type.includes('zip') || file.file_type.includes('compressed')) 
      icon = <FileArchive className="w-8 h-8 text-purple-500" />;
    else if (file.file_type.startsWith('audio/')) 
      icon = <FileAudio className="w-8 h-8 text-yellow-500" />;
    else if (file.file_type.startsWith('video/')) 
      icon = <FileVideo className="w-8 h-8 text-pink-500" />;
    else 
      icon = <FileIcon className="w-8 h-8 text-gray-500" />;
    
    return (
      <div className="w-full h-full flex items-center justify-center bg-muted/50 rounded-md">
        {icon}
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
  const handleDelete = (attachment: UnifiedAttachment) => {
    if (confirm(`Tem certeza que deseja excluir o anexo "${attachment.file_name}"?`)) {
      deleteMutation.mutate({
        type: attachment.type,
        entityId: attachment.entity_id,
        attachmentId: attachment.id
      });
    }
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
            className="overflow-hidden hover:shadow-md transition-shadow h-full flex flex-col cursor-pointer"
            onClick={() => {
              if (onSelectFile) {
                onSelectFile(attachment);
              } else {
                setSelectedFilePreview(attachment);
                setPreviewOpen(true);
              }
            }}
          >
            <CardHeader className="p-3 pb-2 space-y-0">
              <div className="flex flex-row gap-3 items-start">
                <div className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0">
                  {getFilePreview(attachment)}
                </div>
                <div className="flex-1 min-w-0">
                  <CardTitle className="text-base truncate" title={attachment.file_name}>
                    {attachment.file_name}
                  </CardTitle>
                  <CardDescription className="truncate" title={attachment.entity_name}>
                    {attachment.entity_name}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pb-1 flex-grow">
              <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                <Badge variant="outline">
                  {attachment.type === 'client' ? 'Cliente' : attachment.type === 'project' ? 'Projeto' : 'Tarefa'}
                </Badge>
                <Badge variant="secondary">
                  {formatFileSize(attachment.file_size)}
                </Badge>
              </div>
              {attachment.description && (
                <div className="mt-2 text-sm line-clamp-2 text-muted-foreground" title={attachment.description}>
                  {attachment.description}
                </div>
              )}
              <div className="mt-2 text-xs text-muted-foreground">
                Adicionado em {format(new Date(attachment.uploaded_at), 'dd/MM/yyyy', { locale: ptBR })}
              </div>
              {attachment.tags && attachment.tags.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {attachment.tags.map((tag, index) => (
                    <Badge key={index} variant="secondary" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
              )}
            </CardContent>
            <CardFooter className="p-0 mt-auto">
              <div className="flex w-full border-t">
                <Button 
                  variant="ghost" 
                  size="sm"
                  className="rounded-none flex-1 h-9 px-2"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDownload(attachment);
                  }}
                >
                  <Download className="mr-1 h-4 w-4" />
                  <span className="text-xs">Download</span>
                </Button>
                <div className="w-px bg-border"></div>
                <Button 
                  variant="ghost" 
                  size="sm"
                  className="rounded-none flex-1 h-9 px-2 text-destructive hover:text-destructive hover:bg-destructive/10"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(attachment);
                  }}
                >
                  <Trash2 className="mr-1 h-4 w-4" />
                  <span className="text-xs">Excluir</span>
                </Button>
              </div>
            </CardFooter>
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
            <TableHead className="w-[50px]"></TableHead>
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
                <div className="flex items-center justify-center w-10 h-10 rounded overflow-hidden">
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
                      handleDelete(attachment);
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