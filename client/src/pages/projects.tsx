import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
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
import ProjectCard from "@/components/ProjectCard";
import ProjectDetailSidebar from "@/components/ProjectDetailSidebar";
import ProjectKanban from "@/components/ProjectKanban";
import ProjectGantt from "@/components/ProjectGantt";
import { ProjectFormDialog } from "@/components/ProjectFormDialog";
import { 
  Plus, 
  Filter, 
  Search, 
  LayoutGrid, 
  List, 
  ChevronLeft, 
  ChevronRight,
  MoreVertical,
  Copy,
  KanbanSquare,
  GanttChart,
  Trash2
} from "lucide-react";
import { PROJECT_STATUS_OPTIONS, CLIENT_TYPE_OPTIONS } from "@/lib/constants";
import { useProjectForm } from "@/contexts/ProjectFormContext";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { getProgressBarColor, showSuccessToast } from "@/lib/utils";

export default function Projects({ params }: { params?: { id?: string } }) {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [clientFilter, setClientFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");
  const [view, setView] = useState<"grid" | "list">("grid");
  // Inicializa o projeto selecionado a partir do ID na URL, se disponível
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(
    params?.id ? parseInt(params.id) : null
  );
  
  // Efeito para atualizar o projeto selecionado quando o ID na URL mudar
  useEffect(() => {
    if (params?.id) {
      setSelectedProjectId(parseInt(params.id));
    }
  }, [params?.id]);
  const [projectToDelete, setProjectToDelete] = useState<number | null>(null);
  const { openProjectForm, isFormOpen, closeProjectForm } = useProjectForm();

  // Fetch projects
  const { data: projects, isLoading } = useQuery({
    queryKey: ['/api/projects']
  });

  // Fetch clients for dropdown and project details
  const { data: clients } = useQuery({
    queryKey: ['/api/clients']
  });

  // Mutação para duplicar projeto
  const duplicateProjectMutation = useMutation({
    mutationFn: async (projectId: number) => {
      const res = await apiRequest("POST", `/api/projects/${projectId}/duplicate`);
      return await res.json();
    },
    onSuccess: () => {
      showSuccessToast({
        title: "Projeto duplicado com sucesso",
        description: "Uma cópia do projeto foi criada"
      });
      // Atualiza a lista de projetos
      queryClient.invalidateQueries({ queryKey: ['/api/projects'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao duplicar projeto",
        description: error.message || "Não foi possível duplicar o projeto",
        variant: "destructive",
      });
    },
  });
  
  // Mutação para excluir projeto
  const deleteProjectMutation = useMutation({
    mutationFn: async (projectId: number) => {
      return apiRequest("DELETE", `/api/projects/${projectId}`);
    },
    onSuccess: () => {
      showSuccessToast({
        title: "Projeto excluído com sucesso",
        description: "O projeto e todos seus dados relacionados foram removidos permanentemente"
      });
      // Fecha o sidebar de detalhes caso esteja aberto
      setSelectedProjectId(null);
      // Atualiza a lista de projetos e todos os dados relacionados
      queryClient.invalidateQueries({ queryKey: ['/api/projects'] });
      queryClient.invalidateQueries({ queryKey: ['/api/financial-documents'] });
      queryClient.invalidateQueries({ queryKey: ['/api/expenses'] });
      queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao excluir projeto",
        description: error.message || "Não foi possível excluir o projeto",
        variant: "destructive",
      });
    },
  });

  // Apply filters
  const filteredProjects = projects && projects.length > 0 ? projects.filter((project: any) => {
    // Search term filter
    if (searchTerm && !project.name.toLowerCase().includes(searchTerm.toLowerCase())) {
      return false;
    }
    
    // Status filter
    if (statusFilter !== "all" && project.status !== statusFilter) {
      return false;
    }
    
    // Client filter
    if (clientFilter !== "all" && project.client_id !== parseInt(clientFilter)) {
      return false;
    }
    
    // Date filter (simplified for now)
    if (dateFilter === "recent" && project.creation_date) {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      return new Date(project.creation_date) > thirtyDaysAgo;
    }
    
    return true;
  }) : [];

  // Combine project with client data
  const projectsWithClient = filteredProjects && filteredProjects.length > 0 
    ? filteredProjects.map((project: any) => {
        const client = clients && clients.length > 0 
          ? clients.find((c: any) => c.id === project.client_id) 
          : null;
        return { ...project, client };
      })
    : [];

  const handleOpenProjectDetails = (projectId: number) => {
    setSelectedProjectId(projectId);
    // Atualizar a URL para refletir o projeto que está sendo visualizado
    window.history.pushState(null, '', `/projects/${projectId}`);
  };

  const handleCloseProjectDetails = () => {
    // Limpar o ID selecionado e atualizar a URL para a página principal de projetos
    setSelectedProjectId(null);
    window.history.pushState(null, '', '/projects');
  };
  
  const handleDuplicateProject = (projectId: number) => {
    duplicateProjectMutation.mutate(projectId);
  };
  
  const handleDeleteProject = (projectId: number) => {
    setProjectToDelete(null);
    deleteProjectMutation.mutate(projectId);
  };

  // Estado para controlar a aba atual
  const [activeTab, setActiveTab] = useState<string>("projects");
  
  return (
    <div className="space-y-4 p-2 md:p-0 md:space-y-6">
      {/* Cabeçalho com design mobile-first */}
      <div className="bg-white rounded-lg shadow-sm p-4">
        <div className="flex flex-col space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-gray-900">Projetos</h1>
              <p className="text-xs md:text-sm text-gray-500">Gerenciamento de projetos de vídeo</p>
            </div>
            
            <Button 
              onClick={openProjectForm} 
              size="sm" 
              className="shrink-0 bg-rose-500 hover:bg-rose-600"
            >
              <Plus className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Novo Projeto</span>
              <span className="sm:hidden">Novo</span>
            </Button>
          </div>
          
          {/* Barra de pesquisa com design consistente */}
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar projetos"
              className="pl-10 w-full"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          {/* Filtros com layout responsivo */}
          <div className="flex flex-wrap gap-2">
            <Select value={clientFilter} onValueChange={setClientFilter}>
              <SelectTrigger className="w-full sm:w-32 text-sm h-9">
                <SelectValue placeholder="Cliente" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {clients && clients.length > 0 ? clients.map((client: any) => (
                  <SelectItem key={client.id} value={client.id.toString()}>
                    {client.name}
                  </SelectItem>
                )) : null}
              </SelectContent>
            </Select>
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-32 text-sm h-9">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {PROJECT_STATUS_OPTIONS.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Select value={dateFilter} onValueChange={setDateFilter}>
              <SelectTrigger className="w-full sm:w-32 text-sm h-9">
                <SelectValue placeholder="Data" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                <SelectItem value="recent">Mais recentes</SelectItem>
                <SelectItem value="older">Mais antigos</SelectItem>
                <SelectItem value="upcoming">Prazo próximo</SelectItem>
              </SelectContent>
            </Select>
            
            <div className="flex bg-white rounded-md border h-9 ml-auto">
              <Button 
                variant={view === "list" ? "secondary" : "ghost"} 
                size="icon"
                onClick={() => setView("list")}
                className="rounded-r-none h-full aspect-square"
              >
                <List className="h-4 w-4" />
              </Button>
              <Button 
                variant={view === "grid" ? "secondary" : "ghost"} 
                size="icon"
                onClick={() => setView("grid")}
                className="rounded-l-none h-full aspect-square"
              >
                <LayoutGrid className="h-4 w-4" />
              </Button>
            </div>
          </div>
          
          {/* Tabs para alternar entre visualizações */}
          <Tabs 
            value={activeTab} 
            onValueChange={setActiveTab}
            className="w-full"
          >
            <TabsList className="w-full grid grid-cols-3">
              <TabsTrigger value="projects" className="flex items-center justify-center">
                <LayoutGrid className="h-4 w-4 mr-2" />
                <span className="text-xs sm:text-sm">Lista</span>
              </TabsTrigger>
              <TabsTrigger value="kanban" className="flex items-center justify-center">
                <KanbanSquare className="h-4 w-4 mr-2" />
                <span className="text-xs sm:text-sm">Kanban</span>
              </TabsTrigger>
              <TabsTrigger value="gantt" className="flex items-center justify-center">
                <GanttChart className="h-4 w-4 mr-2" />
                <span className="text-xs sm:text-sm">Timeline</span>
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>
      
      {/* Loading state - otimizado para mobile */}
      {isLoading && (
        <div className="flex justify-center items-center h-40 md:h-64 bg-white rounded-lg shadow-sm">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-rose-500"></div>
        </div>
      )}
      
      {/* Empty state - otimizado para mobile */}
      {projectsWithClient && projectsWithClient.length === 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-dashed border-gray-300 p-4 md:p-8 text-center">
          <div className="mx-auto w-10 h-10 md:w-12 md:h-12 rounded-full bg-rose-100 flex items-center justify-center mb-3 md:mb-4">
            <Filter className="h-5 w-5 md:h-6 md:w-6 text-rose-500" />
          </div>
          <h3 className="text-base md:text-lg font-medium mb-1 md:mb-2">Nenhum projeto encontrado</h3>
          <p className="text-sm text-muted-foreground mb-3 md:mb-4">
            Tente ajustar os filtros ou adicione um novo projeto.
          </p>
          <Button onClick={openProjectForm} className="bg-rose-500 hover:bg-rose-600">
            <Plus className="h-4 w-4 mr-2" />
            Novo Projeto
          </Button>
        </div>
      )}
      
      {/* Conteúdo da aba Projetos (grid e list) */}
      {activeTab === "projects" && projectsWithClient && projectsWithClient.length > 0 && (
        <>
          {/* Project grid - otimizado para mobile */}
          {view === "grid" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-6">
              {projectsWithClient.map(project => (
                <ProjectCard 
                  key={project.id} 
                  project={project}
                  onOpenDetails={handleOpenProjectDetails}
                />
              ))}
              
              {/* Card de adicionar projeto */}
              <div className="bg-white rounded-lg shadow-sm border-2 border-dashed border-gray-300 flex flex-col items-center justify-center p-4 md:p-6 hover:border-rose-300 transition-colors h-full">
                <div className="bg-rose-100 rounded-full p-3 mb-3">
                  <Plus className="h-6 w-6 md:h-8 md:w-8 text-rose-500" />
                </div>
                <h3 className="font-medium text-gray-900 mb-1 text-center">Novo Projeto</h3>
                <p className="text-xs md:text-sm text-gray-500 text-center mb-3 md:mb-4">Crie um novo projeto de vídeo</p>
                <Button onClick={openProjectForm} size="sm" className="bg-rose-500 hover:bg-rose-600">
                  <Plus className="h-4 w-4 mr-2" />
                  <span className="hidden sm:inline">Adicionar Projeto</span>
                  <span className="sm:hidden">Adicionar</span>
                </Button>
              </div>
            </div>
          )}
          
          {/* Project list view - otimizado para mobile */}
          {view === "list" && (
            <div className="space-y-2 md:space-y-3">
              {projectsWithClient.map(project => (
                <div 
                  key={project.id}
                  className="bg-white border rounded-lg p-3 md:p-4 flex items-center justify-between hover:shadow-md hover:border-rose-200 transition-all cursor-pointer"
                  onClick={() => handleOpenProjectDetails(project.id)}
                >
                  <div className="flex items-center flex-1 min-w-0">
                    {/* Thumbnail com fallback */}
                    {project.thumbnail ? (
                      <img 
                        src={project.thumbnail} 
                        alt={project.name} 
                        className="w-10 h-10 md:w-12 md:h-12 object-cover rounded mr-3 md:mr-4 flex-shrink-0" 
                      />
                    ) : (
                      <div className="w-10 h-10 md:w-12 md:h-12 bg-gray-200 rounded flex items-center justify-center mr-3 md:mr-4 flex-shrink-0">
                        <span className="text-gray-500 font-medium">
                          {project.name.charAt(0)}
                        </span>
                      </div>
                    )}
                    
                    {/* Informações do projeto */}
                    <div className="min-w-0 flex-1">
                      <h3 className="font-medium text-sm md:text-base hover:text-rose-600 truncate">
                        {project.name}
                      </h3>
                      <div className="flex flex-wrap items-center text-xs md:text-sm text-muted-foreground gap-1 md:gap-2">
                        <span className="truncate max-w-[120px] md:max-w-none">{project.client?.name || 'Cliente não especificado'}</span>
                        <span className="hidden md:inline mx-1">•</span>
                        <span className={`px-1.5 py-0.5 rounded-full text-xs ${
                          project.status === 'em_andamento' ? 'bg-green-100 text-green-800' : 
                          project.status === 'pre_producao' ? 'bg-blue-100 text-blue-800' : 
                          project.status === 'em_producao' ? 'bg-yellow-100 text-yellow-800' : 
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {project.status === 'em_andamento' ? 'Em andamento' : 
                          project.status === 'pre_producao' ? 'Pré-produção' : 
                          project.status === 'em_producao' ? 'Em produção' : 
                          project.status}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center">
                    <div className="text-right mr-6 hidden md:block">
                      <div className="font-medium">{new Date(project.endDate).toLocaleDateString('pt-BR')}</div>
                      <div className="text-sm text-muted-foreground">Prazo</div>
                    </div>
                    
                    <div className="text-right mr-6">
                      <div className="font-medium">
                        {new Intl.NumberFormat('pt-BR', { 
                          style: 'currency', 
                          currency: 'BRL' 
                        }).format(project.budget || 0)}
                      </div>
                      <div className="text-sm text-muted-foreground">Orçamento</div>
                    </div>
                    
                    <div className="w-24 mr-6 hidden md:block">
                      <div className="flex justify-between text-xs mb-1">
                        <span>Progresso</span>
                        <span>{project.progress}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-1.5">
                        <div 
                          className={`${getProgressBarColor(project.progress)} h-1.5 rounded-full`}
                          style={{ width: `${project.progress}%` }}
                        ></div>
                      </div>
                    </div>
                    
                    <div className="flex space-x-2">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem 
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDuplicateProject(project.id);
                            }}
                            className="cursor-pointer"
                          >
                            <Copy className="mr-2 h-4 w-4" /> 
                            Duplicar Projeto
                          </DropdownMenuItem>
                          
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              setProjectToDelete(project.id);
                            }}
                            className="cursor-pointer text-red-600 focus:text-red-600 focus:bg-red-50"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Excluir Projeto
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                      
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation(); // Previne o evento de propagar para o parent
                          handleOpenProjectDetails(project.id);
                        }}
                      >
                        Detalhes
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          
          {/* Pagination */}
          <div className="mt-8 flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Mostrando 1-{projectsWithClient.length} de {projectsWithClient.length} projetos
            </p>
            <div className="flex items-center">
              <Button variant="outline" size="icon" className="rounded-r-none">
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="default" size="icon" className="rounded-none w-8">
                1
              </Button>
              <Button variant="outline" size="icon" className="rounded-none w-8">
                2
              </Button>
              <Button variant="outline" size="icon" className="rounded-l-none">
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </>
      )}
      
      {/* Project details sidebar */}
      {selectedProjectId && (
        <ProjectDetailSidebar 
          projectId={selectedProjectId}
          onClose={handleCloseProjectDetails}
        />
      )}
      
      {/* Componentes de visualização Kanban e Gantt exibidos quando as abas apropriadas estão ativas */}
      {activeTab === "kanban" && projectsWithClient && projectsWithClient.length > 0 && (
        <ProjectKanban projects={projectsWithClient} />
      )}
      
      {activeTab === "gantt" && projectsWithClient && projectsWithClient.length > 0 && (
        <ProjectGantt projects={projectsWithClient} />
      )}
      
      {/* AlertDialog separado para confirmação de exclusão */}
      <AlertDialog open={!!projectToDelete} onOpenChange={(open) => !open && setProjectToDelete(null)}>
        <AlertDialogContent onClick={(e) => e.stopPropagation()}>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir projeto</AlertDialogTitle>
            <AlertDialogDescription>
              {projectToDelete && projectsWithClient ? (
                <>
                  Tem certeza que deseja excluir o projeto "{projectsWithClient.find(p => p.id === projectToDelete)?.name}"? 
                  Esta ação não pode ser desfeita.
                </>
              ) : (
                'Tem certeza que deseja excluir este projeto? Esta ação não pode ser desfeita.'
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={(e) => e.stopPropagation()}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.stopPropagation();
                if (projectToDelete) {
                  handleDeleteProject(projectToDelete);
                }
              }}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
