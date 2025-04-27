import { useState } from "react";
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
import ProjectCard from "@/components/ProjectCard";
import ProjectDetailSidebar from "@/components/ProjectDetailSidebar";
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
  Copy
} from "lucide-react";
import { PROJECT_STATUS_OPTIONS, CLIENT_TYPE_OPTIONS } from "@/lib/constants";
import { useProjectForm } from "@/contexts/ProjectFormContext";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function Projects() {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [clientFilter, setClientFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");
  const [view, setView] = useState<"grid" | "list">("grid");
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
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
      toast({
        title: "Projeto duplicado com sucesso",
        description: "Uma cópia do projeto foi criada",
        variant: "default",
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

  // Apply filters
  const filteredProjects = projects?.filter(project => {
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
  });

  // Combine project with client data
  const projectsWithClient = filteredProjects?.map(project => {
    const client = clients?.find(c => c.id === project.client_id);
    return { ...project, client };
  });

  const handleOpenProjectDetails = (projectId: number) => {
    setSelectedProjectId(projectId);
  };

  const handleCloseProjectDetails = () => {
    setSelectedProjectId(null);
  };
  
  const handleDuplicateProject = (projectId: number) => {
    duplicateProjectMutation.mutate(projectId);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center space-y-4 md:space-y-0">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Projetos</h1>
          <p className="text-sm text-gray-500">Gerenciamento de projetos de vídeo</p>
        </div>
        
        <div className="flex items-center space-x-3">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Todos os projetos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os projetos</SelectItem>
              {PROJECT_STATUS_OPTIONS.map(option => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
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
              {clients?.map(client => (
                <SelectItem key={client.id} value={client.id.toString()}>
                  {client.name}
                </SelectItem>
              ))}
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
      
      {/* Project grid */}
      {view === "grid" && projectsWithClient && projectsWithClient.length > 0 && (
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
      {view === "list" && projectsWithClient && projectsWithClient.length > 0 && (
        <div className="space-y-3">
          {projectsWithClient.map(project => (
            <div 
              key={project.id}
              className="bg-white border rounded-lg p-4 flex items-center justify-between hover:shadow-sm"
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
                  <Link href={`/projects/${project.id}`}>
                    <h3 className="font-medium hover:text-primary cursor-pointer">
                      {project.name}
                    </h3>
                  </Link>
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
                      className="bg-primary h-1.5 rounded-full" 
                      style={{ width: `${project.progress}%` }}
                    ></div>
                  </div>
                </div>
                
                <div className="flex space-x-2">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem 
                        onClick={() => handleDuplicateProject(project.id)}
                        className="cursor-pointer"
                      >
                        <Copy className="mr-2 h-4 w-4" /> 
                        Duplicar Projeto
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => handleOpenProjectDetails(project.id)}
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
      {projectsWithClient && projectsWithClient.length > 0 && (
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
      )}
      
      {/* Project details sidebar */}
      {selectedProjectId && (
        <ProjectDetailSidebar 
          projectId={selectedProjectId}
          onClose={handleCloseProjectDetails}
        />
      )}

      {/* Diálogo de criação/edição de projeto */}
      <ProjectFormDialog />
    </div>
  );
}
