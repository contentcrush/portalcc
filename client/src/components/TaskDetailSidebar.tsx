import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { 
  X, 
  Download, 
  SendHorizontal, 
  Calendar,
  Clock,
  Users,
  FileSpreadsheet,
  Pencil,
  Edit,
  Paperclip,
  MessageSquare
} from "lucide-react";
import { 
  formatDate, 
  formatDateTime, 
  getPriorityBadgeClasses,
  getStatusBadgeClasses,
  getInitials
} from "@/lib/utils";
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
import { UserAvatar } from "./UserAvatar";
import { Separator } from "@/components/ui/separator";

interface TaskDetailSidebarProps {
  taskId: number;
  onClose: () => void;
  onEdit?: (taskId: number) => void;
}

interface CommentFormData {
  comment: string;
}

export default function TaskDetailSidebar({ taskId, onClose, onEdit }: TaskDetailSidebarProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [newComment, setNewComment] = useState("");
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  // Fetch task details
  const { data: task, isLoading: isLoadingTask } = useQuery({
    queryKey: [`/api/tasks/${taskId}`],
    enabled: !!taskId
  });

  // Fetch project details if task has a project
  const { data: project } = useQuery({
    queryKey: [`/api/projects/${task?.project_id}`],
    enabled: !!task?.project_id
  });

  // Fetch assigned user
  const { data: assignedUser } = useQuery({
    queryKey: [`/api/users/${task?.assigned_to}`],
    enabled: !!task?.assigned_to
  });

  // Fetch task comments
  const { data: comments, isLoading: isLoadingComments } = useQuery({
    queryKey: [`/api/tasks/${taskId}/comments`],
    enabled: !!taskId
  });

  // Fetch task attachments
  const { data: attachments, isLoading: isLoadingAttachments } = useQuery({
    queryKey: [`/api/tasks/${taskId}/attachments`],
    enabled: !!taskId
  });

  // Add comment mutation
  const addCommentMutation = useMutation({
    mutationFn: async (data: CommentFormData) => {
      return apiRequest('POST', `/api/tasks/${taskId}/comments`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/tasks/${taskId}/comments`] });
      toast({
        title: "Comentário adicionado",
        description: "Seu comentário foi adicionado com sucesso.",
      });
      setNewComment("");
      setIsSubmittingComment(false);
    },
    onError: (error) => {
      toast({
        title: "Erro ao adicionar comentário",
        description: error.message,
        variant: "destructive"
      });
      setIsSubmittingComment(false);
    }
  });

  // Toggle task completion mutation
  const updateTaskMutation = useMutation({
    mutationFn: async (data: { completed: boolean }) => {
      return apiRequest('PATCH', `/api/tasks/${taskId}`, data);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
      queryClient.invalidateQueries({ queryKey: [`/api/tasks/${taskId}`] });
      if (task?.project_id) {
        queryClient.invalidateQueries({ queryKey: [`/api/projects/${task.project_id}/tasks`] });
      }
      toast({
        title: variables.completed ? "Tarefa concluída" : "Tarefa reaberta",
        description: task?.title,
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

  // Delete task mutation
  const deleteTaskMutation = useMutation({
    mutationFn: async () => {
      return apiRequest('DELETE', `/api/tasks/${taskId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
      if (task?.project_id) {
        queryClient.invalidateQueries({ queryKey: [`/api/projects/${task.project_id}/tasks`] });
      }
      toast({
        title: "Tarefa excluída",
        description: `A tarefa "${task?.title}" foi excluída com sucesso.`,
      });
      onClose();
    },
    onError: (error) => {
      toast({
        title: "Erro ao excluir tarefa",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const handleToggleCompletion = () => {
    if (task) {
      updateTaskMutation.mutate({ completed: !task.completed });
    }
  };

  const handleEditTask = () => {
    if (onEdit) {
      onEdit(taskId);
      onClose();
    }
  };

  const handleDeleteTask = () => {
    deleteTaskMutation.mutate();
    setIsDeleteDialogOpen(false);
  };

  const handleSubmitComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    
    setIsSubmittingComment(true);
    addCommentMutation.mutate({ comment: newComment });
  };

  const handleDownloadAttachment = (attachmentId: number, fileName: string) => {
    // Implementar download de anexo aqui
    toast({
      title: "Download iniciado",
      description: `Baixando ${fileName}...`,
    });
  };

  if (isLoadingTask) {
    return (
      <div className="fixed inset-y-0 right-0 bg-white shadow-lg w-96 transform transition-transform duration-300 z-20 border-l border-gray-200 p-6 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!task) {
    return (
      <div className="fixed inset-y-0 right-0 bg-white shadow-lg w-96 transform transition-transform duration-300 z-20 border-l border-gray-200 p-6">
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="font-semibold text-lg">Tarefa não encontrada</h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-y-0 right-0 bg-white shadow-lg w-96 transform transition-all duration-300 z-20 border-l border-gray-200 overflow-y-auto">
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <h2 className="font-semibold text-lg">DETALHES DA TAREFA</h2>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-5 w-5" />
        </Button>
      </div>
      
      <div className="p-6">
        <div className="text-center mb-6">
          <h3 className="font-medium text-lg">{task.title || 'Carregando...'}</h3>
          <div className="flex justify-center items-center gap-2 mt-2">
            <Badge className={`capitalize ${getStatusBadgeClasses(task.status)}`}>
              {task.status === "pendente" ? "Pendente" : 
               task.status === "em_andamento" ? "Em andamento" : 
               task.status === "bloqueada" ? "Bloqueada" : 
               task.status === "cancelada" ? "Cancelada" : task.status}
            </Badge>
            <Badge className={`capitalize ${getPriorityBadgeClasses(task.priority)}`}>
              {task.priority === "baixa" ? "Baixa" : 
               task.priority === "media" ? "Média" : 
               task.priority === "alta" ? "Alta" : 
               task.priority === "critica" ? "Crítica" : task.priority}
            </Badge>
          </div>
        </div>
        
        <div className="space-y-4 mb-8">
          <div className="flex items-center justify-between">
            <div className="text-sm font-medium text-gray-600">Status:</div>
            <div className="flex items-center">
              <Checkbox 
                checked={task.completed} 
                onCheckedChange={handleToggleCompletion}
                className="mr-2"
                disabled={updateTaskMutation.isPending}
              />
              <span>{task.completed ? "Concluída" : "Pendente"}</span>
            </div>
          </div>
          
          {project && (
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium text-gray-600">Projeto:</div>
              <div className="text-sm font-medium">{project.name || 'Não definido'}</div>
            </div>
          )}
          
          {assignedUser && (
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium text-gray-600">Responsável:</div>
              <div className="flex items-center">
                <UserAvatar 
                  user={assignedUser} 
                  className="h-6 w-6 mr-2" 
                />
                <span className="text-sm font-medium">{assignedUser.name}</span>
              </div>
            </div>
          )}
          
          {task.start_date && (
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium text-gray-600">Data de Início:</div>
              <div className="text-sm font-medium">{formatDate(task.start_date)}</div>
            </div>
          )}
          
          {task.due_date && (
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium text-gray-600">Data de Entrega:</div>
              <div className="text-sm font-medium">{formatDate(task.due_date)}</div>
            </div>
          )}
          
          {task.estimated_hours !== undefined && (
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium text-gray-600">Estimativa:</div>
              <div className="text-sm font-medium">{task.estimated_hours} horas</div>
            </div>
          )}
        </div>
        
        {/* Descrição */}
        <div className="mb-8">
          <h4 className="font-medium text-sm mb-4">DESCRIÇÃO</h4>
          <div className="bg-muted p-3 rounded-md">
            {task.description ? (
              <div className="prose prose-sm max-w-none">
                {task.description.split('\n').map((line, i) => (
                  <p key={i} className="mb-1">{line}</p>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-sm italic">Sem descrição</p>
            )}
          </div>
        </div>
        
        {/* Anexos */}
        <div className="mb-8">
          <h4 className="font-medium text-sm mb-4">ANEXOS</h4>
          {isLoadingAttachments ? (
            <div className="flex justify-center items-center h-16">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
            </div>
          ) : (!attachments || attachments.length === 0) ? (
            <div className="bg-muted p-4 rounded-md text-center">
              <p className="text-muted-foreground text-sm">Nenhum anexo</p>
              <Button variant="outline" size="sm" className="mt-2">
                + Adicionar
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {attachments.map((attachment) => (
                <div 
                  key={attachment.id} 
                  className="bg-muted p-3 rounded-md flex items-center justify-between"
                >
                  <div className="flex items-center">
                    <div className="bg-primary/10 p-2 rounded-md mr-3">
                      <FileSpreadsheet className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{attachment.filename}</p>
                      <p className="text-xs text-muted-foreground">{attachment.size} KB</p>
                    </div>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="icon"
                    onClick={() => handleDownloadAttachment(attachment.id, attachment.filename)}
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              
              <div className="text-center mt-2">
                <Button variant="outline" size="sm">
                  + Adicionar
                </Button>
              </div>
            </div>
          )}
        </div>
        
        {/* Comentários */}
        <div className="mb-8">
          <h4 className="font-medium text-sm mb-4">COMENTÁRIOS</h4>
          {isLoadingComments ? (
            <div className="flex justify-center items-center h-16">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
            </div>
          ) : (!comments || comments.length === 0) ? (
            <div className="bg-muted p-4 rounded-md text-center text-muted-foreground text-sm">
              Nenhum comentário. Seja o primeiro a comentar.
            </div>
          ) : (
            <div className="space-y-4">
              {comments.map((comment) => (
                <div key={comment.id} className="bg-muted p-3 rounded-md">
                  <div className="flex items-start gap-2">
                    <UserAvatar 
                      user={comment.user} 
                      className="w-8 h-8 mt-0.5" 
                    />
                    <div className="flex-1">
                      <div className="flex justify-between items-center">
                        <span className="font-medium text-sm">{comment.user?.name}</span>
                        <span className="text-xs text-muted-foreground">
                          {formatDateTime(comment.creation_date)}
                        </span>
                      </div>
                      <p className="text-sm mt-1">{comment.comment}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          
          {/* Form para adicionar comentário */}
          <form onSubmit={handleSubmitComment} className="mt-4 flex items-center gap-2">
            <Textarea 
              placeholder="Adicione um comentário..."
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              className="min-h-[60px] resize-none"
              disabled={isSubmittingComment}
            />
            <Button 
              type="submit" 
              size="icon" 
              disabled={!newComment.trim() || isSubmittingComment}
              className="h-10 w-10 shrink-0"
            >
              {isSubmittingComment ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-background border-r-transparent" />
              ) : (
                <SendHorizontal className="h-4 w-4" />
              )}
            </Button>
          </form>
        </div>
        
        <div>
          <Button 
            className="w-full bg-indigo-600 hover:bg-indigo-700 mb-3"
            onClick={handleEditTask}
          >
            <Edit className="h-4 w-4 mr-2" />
            Editar Tarefa
          </Button>
          
          <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
            <Button 
              className="w-full bg-destructive hover:bg-destructive/90"
              onClick={() => setIsDeleteDialogOpen(true)}
            >
              Excluir Tarefa
            </Button>
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
      </div>
    </div>
  );
}