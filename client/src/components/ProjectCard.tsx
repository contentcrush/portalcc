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
import { MoreVertical } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { ProjectWithClient } from "@/lib/types";
import { StatusLabels } from "@/lib/types";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useQuery } from "@tanstack/react-query";
import StatusBadge from "./StatusBadge";
import UserAvatar from "./UserAvatar";

interface ProjectCardProps {
  project: ProjectWithClient;
  onOpenDetails?: (projectId: number) => void;
}

export default function ProjectCard({ project, onOpenDetails }: ProjectCardProps) {
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

  function handleOpenDetails() {
    if (onOpenDetails) {
      onOpenDetails(project.id);
    }
  }

  return (
    <Card className="overflow-hidden h-full flex flex-col">
      <div className="relative">
        {project.thumbnail ? (
          <img 
            src={project.thumbnail} 
            alt={project.name} 
            className="w-full h-48 object-cover"
          />
        ) : (
          <div className="w-full h-48 bg-gray-200 flex items-center justify-center">
            <span className="text-gray-400 text-2xl font-semibold">
              {project.name.charAt(0)}
            </span>
          </div>
        )}
        <div className="absolute top-3 right-3">
          <StatusBadge status={project.status} />
        </div>
      </div>

      <CardContent className="p-4 flex-1 flex flex-col">
        <Link href={`/projects/${project.id}`}>
          <h3 className="font-semibold text-lg mb-1 hover:text-primary cursor-pointer">
            {project.name}
          </h3>
        </Link>
        <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
          {project.description || "Sem descrição disponível."}
        </p>

        <div className="flex items-center mb-3">
          <div className="flex -space-x-2 mr-3">
            {teamMembers && teamMembers.length > 0 ? (
              teamMembers.slice(0, 3).map((member, index) => (
                <TooltipProvider key={member.id}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="cursor-pointer">
                        <UserAvatar
                          user={member.user}
                          className="w-6 h-6 border-2 border-white"
                        />
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{member.user?.name || "Usuário"}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              ))
            ) : (
              <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-xs text-gray-500">
                ?
              </div>
            )}
            
            {teamMembers && teamMembers.length > 3 && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-xs border-2 border-white">
                      +{teamMembers.length - 3}
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Mais {teamMembers.length - 3} membros</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
          <div className="text-xs text-muted-foreground">
            {completedStages}/{totalStages} Etapas
          </div>
        </div>

        <div className="mb-3">
          <div className="flex justify-between text-xs mb-1">
            <span>Progresso</span>
            <span className="font-medium">{progress}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        <div className="mt-auto flex items-center justify-between text-sm">
          <div className="flex items-center">
            {project.client ? (
              <Link href={`/clients/${project.client.id}`}>
                <div className="flex items-center hover:text-primary cursor-pointer">
                  <span className="flex items-center justify-center w-5 h-5 bg-primary/10 text-primary rounded-md mr-2 text-xs">
                    {getInitials(project.client.name)}
                  </span>
                  <span className="truncate max-w-[120px]">{project.client.name}</span>
                </div>
              </Link>
            ) : (
              <div className="flex items-center">
                <span className="flex items-center justify-center w-5 h-5 bg-gray-100 text-gray-500 rounded-md mr-2 text-xs">
                  ?
                </span>
                <span>Cliente</span>
              </div>
            )}
          </div>
          <Button variant="ghost" size="icon" onClick={handleOpenDetails} className="h-6 w-6">
            <MoreVertical className="h-4 w-4" />
          </Button>
        </div>
        
        {/* Additional info at bottom */}
        <div className="mt-3 pt-3 border-t border-border flex justify-between text-xs text-muted-foreground">
          {project.endDate && (
            <div className={`${daysRemaining < 5 ? 'text-destructive' : ''}`}>
              Prazo: {formatDate(project.endDate)}
            </div>
          )}
          {project.budget && (
            <div>
              {formatCurrency(project.budget)}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
