import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { 
  calculateProjectProgress, 
  formatDate, 
  formatCurrency, 
  getInitials, 
  calculateDaysRemaining 
} from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Copy, CopyCheck, MoreVertical, Copy as CopyIcon } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { ProjectWithClient } from "@/lib/types";
import { StatusLabels } from "@/lib/types";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import StatusBadge from "./StatusBadge";
import { UserAvatar } from "./UserAvatar";

interface ProjectCardProps {
  project: ProjectWithClient;
  onOpenDetails?: (projectId: number) => void;
}

export default function ProjectCard({ project, onOpenDetails }: ProjectCardProps) {
  const { toast } = useToast();
  const { data: projectMembers } = useQuery({
    queryKey: [`/api/projects/${project.id}/members`],
    enabled: !!project.id,
  });

  const { data: projectStages } = useQuery({
    queryKey: [`/api/projects/${project.id}/stages`],
    enabled: !!project.id,
  });

  const { data: users } = useQuery({
    queryKey: ['/api/users'],
    enabled: !!projectMembers,
  });

  // Mutação para duplicar projeto
  const duplicateProjectMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/projects/${project.id}/duplicate`);
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

  // Get team members with their user details
  const teamMembers = projectMembers?.map(member => {
    const user = users?.find(u => u.id === member.user_id);
    return {
      ...member,
      user
    };
  });

  const completedStages = projectStages?.filter(stage => stage.completed)?.length || 0;
  const totalStages = projectStages?.length || 0;
  const progress = calculateProjectProgress(project);
  const daysRemaining = calculateDaysRemaining(project.endDate);

  function handleOpenDetails(e?: React.MouseEvent) {
    if (e) {
      e.stopPropagation();
    }
    if (onOpenDetails) {
      onOpenDetails(project.id);
    }
  }

  function handleDuplicateProject(e: React.MouseEvent) {
    e.stopPropagation();
    duplicateProjectMutation.mutate();
  }

  return (
    <Card 
      className="overflow-hidden h-full flex flex-col cursor-pointer hover:shadow-md transition-shadow"
      onClick={handleOpenDetails}
    >
      <div className="relative">
        {project.thumbnail ? (
          <img 
            src={project.thumbnail} 
            alt={project.name} 
            className="w-full h-44 object-cover"
          />
        ) : (
          <div className="w-full h-44 bg-gray-200 flex items-center justify-center">
            <span className="text-gray-400 text-2xl font-semibold">
              {project.name.charAt(0)}
            </span>
          </div>
        )}
        <div className="absolute top-3 left-3">
          <div className={`px-2 py-1 rounded-md text-xs ${
            project.status === 'em_andamento' ? 'bg-green-100 text-green-800' : 
            project.status === 'pre_producao' ? 'bg-blue-100 text-blue-800' : 
            project.status === 'em_producao' ? 'bg-amber-100 text-amber-800' : 
            project.status === 'concluido' ? 'bg-gray-100 text-gray-800' : 
            project.status === 'planejamento' ? 'bg-indigo-100 text-indigo-800' : 
            'bg-gray-100 text-gray-800'
          }`}>
            {project.status === 'em_andamento' ? 'Em andamento' : 
             project.status === 'pre_producao' ? 'Pré-produção' : 
             project.status === 'em_producao' ? 'Em produção' : 
             project.status === 'concluido' ? 'Concluído' : 
             project.status === 'planejamento' ? 'Planejamento' : 
             project.status}
          </div>
        </div>
        
        <div className="absolute top-3 right-3 z-10">
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button variant="ghost" size="icon" className="h-8 w-8 bg-white/80 hover:bg-white">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleDuplicateProject} className="cursor-pointer">
                <Copy className="mr-2 h-4 w-4" /> 
                Duplicar Projeto
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <CardContent className="p-4 flex-1 flex flex-col">
        <div className="flex items-center space-x-2 mb-1">
          {teamMembers && teamMembers.length > 0 ? (
            <div className="flex -space-x-2">
              {teamMembers.slice(0, 3).map((member) => (
                <div key={member.id} className="w-6 h-6 rounded-full border-2 border-white overflow-hidden">
                  {member.user?.avatar ? (
                    <img 
                      src={member.user.avatar} 
                      alt={member.user.name} 
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-gray-200 flex items-center justify-center text-xs">
                      {getInitials(member.user?.name || "U")}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : null}
        </div>
        
        <h3 className="font-medium text-base mb-1 hover:text-indigo-600">
          {project.name}
        </h3>
        <p className="text-sm text-gray-500 mb-2 line-clamp-2">
          {project.description ? project.description.substring(0, 80) : 
            project.client ? `Projeto para ${project.client.name}` : 
            "Sem descrição disponível."}
        </p>

        <div className="mt-2 mb-4">
          <div className="flex justify-between text-xs mb-1.5">
            <span>Progresso</span>
            <span className="font-medium">{progress}%</span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-1.5">
            <div 
              className="bg-indigo-600 h-1.5 rounded-full" 
              style={{ width: `${progress}%` }}
            ></div>
          </div>
        </div>

        <div className="flex items-center justify-between text-xs text-gray-500 mt-auto pt-3 border-t border-gray-100">
          <div className="flex items-center">
            <span className="mr-2">Entrega:</span>
            <span className="font-medium">{formatDate(project.endDate)}</span>
          </div>
          
          {completedStages > 0 && (
            <div className="flex items-center">
              <span>{completedStages}/{totalStages} Etapas</span>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between text-xs mt-2">
          {project.client && (
            <div className="flex items-center">
              <div className="flex items-center justify-center w-5 h-5 rounded-full bg-gray-100 text-gray-700 mr-1.5 text-[10px] font-medium">
                {getInitials(project.client.name)}
              </div>
              <span className="text-gray-700 font-medium">{project.client.name}</span>
            </div>
          )}
          
          {project.budget && (
            <div className="text-gray-700 font-medium">
              {formatCurrency(project.budget)}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
