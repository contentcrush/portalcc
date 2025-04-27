import { useState } from "react";
import { formatDate, formatDateTime, getRelativeDate, isTaskOverdue, isTaskDueSoon } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { 
  MessageSquare, 
  Paperclip, 
  Clock, 
  MoreVertical, 
  ChevronDown, 
  ChevronUp 
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { TaskWithDetails } from "@/lib/types";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import StatusBadge from "./StatusBadge";
import UserAvatar from "./UserAvatar";

interface TaskItemProps {
  task: TaskWithDetails;
  onSelect?: (taskId: number) => void;
}

export default function TaskItem({ task, onSelect }: TaskItemProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [expanded, setExpanded] = useState(false);

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
    enabled: !!task.id && expanded
  });

  const { data: attachments } = useQuery({
    queryKey: [`/api/tasks/${task.id}/attachments`],
    enabled: !!task.id && expanded
  });

  const updateTaskMutation = useMutation({
    mutationFn: async (data: { completed: boolean }) => {
      return apiRequest('PATCH', `/api/tasks/${task.id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
      queryClient.invalidateQueries({ queryKey: [`/api/tasks/${task.id}`] });
      if (task.project_id) {
        queryClient.invalidateQueries({ queryKey: [`/api/projects/${task.project_id}/tasks`] });
      }
      toast({
        title: data.completed ? "Tarefa concluída" : "Tarefa reaberta",
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

  const handleStatusChange = () => {
    updateTaskMutation.mutate({ completed: !task.completed });
  };

  const isOverdue = isTaskOverdue(task);
  const isDueSoon = isTaskDueSoon(task, 2);

  return (
    <div className="mb-3">
      <div 
        className={`bg-white rounded-lg border ${isOverdue ? 'border-destructive/20' : 'border-border'} 
          ${task.completed ? 'bg-muted/20' : ''} overflow-hidden`}
      >
        <div className="p-4">
          <div className="flex items-start">
            <Checkbox 
              checked={task.completed} 
              onCheckedChange={handleStatusChange}
              className="mt-1 mr-3" 
              disabled={updateTaskMutation.isPending}
            />
            
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 
                    className={`font-medium ${task.completed ? 'text-muted-foreground line-through' : ''}`}
                    onClick={() => onSelect && onSelect(task.id)}
                  >
                    {task.title}
                  </h3>
                  
                  {task.description && (
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                      {task.description}
                    </p>
                  )}
                </div>
                
                <div className="flex items-center space-x-2 ml-4">
                  <StatusBadge status={task.priority} small className="capitalize" />
                  {!task.completed && <StatusBadge status={task.status} small className="capitalize" />}
                  
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Ações</DropdownMenuLabel>
                      <DropdownMenuItem onClick={() => onSelect && onSelect(task.id)}>
                        Ver detalhes
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={handleStatusChange}>
                        {task.completed ? "Marcar como pendente" : "Marcar como concluída"}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
              
              <div className="flex flex-wrap items-center mt-3 text-xs text-muted-foreground">
                {task.project_id && project && (
                  <div className="flex items-center mr-4 mb-1">
                    <span className="font-medium mr-1">Projeto:</span>
                    <span>{project.name}</span>
                  </div>
                )}
                
                {task.due_date && (
                  <div 
                    className={`flex items-center mr-4 mb-1 
                      ${isOverdue ? 'text-destructive' : isDueSoon ? 'text-warning-foreground' : ''}`}
                  >
                    <Clock className="h-3 w-3 mr-1" />
                    <span>{formatDate(task.due_date)}</span>
                  </div>
                )}
                
                {task.assigned_to && assignedUser && (
                  <div className="flex items-center mb-1">
                    <span className="mr-1">Responsável:</span>
                    <UserAvatar 
                      user={assignedUser} 
                      className="h-4 w-4 mr-1" 
                    />
                    <span>{assignedUser.name}</span>
                  </div>
                )}
              </div>
              
              <div className="flex items-center mt-2 space-x-4">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-8 px-2 text-xs"
                  onClick={() => setExpanded(!expanded)}
                >
                  {expanded ? (
                    <>
                      <ChevronUp className="h-3 w-3 mr-1" />
                      Recolher
                    </>
                  ) : (
                    <>
                      <ChevronDown className="h-3 w-3 mr-1" />
                      Expandir
                    </>
                  )}
                </Button>
                
                <div className="flex items-center space-x-2">
                  <div className="flex items-center text-xs text-muted-foreground">
                    <MessageSquare className="h-3 w-3 mr-1" />
                    <span>{comments?.length || 0}</span>
                  </div>
                  
                  <div className="flex items-center text-xs text-muted-foreground">
                    <Paperclip className="h-3 w-3 mr-1" />
                    <span>{attachments?.length || 0}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Expanded content */}
        {expanded && (
          <div className="border-t border-border p-4 bg-muted/10">
            {/* Comments section */}
            {comments && comments.length > 0 ? (
              <div className="space-y-3">
                <h4 className="text-sm font-medium">Comentários</h4>
                {comments.map((comment) => (
                  <div key={comment.id} className="flex space-x-2">
                    <UserAvatar 
                      user={comment.user} 
                      className="w-6 h-6 mt-1" 
                    />
                    <div className="flex-1">
                      <div className="flex items-center">
                        <span className="text-sm font-medium">{comment.user?.name || "Usuário"}</span>
                        <span className="text-xs text-muted-foreground ml-2">
                          {formatDateTime(comment.creation_date)}
                        </span>
                      </div>
                      <p className="text-sm mt-1">{comment.comment}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">
                Sem comentários.
              </div>
            )}
            
            {/* Add comment button */}
            <Button 
              variant="outline" 
              size="sm" 
              className="mt-3"
              onClick={() => onSelect && onSelect(task.id)}
            >
              <MessageSquare className="h-4 w-4 mr-2" />
              Adicionar comentário
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
