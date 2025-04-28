import { useState } from "react";
import { 
  formatDate,
  isTaskOverdue, 
  isTaskDueSoon
} from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import PriorityBadge from "@/components/PriorityBadge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { 
  MessageSquare, 
  Paperclip, 
  CalendarDays,
  MoreVertical, 
  Link as LinkIcon,
  Trash2
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { TaskWithDetails } from "@/lib/types";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { UserAvatar } from "./UserAvatar";

interface TaskItemProps {
  task: TaskWithDetails;
  onSelect?: (taskId: number) => void;
  onEdit?: (taskId: number) => void;
  isCompleted?: boolean;
}

export default function TaskItem({ task, onSelect, onEdit, isCompleted = false }: TaskItemProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const { data: project } = useQuery({
    queryKey: [`/api/projects/${task.project_id}`],
    enabled: !!task.project_id
  });

  const { data: assignedUser } = useQuery({
    queryKey: [`/api/users/${task.assigned_to}`],
    enabled: !!task.assigned_to
  });

  const { data: comments } = useQuery({
    queryKey: [`/api/tasks/${task.id}/comments`],
    enabled: !!task.id
  });

  const { data: attachments } = useQuery({
    queryKey: [`/api/tasks/${task.id}/attachments`],
    enabled: !!task.id
  });

  const updateTaskMutation = useMutation({
    mutationFn: async (data: { completed: boolean }) => {
      return apiRequest('PATCH', `/api/tasks/${task.id}`, data);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
      queryClient.invalidateQueries({ queryKey: [`/api/tasks/${task.id}`] });
      if (task.project_id) {
        queryClient.invalidateQueries({ queryKey: [`/api/projects/${task.project_id}/tasks`] });
      }
      toast({
        title: variables.completed ? "Tarefa concluída" : "Tarefa reaberta",
        description: task.title,
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao atualizar tarefa",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const deleteTaskMutation = useMutation({
    mutationFn: async () => {
      return apiRequest('DELETE', `/api/tasks/${task.id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
      if (task.project_id) {
        queryClient.invalidateQueries({ queryKey: [`/api/projects/${task.project_id}/tasks`] });
      }
      toast({
        title: "Tarefa excluída",
        description: `A tarefa "${task.title}" foi excluída com sucesso.`,
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao excluir tarefa",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const handleStatusChange = () => {
    updateTaskMutation.mutate({ completed: !task.completed });
  };

  const handleDeleteTask = () => {
    deleteTaskMutation.mutate();
    setIsDeleteDialogOpen(false);
  };

  const isOverdue = !isCompleted && isTaskOverdue(task);
  const isDueSoon = !isCompleted && isTaskDueSoon(task, 2);

  // Formatação da data relativa (ex: "hoje", "5 dias")
  const getFormattedDueDate = () => {
    if (!task.due_date) return null;
    
    const now = new Date();
    const dueDate = new Date(task.due_date);
    
    // Se for hoje
    if (dueDate.toDateString() === now.toDateString()) {
      return "hoje";
    }
    
    // Se for amanhã
    const tomorrow = new Date();
    tomorrow.setDate(now.getDate() + 1);
    if (dueDate.toDateString() === tomorrow.toDateString()) {
      return "amanhã";
    }
    
    // Se for nos próximos dias
    const diffTime = dueDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays > 0) {
      return `em ${diffDays} ${diffDays === 1 ? 'dia' : 'dias'}`;
    } else if (diffDays < 0) {
      const overdueDays = Math.abs(diffDays);
      return `${overdueDays} ${overdueDays === 1 ? 'dia' : 'dias'} atrás`;
    }
    
    return formatDate(task.due_date);
  };

  // Formatação da data no formato DD/MM/YYYY
  const getFullDate = (date: Date) => {
    return new Date(date).toLocaleDateString('pt-BR');
  };

  return (
    <div className="mb-3">
      <div 
        className={`
          bg-white rounded-lg border border-gray-200 overflow-hidden
          hover:border-gray-300 transition-all
          ${isCompleted ? 'bg-muted/10' : ''}
        `}
      >
        <div className="p-4">
          <div className="flex items-start gap-3">
            <Checkbox 
              checked={task.completed} 
              onCheckedChange={handleStatusChange}
              className="mt-1"
              disabled={updateTaskMutation.isPending}
            />
            
            <div className="flex-1">
              {/* Task title and description */}
              <div 
                className="cursor-pointer" 
                onClick={() => onSelect && onSelect(task.id)}
              >
                <h3 className={`font-medium ${isCompleted ? 'text-muted-foreground line-through' : ''}`}>
                  {task.title}
                </h3>
                
                {task.description && (
                  <p className="text-sm text-muted-foreground mt-1 line-clamp-1">
                    {task.description}
                  </p>
                )}
              </div>
              
              {/* Task metadata */}
              <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-gray-500">
                {task.due_date && (
                  <div className={`flex items-center gap-1 
                    ${isOverdue ? 'text-red-500 font-medium' : 
                    isDueSoon ? 'text-orange-500' : ''}`}
                  >
                    <CalendarDays className="h-3.5 w-3.5" />
                    <span title={getFullDate(task.due_date)}>
                      Vence {getFormattedDueDate()}
                      {task.due_date && isCompleted && ` (${getFullDate(task.due_date)})`}
                    </span>
                  </div>
                )}
                
                {task.estimated_hours && (
                  <div className="flex items-center gap-1">
                    <span>Estimativa: {task.estimated_hours}h</span>
                  </div>
                )}
              </div>
              
              {/* Task footer */}
              <div className="flex items-center justify-between mt-3 pt-2 border-t border-gray-100">
                <div className="flex items-center gap-2">
                  {/* Project badge */}
                  {project && (
                    <div className="flex items-center gap-1 bg-gray-100 text-gray-600 px-2 py-0.5 rounded text-xs">
                      {project.name}
                    </div>
                  )}
                  
                  {/* Priority badge */}
                  <PriorityBadge
                    priority={task.priority}
                    size="sm"
                  />
                </div>
                
                <div className="flex items-center gap-2">
                  {/* Comments & attachments indicators */}
                  <div className="flex items-center gap-3 text-gray-500">
                    {(comments && comments.length > 0) && (
                      <div className="flex items-center text-xs">
                        <MessageSquare className="h-3.5 w-3.5 mr-1" />
                        <span>{comments.length}</span>
                      </div>
                    )}
                    
                    {(attachments && attachments.length > 0) && (
                      <div className="flex items-center text-xs">
                        <Paperclip className="h-3.5 w-3.5 mr-1" />
                        <span>{attachments.length}</span>
                      </div>
                    )}
                  </div>
                  
                  {/* Action buttons */}
                  <div className="flex items-center gap-1">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-7 w-7"
                      onClick={() => onSelect && onSelect(task.id)}
                    >
                      <LinkIcon className="h-3.5 w-3.5" />
                    </Button>
                    
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-7 w-7"
                      onClick={() => onSelect && onSelect(task.id)}
                    >
                      <MessageSquare className="h-3.5 w-3.5" />
                    </Button>
                    
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7">
                          <MoreVertical className="h-3.5 w-3.5" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => onSelect && onSelect(task.id)}>
                          Ver detalhes
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onEdit && onEdit(task.id)}>
                          Editar tarefa
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={handleStatusChange}>
                          {task.completed ? "Marcar como pendente" : "Marcar como concluída"}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem 
                          onClick={() => setIsDeleteDialogOpen(true)}
                          className="text-destructive focus:text-destructive"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Apagar Tarefa
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </div>
              
              {/* User avatar - positioned at the top right */}
              {assignedUser && (
                <div className="absolute top-4 right-4">
                  <UserAvatar 
                    user={assignedUser} 
                    className="h-6 w-6" 
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      
      {/* Dialog de confirmação para excluir tarefa */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Tem certeza?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Isso excluirá permanentemente a tarefa
              "{task.title}" e todos os dados associados a ela.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteTask}
              className="bg-destructive hover:bg-destructive/90"
              disabled={deleteTaskMutation.isPending}
            >
              {deleteTaskMutation.isPending ? (
                <span className="flex items-center">
                  <span className="h-4 w-4 mr-2 animate-spin rounded-full border-2 border-background border-r-transparent"></span>
                  Excluindo...
                </span>
              ) : (
                "Excluir tarefa"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
