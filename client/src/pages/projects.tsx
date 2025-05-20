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
import { ProjectsPagination } from "@/components/projects/ProjectsPagination";
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
  // Removemos os estados de filtro que agora são gerenciados pelo componente ProjectsPagination
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

  // Agora estamos usando o componente ProjectsPagination que busca 
  // e gerencia os projetos com paginação otimizada, então não precisamos
  // buscar todos os projetos de uma vez
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

  // A lógica de filtragem foi movida para o componente ProjectsPagination
  // que agora lida com a paginação e filtragem dos projetos direto na API

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
      
      {/* Removido o filtro antigo, que agora faz parte do componente ProjectsPagination */}
      
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
      {activeTab === "projects" && (
        <div className="mt-4">
          <ProjectsPagination />
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
