import React, { useState, useRef, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { showSuccessToast } from '@/lib/utils';
import { format, addDays, differenceInDays, parseISO, isBefore, isAfter } from 'date-fns';
import { pt } from 'date-fns/locale';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import StatusBadge from './StatusBadge';
import {
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  ChevronsLeft,
  ChevronsRight,
} from 'lucide-react';

interface ProjectGanttProps {
  projects: any[];
}

// Possible zoom levels
const ZOOM_LEVELS = [7, 14, 30, 60, 90, 180, 365];

export default function ProjectGantt({ projects }: ProjectGanttProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [zoomIndex, setZoomIndex] = useState(2); // Default to 30 days
  const [startDate, setStartDate] = useState(new Date());
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  
  // Get the number of days in the current view
  const daysInView = ZOOM_LEVELS[zoomIndex];
  
  // Calculate end date based on start date and zoom level
  const endDate = addDays(startDate, daysInView);
  
  // Generate array of dates for the timeline header
  const dates = Array.from({ length: daysInView }, (_, i) => addDays(startDate, i));
  
  // Sort projects by end date
  const sortedProjects = [...projects].sort((a, b) => {
    // If no end date, put at the end
    if (!a.endDate) return 1;
    if (!b.endDate) return -1;
    return new Date(a.endDate).getTime() - new Date(b.endDate).getTime();
  });
  
  // Mutation to update project dates
  const updateProjectDates = useMutation({
    mutationFn: async ({ projectId, startDate, endDate }: { projectId: number, startDate?: Date, endDate?: Date }) => {
      // Encontra o projeto que está sendo atualizado
      const projectToUpdate = projects.find(p => p.id === projectId);
      
      if (!projectToUpdate) {
        throw new Error('Projeto não encontrado');
      }
      
      // Mantém os campos obrigatórios
      const updateData: any = {
        name: projectToUpdate.name,
        client_id: projectToUpdate.client_id || null,
        status: projectToUpdate.status || 'em_andamento'
      };
      
      // Adiciona os campos de data no formato correto (ISO string sem a parte de tempo)
      if (startDate) {
        updateData.startDate = startDate.toISOString().split('T')[0];
      }
      
      if (endDate) {
        updateData.endDate = endDate.toISOString().split('T')[0];
      }
      
      return apiRequest('PATCH', `/api/projects/${projectId}`, updateData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/projects'] });
      showSuccessToast({
        title: 'Projeto atualizado',
        description: 'Datas do projeto atualizadas com sucesso'
      });
    },
    onError: (error) => {
      toast({
        title: 'Erro ao atualizar projeto',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
  
  // Handlers for navigation
  const handlePrevPeriod = () => {
    setStartDate(addDays(startDate, -daysInView));
  };
  
  const handleNextPeriod = () => {
    setStartDate(addDays(startDate, daysInView));
  };
  
  const handleToday = () => {
    setStartDate(new Date());
  };
  
  const handleZoomIn = () => {
    if (zoomIndex > 0) {
      setZoomIndex(zoomIndex - 1);
    }
  };
  
  const handleZoomOut = () => {
    if (zoomIndex < ZOOM_LEVELS.length - 1) {
      setZoomIndex(zoomIndex + 1);
    }
  };
  
  // Handle bar dragging for project date adjustment
  const [dragState, setDragState] = useState<{
    isDragging: boolean;
    projectId: number | null;
    startX: number;
    initialStartDate: Date | null;
    initialEndDate: Date | null;
    mode: 'move' | 'resize-start' | 'resize-end' | null;
    newStartDate?: Date;
    newEndDate?: Date;
  }>({
    isDragging: false,
    projectId: null,
    startX: 0,
    initialStartDate: null,
    initialEndDate: null,
    mode: null,
  });
  
  const startDrag = (
    projectId: number, 
    x: number, 
    initialStartDate: Date, 
    initialEndDate: Date, 
    mode: 'move' | 'resize-start' | 'resize-end'
  ) => {
    setDragState({
      isDragging: true,
      projectId,
      startX: x,
      initialStartDate,
      initialEndDate,
      mode,
    });
  };
  
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!dragState.isDragging || !scrollContainerRef.current) return;
    
    const { projectId, startX, initialStartDate, initialEndDate, mode } = dragState;
    
    if (!initialStartDate || !initialEndDate || !mode) return;
    
    // Calculate the day width
    const dayWidth = scrollContainerRef.current.scrollWidth / daysInView;
    
    // Calculate day difference based on mouse movement
    const diffX = e.clientX - startX;
    const daysDiff = Math.round(diffX / dayWidth);
    
    // Skip if no actual change
    if (daysDiff === 0) return;
    
    // Calculate new dates based on drag mode
    let newStartDate = initialStartDate;
    let newEndDate = initialEndDate;
    
    if (mode === 'move') {
      newStartDate = addDays(initialStartDate, daysDiff);
      newEndDate = addDays(initialEndDate, daysDiff);
    } else if (mode === 'resize-start') {
      newStartDate = addDays(initialStartDate, daysDiff);
      // Don't allow start date to be after end date
      if (isAfter(newStartDate, initialEndDate)) {
        newStartDate = initialEndDate;
      }
    } else if (mode === 'resize-end') {
      newEndDate = addDays(initialEndDate, daysDiff);
      // Don't allow end date to be before start date
      if (isBefore(newEndDate, initialStartDate)) {
        newEndDate = initialStartDate;
      }
    }
    
    // Update drag state with the new dates for visual feedback
    setDragState({
      ...dragState,
      newStartDate,
      newEndDate
    });
    
    // In a real implementation, we would update the visual state here
    // This is a simplified version that doesn't update the visual during drag
  };
  
  const handleMouseUp = () => {
    if (!dragState.isDragging || !dragState.projectId) return;
    
    const { projectId, newStartDate, newEndDate, mode } = dragState;
    
    // Reset drag state
    setDragState({
      isDragging: false,
      projectId: null,
      startX: 0,
      initialStartDate: null,
      initialEndDate: null,
      mode: null,
    });
    
    // Only update the backend if we have new dates
    if (newStartDate && newEndDate) {
      // No modo 'move', atualizamos ambas as datas
      // No modo 'resize-start', atualizamos apenas a data de início
      // No modo 'resize-end', atualizamos apenas a data de fim
      updateProjectDates.mutate({
        projectId,
        startDate: (mode === 'move' || mode === 'resize-start') ? newStartDate : undefined,
        endDate: (mode === 'move' || mode === 'resize-end') ? newEndDate : undefined,
      });
    }
  };
  
  // Get bar position and width for a project
  const getBarStyle = (project: any): React.CSSProperties => {
    if (!project.startDate || !project.endDate) {
      return { display: 'none' };
    }
    
    // Certifica-se de que estamos trabalhando com objetos Date
    const projectStart = new Date(project.startDate);
    const projectEnd = new Date(project.endDate);
    
    // Verifica se o projeto está dentro do período visível
    if (isAfter(projectStart, endDate) || isBefore(projectEnd, startDate)) {
      return { display: 'none' };
    }
    
    // Para projetos que começam antes do período visível, ajusta para o início da visualização
    const visibleStart = isBefore(projectStart, startDate) ? startDate : projectStart;
    
    // Para projetos que terminam depois do período visível, ajusta para o fim da visualização
    const visibleEnd = isAfter(projectEnd, endDate) ? endDate : projectEnd;
    
    // Calcula a posição à esquerda (data de início)
    const daysFromStart = Math.max(0, differenceInDays(visibleStart, startDate));
    const leftPercent = (daysFromStart / daysInView) * 100;
    
    // Calcula a largura (duração)
    const visibleDurationDays = differenceInDays(visibleEnd, visibleStart) + 1; // +1 para incluir o dia final
    const widthPercent = (visibleDurationDays / daysInView) * 100;
    
    return {
      left: `${leftPercent}%`,
      width: `${widthPercent}%`,
    };
  };
  
  // Helper to format date for display
  const formatDate = (date: Date): string => {
    return format(date, 'dd MMM', { locale: pt });
  };
  
  // Helper to determine if a date is a weekend
  const isWeekend = (date: Date): boolean => {
    const day = date.getDay();
    return day === 0 || day === 6; // 0 = Sunday, 6 = Saturday
  };
  
  return (
    <div className="my-8">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold">Linha do Tempo de Projetos</h2>
        
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm" onClick={handleToday}>
            Hoje
          </Button>
          <div className="flex items-center border rounded-md">
            <Button variant="ghost" size="icon" onClick={handlePrevPeriod}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="px-3 py-1">
              {format(startDate, 'MMM yyyy', { locale: pt })}
            </div>
            <Button variant="ghost" size="icon" onClick={handleNextPeriod}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex items-center border rounded-md">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={handleZoomIn}
              disabled={zoomIndex === 0}
            >
              <ZoomIn className="h-4 w-4" />
            </Button>
            <div className="px-3 py-1 text-sm">
              {daysInView} dias
            </div>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={handleZoomOut}
              disabled={zoomIndex === ZOOM_LEVELS.length - 1}
            >
              <ZoomOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
      
      <Card className="overflow-hidden">
        <CardContent className="p-0">
          <div 
            className="overflow-x-auto"
            ref={scrollContainerRef}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          >
            {/* Timeline header */}
            <div className="flex border-b border-gray-200 sticky top-0 bg-white z-10">
              <div className="min-w-[200px] border-r border-gray-200 p-2 bg-gray-50">
                <div className="font-medium text-sm">Projeto</div>
              </div>
              <div className="flex min-w-[1000px]">
                {dates.map((date, index) => (
                  <div
                    key={index}
                    className={`flex-1 p-1 text-center text-xs border-r border-gray-200 ${
                      isWeekend(date) ? 'bg-gray-50' : ''
                    }`}
                  >
                    {index % 3 === 0 && (
                      <div className="font-medium">
                        {formatDate(date)}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
            
            {/* Project rows */}
            <div>
              {sortedProjects.map((project) => (
                <div key={project.id} className="flex border-b border-gray-200 hover:bg-gray-50">
                  <div className="min-w-[200px] border-r border-gray-200 p-2 flex items-center">
                    <div>
                      <div className="font-medium text-sm">{project.name}</div>
                      <div className="text-xs text-gray-500 flex items-center">
                        {project.client?.name || 'Cliente não especificado'}
                        <StatusBadge status={project.status} minimal className="ml-2" />
                      </div>
                    </div>
                  </div>
                  <div className="flex-1 min-w-[1000px] relative h-16">
                    {/* Timeline grid */}
                    <div className="flex h-full">
                      {dates.map((date, index) => (
                        <div
                          key={index}
                          className={`flex-1 border-r border-gray-200 ${
                            isWeekend(date) ? 'bg-gray-50' : ''
                          }`}
                        />
                      ))}
                    </div>
                    
                    {/* Project bar */}
                    {project.startDate && project.endDate && (
                      <div
                        className="absolute top-3 h-10 bg-blue-500 rounded-md cursor-move opacity-80 hover:opacity-100"
                        style={getBarStyle(project)}
                        onMouseDown={(e) => {
                          e.preventDefault();
                          startDrag(
                            project.id,
                            e.clientX,
                            new Date(project.startDate),
                            new Date(project.endDate),
                            'move'
                          );
                        }}
                      >
                        <div className="absolute inset-0 flex items-center justify-center text-white text-xs font-medium truncate px-2">
                          {project.name}
                        </div>
                        
                        {/* Resize handle - left */}
                        <div 
                          className="absolute left-0 top-0 bottom-0 w-2 cursor-ew-resize"
                          onMouseDown={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            startDrag(
                              project.id,
                              e.clientX,
                              new Date(project.startDate),
                              new Date(project.endDate),
                              'resize-start'
                            );
                          }}
                        />
                        
                        {/* Resize handle - right */}
                        <div 
                          className="absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize"
                          onMouseDown={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            startDrag(
                              project.id,
                              e.clientX,
                              new Date(project.startDate),
                              new Date(project.endDate),
                              'resize-end'
                            );
                          }}
                        />
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}