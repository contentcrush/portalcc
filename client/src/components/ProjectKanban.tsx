import React, { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { Calendar, DollarSign, Loader2 } from 'lucide-react';
import StatusBadge from './StatusBadge';
import { ClientAvatar } from './ClientAvatar';
import { getNormalizedProjectStatus, getProgressBarColor, showSuccessToast } from '@/lib/utils';

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

// Status columns - apenas etapas regulares do fluxo de projeto
const statusColumns: StatusColumn[] = [
  { id: 'proposta', title: 'Proposta' },
  { id: 'pre_producao', title: 'Pré-produção' },
  { id: 'producao', title: 'Produção' },
  { id: 'pos_revisao', title: 'Pós / Revisão' },
  { id: 'entregue', title: 'Entregue' },
  { id: 'concluido', title: 'Concluído' }
];

interface ProjectKanbanProps {
  // Não precisamos mais receber projetos como props
}

export default function ProjectKanban() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Buscar todos os projetos (limit=1000 para pegar todos os projetos sem paginação visual)
  const { data, isLoading, error } = useQuery({
    queryKey: ['/api/projects', { includeRelations: true, limit: 1000 }],
  });
  
  // Precisamos extrair os projetos do retorno da API paginada
  const projects = data?.data || [];
  
  // Inicializando as colunas vazias
  const emptyColumns = statusColumns.reduce<ColumnsState>((acc, column) => {
    acc[column.id] = {
      id: column.id,
      title: column.title,
      items: []
    };
    return acc;
  }, {});
  
  const [columns, setColumns] = useState<ColumnsState>(emptyColumns);
  
  // Efeito para atualizar as colunas quando os projetos forem carregados
  useEffect(() => {
    if (!projects.length) return;
    
    const updatedColumns = statusColumns.reduce<ColumnsState>((acc, column) => {
      acc[column.id] = {
        id: column.id,
        title: column.title,
        items: projects.filter(project => {
          // Primeiro verifica se o projeto tem um status especial (atrasado, pausado, cancelado)
          const hasSpecialStatus = ['atrasado', 'pausado', 'cancelado'].includes(project.status);
          
          // Para projetos com status especial, verificamos o status subjacente
          if (hasSpecialStatus) {
            const underlyingStatus = project.original_status || project.underlying_status || 'producao';
            return column.id === underlyingStatus;
          }
          
          // Para projetos com status normal
          return (
            // Status exato
            (project.status === column.id) ||
            
            // Mapeamento de status legados/antigos para as novas categorias
            (column.id === 'proposta' && ['novo', 'em_orcamento', 'draft'].includes(project.status)) ||
            (column.id === 'pre_producao' && ['pre-producao'].includes(project.status)) ||
            (column.id === 'producao' && ['em_andamento', 'em_producao'].includes(project.status)) ||
            (column.id === 'pos_revisao' && ['revisao_cliente', 'pos_producao'].includes(project.status))
          );
        })
      };
      return acc;
    }, {});
    
    setColumns(updatedColumns);
  }, [projects]);
  
  // Update project status mutation
  const updateProjectStatus = useMutation({
    mutationFn: async ({ projectId, status, completionDate }: { projectId: number, status: string, completionDate?: Date }) => {
      // Encontrar projeto nos dados disponíveis
      const projectToUpdate = projects.find(p => p.id === projectId);
      
      if (!projectToUpdate) {
        throw new Error('Projeto não encontrado');
      }
      
      // Criamos um objeto com os campos mínimos necessários para a atualização
      const updateData: any = {
        name: projectToUpdate.name,
        client_id: projectToUpdate.client_id || null,
        status: status, // Atualizamos apenas o status
        payment_term: projectToUpdate.payment_term || 30, // Mantém o payment_term existente ou usa 30 como padrão
      };
      
      // Definir a data de conclusão se o projeto está sendo movido para "concluido"
      if (status === 'concluido') {
        updateData.completionDate = completionDate || new Date();
      }
      
      return apiRequest('PATCH', `/api/projects/${projectId}`, updateData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/projects'] });
      showSuccessToast({
        title: 'Projeto atualizado',
        description: 'Status do projeto foi atualizado com sucesso'
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
  
  // Função para calcular o progresso com base no status do projeto
  const calculateProgress = (project: any) => {
    // Se o projeto já tiver um valor de progresso explícito, usamos ele
    if (project.progress) {
      return project.progress;
    }
    
    // Caso contrário, calculamos com base no status
    const { stageStatus } = getNormalizedProjectStatus(project);
    
    // Valores de progresso padrão para cada status
    switch (stageStatus) {
      case 'proposta':
        return 10;
      case 'pre_producao':
        return 30;
      case 'producao':
        return 50;
      case 'pos_revisao':
        return 75;
      case 'entregue':
        return 90;
      case 'concluido':
        return 100;
      default:
        return 0;
    }
  };

  // Mantemos apenas as colunas de fluxo de trabalho regular
  const mainColumns = ['proposta', 'pre_producao', 'producao', 'pos_revisao', 'entregue', 'concluido'];
  
  // Se estiver carregando, mostrar um indicador
  if (isLoading) {
    return (
      <div className="my-8">
        <h2 className="text-xl font-semibold mb-6">Quadro de Projetos</h2>
        <div className="flex items-center justify-center h-[500px]">
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Carregando projetos...</p>
          </div>
        </div>
      </div>
    );
  }
  
  // Se tiver algum erro na API
  if (error) {
    return (
      <div className="my-8">
        <h2 className="text-xl font-semibold mb-6">Quadro de Projetos</h2>
        <div className="bg-destructive/10 p-4 rounded-md">
          <p className="text-destructive font-medium">Erro ao carregar projetos</p>
          <p className="text-sm text-muted-foreground">{error.message}</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="my-8">
      <h2 className="text-xl font-semibold mb-6">Quadro de Projetos</h2>
      
      {/* Contêiner principal com scroll horizontal */}
      <div className="overflow-x-auto pb-4">
        <DragDropContext onDragEnd={onDragEnd}>
          <div className="flex flex-nowrap min-w-full space-x-4">
            {/* Colunas principais do fluxo de trabalho */}
            {statusColumns
              .filter(column => mainColumns.includes(column.id))
              .map(column => (
                <div key={column.id} className="flex-shrink-0 w-[280px]">
                  <div className={`bg-gray-50 rounded-lg p-3 mb-2 ${
                    column.id === 'proposta' ? 'border-l-4 border-slate-400' :
                    column.id === 'pre_producao' ? 'border-l-4 border-indigo-400' :
                    column.id === 'producao' ? 'border-l-4 border-yellow-400' :
                    column.id === 'pos_revisao' ? 'border-l-4 border-purple-400' :
                    column.id === 'entregue' ? 'border-l-4 border-green-400' :
                    column.id === 'concluido' ? 'border-l-4 border-emerald-400' : ''
                  }`}>
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
                                      <StatusBadge project={project} minimal />
                                    </div>
                                    <div className="flex items-center gap-2 mt-1 mb-1">
                                      {project.client && (
                                        <div className="flex-shrink-0">
                                          <ClientAvatar 
                                            name={project.client.name} 
                                            logoUrl={project.client.logo} 
                                            size="sm"
                                          />
                                        </div>
                                      )}
                                      <p className="text-xs text-gray-500 truncate">
                                        {project.client?.name || 'Cliente não especificado'}
                                      </p>
                                    </div>
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
                                      <span>{calculateProgress(project)}%</span>
                                    </div>
                                    <div className="w-full bg-gray-200 rounded-full h-1">
                                      <div 
                                        className={`${getProgressBarColor(calculateProgress(project))} h-1 rounded-full ${project.status === 'pausado' ? 'bg-stripes' : ''}`}
                                        style={{ width: `${calculateProgress(project)}%` }}
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
            
            {/* Não exibimos mais as colunas de status especial; 
                 eles agora aparecem como badges nos cartões nos status de etapa */}
          </div>
        </DragDropContext>
      </div>
      
      <div className="mt-4 text-sm text-gray-500">
        <span>Arraste os cartões para atualizar o status dos projetos.</span>
      </div>
    </div>
  );
}