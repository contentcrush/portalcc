import { useState, useEffect, useMemo } from "react";
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

  // Apply filters and sorting with debug logging
  const projectsWithClient = useMemo(() => {
    console.log("🔄 [ProjectSorting] Iniciando ordenação:", { 
      dateFilter, 
      projectsCount: projects?.length || 0 
    });
    
    if (!projects || !Array.isArray(projects)) {
      console.log("❌ [ProjectSorting] Projetos não disponíveis");
      return [];
    }

    // First, filter the projects
    let filtered = projects.filter((project: any) => {
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
      
      return true;
    });

    console.log("🔍 [ProjectSorting] Filtros aplicados:", { 
      filteredCount: filtered.length,
      totalCount: projects.length 
    });

    // Then, apply sorting based on dateFilter
    let sorted = [...filtered];
    
    switch (dateFilter) {
      case "recent":
        console.log("📅 [ProjectSorting] Aplicando ordenação: Mais Recentes");
        sorted = sorted.sort((a: any, b: any) => {
          // Projetos com data têm prioridade sobre projetos sem data
          const hasDateA = a.start_date != null;
          const hasDateB = b.start_date != null;
          
          // Debug detalhado
          console.log(`🔍 Comparando: ${a.name} (${a.start_date}) vs ${b.name} (${b.start_date})`);
          
          if (hasDateA && !hasDateB) {
            console.log(`  → ${a.name} tem data, ${b.name} não tem - A primeiro`);
            return -1;
          }
          if (!hasDateA && hasDateB) {
            console.log(`  → ${b.name} tem data, ${a.name} não tem - B primeiro`);
            return 1;
          }
          if (!hasDateA && !hasDateB) {
            console.log(`  → Ambos sem data - ordenar por ID`);
            return a.id - b.id;
          }
          
          // Ambos têm data - ordenar por data (mais recentes primeiro)
          const dateA = new Date(a.start_date).getTime();
          const dateB = new Date(b.start_date).getTime();
          const result = dateB - dateA;
          console.log(`  → Ambos com data - ${dateB > dateA ? b.name : a.name} é mais recente (${result})`);
          return result;
        });
        break;
        
      case "older":
        console.log("📅 [ProjectSorting] Aplicando ordenação: Mais Antigos");
        sorted = sorted.sort((a: any, b: any) => {
          // Projetos com data têm prioridade sobre projetos sem data
          const hasDateA = a.start_date != null;
          const hasDateB = b.start_date != null;
          
          if (hasDateA && !hasDateB) return -1; // A tem data, B não tem - A vem primeiro
          if (!hasDateA && hasDateB) return 1;  // B tem data, A não tem - B vem primeiro
          if (!hasDateA && !hasDateB) return a.id - b.id; // Ambos sem data - ordenar por ID
          
          // Ambos têm data - ordenar por data (mais antigos primeiro)
          const dateA = new Date(a.start_date).getTime();
          const dateB = new Date(b.start_date).getTime();
          return dateA - dateB;
        });
        break;
        
      case "upcoming":
        console.log("📅 [ProjectSorting] Aplicando ordenação: Prazo Próximo");
        sorted = sorted.sort((a: any, b: any) => {
          // Projetos com data de fim têm prioridade sobre projetos sem data
          const hasEndDateA = a.end_date != null;
          const hasEndDateB = b.end_date != null;
          
          if (hasEndDateA && !hasEndDateB) return -1; // A tem prazo, B não tem - A vem primeiro
          if (!hasEndDateA && hasEndDateB) return 1;  // B tem prazo, A não tem - B vem primeiro
          if (!hasEndDateA && !hasEndDateB) return a.id - b.id; // Ambos sem prazo - ordenar por ID
          
          // Ambos têm prazo - ordenar por proximidade
          const endDateA = new Date(a.end_date).getTime();
          const endDateB = new Date(b.end_date).getTime();
          const now = new Date().getTime();
          
          const diffA = Math.abs(endDateA - now);
          const diffB = Math.abs(endDateB - now);
          return diffA - diffB;
        });
        break;
        
      default:
        console.log("📅 [ProjectSorting] Aplicando ordenação: Padrão (por ID)");
        sorted = sorted.sort((a: any, b: any) => a.id - b.id);
        break;
    }

    // Log the first few projects after sorting
    console.log("✅ [ProjectSorting] Ordenação concluída. Primeiros 3 projetos:", 
      sorted.slice(0, 3).map(p => ({ 
        id: p.id, 
        name: p.name, 
        start_date: p.start_date, 
        end_date: p.end_date 
      }))
    );

    // Combine with client data
    return sorted.map((project: any) => {
      const client = clients && Array.isArray(clients) && clients.length > 0 
        ? clients.find((c: any) => c.id === project.client_id) 
        : null;
      return { ...project, client };
    });
  }, [projects, clients, searchTerm, statusFilter, clientFilter, dateFilter]);

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
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center space-y-4 md:space-y-0">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Projetos</h1>
          <p className="text-sm text-gray-500">Gerenciamento de projetos de vídeo</p>
        </div>
        
        <div className="flex items-center space-x-3">
          <Tabs 
            value={activeTab} 
            onValueChange={setActiveTab}
            className="mr-4"
          >
            <TabsList>
              <TabsTrigger value="projects" className="flex items-center">
                <LayoutGrid className="h-4 w-4 mr-2" />
                Lista
              </TabsTrigger>
              <TabsTrigger value="kanban" className="flex items-center">
                <KanbanSquare className="h-4 w-4 mr-2" />
                Kanban
              </TabsTrigger>
              <TabsTrigger value="gantt" className="flex items-center">
                <GanttChart className="h-4 w-4 mr-2" />
                Timeline
              </TabsTrigger>
            </TabsList>
          </Tabs>
          
          <Button onClick={openProjectForm}>
            <Plus className="h-4 w-4 mr-2" />
            Novo Projeto
          </Button>
        </div>
      </div>
      
      {/* Filter and search */}
      <div className="flex flex-wrap items-center justify-between bg-white p-4 rounded-lg shadow-sm space-y-4 md:space-y-0">
        <div className="w-full md:w-auto">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar projetos"
              className="pl-10 w-full md:w-80"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        
        <div className="flex flex-wrap gap-2 w-full md:w-auto">
          <Select value={clientFilter} onValueChange={setClientFilter}>
            <SelectTrigger className="w-32">
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
            <SelectTrigger className="w-32">
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
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Data" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              <SelectItem value="recent">Mais recentes</SelectItem>
              <SelectItem value="older">Mais antigos</SelectItem>
              <SelectItem value="upcoming">Prazo próximo</SelectItem>
            </SelectContent>
          </Select>
          
          <div className="flex bg-white rounded-md border">
            <Button 
              variant={view === "list" ? "secondary" : "ghost"} 
              size="icon"
              onClick={() => setView("list")}
              className="rounded-r-none"
            >
              <List className="h-4 w-4" />
            </Button>
            <Button 
              variant={view === "grid" ? "secondary" : "ghost"} 
              size="icon"
              onClick={() => setView("grid")}
              className="rounded-l-none"
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
      
      {/* Loading state */}
      {isLoading && (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      )}
      
      {/* Empty state */}
      {projectsWithClient && projectsWithClient.length === 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-dashed border-gray-300 p-8 text-center">
          <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
            <Filter className="h-6 w-6 text-primary" />
          </div>
          <h3 className="text-lg font-medium mb-2">Nenhum projeto encontrado</h3>
          <p className="text-muted-foreground mb-4">
            Tente ajustar os filtros ou adicione um novo projeto.
          </p>
          <Button onClick={openProjectForm}>
            <Plus className="h-4 w-4 mr-2" />
            Novo Projeto
          </Button>
        </div>
      )}
      
      {/* Conteúdo da aba Projetos (grid e list) */}
      {activeTab === "projects" && projectsWithClient && projectsWithClient.length > 0 && (
        <>
          {/* Project grid */}
          {view === "grid" && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {projectsWithClient.map(project => (
                <ProjectCard 
                  key={project.id} 
                  project={project}
                  onOpenDetails={handleOpenProjectDetails}
                />
              ))}
              
              {/* Add new project card */}
              <div className="bg-white rounded-lg shadow-sm border-2 border-dashed border-gray-300 flex flex-col items-center justify-center p-6 hover:border-primary/40 transition-colors h-full">
                <div className="bg-primary/10 rounded-full p-3 mb-3">
                  <Plus className="h-8 w-8 text-primary" />
                </div>
                <h3 className="font-medium text-gray-900 mb-1">Novo Projeto</h3>
                <p className="text-sm text-gray-500 text-center mb-4">Crie um novo projeto de vídeo para sua produtora</p>
                <Button onClick={openProjectForm}>Adicionar Projeto</Button>
              </div>
            </div>
          )}
          
          {/* Project list view */}
          {view === "list" && (
            <div className="space-y-3">
              {projectsWithClient.map(project => (
                <div 
                  key={project.id}
                  className="bg-white border rounded-lg p-4 flex items-center justify-between hover:shadow-md hover:border-primary/50 transition-all cursor-pointer"
                  onClick={() => handleOpenProjectDetails(project.id)}
                >
                  <div className="flex items-center">
                    {project.thumbnail ? (
                      <img 
                        src={project.thumbnail} 
                        alt={project.name} 
                        className="w-12 h-12 object-cover rounded mr-4" 
                      />
                    ) : (
                      <div className="w-12 h-12 bg-gray-200 rounded flex items-center justify-center mr-4">
                        <span className="text-gray-500 font-medium">
                          {project.name.charAt(0)}
                        </span>
                      </div>
                    )}
                    
                    <div>
                      <h3 className="font-medium hover:text-primary">
                        {project.name}
                      </h3>
                      <div className="flex items-center text-sm text-muted-foreground">
                        <span>{project.client?.name || 'Cliente não especificado'}</span>
                        <span className="mx-2">•</span>
                        <span className={`px-2 py-0.5 rounded-full text-xs ${
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
