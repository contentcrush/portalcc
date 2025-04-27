import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { X, Edit, CheckCircle2, Circle, MoreHorizontal } from "lucide-react";
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
    <div className="fixed inset-y-0 right-0 bg-white shadow-lg w-96 transform transition-transform duration-300 z-20 border-l border-gray-200 overflow-y-auto">
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <h2 className="font-semibold text-lg">Detalhes do Projeto</h2>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-5 w-5" />
        </Button>
      </div>
      
      <div className="p-4">
        <div className="flex items-center mb-6">
          <div 
            className="w-12 h-12 rounded-full flex items-center justify-center font-semibold text-lg"
            style={{ 
              backgroundColor: client ? `rgba(59, 130, 246, 0.1)` : '#E5E7EB',
              color: client ? `rgb(59, 130, 246)` : '#6B7280'
            }}
          >
            {client ? getInitials(client.name) : 'XX'}
          </div>
          <div className="ml-4">
            <h3 className="font-semibold text-lg">{project.name}</h3>
            <p className="text-sm text-gray-500">Criado em {formatDate(project.creation_date)}</p>
          </div>
        </div>
        
        <div className="border-b border-gray-200 pb-4 mb-4">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm text-gray-500">Status:</div>
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
              project.status === 'em_andamento' ? 'bg-green-50 text-green-600' : 
              project.status === 'pre_producao' ? 'bg-blue-50 text-blue-600' : 
              project.status === 'em_producao' ? 'bg-yellow-50 text-yellow-600' : 
              project.status === 'concluido' ? 'bg-green-50 text-green-600' : 
              'bg-gray-50 text-gray-600'
            }`}>
              {project.status === 'em_andamento' ? 'Em andamento' : 
               project.status === 'pre_producao' ? 'Pré-produção' : 
               project.status === 'em_producao' ? 'Em produção' : 
               project.status === 'concluido' ? 'Concluído' : 
               project.status}
            </span>
          </div>
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm text-gray-500">Cliente:</div>
            <span className="text-sm font-medium">{client?.name || 'Não informado'}</span>
          </div>
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm text-gray-500">Orçamento:</div>
            <span className="text-sm font-medium">{formatCurrency(project.budget)}</span>
          </div>
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-500">Prazo:</div>
            <span className="text-sm font-medium">{formatDate(project.endDate)}</span>
          </div>
        </div>
        
        <div className="mb-6">
          <h4 className="font-medium text-sm uppercase text-gray-500 mb-2">Equipe do Projeto</h4>
          <div className="space-y-3">
            {teamMembers && teamMembers.length > 0 ? (
              teamMembers.map(member => (
                <div key={member.id} className="flex items-center">
                  <UserAvatar user={member.user} className="w-8 h-8 mr-3" />
                  <div>
                    <p className="text-sm font-medium">{member.user?.name || 'Usuário'}</p>
                    <p className="text-xs text-gray-500 capitalize">{member.role || 'Membro'}</p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-gray-500">Nenhum membro atribuído a este projeto.</p>
            )}
            <Button variant="ghost" size="sm" className="text-primary w-full">
              <MoreHorizontal className="h-4 w-4 mr-1" />
              Gerenciar equipe
            </Button>
          </div>
        </div>
        
        <div className="mb-6">
          <h4 className="font-medium text-sm uppercase text-gray-500 mb-2">Etapas do Projeto</h4>
          <div className="space-y-2">
            {stages && stages.length > 0 ? (
              stages.map((stage, index) => (
                <div key={stage.id} className="flex items-center">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-6 w-6 mr-2 p-0"
                    onClick={() => toggleStageCompletion(stage.id, stage.completed)}
                    disabled={updateStageMutation.isPending}
                  >
                    {stage.completed ? (
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                    ) : (
                      <Circle className="h-5 w-5 text-gray-300" />
                    )}
                  </Button>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{stage.name}</p>
                    <p className="text-xs text-gray-500">
                      {stage.completed 
                        ? `Concluído em ${formatDate(stage.completion_date)}` 
                        : stage.description || `Etapa ${index + 1}`}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-gray-500">Nenhuma etapa definida para este projeto.</p>
            )}
            <Button variant="ghost" size="sm" className="text-primary w-full">
              <MoreHorizontal className="h-4 w-4 mr-1" />
              Gerenciar etapas
            </Button>
          </div>
        </div>
        
        <div className="mb-6">
          <div className="flex justify-between items-center mb-2">
            <h4 className="font-medium text-sm uppercase text-gray-500">Progresso</h4>
            <span className="text-sm font-medium">{progress}%</span>
          </div>
          <Progress value={progress} className="h-2.5 mb-4" />
          <div className="text-xs text-muted-foreground">
            {completedStages} de {totalStages} etapas concluídas
          </div>
        </div>
        
        <div className="flex space-x-3">
          <Button className="flex-1 py-2" variant="default">
            <Edit className="h-5 w-5 mr-2" />
            Editar Projeto
          </Button>
          <Button className="flex-1 py-2" variant="outline">
            Gerenciar Tarefas
          </Button>
        </div>
        
        <div className="mt-4">
          <Button variant="outline" className="w-full py-2">
            Financeiro
          </Button>
        </div>
      </div>
    </div>
  );
}
