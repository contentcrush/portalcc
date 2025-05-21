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
      
      {/* O estado de carregamento e vazio agora são gerenciados pelo componente ProjectsPagination */}
      
      {/* Conteúdo da aba Projetos (grid e list) */}
      {activeTab === "projects" && (
        <div className="mt-4">
          <ProjectsPagination />
        </div>
      )}
      
      {/* Project details sidebar */}
      {selectedProjectId && (
        <ProjectDetailSidebar 
          projectId={selectedProjectId}
          onClose={handleCloseProjectDetails}
        />
      )}
      
      {/* Componentes de visualização Kanban e Gantt */}
      {activeTab === "kanban" && (
        <div className="mt-4">
          <ProjectKanban />
        </div>
      )}
      
      {activeTab === "gantt" && (
        <div className="mt-4">
          <ProjectGantt />
        </div>
      )}
      
      {/* AlertDialog separado para confirmação de exclusão */}
      <AlertDialog open={!!projectToDelete} onOpenChange={(open) => !open && setProjectToDelete(null)}>
        <AlertDialogContent onClick={(e) => e.stopPropagation()}>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir projeto</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este projeto? Esta ação não pode ser desfeita.
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
