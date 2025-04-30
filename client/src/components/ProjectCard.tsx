import React, { useState } from "react";
import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { 
  calculateProjectProgress, 
  formatDate, 
  formatCurrency, 
  getInitials, 
  calculateDaysRemaining,
  getProgressBarColor
} from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Copy, 
  CopyCheck, 
  MoreVertical, 
  Copy as CopyIcon, 
  Trash2,
  Edit
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { ProjectWithClient } from "@/lib/types";
import { StatusLabels } from "@/lib/types";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useProjectForm } from "@/contexts/ProjectFormContext";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import StatusBadge from "./StatusBadge";
import { UserAvatar } from "./UserAvatar";

interface ProjectCardProps {
  project: ProjectWithClient;
  onOpenDetails?: (projectId: number) => void;
}

export default function ProjectCard({ project, onOpenDetails }: ProjectCardProps) {
  const { toast } = useToast();
  const { openProjectForm, setProjectToEdit } = useProjectForm();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
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
  
  // Mutação para excluir projeto
  const deleteProjectMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("DELETE", `/api/projects/${project.id}`);
    },
    onSuccess: () => {
      toast({
        title: "Projeto excluído com sucesso",
        description: "O projeto foi removido permanentemente",
        variant: "default",
      });
      // Atualiza a lista de projetos
      queryClient.invalidateQueries({ queryKey: ['/api/projects'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao excluir projeto",
        description: error.message || "Não foi possível excluir o projeto",
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
  
  function handleDeleteProject(e?: React.MouseEvent) {
    if (e) {
      e.stopPropagation();
    }
    setShowDeleteDialog(false);
    deleteProjectMutation.mutate();
  }

  return (
    <>
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
            <StatusBadge status={project.status} small={true} />
          </div>
          
          <div className="absolute top-3 right-3 z-10">
            <DropdownMenu>
              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                <Button variant="ghost" size="icon" className="h-8 w-8 bg-white/80 hover:bg-white">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem 
                  onClick={(e) => {
                    e.stopPropagation();
                    setProjectToEdit(project);
                    openProjectForm();
                  }} 
                  className="cursor-pointer"
                >
                  <Edit className="mr-2 h-4 w-4" /> 
                  Editar Projeto
                </DropdownMenuItem>
                
                <DropdownMenuItem onClick={handleDuplicateProject} className="cursor-pointer">
                  <Copy className="mr-2 h-4 w-4" /> 
                  Duplicar Projeto
                </DropdownMenuItem>
                
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowDeleteDialog(true);
                  }}
                  className="cursor-pointer text-red-600 focus:text-red-600 focus:bg-red-50"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Excluir Projeto
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
                className={`${getProgressBarColor(progress)} h-1.5 rounded-full`}
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

      {/* AlertDialog separado fora do dropdown menu */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent onClick={(e) => e.stopPropagation()}>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir projeto</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o projeto "{project.name}"? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={(e) => e.stopPropagation()}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteProject}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
