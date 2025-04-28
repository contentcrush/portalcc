import React, { useState } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { Calendar, DollarSign } from 'lucide-react';
import StatusBadge from './StatusBadge';

// Define types for our columns
type StatusColumn = {
  id: string;
  title: string;
};

type ColumnContent = {
  id: string;
  title: string;
  items: any[];
};

type ColumnsState = {
  [key: string]: ColumnContent;
};

// Status columns
const statusColumns: StatusColumn[] = [
  { id: 'pre_producao', title: 'Pré-Produção' },
  { id: 'em_producao', title: 'Produção' },
  { id: 'pos_producao', title: 'Pós-Produção' },
  { id: 'concluido', title: 'Concluído' }
];

interface ProjectKanbanProps {
  projects: any[];
}

export default function ProjectKanban({ projects }: ProjectKanbanProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Group projects by status
  const initialColumns = statusColumns.reduce<ColumnsState>((acc, column) => {
    acc[column.id] = {
      id: column.id,
      title: column.title,
      items: projects.filter(project => 
        (project.status === column.id) ||
        // Map similar statuses to our simplified kanban columns
        (column.id === 'pre_producao' && ['em_orcamento', 'draft'].includes(project.status)) ||
        (column.id === 'em_producao' && ['em_andamento'].includes(project.status)) ||
        (column.id === 'pos_producao' && ['revisao_cliente'].includes(project.status))
      )
    };
    return acc;
  }, {});
  
  const [columns, setColumns] = useState<ColumnsState>(initialColumns);
  
  // Update project status mutation
  const updateProjectStatus = useMutation({
    mutationFn: async ({ projectId, status, completionDate }: { projectId: number, status: string, completionDate?: Date }) => {
      const updateData: any = { status };
      
      // If project is being moved to "completed", set the completion date
      if (status === 'concluido') {
        updateData.completion_date = completionDate || new Date();
      }
      
      return apiRequest('PATCH', `/api/projects/${projectId}`, updateData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/projects'] });
      toast({
        title: 'Projeto atualizado',
        description: 'Status do projeto foi atualizado com sucesso',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao atualizar projeto',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Handle drag end
  const onDragEnd = (result: DropResult) => {
    const { destination, source, draggableId } = result;
    
    // If no destination or dropped back to same position
    if (!destination) return;
    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    ) return;
    
    // Get source and destination columns
    const sourceColumn = columns[source.droppableId];
    const destColumn = columns[destination.droppableId];
    
    if (!sourceColumn || !destColumn) return;
    
    // Move within same column
    if (sourceColumn.id === destColumn.id) {
      const newItems = Array.from(sourceColumn.items);
      const [removed] = newItems.splice(source.index, 1);
      newItems.splice(destination.index, 0, removed);
      
      setColumns({
        ...columns,
        [sourceColumn.id]: {
          ...sourceColumn,
          items: newItems
        }
      });
      
      return;
    }
    
    // Move to different column
    const sourceItems = Array.from(sourceColumn.items);
    const [removed] = sourceItems.splice(source.index, 1);
    const destItems = Array.from(destColumn.items);
    destItems.splice(destination.index, 0, removed);
    
    setColumns({
      ...columns,
      [sourceColumn.id]: {
        ...sourceColumn,
        items: sourceItems
      },
      [destColumn.id]: {
        ...destColumn,
        items: destItems
      }
    });
    
    // Update project status in backend
    const projectId = parseInt(draggableId);
    const newStatus = destination.droppableId;
    
    // Use the completionDate if moving to completed status
    const completionDate = newStatus === 'concluido' ? new Date() : undefined;
    
    updateProjectStatus.mutate({ 
      projectId,
      status: newStatus,
      completionDate
    });
  };
  
  return (
    <div className="my-8">
      <h2 className="text-xl font-semibold mb-6">Quadro de Projetos</h2>
      <div className="flex flex-col lg:flex-row space-y-6 lg:space-y-0 lg:space-x-6 overflow-auto">
        <DragDropContext onDragEnd={onDragEnd}>
          {statusColumns.map(column => (
            <div key={column.id} className="w-full lg:w-1/4 min-w-[250px]">
              <div className="bg-gray-50 rounded-lg p-4 mb-2">
                <h3 className="font-medium text-gray-700 flex items-center gap-2">
                  {column.title}
                  <Badge variant="outline" className="ml-2">
                    {columns[column.id]?.items.length || 0}
                  </Badge>
                </h3>
              </div>
              
              <Droppable droppableId={column.id}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={`min-h-[500px] rounded-lg p-2 transition-colors ${
                      snapshot.isDraggingOver ? 'bg-blue-50' : 'bg-gray-100'
                    }`}
                  >
                    {columns[column.id]?.items.map((project, index) => (
                      <Draggable
                        key={project.id.toString()}
                        draggableId={project.id.toString()}
                        index={index}
                      >
                        {(provided, snapshot) => (
                          <Card
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            className={`mb-3 ${
                              snapshot.isDragging ? 'shadow-lg' : 'shadow-sm'
                            }`}
                          >
                            <CardContent className="p-3">
                              <div className="mb-2">
                                <div className="flex justify-between items-center mb-1">
                                  <h4 className="font-medium text-gray-900 truncate">
                                    {project.name}
                                  </h4>
                                  <StatusBadge status={project.status} minimal />
                                </div>
                                <p className="text-xs text-gray-500 truncate">
                                  {project.client?.name || 'Cliente não especificado'}
                                </p>
                              </div>
                              
                              <div className="grid grid-cols-2 gap-2 mt-3">
                                <div className="flex items-center text-xs text-gray-500">
                                  <Calendar className="h-3 w-3 mr-1" />
                                  {project.endDate ? format(new Date(project.endDate), 'dd/MM/yyyy') : 'Sem prazo'}
                                </div>
                                <div className="flex items-center text-xs text-gray-500">
                                  <DollarSign className="h-3 w-3 mr-1" />
                                  {project.budget 
                                    ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(project.budget)
                                    : '-'}
                                </div>
                              </div>
                              
                              <div className="mt-2">
                                <div className="flex justify-between text-xs mb-1">
                                  <span>Progresso</span>
                                  <span>{project.progress}%</span>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-1">
                                  <div 
                                    className="bg-blue-600 h-1 rounded-full" 
                                    style={{ width: `${project.progress}%` }}
                                  ></div>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </div>
          ))}
        </DragDropContext>
      </div>
    </div>
  );
}