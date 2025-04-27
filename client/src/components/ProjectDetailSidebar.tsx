import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { X, Edit, CheckCircle2, Circle, MoreHorizontal, Copy } from "lucide-react";
import { formatDate, formatCurrency, getInitials } from "@/lib/utils";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import UserAvatar from "./UserAvatar";

interface ProjectDetailSidebarProps {
  projectId: number;
  onClose: () => void;
}

export default function ProjectDetailSidebar({ projectId, onClose }: ProjectDetailSidebarProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

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
      return apiRequest('POST', `/api/projects/${projectId}/duplicate`);
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
  
  const handleDuplicateProject = () => {
    duplicateProjectMutation.mutate();
  };

  // Get team members with their user details
  const teamMembers = projectMembers?.map(member => {
    const user = users?.find(u => u.id === member.user_id);
    return {
      ...member,
      user
    };
  });

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
            <div className={`px-2 py-1 rounded text-xs ${
              project?.status === 'em_andamento' ? 'bg-green-100 text-green-700' : 
              project?.status === 'pre_producao' ? 'bg-blue-100 text-blue-700' : 
              project?.status === 'em_producao' ? 'bg-amber-100 text-amber-700' : 
              project?.status === 'concluido' ? 'bg-gray-100 text-gray-700' : 
              'bg-gray-100 text-gray-700'
            }`}>
              {project?.status === 'em_andamento' ? 'Em andamento' : 
               project?.status === 'pre_producao' ? 'Pré-produção' : 
               project?.status === 'em_producao' ? 'Em produção' : 
               project?.status === 'concluido' ? 'Concluído' : 
               project?.status || 'Não definido'}
            </div>
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
                <div key={member.id} className="flex items-start">
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
                    <p className="text-xs text-gray-500">{member.role || 'Membro'}</p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-gray-500">Nenhum membro na equipe</p>
            )}
            
            <div className="flex justify-center">
              <Button variant="ghost" size="sm" className="text-indigo-600">
                + Adicionar membro
              </Button>
            </div>
          </div>
        </div>
        
        <div className="mb-8">
          <h4 className="font-medium text-sm mb-4">ETAPAS DO PROJETO</h4>
          <div className="space-y-3">
            {stages && stages.length > 0 ? (
              stages.map((stage) => (
                <div key={stage.id} className="flex items-center">
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center mr-3 ${
                    stage.completed 
                      ? 'bg-green-500' 
                      : 'bg-gray-100'
                  }`}>
                    {stage.completed && <CheckCircle2 className="h-3 w-3 text-white" />}
                  </div>
                  <div>
                    <p className="text-sm font-medium">{stage.name}</p>
                    <p className={`text-xs ${
                      stage.completed 
                        ? 'text-green-600' 
                        : 'text-gray-500'
                    }`}>
                      {stage.completed 
                        ? `Concluída em ${formatDate(stage.completion_date || new Date())}` 
                        : 'Pendente'}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-gray-500">Nenhuma etapa definida</p>
            )}
          </div>
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
          <Button className="w-full bg-indigo-600 hover:bg-indigo-700 mb-3">
            Editar Projeto
          </Button>
          <Button className="w-full" variant="outline">
            Gerenciar Tarefas
          </Button>
          <Button className="w-full mt-3" variant="outline">
            Financeiro
          </Button>
          <Button 
            className="w-full mt-3" 
            variant="outline"
            onClick={handleDuplicateProject}
          >
            <Copy className="h-4 w-4 mr-2" />
            Duplicar Projeto
          </Button>
        </div>
      </div>
    </div>
  );
}
