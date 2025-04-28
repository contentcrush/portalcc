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
  Pencil
} from "lucide-react";
import { 
  formatDate, 
  formatDateTime, 
  getPriorityBadgeClasses,
  getStatusBadgeClasses
} from "@/lib/utils";
import { 
  Sheet, 
  SheetContent, 
  SheetHeader, 
  SheetTitle, 
  SheetFooter 
} from "@/components/ui/sheet";
import { UserAvatar } from "./UserAvatar";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";

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

  const handleToggleCompletion = () => {
    if (task) {
      updateTaskMutation.mutate({ completed: !task.completed });
    }
  };

  const handleEditTask = () => {
    if (onEdit) {
      onEdit(taskId);
    }
    onClose();
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
      <Sheet open={!!taskId} onOpenChange={onClose}>
        <SheetContent className="w-full sm:max-w-md md:max-w-lg">
          <div className="flex justify-center items-center h-full">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  if (!task) {
    return (
      <Sheet open={!!taskId} onOpenChange={onClose}>
        <SheetContent className="w-full sm:max-w-md md:max-w-lg">
          <div className="flex flex-col justify-center items-center h-full">
            <p className="text-lg font-medium text-destructive mb-4">Tarefa não encontrada</p>
            <Button onClick={onClose}>Fechar</Button>
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Sheet open={!!taskId} onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-md md:max-w-lg p-0">
        <div className="h-full flex flex-col">
          <SheetHeader className="p-4 border-b">
            <div className="flex justify-between items-start">
              <SheetTitle>Detalhes da Tarefa</SheetTitle>
              <Button variant="ghost" size="icon" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </SheetHeader>
          
          <ScrollArea className="flex-1 p-4">
            <div className="space-y-6">
              {/* Cabeçalho da tarefa */}
              <div className="space-y-2">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h2 className="text-xl font-semibold">{task.title}</h2>
                    <div className="flex flex-wrap items-center gap-2 mt-2">
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
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={handleEditTask}>
                      <Pencil className="h-4 w-4 mr-1" /> Editar
                    </Button>
                  </div>
                </div>
                
                <div className="flex items-center">
                  <div className="flex items-center">
                    <Checkbox 
                      checked={task.completed} 
                      onCheckedChange={handleToggleCompletion}
                      className="mr-2"
                      disabled={updateTaskMutation.isPending}
                    />
                    <span>Marcar como concluída</span>
                  </div>
                </div>
              </div>
              
              {/* Informações da tarefa */}
              <div className="grid grid-cols-2 gap-4">
                {project && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-1">Projeto</p>
                    <div className="flex items-center">
                      <FileSpreadsheet className="h-4 w-4 mr-2 text-primary" />
                      <span>{project.name}</span>
                    </div>
                  </div>
                )}
                
                {assignedUser && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-1">Responsável</p>
                    <div className="flex items-center">
                      <UserAvatar 
                        user={assignedUser} 
                        className="h-6 w-6 mr-2" 
                      />
                      <span>{assignedUser.name}</span>
                    </div>
                  </div>
                )}
                
                {task.start_date && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-1">Data de Início</p>
                    <div className="flex items-center">
                      <Calendar className="h-4 w-4 mr-2 text-primary" />
                      <span>{formatDate(task.start_date)}</span>
                    </div>
                  </div>
                )}
                
                {task.due_date && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-1">Data de Entrega</p>
                    <div className="flex items-center">
                      <Calendar className="h-4 w-4 mr-2 text-primary" />
                      <span>{formatDate(task.due_date)}</span>
                    </div>
                  </div>
                )}
                
                {task.estimated_hours !== undefined && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-1">Estimativa</p>
                    <div className="flex items-center">
                      <Clock className="h-4 w-4 mr-2 text-primary" />
                      <span>{task.estimated_hours} horas</span>
                    </div>
                  </div>
                )}
              </div>
              
              {/* Descrição */}
              <div>
                <h3 className="text-sm font-medium mb-2">Descrição</h3>
                <div className="bg-muted p-3 rounded-md">
                  {task.description ? (
                    <div className="prose prose-sm max-w-none">
                      {task.description.split('\n').map((line, i) => {
                        // Verifica se a linha começa com - para transformar em lista
                        if (line.trim().startsWith('- ')) {
                          return <li key={i} className="ml-4">{line.trim().substring(2)}</li>;
                        }
                        return <p key={i} className="mb-1">{line}</p>;
                      })}
                    </div>
                  ) : (
                    <p className="text-muted-foreground text-sm italic">Sem descrição</p>
                  )}
                </div>
              </div>
              
              {/* Anexos */}
              <div>
                <h3 className="text-sm font-medium mb-2">Anexos</h3>
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
              <div>
                <h3 className="text-sm font-medium mb-2">Comentários</h3>
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
                            <div className="flex items-center gap-4 mt-1">
                              <button className="text-xs text-muted-foreground hover:text-foreground">
                                Responder
                              </button>
                              <button className="text-xs text-muted-foreground hover:text-foreground">
                                Curtir
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                
                {/* Form para adicionar comentário */}
                <form onSubmit={handleSubmitComment} className="mt-4">
                  <div className="flex items-start gap-2">
                    <UserAvatar user={null} className="w-8 h-8 mt-0.5" />
                    <div className="flex-1 relative">
                      <Textarea
                        placeholder="Adicionar um comentário..."
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        className="min-h-[80px] pr-10"
                      />
                      <Button 
                        type="submit" 
                        size="icon" 
                        variant="ghost" 
                        className="absolute bottom-2 right-2"
                        disabled={!newComment.trim() || isSubmittingComment}
                      >
                        {isSubmittingComment ? (
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                        ) : (
                          <SendHorizontal className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                </form>
              </div>
            </div>
          </ScrollArea>
        </div>
      </SheetContent>
    </Sheet>
  );
}