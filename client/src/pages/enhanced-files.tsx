import { useState, useRef, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format, parseISO, isSameMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
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
  Star,
  Clock,
  AlertTriangle,
  Info,
  MoreHorizontal,
  Share,
  FolderTree,
  Rows3,
  Sparkles
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
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
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
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
import { apiRequest, queryClient } from "@/lib/queryClient";
import { formatFileSize, cn } from "@/lib/utils";

// Importar componentes personalizados
import FileUploadForm from "@/components/FileUploadForm";
import FileViewer from "@/components/FileViewer";
import FileTreeView, { transformDataToTree } from "@/components/FileTreeView";
import FileRecentsAndFavorites from "@/components/FileRecentsAndFavorites";
import FileAdvancedFilters from "@/components/FileAdvancedFilters";
import FileShareDialog from "@/components/FileShareDialog";
import FileTrashBin from "@/components/FileTrashBin";

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
  isFavorite?: boolean;
}

// Interface para arquivos excluídos
interface DeletedFile {
  id: number;
  name: string;
  type: string;
  size: number;
  deletedAt: string;
  entityType: 'client' | 'project' | 'task';
  entityId: number;
  entityName: string;
  path: string;
  thumbnailUrl?: string;
}

// Interface para filtros avançados
interface FilterOptions {
  fileType?: string[];
  dateRange?: {
    from?: Date;
    to?: Date;
  };
  sizeRange?: {
    min?: number;
    max?: number;
  };
  uploadedBy?: number[];
  entities?: {
    clients?: number[];
    projects?: number[];
    tasks?: number[];
  };
  searchInContent?: boolean;
  tags?: string[];
}

// Tipo para opções de agrupamento
type GroupingOption = 'none' | 'date' | 'month' | 'client' | 'project' | 'type' | 'uploader';

export default function EnhancedFiles() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Estados para navegação e filtros
  const [view, setView] = useState<'grid' | 'list' | 'tree'>('grid');
  const [activeTab, setActiveTab] = useState<'all' | 'recents' | 'favorites'>('all');
  const [searchTerm, setSearchTerm] = useState("");
  const [clientId, setClientId] = useState<string>("all");
  const [projectId, setProjectId] = useState<string>("all");
  const [attachmentType, setAttachmentType] = useState<string>("all");
  const [selectedFiles, setSelectedFiles] = useState<number[]>([]);
  const [groupBy, setGroupBy] = useState<GroupingOption>('month');
  const [sortBy, setSortBy] = useState<'date' | 'name' | 'size'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [filterOptions, setFilterOptions] = useState<FilterOptions>({});
  
  // Estados para uploads e ações
  const [isUploadFormOpen, setIsUploadFormOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  
  // Estados para diálogos e visualizadores
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);
  const [isTrashBinOpen, setIsTrashBinOpen] = useState(false);
  const [selectedAttachment, setSelectedAttachment] = useState<UnifiedAttachment | null>(null);
  const [isFileViewerOpen, setIsFileViewerOpen] = useState(false);
  
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
  
  // Busca usuários para o filtro
  const { data: users = [] } = useQuery({
    queryKey: ["/api/users"],
    staleTime: 5 * 60 * 1000, // 5 minutos
  });
  
  // Busca tarefas para o filtro
  const { data: tasks = [] } = useQuery({
    queryKey: ["/api/tasks"],
    staleTime: 5 * 60 * 1000, // 5 minutos
  });
  
  // Busca anexos do cliente
  const {
    data: clientAttachments = [],
    isLoading: clientLoading,
    isError: clientError,
    refetch: refetchClientAttachments,
  } = useQuery({
    queryKey: ["/api/attachments/clients", clientId],
    queryFn: async () => {
      // Se o clientId for específico, filtra os resultados no cliente
      let url = '/api/attachments/clients';
      
      if (clientId !== 'all') {
        url = `/api/attachments/clients/${clientId}`;
      }
      
      const response = await fetch(url);
      if (!response.ok) {
        // Se for erro de autenticação (401), retornamos um array vazio em vez de lançar um erro
        if (response.status === 401) {
          console.warn('Não autenticado ao carregar anexos de clientes, retornando lista vazia');
          return [];
        }
        throw new Error('Falha ao carregar anexos de clientes');
      }
      
      return await response.json();
    },
  });
  
  // Busca anexos de projeto
  const {
    data: projectAttachments = [],
    isLoading: projectLoading,
    isError: projectError,
    refetch: refetchProjectAttachments,
  } = useQuery({
    queryKey: ["/api/attachments/projects", projectId],
    queryFn: async () => {
      // Se o projectId for específico, filtra os resultados no cliente
      let url = '/api/attachments/projects';
      
      if (projectId !== 'all') {
        url = `/api/attachments/projects/${projectId}`;
      }
      
      const response = await fetch(url);
      if (!response.ok) {
        // Se for erro de autenticação (401), retornamos um array vazio em vez de lançar um erro
        if (response.status === 401) {
          console.warn('Não autenticado ao carregar anexos de projetos, retornando lista vazia');
          return [];
        }
        throw new Error('Falha ao carregar anexos de projetos');
      }
      
      return await response.json();
    },
  });
  
  // Busca anexos de tarefa
  const {
    data: taskAttachments = [],
    isLoading: taskLoading,
    isError: taskError,
    refetch: refetchTaskAttachments,
  } = useQuery({
    queryKey: ["/api/attachments/tasks"],
    queryFn: async () => {
      // Obtém todos os anexos de tarefas
      const response = await fetch('/api/attachments/tasks');
      if (!response.ok) {
        // Se for erro de autenticação (401), retornamos um array vazio em vez de lançar um erro
        if (response.status === 401) {
          console.warn('Não autenticado ao carregar anexos de tarefas, retornando lista vazia');
          return [];
        }
        throw new Error('Falha ao carregar anexos de tarefas');
      }
      
      const attachments = await response.json();
      return attachments;
    },
  });
  
  // Busca arquivos marcados como favoritos
  const {
    data: favoriteAttachments = [],
    isLoading: favoriteLoading,
    refetch: refetchFavorites,
  } = useQuery({
    queryKey: ["/api/attachments/favorites"],
    queryFn: async () => {
      try {
        const response = await fetch('/api/attachments/favorites');
        if (!response.ok) {
          if (response.status === 401) {
            return [];
          }
          throw new Error('Falha ao carregar arquivos favoritos');
        }
        return await response.json();
      } catch (error) {
        console.error('Erro ao carregar favoritos:', error);
        return [];
      }
    },
  });
  
  // Busca arquivos recentes
  const {
    data: recentAttachments = [],
    isLoading: recentLoading,
    refetch: refetchRecents,
  } = useQuery({
    queryKey: ["/api/attachments/recent"],
    queryFn: async () => {
      try {
        const response = await fetch('/api/attachments/recent');
        if (!response.ok) {
          if (response.status === 401) {
            return [];
          }
          throw new Error('Falha ao carregar arquivos recentes');
        }
        return await response.json();
      } catch (error) {
        console.error('Erro ao carregar recentes:', error);
        return [];
      }
    },
  });
  
  // Busca arquivos excluídos
  const {
    data: deletedFiles = [],
    isLoading: deletedLoading,
    refetch: refetchDeleted,
  } = useQuery({
    queryKey: ["/api/attachments/deleted"],
    queryFn: async () => {
      try {
        const response = await fetch('/api/attachments/deleted');
        if (!response.ok) {
          if (response.status === 401) {
            return [];
          }
          throw new Error('Falha ao carregar arquivos excluídos');
        }
        return await response.json();
      } catch (error) {
        console.error('Erro ao carregar excluídos:', error);
        return [];
      }
    },
    enabled: false, // Não carregar automaticamente
  });
  
  // Mutação para upload de arquivo
  const uploadMutation = useMutation({
    mutationFn: async ({ entityType, entityId, formData }: { 
      entityType: string; 
      entityId: string; 
      formData: FormData;
    }) => {
      const endpoint = `/api/attachments/${entityType}s/${entityId}`;
      const response = await fetch(endpoint, {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Erro ao fazer upload do arquivo');
      }
      
      return await response.json();
    },
    onSuccess: () => {
      // Atualizar todas as consultas relevantes
      refetchAttachments();
      refetchFavorites();
      refetchRecents();
      
      toast({
        title: "Arquivo enviado com sucesso",
        variant: "default",
        className: "bg-green-50 text-green-900 border-green-200",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao enviar arquivo",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Mutação para excluir arquivo
  const deleteMutation = useMutation({
    mutationFn: async ({ id, type }: { id: number; type: string }) => {
      const response = await fetch(`/api/attachments/${type}s/${id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Erro ao excluir arquivo');
      }
      
      return { id, type };
    },
    onSuccess: (data) => {
      // Atualizar todas as consultas relevantes
      refetchAttachments();
      refetchFavorites();
      refetchRecents();
      refetchDeleted();
      
      toast({
        title: "Arquivo movido para a lixeira",
        description: "O arquivo foi excluído e pode ser restaurado da lixeira",
        variant: "default",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao excluir arquivo",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Mutação para marcar/desmarcar arquivo como favorito
  const favoriteMutation = useMutation({
    mutationFn: async ({ id, type, isFavorite }: { id: number; type: string; isFavorite: boolean }) => {
      const response = await fetch(`/api/attachments/${type}s/${id}/favorite`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ isFavorite }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Erro ao atualizar favorito');
      }
      
      return { id, type, isFavorite };
    },
    onSuccess: (data) => {
      // Atualizar consultas relevantes
      refetchAttachments();
      refetchFavorites();
      
      toast({
        title: data.isFavorite ? "Adicionado aos favoritos" : "Removido dos favoritos",
        variant: "default",
        className: data.isFavorite ? "bg-yellow-50 text-yellow-900 border-yellow-200" : undefined,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao atualizar favorito",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Mutação para restaurar arquivos excluídos
  const restoreMutation = useMutation({
    mutationFn: async (fileIds: (number | string)[]) => {
      const response = await fetch(`/api/attachments/restore`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ fileIds }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Erro ao restaurar arquivos');
      }
      
      return await response.json();
    },
    onSuccess: () => {
      // Atualizar consultas relevantes
      refetchAttachments();
      refetchDeleted();
      
      toast({
        title: "Arquivos restaurados com sucesso",
        variant: "default",
        className: "bg-green-50 text-green-900 border-green-200",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao restaurar arquivos",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Mutação para excluir permanentemente arquivos
  const permanentDeleteMutation = useMutation({
    mutationFn: async (fileIds: (number | string)[]) => {
      const response = await fetch(`/api/attachments/permanent-delete`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ fileIds }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Erro ao excluir permanentemente');
      }
      
      return await response.json();
    },
    onSuccess: () => {
      // Atualizar consultas relevantes
      refetchDeleted();
      
      toast({
        title: "Arquivos excluídos permanentemente",
        variant: "default",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao excluir permanentemente",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Mutação para compartilhar arquivo
  const shareMutation = useMutation({
    mutationFn: async ({ fileId, permissions }: { fileId: number; permissions: any[] }) => {
      const response = await fetch(`/api/attachments/share`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ fileId, permissions }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Erro ao compartilhar arquivo');
      }
      
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Arquivo compartilhado com sucesso",
        variant: "default",
        className: "bg-green-50 text-green-900 border-green-200",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao compartilhar arquivo",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Função para refrescar todos os dados de anexos
  const refetchAttachments = useCallback(() => {
    refetchClientAttachments();
    refetchProjectAttachments();
    refetchTaskAttachments();
  }, [refetchClientAttachments, refetchProjectAttachments, refetchTaskAttachments]);
  
  // Efeito para carregar metadados completos para cada anexo
  useEffect(() => {
    // Aqui poderia ter uma lógica para carregar dados adicionais como thumbnails
    // ou metadados mais detalhados para cada anexo
  }, [clientAttachments, projectAttachments, taskAttachments]);
  
  // Unifica os anexos em um único array com tipagem consistente
  const unifiedAttachments: UnifiedAttachment[] = [
    ...(Array.isArray(clientAttachments) ? clientAttachments.map((att: any) => ({
      ...att,
      type: 'client' as const,
      entity_id: att.client_id,
      entity_name: Array.isArray(clients) ? clients.find((c: any) => c.id === att.client_id)?.name || 'Cliente não encontrado' : `Cliente ${att.client_id}`,
      tags: att.tags ? (typeof att.tags === 'string' ? att.tags.split(',') : att.tags) : null,
    })) : []),
    ...(Array.isArray(projectAttachments) ? projectAttachments.map((att: any) => ({
      ...att,
      type: 'project' as const,
      entity_id: att.project_id,
      entity_name: Array.isArray(projects) ? projects.find((p: any) => p.id === att.project_id)?.name || 'Projeto não encontrado' : `Projeto ${att.project_id}`,
      tags: att.tags ? (typeof att.tags === 'string' ? att.tags.split(',') : att.tags) : null,
    })) : []),
    ...(Array.isArray(taskAttachments) ? taskAttachments.map((att: any) => ({
      ...att,
      type: 'task' as const,
      entity_id: att.task_id,
      entity_name: att.title || `Tarefa ${att.task_id}`,
      tags: att.tags ? (typeof att.tags === 'string' ? att.tags.split(',') : att.tags) : null,
    })) : [])
  ];
  
  // Aplica filtros avançados nos anexos
  const applyAdvancedFilters = (attachments: UnifiedAttachment[]) => {
    if (!filterOptions || Object.keys(filterOptions).length === 0) {
      return attachments;
    }
    
    return attachments.filter(att => {
      // Filtrar por tipo de arquivo
      if (filterOptions.fileType && filterOptions.fileType.length > 0) {
        if (!filterOptions.fileType.includes(att.file_type)) {
          return false;
        }
      }
      
      // Filtrar por intervalo de datas
      if (filterOptions.dateRange) {
        const uploadDate = new Date(att.uploaded_at);
        
        if (filterOptions.dateRange.from && uploadDate < filterOptions.dateRange.from) {
          return false;
        }
        
        if (filterOptions.dateRange.to) {
          const endOfDay = new Date(filterOptions.dateRange.to);
          endOfDay.setHours(23, 59, 59, 999);
          
          if (uploadDate > endOfDay) {
            return false;
          }
        }
      }
      
      // Filtrar por tamanho do arquivo
      if (filterOptions.sizeRange) {
        if (filterOptions.sizeRange.min !== undefined && att.file_size < filterOptions.sizeRange.min) {
          return false;
        }
        
        if (filterOptions.sizeRange.max !== undefined && att.file_size > filterOptions.sizeRange.max) {
          return false;
        }
      }
      
      // Filtrar por quem fez upload
      if (filterOptions.uploadedBy && filterOptions.uploadedBy.length > 0) {
        if (!filterOptions.uploadedBy.includes(att.uploaded_by || 0)) {
          return false;
        }
      }
      
      // Filtrar por entidade (cliente, projeto, tarefa)
      if (filterOptions.entities) {
        if (
          filterOptions.entities.clients && 
          filterOptions.entities.clients.length > 0 && 
          att.type === 'client' && 
          !filterOptions.entities.clients.includes(att.entity_id)
        ) {
          return false;
        }
        
        if (
          filterOptions.entities.projects && 
          filterOptions.entities.projects.length > 0 && 
          att.type === 'project' && 
          !filterOptions.entities.projects.includes(att.entity_id)
        ) {
          return false;
        }
        
        if (
          filterOptions.entities.tasks && 
          filterOptions.entities.tasks.length > 0 && 
          att.type === 'task' && 
          !filterOptions.entities.tasks.includes(att.entity_id)
        ) {
          return false;
        }
      }
      
      // Filtrar por tags
      if (filterOptions.tags && filterOptions.tags.length > 0) {
        if (!att.tags) {
          return false;
        }
        
        const attachmentTags = Array.isArray(att.tags) ? att.tags : [att.tags];
        
        if (!filterOptions.tags.some(tag => attachmentTags.includes(tag))) {
          return false;
        }
      }
      
      return true;
    });
  };
  
  // Filtra os anexos com base nos critérios selecionados
  const filteredAttachments = unifiedAttachments.filter(att => {
    // Filtro básico de busca por texto
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      const nameMatch = att.file_name.toLowerCase().includes(searchLower);
      const entityMatch = att.entity_name?.toLowerCase().includes(searchLower) || false;
      const tagMatch = att.tags ? 
        (Array.isArray(att.tags) ? 
          att.tags.some(tag => tag.toLowerCase().includes(searchLower)) : 
          att.tags.toLowerCase().includes(searchLower)
        ) : 
        false;
      
      if (!(nameMatch || entityMatch || tagMatch)) {
        return false;
      }
    }
    
    // Filtrar por cliente
    if (clientId !== 'all') {
      if (att.type === 'client' && att.entity_id.toString() !== clientId) {
        return false;
      }
      
      if (att.type === 'project' && Array.isArray(projects)) {
        const project = projects.find((p: any) => p.id === att.entity_id);
        if (!project || project.client_id?.toString() !== clientId) {
          return false;
        }
      }
      
      if (att.type === 'task') {
        // Aqui precisaria de uma lógica para relacionar tarefas com clientes
        // Por exemplo, através do projeto vinculado à tarefa
        if (Array.isArray(tasks) && Array.isArray(projects)) {
          const task = tasks.find((t: any) => t.id === att.entity_id);
          if (!task) return false;
          
          const project = projects.find((p: any) => p.id === task.project_id);
          if (!project || project.client_id?.toString() !== clientId) {
            return false;
          }
        }
      }
    }
    
    // Filtrar por projeto
    if (projectId !== 'all') {
      if (att.type === 'project' && att.entity_id.toString() !== projectId) {
        return false;
      }
      
      if (att.type === 'task' && Array.isArray(tasks)) {
        const task = tasks.find((t: any) => t.id === att.entity_id);
        if (!task || task.project_id?.toString() !== projectId) {
          return false;
        }
      }
      
      // Arquivos de cliente não devem aparecer quando filtrando por projeto
      if (att.type === 'client') {
        return false;
      }
    }
    
    // Filtrar por tipo de anexo
    if (attachmentType !== 'all') {
      if (att.type !== attachmentType) {
        return false;
      }
    }
    
    return true;
  }).filter(att => {
    // Aplicar filtros avançados
    return applyAdvancedFilters([att]).length > 0;
  });
  
  // Função para selecionar um arquivo individual
  const handleSelectFile = (id: number, selected: boolean) => {
    if (selected) {
      setSelectedFiles(prev => [...prev, id]);
    } else {
      setSelectedFiles(prev => prev.filter(fileId => fileId !== id));
    }
  };
  
  // Função para selecionar todos os arquivos
  const handleSelectAll = () => {
    if (selectedFiles.length === filteredAttachments.length) {
      // Se todos já estão selecionados, desmarcar todos
      setSelectedFiles([]);
    } else {
      // Caso contrário, selecionar todos
      setSelectedFiles(filteredAttachments.map(att => att.id));
    }
  };
  
  // Função para excluir arquivos selecionados
  const handleDeleteSelected = () => {
    if (selectedFiles.length === 0) {
      toast({
        title: "Nenhum arquivo selecionado",
        description: "Selecione pelo menos um arquivo para excluir",
        variant: "destructive",
      });
      return;
    }
    
    // Implementar lógica para exclusão em lote
    selectedFiles.forEach(fileId => {
      const file = unifiedAttachments.find(att => att.id === fileId);
      if (file) {
        deleteMutation.mutate({ id: file.id, type: file.type });
      }
    });
    
    // Limpar seleção após excluir
    setSelectedFiles([]);
  };
  
  // Função para baixar arquivos selecionados
  const handleDownloadSelected = () => {
    if (selectedFiles.length === 0) {
      toast({
        title: "Nenhum arquivo selecionado",
        description: "Selecione pelo menos um arquivo para baixar",
        variant: "destructive",
      });
      return;
    }
    
    // Implementar lógica para download em lote
    selectedFiles.forEach(fileId => {
      const file = unifiedAttachments.find(att => att.id === fileId);
      if (file) {
        handleDownload(file);
      }
    });
  };
  
  // Função para lidar com drag & drop
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
  }, [clientId, projectId]);
  
  // Manipulador de upload de arquivos
  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    
    setUploading(true);
    setUploadProgress(5);
    
    const formData = new FormData();
    for (let i = 0; i < files.length; i++) {
      formData.append('file', files[i]);
    }
    
    // Determinação do tipo de entidade e ID para upload
    let entityType = 'client';
    let entityId = 'all';
    
    if (clientId !== 'all') {
      entityType = 'client';
      entityId = clientId;
    } else if (projectId !== 'all') {
      entityType = 'project';
      entityId = projectId;
    } else {
      // Se nenhum filtro específico estiver aplicado, abrir o formulário de upload
      setIsUploadFormOpen(true);
      setUploading(false);
      setUploadProgress(0);
      return;
    }
    
    // Simulação de progresso de upload
    const progressInterval = setInterval(() => {
      setUploadProgress(prev => {
        if (prev >= 95) {
          clearInterval(progressInterval);
          return 95;
        }
        return prev + 5;
      });
    }, 500);
    
    try {
      await uploadMutation.mutate({
        entityType,
        entityId,
        formData
      });
      
      clearInterval(progressInterval);
      setUploadProgress(100);
      
      // Atualizar a lista de anexos após o upload com sucesso
      refetchAttachments();
    } catch (error) {
      clearInterval(progressInterval);
      console.error('Erro no upload:', error);
      
      toast({
        title: "Erro no upload",
        description: "Não foi possível enviar o arquivo.",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };
  
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
    setSelectedAttachment(attachment);
    setIsFileViewerOpen(true);
  };
  
  // Função para compartilhar um arquivo
  const handleShare = (attachment: UnifiedAttachment) => {
    setSelectedAttachment(attachment);
    setIsShareDialogOpen(true);
  };
  
  // Função para marcar/desmarcar um arquivo como favorito
  const handleToggleFavorite = (attachment: UnifiedAttachment) => {
    favoriteMutation.mutate({ 
      id: attachment.id, 
      type: attachment.type, 
      isFavorite: !attachment.isFavorite 
    });
  };
  
  // Função para restaurar arquivos excluídos
  const handleRestoreFiles = async (fileIds: (number | string)[]) => {
    await restoreMutation.mutateAsync(fileIds);
  };
  
  // Função para excluir permanentemente arquivos
  const handlePermanentDelete = async (fileIds: (number | string)[]) => {
    await permanentDeleteMutation.mutateAsync(fileIds);
  };
  
  // Função para atualizar permissões de compartilhamento
  const handleUpdatePermissions = async (permissions: any[]) => {
    if (!selectedAttachment) return;
    
    await shareMutation.mutateAsync({
      fileId: selectedAttachment.id,
      permissions,
    });
  };
  
  // Função para gerar link de compartilhamento
  const handleGenerateShareLink = async () => {
    if (!selectedAttachment) return '';
    
    // Normalmente, aqui faria uma chamada à API para gerar o link
    // Por ora, simularemos isso
    return `${window.location.origin}/share/${selectedAttachment.id}/${Date.now()}`;
  };
  
  // Função para obter ícone baseado no tipo de arquivo
  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith('image/')) {
      return <FileImage className="h-10 w-10 text-blue-500" />;
    } else if (fileType === 'application/pdf') {
      return <FileText className="h-10 w-10 text-red-500" />;
    } else if (
      fileType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
      fileType === 'application/vnd.ms-excel' ||
      fileType === 'text/csv'
    ) {
      return <FileSpreadsheet className="h-10 w-10 text-green-500" />;
    } else if (
      fileType === 'application/zip' ||
      fileType === 'application/x-zip-compressed' ||
      fileType === 'application/x-rar-compressed'
    ) {
      return <FileArchive className="h-10 w-10 text-orange-500" />;
    } else if (fileType.startsWith('audio/')) {
      return <FileAudio className="h-10 w-10 text-purple-500" />;
    } else if (fileType.startsWith('video/')) {
      return <FileVideo className="h-10 w-10 text-pink-500" />;
    } else {
      return <FileIcon className="h-10 w-10 text-gray-500" />;
    }
  };
  
  // Função para obter a cor do card baseada no tipo de arquivo
  const getTypeColor = (fileType: string) => {
    if (fileType.startsWith('image/')) return 'blue';
    if (fileType === 'application/pdf') return 'red';
    if (fileType.startsWith('application/vnd.openxmlformats-officedocument.spreadsheetml')) return 'green';
    if (fileType.startsWith('application/vnd.ms-excel') || fileType === 'text/csv') return 'green';
    if (fileType.startsWith('application/zip') || fileType.includes('compressed')) return 'orange';
    if (fileType.startsWith('audio/')) return 'purple';
    if (fileType.startsWith('video/')) return 'pink';
    return 'gray';
  };
  
  // Função para obter o nome de exibição do tipo de arquivo
  const getDisplayType = (entityType: string, fileType: string) => {
    if (entityType === 'client') return 'Cliente';
    if (entityType === 'project') return 'Projeto';
    if (entityType === 'task') return 'Tarefa';
    
    if (fileType.startsWith('image/')) return 'Imagem';
    if (fileType === 'application/pdf') return 'PDF';
    if (fileType.includes('spreadsheet') || fileType.includes('excel') || fileType === 'text/csv') return 'Planilha';
    if (fileType.includes('zip') || fileType.includes('compressed')) return 'Arquivo';
    if (fileType.startsWith('audio/')) return 'Áudio';
    if (fileType.startsWith('video/')) return 'Vídeo';
    
    return 'Arquivo';
  };
  
  // Determinar se a página está carregando
  const isLoading = clientLoading || projectLoading || taskLoading;
  
  // Obter todas as tags disponíveis
  const availableTags = Array.from(
    new Set(
      unifiedAttachments
        .filter(att => att.tags)
        .flatMap(att => Array.isArray(att.tags) ? att.tags : [att.tags])
        .filter(Boolean)
    )
  ) as string[];
  
  // Criar dados para a visualização em árvore
  const treeData = transformDataToTree(
    Array.isArray(clients) ? clients : [],
    Array.isArray(projects) ? projects : [],
    Array.isArray(tasks) ? tasks : [],
    filteredAttachments
  );
  
  // Renderizar a página
  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Cabeçalho */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Arquivos</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Gerencie todos os arquivos do sistema em um único lugar
          </p>
        </div>
        
        <div className="mt-4 md:mt-0 flex gap-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (view === 'grid') setView('list');
                    else if (view === 'list') setView('tree');
                    else setView('grid');
                  }}
                  className="flex items-center gap-1"
                >
                  {view === 'grid' ? (
                    <>
                      <List className="h-4 w-4" />
                      Lista
                    </>
                  ) : view === 'list' ? (
                    <>
                      <FolderTree className="h-4 w-4" />
                      Árvore
                    </>
                  ) : (
                    <>
                      <Grid className="h-4 w-4" />
                      Grade
                    </>
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                Alternar visualização
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  size="sm"
                  onClick={() => setIsUploadFormOpen(true)}
                  className="flex items-center gap-1"
                >
                  <Upload className="h-4 w-4" />
                  Enviar arquivo
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                Fazer upload de novos arquivos
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          
          {selectedFiles.length > 0 && (
            <>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      variant="secondary"
                      size="sm"
                      onClick={handleDownloadSelected}
                      className="flex items-center gap-1"
                    >
                      <DownloadIcon className="h-4 w-4" />
                      Download ({selectedFiles.length})
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    Baixar arquivos selecionados
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      variant="destructive"
                      size="sm"
                      onClick={handleDeleteSelected}
                      className="flex items-center gap-1"
                    >
                      <Trash2 className="h-4 w-4" />
                      Excluir ({selectedFiles.length})
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    Mover arquivos selecionados para a lixeira
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </>
          )}
        </div>
      </div>
      
      {/* Área de Drop Zone */}
      {isDragging && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="w-96 h-96 border-2 border-dashed border-primary rounded-lg flex flex-col items-center justify-center bg-muted/20">
            <Upload className="w-16 h-16 text-primary mb-4" />
            <h3 className="text-xl font-medium">Solte os arquivos aqui</h3>
            <p className="text-muted-foreground mt-2">Os arquivos serão enviados</p>
          </div>
        </div>
      )}
      
      {/* Abas de navegação */}
      <Tabs defaultValue="all" value={activeTab} onValueChange={(value) => setActiveTab(value as any)}>
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="all" className="flex items-center gap-1">
              <Rows3 className="h-4 w-4" />
              Todos os arquivos
            </TabsTrigger>
            <TabsTrigger value="recents" className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              Recentes
            </TabsTrigger>
            <TabsTrigger value="favorites" className="flex items-center gap-1">
              <Star className="h-4 w-4" />
              Favoritos
            </TabsTrigger>
          </TabsList>
          
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => {
              queryClient.invalidateQueries({ queryKey: ["/api/attachments/deleted"] });
              refetchDeleted();
              setIsTrashBinOpen(true);
            }}
            className="flex items-center gap-1"
          >
            <Trash2 className="h-4 w-4" />
            Lixeira
          </Button>
        </div>
        
        {/* Conteúdo da guia Todos os arquivos */}
        <TabsContent value="all" className="space-y-4">
          {activeTab === "all" && (
            <>
              {/* Filtros e agrupamento */}
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
                        {Array.isArray(clients) && clients.map((client: any) => (
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
                        {Array.isArray(projects) && projects.map((project: any) => (
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
              
              {/* Filtros avançados */}
              <FileAdvancedFilters
                filterOptions={filterOptions}
                onFilterChange={setFilterOptions}
                groupBy={groupBy}
                onGroupChange={setGroupBy}
                clients={Array.isArray(clients) ? clients : []}
                projects={Array.isArray(projects) ? projects : []}
                tasks={Array.isArray(tasks) ? tasks : []}
                users={Array.isArray(users) ? users : []}
                availableTags={availableTags}
              />
              
              {/* Visualização dos arquivos */}
              {isLoading ? (
                <div className="flex items-center justify-center h-64">
                  <Loader2 className="h-12 w-12 animate-spin text-primary" />
                </div>
              ) : filteredAttachments.length === 0 ? (
                <div className="text-center p-10 border rounded-lg bg-muted/20">
                  <FileIcon className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-xl font-medium mb-2">Nenhum arquivo encontrado</h3>
                  <p className="text-muted-foreground max-w-md mx-auto mb-6">
                    {searchTerm || Object.keys(filterOptions).length > 0 ?
                      "Nenhum arquivo corresponde aos critérios de busca. Tente ajustar os filtros ou a pesquisa." :
                      "Comece enviando arquivos para clientes, projetos ou tarefas."}
                  </p>
                  <Button onClick={() => setIsUploadFormOpen(true)}>
                    <Upload className="h-4 w-4 mr-2" />
                    Enviar arquivo
                  </Button>
                </div>
              ) : view === 'tree' ? (
                <FileTreeView
                  data={treeData}
                  onSelect={(item) => {
                    const originalItem = item.originalItem;
                    if (item.type === 'file' && originalItem) {
                      handleView(originalItem);
                    }
                  }}
                  onToggleFavorite={(item) => {
                    const originalItem = item.originalItem;
                    if (item.type === 'file' && originalItem) {
                      handleToggleFavorite(originalItem);
                    }
                  }}
                  onViewFile={(item) => {
                    const originalItem = item.originalItem;
                    if (item.type === 'file' && originalItem) {
                      handleView(originalItem);
                    }
                  }}
                  onDownloadFile={(item) => {
                    const originalItem = item.originalItem;
                    if (item.type === 'file' && originalItem) {
                      handleDownload(originalItem);
                    }
                  }}
                  onDeleteFile={(item) => {
                    const originalItem = item.originalItem;
                    if (item.type === 'file' && originalItem) {
                      handleDelete(originalItem);
                    }
                  }}
                  onShareFile={(item) => {
                    const originalItem = item.originalItem;
                    if (item.type === 'file' && originalItem) {
                      handleShare(originalItem);
                    }
                  }}
                />
              ) : view === 'list' ? (
                <div className="border rounded-md overflow-hidden">
                  <div className="flex items-center bg-muted/40 p-2">
                    <div className="w-12 flex items-center justify-center">
                      <Checkbox 
                        checked={selectedFiles.length === filteredAttachments.length && filteredAttachments.length > 0}
                        onCheckedChange={handleSelectAll}
                        id="select-all"
                      />
                    </div>
                    <div className="flex-grow">Nome</div>
                    <div className="w-32">Tamanho</div>
                    <div className="w-40">Data</div>
                    <div className="w-40">Entidade</div>
                    <div className="w-32">Ações</div>
                  </div>
                  
                  <ScrollArea className="h-[calc(100vh-380px)]">
                    {filteredAttachments.map(attachment => (
                      <div 
                        key={`${attachment.type}-${attachment.id}`}
                        className="flex items-center py-2 px-4 hover:bg-muted/20 border-b last:border-b-0"
                      >
                        <div className="w-12 flex items-center justify-center">
                          <Checkbox 
                            checked={selectedFiles.includes(attachment.id)}
                            onCheckedChange={(checked) => handleSelectFile(attachment.id, !!checked)}
                            id={`file-${attachment.id}`}
                          />
                        </div>
                        
                        <div 
                          className="flex items-center gap-2 flex-grow overflow-hidden cursor-pointer"
                          onClick={() => handleView(attachment)}
                        >
                          {getFileIcon(attachment.file_type)}
                          <div className="overflow-hidden">
                            <p className="font-medium truncate">{attachment.file_name}</p>
                            <p className="text-xs text-muted-foreground truncate">
                              {attachment.description || getDisplayType(attachment.type, attachment.file_type)}
                            </p>
                          </div>
                        </div>
                        
                        <div className="w-32 text-sm text-muted-foreground">
                          {formatFileSize(attachment.file_size)}
                        </div>
                        
                        <div className="w-40 text-sm text-muted-foreground">
                          {format(new Date(attachment.uploaded_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                        </div>
                        
                        <div className="w-40">
                          <Badge variant="outline" className="truncate">
                            {attachment.type === 'client' ? 'Cliente' : 
                            attachment.type === 'project' ? 'Projeto' : 'Tarefa'}: {attachment.entity_name}
                          </Badge>
                        </div>
                        
                        <div className="w-32 flex items-center justify-end gap-1">
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-8 w-8" 
                                  onClick={() => handleView(attachment)}
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
                                  onClick={() => handleDownload(attachment)}
                                >
                                  <DownloadIcon className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Download</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                          
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-8 w-8" 
                                  onClick={() => handleToggleFavorite(attachment)}
                                >
                                  <Star className={cn(
                                    "h-4 w-4",
                                    attachment.isFavorite && "fill-yellow-400 text-yellow-400"
                                  )} />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                {attachment.isFavorite ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                          
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleShare(attachment)}>
                                <Share className="mr-2 h-4 w-4" />
                                <span>Compartilhar</span>
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => handleDelete(attachment)} className="text-destructive focus:text-destructive">
                                <Trash2 className="mr-2 h-4 w-4" />
                                <span>Excluir</span>
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    ))}
                  </ScrollArea>
                </div>
              ) : (
                // Visualização em grade
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                  {filteredAttachments.map(attachment => (
                    <Card 
                      key={`${attachment.type}-${attachment.id}`}
                      className={cn(
                        "overflow-hidden transition-all group hover:shadow-md",
                        selectedFiles.includes(attachment.id) && "ring-2 ring-primary ring-offset-2"
                      )}
                    >
                      <div className="relative">
                        <div className={cn(
                          "w-full aspect-square flex items-center justify-center",
                          `bg-${getTypeColor(attachment.file_type)}-50`
                        )}>
                          {attachment.file_type.startsWith('image/') ? (
                            <img 
                              src={attachment.file_url} 
                              alt={attachment.file_name}
                              className="object-cover w-full h-full cursor-pointer"
                              onClick={() => handleView(attachment)}
                            />
                          ) : (
                            <div 
                              className="flex items-center justify-center w-full h-full cursor-pointer"
                              onClick={() => handleView(attachment)}
                            >
                              {getFileIcon(attachment.file_type)}
                            </div>
                          )}
                        </div>
                        
                        {/* Checkbox para seleção */}
                        <div className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Checkbox 
                            checked={selectedFiles.includes(attachment.id)}
                            onCheckedChange={(checked) => handleSelectFile(attachment.id, !!checked)}
                            className="h-5 w-5 bg-white/80"
                          />
                        </div>
                        
                        {/* Ações rápidas */}
                        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 bg-black/20 text-white hover:bg-black/40 rounded-full"
                            onClick={() => handleToggleFavorite(attachment)}
                          >
                            <Star className={cn(
                              "h-4 w-4",
                              attachment.isFavorite && "fill-yellow-400 text-yellow-400"
                            )} />
                          </Button>
                        </div>
                        
                        <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 bg-black/20 text-white hover:bg-black/40 rounded-full"
                            onClick={() => handleDownload(attachment)}
                          >
                            <DownloadIcon className="h-4 w-4" />
                          </Button>
                          
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 bg-black/20 text-white hover:bg-black/40 rounded-full"
                            onClick={() => handleShare(attachment)}
                          >
                            <Share className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      
                      <CardHeader className="p-3 pb-2">
                        <CardTitle 
                          className="text-sm font-medium truncate cursor-pointer" 
                          title={attachment.file_name}
                          onClick={() => handleView(attachment)}
                        >
                          {attachment.file_name}
                        </CardTitle>
                        <CardDescription className="text-xs truncate">
                          {formatFileSize(attachment.file_size)} · {format(new Date(attachment.uploaded_at), 'dd/MM/yyyy', { locale: ptBR })}
                        </CardDescription>
                      </CardHeader>
                      
                      <CardFooter className="p-3 pt-0 flex items-center justify-between">
                        <Badge 
                          variant="outline" 
                          className={cn(
                            "text-xs truncate max-w-[150px]",
                            `border-${getTypeColor(attachment.file_type)}-200 text-${getTypeColor(attachment.file_type)}-700 bg-${getTypeColor(attachment.file_type)}-50`
                          )}
                        >
                          {attachment.entity_name}
                        </Badge>
                        
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleView(attachment)}>
                              <Eye className="mr-2 h-4 w-4" />
                              <span>Visualizar</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleDownload(attachment)}>
                              <DownloadIcon className="mr-2 h-4 w-4" />
                              <span>Download</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleShare(attachment)}>
                              <Share className="mr-2 h-4 w-4" />
                              <span>Compartilhar</span>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => handleDelete(attachment)} className="text-destructive focus:text-destructive">
                              <Trash2 className="mr-2 h-4 w-4" />
                              <span>Excluir</span>
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </CardFooter>
                    </Card>
                  ))}
                </div>
              )}
            </>
          )}
        </TabsContent>
        
        {/* Conteúdo da guia Recentes */}
        <TabsContent value="recents">
          {activeTab === "recents" && (
            <div className="space-y-6">
              <div className="border-b pb-4">
                <h3 className="text-lg font-medium flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Arquivos adicionados recentemente
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Seus arquivos mais recentes, adicionados nos últimos 30 dias.
                </p>
              </div>
              
              {recentLoading ? (
                <div className="flex items-center justify-center h-64">
                  <Loader2 className="h-12 w-12 animate-spin text-primary" />
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                  {Array.isArray(recentAttachments) && recentAttachments.length > 0 ? (
                    recentAttachments.map((attachment: UnifiedAttachment) => (
                      <Card 
                        key={`${attachment.type}-${attachment.id}`}
                        className="overflow-hidden transition-all group hover:shadow-md"
                      >
                        <div className="relative">
                          <div className={cn(
                            "w-full aspect-square flex items-center justify-center",
                            `bg-${getTypeColor(attachment.file_type)}-50`
                          )}>
                            {attachment.file_type.startsWith('image/') ? (
                              <img 
                                src={attachment.file_url} 
                                alt={attachment.file_name}
                                className="object-cover w-full h-full cursor-pointer"
                                onClick={() => handleView(attachment)}
                              />
                            ) : (
                              <div 
                                className="flex items-center justify-center w-full h-full cursor-pointer"
                                onClick={() => handleView(attachment)}
                              >
                                {getFileIcon(attachment.file_type)}
                              </div>
                            )}
                          </div>
                          
                          <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8 bg-black/20 text-white hover:bg-black/40 rounded-full"
                              onClick={() => handleToggleFavorite(attachment)}
                            >
                              <Star className={cn(
                                "h-4 w-4",
                                attachment.isFavorite && "fill-yellow-400 text-yellow-400"
                              )} />
                            </Button>
                          </div>
                          
                          <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8 bg-black/20 text-white hover:bg-black/40 rounded-full"
                              onClick={() => handleDownload(attachment)}
                            >
                              <DownloadIcon className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                        
                        <CardHeader className="p-3 pb-2">
                          <CardTitle 
                            className="text-sm font-medium truncate cursor-pointer" 
                            title={attachment.file_name}
                            onClick={() => handleView(attachment)}
                          >
                            {attachment.file_name}
                          </CardTitle>
                          <CardDescription className="text-xs truncate">
                            {formatFileSize(attachment.file_size)} · {format(new Date(attachment.uploaded_at), 'dd/MM/yyyy', { locale: ptBR })}
                          </CardDescription>
                        </CardHeader>
                        
                        <CardFooter className="p-3 pt-0 flex items-center justify-between">
                          <Badge 
                            variant="outline" 
                            className={cn(
                              "text-xs truncate max-w-[150px]",
                              `border-${getTypeColor(attachment.file_type)}-200 text-${getTypeColor(attachment.file_type)}-700 bg-${getTypeColor(attachment.file_type)}-50`
                            )}
                          >
                            {attachment.entity_name}
                          </Badge>
                        </CardFooter>
                      </Card>
                    ))
                  ) : (
                    <div className="col-span-full text-center p-10 border rounded-lg bg-muted/20">
                      <Clock className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                      <h3 className="text-xl font-medium mb-2">Nenhum arquivo recente</h3>
                      <p className="text-muted-foreground max-w-md mx-auto mb-6">
                        Você não adicionou nenhum arquivo recentemente.
                      </p>
                      <Button onClick={() => setIsUploadFormOpen(true)}>
                        <Upload className="h-4 w-4 mr-2" />
                        Enviar arquivo
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </TabsContent>
        
        {/* Conteúdo da guia Favoritos */}
        <TabsContent value="favorites">
          {activeTab === "favorites" && (
            <div className="space-y-6">
              <div className="border-b pb-4">
                <h3 className="text-lg font-medium flex items-center gap-2">
                  <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                  Arquivos favoritos
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Seus arquivos marcados como favoritos para acesso rápido.
                </p>
              </div>
              
              {favoriteLoading ? (
                <div className="flex items-center justify-center h-64">
                  <Loader2 className="h-12 w-12 animate-spin text-primary" />
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                  {Array.isArray(favoriteAttachments) && favoriteAttachments.length > 0 ? (
                    favoriteAttachments.map((attachment: UnifiedAttachment) => (
                      <Card 
                        key={`${attachment.type}-${attachment.id}`}
                        className="overflow-hidden transition-all group hover:shadow-md"
                      >
                        <div className="relative">
                          <div className={cn(
                            "w-full aspect-square flex items-center justify-center",
                            `bg-${getTypeColor(attachment.file_type)}-50`
                          )}>
                            {attachment.file_type.startsWith('image/') ? (
                              <img 
                                src={attachment.file_url} 
                                alt={attachment.file_name}
                                className="object-cover w-full h-full cursor-pointer"
                                onClick={() => handleView(attachment)}
                              />
                            ) : (
                              <div 
                                className="flex items-center justify-center w-full h-full cursor-pointer"
                                onClick={() => handleView(attachment)}
                              >
                                {getFileIcon(attachment.file_type)}
                              </div>
                            )}
                          </div>
                          
                          <div className="absolute top-2 right-2">
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8 bg-black/20 text-white hover:bg-black/40 rounded-full"
                              onClick={() => handleToggleFavorite(attachment)}
                            >
                              <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                            </Button>
                          </div>
                          
                          <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8 bg-black/20 text-white hover:bg-black/40 rounded-full"
                              onClick={() => handleDownload(attachment)}
                            >
                              <DownloadIcon className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                        
                        <CardHeader className="p-3 pb-2">
                          <CardTitle 
                            className="text-sm font-medium truncate cursor-pointer" 
                            title={attachment.file_name}
                            onClick={() => handleView(attachment)}
                          >
                            {attachment.file_name}
                          </CardTitle>
                          <CardDescription className="text-xs truncate">
                            {formatFileSize(attachment.file_size)} · {format(new Date(attachment.uploaded_at), 'dd/MM/yyyy', { locale: ptBR })}
                          </CardDescription>
                        </CardHeader>
                        
                        <CardFooter className="p-3 pt-0 flex items-center justify-between">
                          <Badge 
                            variant="outline" 
                            className={cn(
                              "text-xs truncate max-w-[150px]",
                              `border-${getTypeColor(attachment.file_type)}-200 text-${getTypeColor(attachment.file_type)}-700 bg-${getTypeColor(attachment.file_type)}-50`
                            )}
                          >
                            {attachment.entity_name}
                          </Badge>
                        </CardFooter>
                      </Card>
                    ))
                  ) : (
                    <div className="col-span-full text-center p-10 border rounded-lg bg-muted/20">
                      <Star className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                      <h3 className="text-xl font-medium mb-2">Nenhum arquivo favorito</h3>
                      <p className="text-muted-foreground max-w-md mx-auto mb-6">
                        Você ainda não marcou nenhum arquivo como favorito.
                      </p>
                      <Button onClick={() => setActiveTab('all')}>
                        <Sparkles className="h-4 w-4 mr-2" />
                        Explorar arquivos
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </TabsContent>
      </Tabs>
      
      {/* Input oculto para upload de arquivos */}
      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        multiple
        onChange={(e) => handleFileUpload(e.target.files)}
      />
      
      {/* Componentes de diálogo e visualização */}
      <FileUploadForm
        open={isUploadFormOpen}
        onClose={() => setIsUploadFormOpen(false)}
        onSuccess={() => {
          refetchAttachments();
          toast({
            title: "Upload concluído",
            description: "O arquivo foi enviado com sucesso",
            variant: "default",
            className: "bg-green-50 text-green-900 border-green-200",
          });
        }}
        initialEntityType={clientId !== 'all' ? 'client' : projectId !== 'all' ? 'project' : 'client'}
        initialEntityId={clientId !== 'all' ? clientId : projectId !== 'all' ? projectId : 'all'}
      />
      
      {selectedAttachment && (
        <Dialog 
          open={isFileViewerOpen} 
          onOpenChange={(open) => !open && setIsFileViewerOpen(false)}
        >
          <DialogContent className="max-w-5xl max-h-[90vh]">
            <FileViewer
              file={{
                id: selectedAttachment.id,
                name: selectedAttachment.file_name,
                url: selectedAttachment.file_url,
                type: selectedAttachment.file_type,
                size: selectedAttachment.file_size,
                uploadedAt: selectedAttachment.uploaded_at,
                uploadedBy: selectedAttachment.uploaded_by ? 
                  Array.isArray(users) ? 
                    users.find((u: any) => u.id === selectedAttachment.uploaded_by)?.name : 
                    undefined : 
                  undefined,
                description: selectedAttachment.description || undefined,
                entity: {
                  type: selectedAttachment.type,
                  id: selectedAttachment.entity_id,
                  name: selectedAttachment.entity_name || '',
                },
              }}
              onClose={() => setIsFileViewerOpen(false)}
              onDownload={() => handleDownload(selectedAttachment)}
              onShare={() => {
                setIsFileViewerOpen(false);
                setIsShareDialogOpen(true);
              }}
              onToggleFavorite={() => handleToggleFavorite(selectedAttachment)}
              isFavorite={selectedAttachment.isFavorite}
            />
          </DialogContent>
        </Dialog>
      )}
      
      {selectedAttachment && (
        <FileShareDialog
          open={isShareDialogOpen}
          onClose={() => setIsShareDialogOpen(false)}
          file={{
            id: selectedAttachment.id,
            name: selectedAttachment.file_name,
            type: selectedAttachment.file_type,
          }}
          users={Array.isArray(users) ? users : []}
          teams={[]}
          currentPermissions={[]}
          onUpdatePermissions={handleUpdatePermissions}
          onGenerateLink={handleGenerateShareLink}
        />
      )}
      
      <FileTrashBin
        open={isTrashBinOpen}
        onClose={() => setIsTrashBinOpen(false)}
        deletedFiles={Array.isArray(deletedFiles) ? deletedFiles.map((file: any) => ({
          id: file.id,
          name: file.file_name,
          type: file.file_type,
          size: file.file_size,
          deletedAt: file.deleted_at,
          entityType: file.entity_type,
          entityId: file.entity_id,
          entityName: file.entity_name,
          path: file.file_url,
        })) : []}
        onRestore={handleRestoreFiles}
        onDeletePermanently={handlePermanentDelete}
        isLoading={restoreMutation.isPending || permanentDeleteMutation.isPending}
      />
    </div>
  );
}