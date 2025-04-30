import { useState } from "react";
import { useProjectForm } from "@/contexts/ProjectFormContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation, useRoute } from "wouter";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { UserPlus, X, Edit, CheckCircle2, Circle, MoreHorizontal, Copy, FileText, DollarSign, Trash2, Clock, Pause, Check } from "lucide-react";
import { formatDate, formatCurrency, getInitials, formatTeamRole } from "@/lib/utils";
import { apiRequest } from "@/lib/queryClient";
import { TEAM_ROLE_OPTIONS } from "@/lib/constants";
import { useToast } from "@/hooks/use-toast";
import { UserAvatar } from "./UserAvatar";
import { Badge } from "@/components/ui/badge";
import StatusBadge from "./StatusBadge";
import { ProjectStageStatus, ProjectSpecialStatus, isProjectStage, isProjectSpecialStatus } from "@/lib/types";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ProjectFormDialog } from "./ProjectFormDialog";

interface ProjectDetailSidebarProps {
  projectId: number;
  onClose: () => void;
}

export default function ProjectDetailSidebar({ projectId, onClose }: ProjectDetailSidebarProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const { openProjectForm, setProjectToEdit } = useProjectForm();
  
  // Estados para controlar os diálogos
  const [showAddMemberDialog, setShowAddMemberDialog] = useState(false);
  
  // Funções para navegação
  const handleManageTasks = () => {
    navigate(`/tasks?projectId=${projectId}`);
    onClose();
  };
  
  const handleProjectFinancial = () => {
    navigate(`/financial?projectId=${projectId}`);
    onClose();
  };

  const { data: project, isLoading: isLoadingProject } = useQuery({
    queryKey: [`/api/projects/${projectId}`],
    enabled: !!projectId
  });

  const { data: client } = useQuery({
    queryKey: [`/api/clients/${project?.client_id}`],
    enabled: !!project?.client_id
  });

  const { data: projectMembers } = useQuery({
    queryKey: [`/api/projects/${projectId}/members`],
    enabled: !!projectId
  });

  const { data: users } = useQuery({
    queryKey: ['/api/users'],
    enabled: !!projectMembers
  });

  const { data: stages } = useQuery({
    queryKey: [`/api/projects/${projectId}/stages`],
    enabled: !!projectId
  });

  // Mutation to update a project stage
  const updateStageMutation = useMutation({
    mutationFn: async ({ stageId, data }: { stageId: number, data: any }) => {
      return apiRequest('PATCH', `/api/projects/${projectId}/stages/${stageId}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/stages`] });
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}`] });
      toast({
        title: "Etapa atualizada",
        description: "A etapa do projeto foi atualizada com sucesso."
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao atualizar etapa",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const toggleStageCompletion = (stageId: number, completed: boolean) => {
    updateStageMutation.mutate({
      stageId,
      data: { completed: !completed }
    });
  };
  
  // Mutation para duplicar um projeto
  const duplicateProjectMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', `/api/projects/${projectId}/duplicate`);
      const data = await response.json();
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/projects'] });
      toast({
        title: "Projeto duplicado com sucesso",
        description: `O projeto "${data.name}" foi criado.`
      });
      onClose(); // Fechar o painel lateral após duplicação
    },
    onError: (error) => {
      toast({
        title: "Erro ao duplicar projeto",
        description: error.message,
        variant: "destructive"
      });
    }
  });
  
  // Mutation para excluir o projeto
  const deleteProjectMutation = useMutation({
    mutationFn: async () => {
      return apiRequest('DELETE', `/api/projects/${projectId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/projects'] });
      toast({
        title: "Projeto excluído com sucesso",
        description: "O projeto foi removido permanentemente."
      });
      onClose(); // Fechar o painel lateral após exclusão
    },
    onError: (error) => {
      toast({
        title: "Erro ao excluir projeto",
        description: error.message,
        variant: "destructive"
      });
    }
  });
  
  // Mutation para atualizar o status do projeto
  const updateProjectStatusMutation = useMutation({
    mutationFn: async (status: string) => {
      if (!project) {
        throw new Error('Projeto não encontrado');
      }
      
      // Precisamos incluir os campos obrigatórios do projeto junto com o novo status
      const updateData = {
        name: project.name,
        client_id: project.client_id,
        status: status
      };
      
      // Retornamos a resposta da API
      return apiRequest('PATCH', `/api/projects/${projectId}`, updateData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}`] });
      queryClient.invalidateQueries({ queryKey: ['/api/projects'] });
      toast({
        title: "Status atualizado",
        description: "O status do projeto foi atualizado com sucesso."
      });
    },
    onError: (error) => {
      console.error("Erro ao atualizar status:", error);
      toast({
        title: "Erro ao atualizar status",
        description: "Não foi possível atualizar o status do projeto.",
        variant: "destructive"
      });
    }
  });
  
  const handleUpdateProjectStatus = (status: string) => {
    // Verifica se o status é diferente do atual para evitar chamadas desnecessárias
    if (project && project.status !== status) {
      // Confirmação para status especiais
      if (['cancelado', 'pausado'].includes(status)) {
        const statusLabel = status === 'cancelado' ? 'cancelar' : 'pausar';
        if (!window.confirm(`Tem certeza que deseja ${statusLabel} este projeto?`)) {
          return;
        }
      }
      
      updateProjectStatusMutation.mutate(status);
    }
  };
  
  const handleDuplicateProject = () => {
    if (window.confirm("Deseja duplicar este projeto? Uma cópia será criada com todos os membros da equipe e etapas.")) {
      duplicateProjectMutation.mutate();
    }
  };
  
  const handleDeleteProject = () => {
    deleteProjectMutation.mutate();
  };

  // Get team members with their user details
  const teamMembers = projectMembers?.map(member => {
    const user = users?.find(u => u.id === member.user_id);
    return {
      ...member,
      user
    };
  });

  // Mutation para remover um membro da equipe
  const removeMemberMutation = useMutation({
    mutationFn: async ({ projectId, userId }: { projectId: number, userId: number }) => {
      return apiRequest('DELETE', `/api/projects/${projectId}/members/${userId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/members`] });
      toast({
        title: "Membro removido",
        description: "O membro foi removido da equipe com sucesso."
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao remover membro",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const handleRemoveMember = (userId: number, userName: string) => {
    removeMemberMutation.mutate({ projectId, userId });
  };

  // Calculate progress
  const progress = project?.progress || 0;
  const completedStages = stages?.filter(stage => stage.completed)?.length || 0;
  const totalStages = stages?.length || 0;

  if (isLoadingProject) {
    return (
      <div className="fixed inset-y-0 right-0 bg-white shadow-lg w-96 transform transition-transform duration-300 z-20 border-l border-gray-200 p-6 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="fixed inset-y-0 right-0 bg-white shadow-lg w-96 transform transition-transform duration-300 z-20 border-l border-gray-200 p-6">
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="font-semibold text-lg">Projeto não encontrado</h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-y-0 right-0 bg-white shadow-lg w-96 transform transition-all duration-300 z-20 border-l border-gray-200 overflow-y-auto">
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <h2 className="font-semibold text-lg">DETALHES DO PROJETO</h2>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-5 w-5" />
        </Button>
      </div>
      
      <div className="p-6">
        <div className="flex justify-center mb-6">
          <div 
            className="w-16 h-16 rounded-full flex items-center justify-center font-semibold text-xl"
            style={{ 
              backgroundColor: client ? `rgba(59, 130, 246, 0.1)` : '#E5E7EB',
              color: client ? `rgb(59, 130, 246)` : '#6B7280'
            }}
          >
            {client ? getInitials(client.name) : ''}
          </div>
        </div>
        
        <div className="text-center mb-6">
          <h3 className="font-medium text-lg">{project?.name || 'Carregando...'}</h3>
          <p className="text-sm text-gray-500">
            Criado em {project?.creation_date ? formatDate(project.creation_date) : '-'}
          </p>
        </div>
        
        <div className="space-y-4 mb-8">
          <div className="flex items-center justify-between">
            <div className="text-sm font-medium text-gray-600">Status:</div>
            <StatusBadge 
              project={project}
            />
          </div>
          
          <div className="flex items-center justify-between">
            <div className="text-sm font-medium text-gray-600">Cliente:</div>
            <div className="text-sm font-medium">{client?.name || 'Não definido'}</div>
          </div>
          
          <div className="flex items-center justify-between">
            <div className="text-sm font-medium text-gray-600">Orçamento:</div>
            <div className="text-sm font-medium">
              {project?.budget ? formatCurrency(project.budget) : 'Não definido'}
            </div>
          </div>
          
          <div className="flex items-center justify-between">
            <div className="text-sm font-medium text-gray-600">Prazo:</div>
            <div className="text-sm font-medium">
              {project?.endDate ? formatDate(project.endDate) : 'Não definido'}
            </div>
          </div>
        </div>
        
        <div className="mb-8">
          <h4 className="font-medium text-sm mb-4">EQUIPE DO PROJETO</h4>
          <div className="space-y-4">
            {teamMembers && teamMembers.length > 0 ? (
              teamMembers.map(member => (
                <div key={member.id} className="flex items-start justify-between group">
                  <div className="flex items-start">
                    {member.user?.avatar ? (
                      <img 
                        src={member.user.avatar} 
                        alt={member.user?.name || 'Membro'}
                        className="w-8 h-8 rounded-full mr-3"
                      />
                    ) : (
                      <div className="w-8 h-8 bg-gray-200 rounded-full mr-3 flex items-center justify-center">
                        {getInitials(member.user?.name || 'U')}
                      </div>
                    )}
                    <div>
                      <p className="text-sm font-medium">{member.user?.name || 'Usuário'}</p>
                      <p className="text-xs text-gray-500">{formatTeamRole(member.role) || 'Membro'}</p>
                    </div>
                  </div>
                  
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6"
                      >
                        <Trash2 className="h-3.5 w-3.5 text-gray-400 hover:text-red-500" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Remover membro da equipe</AlertDialogTitle>
                        <AlertDialogDescription>
                          Tem certeza que deseja remover {member.user?.name || 'este membro'} da equipe do projeto?
                          Esta ação não pode ser desfeita.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction 
                          onClick={() => handleRemoveMember(member.user_id, member.user?.name || 'Usuário')}
                          className="bg-red-600 hover:bg-red-700 text-white"
                        >
                          Remover
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              ))
            ) : (
              <p className="text-sm text-gray-500">Nenhum membro na equipe</p>
            )}
            
            <div className="flex justify-center">
              <Button 
                variant="ghost" 
                size="sm" 
                className="text-indigo-600"
                onClick={() => setShowAddMemberDialog(true)}
              >
                + Adicionar membro
              </Button>
            </div>
          </div>
        </div>
        
        <div className="mb-8">
          <h4 className="font-medium text-sm mb-4">ETAPAS DO PROJETO</h4>
          
          {/* Mutation para atualizar o status do projeto */}
          {project ? (
            <div className="space-y-4">
              {/* Etapas de fluxo padrão */}
              <div 
                className="flex items-start cursor-pointer group"
                onClick={() => handleUpdateProjectStatus('proposta')}
              >
                <div className={`w-6 h-6 rounded-full flex items-center justify-center mr-3 shrink-0 transition-colors
                  ${['proposta', 'pre_producao', 'producao', 'pos_revisao', 'entregue', 'concluido'].includes(project.status)
                    ? 'bg-green-500'
                    : 'bg-slate-100'
                  }`}
                >
                  <Check className={`h-3.5 w-3.5 ${
                    ['proposta', 'pre_producao', 'producao', 'pos_revisao', 'entregue', 'concluido'].includes(project.status) 
                      ? 'text-white'
                      : 'text-slate-300'
                  }`} />
                </div>
                <div>
                  <p className="text-sm font-medium">Proposta</p>
                  <p className={`text-xs ${
                    ['proposta', 'pre_producao', 'producao', 'pos_revisao', 'entregue', 'concluido'].includes(project.status)
                      ? 'text-slate-600'
                      : 'text-gray-500'
                  }`}>
                    {['proposta', 'pre_producao', 'producao', 'pos_revisao', 'entregue', 'concluido'].includes(project.status)
                      ? 'Concluído'
                      : 'Pendente'}
                  </p>
                </div>
              </div>
              
              <div 
                className="flex items-start cursor-pointer group"
                onClick={() => handleUpdateProjectStatus('pre_producao')}
              >
                <div className={`w-6 h-6 rounded-full flex items-center justify-center mr-3 shrink-0 transition-colors
                  ${['pre_producao', 'producao', 'pos_revisao', 'entregue', 'concluido'].includes(project.status)
                    ? 'bg-green-500'
                    : 'bg-slate-100'
                  }`}
                >
                  <Check className={`h-3.5 w-3.5 ${
                    ['pre_producao', 'producao', 'pos_revisao', 'entregue', 'concluido'].includes(project.status) 
                      ? 'text-white'
                      : 'text-slate-300'
                  }`} />
                </div>
                <div>
                  <p className="text-sm font-medium">Pré-produção</p>
                  <p className={`text-xs ${
                    ['pre_producao', 'producao', 'pos_revisao', 'entregue', 'concluido'].includes(project.status)
                      ? 'text-indigo-600'
                      : 'text-gray-500'
                  }`}>
                    {['pre_producao', 'producao', 'pos_revisao', 'entregue', 'concluido'].includes(project.status)
                      ? 'Concluído'
                      : 'Pendente'}
                  </p>
                </div>
              </div>
              
              <div 
                className="flex items-start cursor-pointer group"
                onClick={() => handleUpdateProjectStatus('producao')}
              >
                <div className={`w-6 h-6 rounded-full flex items-center justify-center mr-3 shrink-0 transition-colors
                  ${project.status === 'producao' 
                    ? 'bg-yellow-500' 
                    : ['pos_revisao', 'entregue', 'concluido'].includes(project.status)
                      ? 'bg-green-500'
                      : 'bg-slate-100'
                  }`}
                >
                  <Check className={`h-3.5 w-3.5 ${
                    ['producao', 'pos_revisao', 'entregue', 'concluido'].includes(project.status) 
                      ? 'text-white'
                      : 'text-slate-300'
                  }`} />
                </div>
                <div>
                  <p className="text-sm font-medium">Produção</p>
                  <p className={`text-xs ${
                    project.status === 'producao'
                      ? 'text-yellow-600'
                      : ['pos_revisao', 'entregue', 'concluido'].includes(project.status)
                        ? 'text-slate-600'
                        : 'text-gray-500'
                  }`}>
                    {project.status === 'producao'
                      ? 'Em andamento'
                      : ['pos_revisao', 'entregue', 'concluido'].includes(project.status)
                        ? 'Concluído'
                        : 'Pendente'}
                  </p>
                </div>
              </div>
              
              <div 
                className="flex items-start cursor-pointer group"
                onClick={() => handleUpdateProjectStatus('pos_revisao')}
              >
                <div className={`w-6 h-6 rounded-full flex items-center justify-center mr-3 shrink-0 transition-colors 
                  ${project.status === 'pos_revisao'
                    ? 'bg-purple-500'
                    : ['entregue', 'concluido'].includes(project.status)
                      ? 'bg-green-500'
                      : 'bg-slate-100'
                  }`}
                >
                  <Check className={`h-3.5 w-3.5 ${
                    ['pos_revisao', 'entregue', 'concluido'].includes(project.status) 
                      ? 'text-white'
                      : 'text-slate-300'
                  }`} />
                </div>
                <div>
                  <p className="text-sm font-medium">Pós-produção</p>
                  <p className={`text-xs ${
                    project.status === 'pos_revisao'
                      ? 'text-purple-600'
                      : ['entregue', 'concluido'].includes(project.status)
                        ? 'text-slate-600'
                        : 'text-gray-500'
                  }`}>
                    {['pos_revisao', 'entregue', 'concluido'].includes(project.status)
                      ? 'Concluído'
                      : 'Pendente'}
                  </p>
                </div>
              </div>
              
              <div 
                className="flex items-start cursor-pointer group"
                onClick={() => handleUpdateProjectStatus('entregue')}
              >
                <div className={`w-6 h-6 rounded-full flex items-center justify-center mr-3 shrink-0 transition-colors
                  ${project.status === 'entregue'
                    ? 'bg-green-500'
                    : project.status === 'concluido'
                      ? 'bg-green-500'
                      : 'bg-slate-100'
                  }`}
                >
                  <Check className={`h-3.5 w-3.5 ${
                    ['entregue', 'concluido'].includes(project.status) 
                      ? 'text-white'
                      : 'text-slate-300'
                  }`} />
                </div>
                <div>
                  <p className="text-sm font-medium">Entregue / Aprovado</p>
                  <p className={`text-xs ${
                    ['entregue', 'concluido'].includes(project.status)
                      ? 'text-slate-600'
                      : 'text-gray-500'
                  }`}>
                    {['entregue', 'concluido'].includes(project.status)
                      ? 'Concluído'
                      : 'Pendente'}
                  </p>
                </div>
              </div>
              
              <div 
                className="flex items-start cursor-pointer group"
                onClick={() => handleUpdateProjectStatus('concluido')}
              >
                <div className={`w-6 h-6 rounded-full flex items-center justify-center mr-3 shrink-0 transition-colors
                  ${project.status === 'concluido'
                    ? 'bg-green-500'
                    : 'bg-slate-100'
                  }`}
                >
                  <Check className={`h-3.5 w-3.5 ${
                    project.status === 'concluido' 
                      ? 'text-white'
                      : 'text-slate-300'
                  }`} />
                </div>
                <div>
                  <p className="text-sm font-medium">Concluído (Pago)</p>
                  <p className={`text-xs ${
                    project.status === 'concluido'
                      ? 'text-slate-600'
                      : 'text-gray-500'
                  }`}>
                    {project.status === 'concluido'
                      ? 'Concluído'
                      : 'Pendente'}
                  </p>
                </div>
              </div>
              
              {/* Linha separadora */}
              <div className="border-t border-gray-200 my-4"></div>
              
              {/* Status especiais */}
              <div className="flex flex-wrap gap-3">
                <button
                  className={`flex items-center px-3 py-1.5 rounded text-sm
                    ${project.status === 'atrasado'
                      ? 'bg-rose-100 text-rose-600 border border-rose-300'
                      : 'bg-gray-50 text-gray-500 border border-gray-200 hover:bg-gray-100'
                    }`}
                  onClick={() => handleUpdateProjectStatus('atrasado')}
                >
                  <Clock className="h-3.5 w-3.5 mr-1.5" />
                  Atrasado
                </button>
                
                <button
                  className={`flex items-center px-3 py-1.5 rounded text-sm
                    ${project.status === 'pausado'
                      ? 'bg-amber-100 text-amber-600 border border-amber-300'
                      : 'bg-gray-50 text-gray-500 border border-gray-200 hover:bg-gray-100'
                    }`}
                  onClick={() => handleUpdateProjectStatus('pausado')}
                >
                  <Pause className="h-3.5 w-3.5 mr-1.5" />
                  Pausado
                </button>
                
                <button
                  className={`flex items-center px-3 py-1.5 rounded text-sm
                    ${project.status === 'cancelado'
                      ? 'bg-gray-100 text-gray-600 border border-gray-300'
                      : 'bg-gray-50 text-gray-500 border border-gray-200 hover:bg-gray-100'
                    }`}
                  onClick={() => handleUpdateProjectStatus('cancelado')}
                >
                  <X className="h-3.5 w-3.5 mr-1.5" />
                  Cancelado
                </button>
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-500">Carregando etapas...</p>
          )}
        </div>
        
        <div className="mb-8">
          <div className="flex justify-between items-center mb-2">
            <div className="text-xs font-medium text-gray-500">PROGRESSO</div>
            <div className="text-xs font-semibold">{progress}%</div>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-1.5">
            <div 
              className="bg-indigo-600 h-1.5 rounded-full" 
              style={{ width: `${progress}%` }}
            ></div>
          </div>
          {stages && (
            <div className="text-xs text-gray-500 mt-1">
              {completedStages} de {totalStages} etapas concluídas
            </div>
          )}
        </div>
        
        <div>
          <Button 
            className="w-full bg-indigo-600 hover:bg-indigo-700 mb-3"
            onClick={() => {
              if (project) {
                setProjectToEdit(project);
                openProjectForm();
              }
            }}
          >
            <Edit className="h-4 w-4 mr-2" />
            Editar Projeto
          </Button>
          <Button 
            className="w-full" 
            variant="outline"
            onClick={handleManageTasks}
          >
            Gerenciar Tarefas
          </Button>
          <Button 
            className="w-full mt-3" 
            variant="outline"
            onClick={handleProjectFinancial}
          >
            Financeiro
          </Button>
          <Button 
            className="w-full mt-3" 
            variant="outline"
            onClick={handleDuplicateProject}
            disabled={duplicateProjectMutation.isPending}
          >
            {duplicateProjectMutation.isPending ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-indigo-600 mr-2"></div>
                Duplicando...
              </>
            ) : (
              <>
                <Copy className="h-4 w-4 mr-2" />
                Duplicar Projeto
              </>
            )}
          </Button>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button 
                className="w-full mt-3 border-red-600 text-red-600 hover:bg-red-50" 
                variant="outline"
                disabled={deleteProjectMutation.isPending}
              >
                {deleteProjectMutation.isPending ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600 mr-2"></div>
                    Excluindo...
                  </>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4 mr-2" />
                    Excluir Projeto
                  </>
                )}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Excluir projeto</AlertDialogTitle>
                <AlertDialogDescription>
                  Tem certeza que deseja excluir o projeto "{project.name}"? Esta ação não pode ser desfeita.
                  <br /><br />
                  <strong>Todos os dados associados, como tarefas e arquivos, também serão excluídos permanentemente.</strong>
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDeleteProject}
                  className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
                >
                  Excluir
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
      
      {/* Diálogo de adicionar membro */}
      <Dialog open={showAddMemberDialog} onOpenChange={setShowAddMemberDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Adicionar Membro à Equipe</DialogTitle>
            <DialogDescription>
              Selecione um usuário e defina seu papel no projeto.
            </DialogDescription>
          </DialogHeader>
          
          <AddMemberForm 
            projectId={projectId} 
            onSuccess={() => {
              setShowAddMemberDialog(false);
              queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/members`] });
            }}
          />
        </DialogContent>
      </Dialog>
      
      {/* ProjectFormDialog é renderizado e gerenciado pelo contexto global */}
      <ProjectFormDialog />
    </div>
  );
}

// Componente de formulário para adicionar membro
function AddMemberForm({ projectId, onSuccess }: { projectId: number, onSuccess: () => void }) {
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [selectedRole, setSelectedRole] = useState<string>(TEAM_ROLE_OPTIONS[0].value); // Use o primeiro valor disponível como padrão
  const [isPending, setIsPending] = useState(false);
  const { toast } = useToast();
  
  const { data: users } = useQuery({
    queryKey: ['/api/users'],
  });
  
  const { data: projectMembers } = useQuery({
    queryKey: [`/api/projects/${projectId}/members`],
    enabled: !!projectId
  });
  
  // Filtra usuários que já são membros do projeto
  const availableUsers = users?.filter(user => {
    return !projectMembers?.some(member => member.user_id === user.id);
  }) || [];
  
  async function handleAddMember() {
    if (!selectedUserId) {
      toast({
        title: "Erro",
        description: "Selecione um usuário para adicionar à equipe.",
        variant: "destructive"
      });
      return;
    }
    
    setIsPending(true);
    
    try {
      console.log('Enviando dados para adicionar membro:', {
        user_id: selectedUserId,
        role: selectedRole,
        project_id: projectId // adiciona project_id explicitamente
      });
      
      await apiRequest('POST', `/api/projects/${projectId}/members`, {
        user_id: selectedUserId,
        role: selectedRole,
        project_id: projectId // adiciona project_id explicitamente para redundância
      });
      
      toast({
        title: "Membro adicionado",
        description: "O membro foi adicionado com sucesso à equipe do projeto."
      });
      
      onSuccess();
    } catch (error) {
      console.error('Erro ao adicionar membro:', error);
      toast({
        title: "Erro ao adicionar membro",
        description: error.message || "Falha ao adicionar membro à equipe",
        variant: "destructive"
      });
    } finally {
      setIsPending(false);
    }
  }
  
  return (
    <div className="grid gap-4 py-4">
      <div className="grid grid-cols-4 items-center gap-4">
        <label htmlFor="user" className="text-right text-sm font-medium">
          Usuário
        </label>
        <Select 
          onValueChange={(value) => setSelectedUserId(Number(value))}
        >
          <SelectTrigger className="col-span-3">
            <SelectValue placeholder="Selecione um usuário" />
          </SelectTrigger>
          <SelectContent>
            {availableUsers.length > 0 ? (
              availableUsers.map(user => (
                <SelectItem key={user.id} value={user.id.toString()}>
                  {user.name}
                </SelectItem>
              ))
            ) : (
              <SelectItem value="none" disabled>Não há usuários disponíveis</SelectItem>
            )}
          </SelectContent>
        </Select>
      </div>
      
      <div className="grid grid-cols-4 items-center gap-4">
        <label htmlFor="role" className="text-right text-sm font-medium">
          Função
        </label>
        <Select 
          value={selectedRole}
          onValueChange={setSelectedRole}
        >
          <SelectTrigger className="col-span-3">
            <SelectValue placeholder="Selecione uma função" />
          </SelectTrigger>
          <SelectContent>
            {TEAM_ROLE_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      
      <DialogFooter>
        <Button variant="outline" onClick={() => setShowAddMemberDialog(false)}>
          Cancelar
        </Button>
        <Button onClick={handleAddMember} disabled={isPending}>
          {isPending ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Adicionando...
            </>
          ) : "Adicionar Membro"}
        </Button>
      </DialogFooter>
    </div>
  );
}
