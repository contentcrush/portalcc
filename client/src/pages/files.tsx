import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { format } from "date-fns";
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
  Loader2
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
import { queryClient, apiRequest } from "@/lib/queryClient";
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

// Props para o componente FilesList
interface FilesListProps {
  attachments: UnifiedAttachment[];
  isLoading: boolean;
  onDownload: (attachment: UnifiedAttachment) => void;
  onDelete: (attachment: UnifiedAttachment) => void;
  getFileIcon: (fileType: string) => JSX.Element;
}

// Componente para exibir a lista de arquivos
const AttachmentsList = ({ attachments, isLoading, onDownload, onDelete, getFileIcon }: FilesListProps) => {
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

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {attachments.map((attachment) => (
        <Card key={`${attachment.type}-${attachment.id}`} className="overflow-hidden hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center gap-4 pb-2">
            <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-muted">
              {getFileIcon(attachment.file_type)}
            </div>
            <div className="flex-1 overflow-hidden">
              <CardTitle className="text-base truncate" title={attachment.file_name}>
                {attachment.file_name}
              </CardTitle>
              <CardDescription className="truncate">
                {attachment.entity_name}
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="pb-1">
            <div className="flex items-center text-sm text-muted-foreground">
              <Badge variant="outline" className="mr-2">
                {attachment.type === 'client' ? 'Cliente' : attachment.type === 'project' ? 'Projeto' : 'Tarefa'}
              </Badge>
              <span>{formatFileSize(attachment.file_size)}</span>
            </div>
            <div className="mt-2 flex items-center text-xs text-muted-foreground">
              <span>Adicionado em {format(new Date(attachment.uploaded_at), 'dd/MM/yyyy', { locale: ptBR })}</span>
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
          <CardFooter>
            <div className="flex w-full divide-x">
              <Button 
                variant="ghost" 
                className="rounded-none h-10 flex-1"
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
};

// Página principal de gerenciamento de arquivos
export default function FilesPage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [filter, setFilter] = useState<string>("all");
  const [activeTab, setActiveTab] = useState<string>("all");
  const [selectedClient, setSelectedClient] = useState<number | null>(null);
  const [selectedProject, setSelectedProject] = useState<number | null>(null);

  // Consulta para buscar todos os anexos
  const { data: attachments, isLoading: isLoadingAttachments } = useQuery<{
    clients: ClientAttachment[],
    projects: ProjectAttachment[],
    tasks: TaskAttachment[]
  }>({
    queryKey: ['/api/attachments/all'],
    onError: (error) => {
      toast({
        title: "Erro ao carregar anexos",
        description: "Não foi possível carregar os anexos. Tente novamente mais tarde.",
        variant: "destructive",
      });
      console.error("Erro ao buscar anexos:", error);
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
      allAttachments = [
        ...allAttachments,
        ...attachments.clients.map(att => ({
          ...att,
          type: 'client' as const,
          entity_id: att.client_id,
          entity_name: clientMap.get(att.client_id)?.name || `Cliente ${att.client_id}`,
          uploader: att.uploaded_by ? userMap.get(att.uploaded_by) : null,
          uploaded_at: att.created_at || att.upload_date || new Date().toISOString()
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
          uploaded_at: att.created_at || att.upload_date || new Date().toISOString()
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
          uploaded_at: att.created_at || att.upload_date || new Date().toISOString()
        }))
      ];
    }

    // Ordenar por data de upload (mais recente primeiro)
    return allAttachments.sort((a, b) => 
      new Date(b.uploaded_at).getTime() - new Date(a.uploaded_at).getTime()
    );
  };

  // Filtrar anexos com base no termo de busca e filtros
  const filteredAttachments = (): UnifiedAttachment[] => {
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
    if (selectedClient) {
      filtered = filtered.filter(att => {
        if (att.type === 'client') {
          return att.entity_id === selectedClient;
        } else if (att.type === 'project') {
          const project = projectMap.get(att.entity_id);
          return project && project.client_id === selectedClient;
        } else if (att.type === 'task') {
          const task = taskMap.get(att.entity_id);
          if (task && task.project_id) {
            const project = projectMap.get(task.project_id);
            return project && project.client_id === selectedClient;
          }
        }
        return false;
      });
    }

    // Filtrar por projeto selecionado
    if (selectedProject) {
      filtered = filtered.filter(att => {
        if (att.type === 'project') {
          return att.entity_id === selectedProject;
        } else if (att.type === 'task') {
          const task = taskMap.get(att.entity_id);
          return task && task.project_id === selectedProject;
        }
        return false;
      });
    }

    return filtered;
  };

  // Função para obter o ícone correto com base no tipo de arquivo
  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith('image/')) return <FileImage className="w-8 h-8 text-blue-500" />;
    if (fileType.includes('pdf') || fileType.includes('text')) return <FileText className="w-8 h-8 text-red-500" />;
    if (fileType.includes('spreadsheet') || fileType.includes('excel')) return <FileSpreadsheet className="w-8 h-8 text-green-500" />;
    if (fileType.includes('zip') || fileType.includes('compressed')) return <FileArchive className="w-8 h-8 text-purple-500" />;
    if (fileType.startsWith('audio/')) return <FileAudio className="w-8 h-8 text-yellow-500" />;
    if (fileType.startsWith('video/')) return <FileVideo className="w-8 h-8 text-pink-500" />;
    return <FileIcon className="w-8 h-8 text-gray-500" />;
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

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Gerenciamento de Arquivos</h1>
          <p className="text-muted-foreground">
            Visualize, organize e gerencie todos os arquivos do sistema em um só lugar.
          </p>
        </div>
      </div>

      {/* Filtros e busca */}
      <div className="flex flex-col md:flex-row gap-4 items-center">
        <div className="relative w-full md:w-96">
          <Input
            placeholder="Buscar por nome de arquivo, cliente ou projeto..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
          <FileIcon className="h-4 w-4 absolute left-3 top-3 text-gray-400" />
        </div>

        <div className="flex items-center gap-2 ml-auto">
          <Label htmlFor="filter-type" className="sr-only">Tipo de arquivo</Label>
          <Select
            value={filter}
            onValueChange={setFilter}
          >
            <SelectTrigger className="w-[180px]">
              <Filter className="h-4 w-4 mr-2" />
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

      {/* Filtros adicionais por cliente e projeto */}
      <div className="flex flex-col md:flex-row gap-4 items-start">
        <div className="flex-1">
          <Label htmlFor="filter-client">Filtrar por cliente</Label>
          <Select 
            value={selectedClient?.toString() || ""}
            onValueChange={(value) => {
              setSelectedClient(value ? parseInt(value) : null);
              // Resetar o projeto selecionado quando o cliente muda
              setSelectedProject(null);
            }}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Todos os clientes" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Todos os clientes</SelectItem>
              {clients?.map((client: any) => (
                <SelectItem key={client.id} value={client.id.toString()}>
                  {client.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex-1">
          <Label htmlFor="filter-project">Filtrar por projeto</Label>
          <Select 
            value={selectedProject?.toString() || ""}
            onValueChange={(value) => setSelectedProject(value ? parseInt(value) : null)}
            disabled={!selectedClient}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder={selectedClient ? "Selecione um projeto" : "Selecione um cliente primeiro"} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Todos os projetos</SelectItem>
              {projects && selectedClient && 
                projects
                  .filter((project: any) => project.client_id === selectedClient)
                  .map((project: any) => (
                    <SelectItem key={project.id} value={project.id.toString()}>
                      {project.name}
                    </SelectItem>
                  ))
              }
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Tabs para filtrar por tipo de entidade */}
      <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid grid-cols-3 md:w-[400px]">
          <TabsTrigger value="all">Todos</TabsTrigger>
          <TabsTrigger value="client">Clientes</TabsTrigger>
          <TabsTrigger value="project">Projetos</TabsTrigger>
        </TabsList>
        
        <TabsContent value="all" className="mt-6">
          <AttachmentsList 
            attachments={filteredAttachments()} 
            isLoading={isLoading}
            onDownload={handleDownload}
            onDelete={handleDelete}
            getFileIcon={getFileIcon}
          />
        </TabsContent>
        
        <TabsContent value="client" className="mt-6">
          <AttachmentsList 
            attachments={filteredAttachments()} 
            isLoading={isLoading}
            onDownload={handleDownload}
            onDelete={handleDelete}
            getFileIcon={getFileIcon}
          />
        </TabsContent>
        
        <TabsContent value="project" className="mt-6">
          <AttachmentsList 
            attachments={filteredAttachments()} 
            isLoading={isLoading}
            onDownload={handleDownload}
            onDelete={handleDelete}
            getFileIcon={getFileIcon}
          />
        </TabsContent>
      </Tabs>
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