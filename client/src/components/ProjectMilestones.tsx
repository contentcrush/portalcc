import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, Circle, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { PROJECT_MILESTONES, calculateIntelligentProgress, type ProjectStatus } from "@shared/schema";

interface ProjectMilestonesProps {
  project: any;
  className?: string;
}

export function ProjectMilestones({ project, className }: ProjectMilestonesProps) {
  const projectStatus = project.status as ProjectStatus;
  const milestones = PROJECT_MILESTONES[projectStatus] || [];
  
  // Simular marcos completados para demonstração
  const completedMilestones = project.completed_milestones || [];
  
  // Calcular progresso inteligente
  const hasBudget = project.budget && project.budget > 0;
  const hasTeamMembers = project.members && project.members.length > 0;
  const hasFinancialDocuments = project.financial_documents && project.financial_documents.length > 0;
  
  const intelligentProgress = calculateIntelligentProgress(
    projectStatus, 
    completedMilestones, 
    hasBudget,
    hasTeamMembers,
    hasFinancialDocuments
  );

  if (milestones.length === 0) {
    return null;
  }

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center justify-between">
          <span>Marcos do Projeto</span>
          <Badge variant="outline" className="text-xs">
            {completedMilestones.length}/{milestones.length} Concluídos
          </Badge>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Barra de progresso geral */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Progresso da Etapa</span>
            <span className="font-medium">{intelligentProgress.progress}%</span>
          </div>
          <Progress value={intelligentProgress.progress} className="h-2" />
        </div>

        {/* Lista de marcos */}
        <div className="space-y-3">
          {milestones.map((milestone) => {
            const isCompleted = completedMilestones.includes(milestone.id);
            const isNext = !isCompleted && intelligentProgress.nextMilestone === milestone.label;
            
            return (
              <div 
                key={milestone.id} 
                className={cn(
                  "flex items-center gap-3 p-3 rounded-lg border transition-colors",
                  isCompleted && "bg-green-50 border-green-200",
                  isNext && "bg-blue-50 border-blue-200",
                  !isCompleted && !isNext && "bg-gray-50 border-gray-200"
                )}
              >
                <div className="flex-shrink-0">
                  {isCompleted ? (
                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                  ) : isNext ? (
                    <Clock className="w-5 h-5 text-blue-600" />
                  ) : (
                    <Circle className="w-5 h-5 text-gray-400" />
                  )}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h4 className={cn(
                      "text-sm font-medium",
                      isCompleted && "text-green-800",
                      isNext && "text-blue-800",
                      !isCompleted && !isNext && "text-gray-600"
                    )}>
                      {milestone.label}
                    </h4>
                    <span className="text-xs text-gray-500">
                      {milestone.weight}%
                    </span>
                  </div>
                  
                  {isNext && (
                    <p className="text-xs text-blue-600 mt-1">
                      Próximo marco a ser concluído
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Indicadores automáticos */}
        <div className="border-t pt-4">
          <h5 className="text-sm font-medium text-gray-700 mb-3">Indicadores Automáticos</h5>
          <div className="grid grid-cols-1 gap-2 text-xs">
            <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
              <span className="flex items-center gap-2">
                {hasBudget ? (
                  <CheckCircle2 className="w-3 h-3 text-green-600" />
                ) : (
                  <Circle className="w-3 h-3 text-gray-400" />
                )}
                Orçamento Definido
              </span>
              {hasBudget && <span className="text-green-600 font-medium">+5%</span>}
            </div>
            
            <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
              <span className="flex items-center gap-2">
                {hasTeamMembers ? (
                  <CheckCircle2 className="w-3 h-3 text-green-600" />
                ) : (
                  <Circle className="w-3 h-3 text-gray-400" />
                )}
                Equipe Designada
              </span>
              {hasTeamMembers && <span className="text-green-600 font-medium">+3%</span>}
            </div>
            
            <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
              <span className="flex items-center gap-2">
                {hasFinancialDocuments ? (
                  <CheckCircle2 className="w-3 h-3 text-green-600" />
                ) : (
                  <Circle className="w-3 h-3 text-gray-400" />
                )}
                Documentos Financeiros
              </span>
              {hasFinancialDocuments && <span className="text-green-600 font-medium">+2%</span>}
            </div>
          </div>
        </div>

        {/* Resumo do progresso */}
        {intelligentProgress.details && (
          <div className="border-t pt-4">
            <h5 className="text-sm font-medium text-gray-700 mb-2">Resumo do Progresso</h5>
            <div className="text-xs text-gray-600 space-y-1">
              <div className="flex justify-between">
                <span>Progresso Base ({projectStatus}):</span>
                <span>{intelligentProgress.details.baseProgress}%</span>
              </div>
              <div className="flex justify-between">
                <span>Marcos Concluídos:</span>
                <span>+{intelligentProgress.details.milestoneProgress}%</span>
              </div>
              <div className="flex justify-between">
                <span>Indicadores Automáticos:</span>
                <span>+{intelligentProgress.details.autoProgress}%</span>
              </div>
              <div className="flex justify-between font-medium border-t pt-1">
                <span>Total:</span>
                <span>{intelligentProgress.progress}%</span>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}