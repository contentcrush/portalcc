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
            {client ? getInitials(client.name) : 'BA'}
          </div>
        </div>
        
        <div className="text-center mb-6">
          <h3 className="font-medium text-lg">Comercial Banco Azul</h3>
          <p className="text-sm text-gray-500">Criado em 10/03/2025</p>
        </div>
        
        <div className="space-y-4 mb-8">
          <div className="flex items-center justify-between">
            <div className="text-sm font-medium text-gray-600">Status:</div>
            <div className="bg-green-100 text-green-700 px-2 py-1 rounded text-xs">Em andamento</div>
          </div>
          
          <div className="flex items-center justify-between">
            <div className="text-sm font-medium text-gray-600">Cliente:</div>
            <div className="text-sm font-medium">Banco Azul</div>
          </div>
          
          <div className="flex items-center justify-between">
            <div className="text-sm font-medium text-gray-600">Orçamento:</div>
            <div className="text-sm font-medium">R$ 54.000</div>
          </div>
          
          <div className="flex items-center justify-between">
            <div className="text-sm font-medium text-gray-600">Prazo:</div>
            <div className="text-sm font-medium">28/04/2025</div>
          </div>
        </div>
        
        <div className="mb-8">
          <h4 className="font-medium text-sm mb-4">EQUIPE DO PROJETO</h4>
          <div className="space-y-4">
            <div className="flex items-start">
              <img 
                src="https://randomuser.me/api/portraits/men/32.jpg" 
                alt="Bruno Silva"
                className="w-8 h-8 rounded-full mr-3"
              />
              <div>
                <p className="text-sm font-medium">Bruno Silva</p>
                <p className="text-xs text-gray-500">Diretor</p>
              </div>
            </div>
            
            <div className="flex items-start">
              <img 
                src="https://randomuser.me/api/portraits/women/44.jpg" 
                alt="Ana Oliveira"
                className="w-8 h-8 rounded-full mr-3"
              />
              <div>
                <p className="text-sm font-medium">Ana Oliveira</p>
                <p className="text-xs text-gray-500">Produtora</p>
              </div>
            </div>
            
            <div className="flex items-start">
              <img 
                src="https://randomuser.me/api/portraits/women/68.jpg" 
                alt="Julia Santos"
                className="w-8 h-8 rounded-full mr-3"
              />
              <div>
                <p className="text-sm font-medium">Julia Santos</p>
                <p className="text-xs text-gray-500">Editora</p>
              </div>
            </div>
            
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
            <div className="flex items-center">
              <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center mr-3">
                <CheckCircle2 className="h-3 w-3 text-white" />
              </div>
              <div>
                <p className="text-sm font-medium">Pré-produção</p>
                <p className="text-xs text-green-600">Concluída em 25/03/2025</p>
              </div>
            </div>
            
            <div className="flex items-center">
              <div className="w-5 h-5 bg-indigo-100 border border-indigo-600 rounded-full flex items-center justify-center mr-3">
                <div className="w-2 h-2 rounded-full bg-indigo-600"></div>
              </div>
              <div>
                <p className="text-sm font-medium">Produção</p>
                <p className="text-xs text-indigo-600">Em andamento</p>
              </div>
            </div>
            
            <div className="flex items-center">
              <div className="w-5 h-5 bg-gray-100 rounded-full mr-3">
              </div>
              <div>
                <p className="text-sm font-medium">Pós-produção</p>
                <p className="text-xs text-gray-500">Pendente</p>
              </div>
            </div>
          </div>
        </div>
        
        <div className="mb-8">
          <div className="flex justify-between items-center mb-2">
            <div className="text-xs font-medium text-gray-500">PROGRESSO</div>
            <div className="text-xs font-semibold">65%</div>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-1.5">
            <div className="bg-indigo-600 h-1.5 rounded-full" style={{ width: '65%' }}></div>
          </div>
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
        </div>
      </div>
    </div>
  );
}
