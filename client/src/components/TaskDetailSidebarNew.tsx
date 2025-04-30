import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { X, Download, Plus, Send, ChevronDown } from "lucide-react";
import { formatDate } from "@/lib/utils";
import PriorityBadge from "@/components/PriorityBadge";
import { UserAvatar } from "./UserAvatar";
import { Separator } from "@/components/ui/separator";
import { TASK_STATUS_OPTIONS } from "@/lib/constants";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface TaskDetailSidebarProps {
  taskId: number;
  onClose: () => void;
  onEdit?: (taskId: number) => void;
}

interface CommentFormData {
  comment: string;
}

export default function TaskDetailSidebarNew({ taskId, onClose, onEdit }: TaskDetailSidebarProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [newComment, setNewComment] = useState("");
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

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

  // Toggle task completion mutation
  const updateTaskMutation = useMutation({
    mutationFn: async (data: { completed?: boolean, status?: string }) => {
      return apiRequest('PATCH', `/api/tasks/${taskId}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
      queryClient.invalidateQueries({ queryKey: [`/api/tasks/${taskId}`] });
      toast({
        title: "Tarefa atualizada",
        description: "Tarefa atualizada com sucesso",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao atualizar tarefa",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Add comment mutation
  const addCommentMutation = useMutation({
    mutationFn: async (data: CommentFormData) => {
      return apiRequest('POST', `/api/tasks/${taskId}/comments`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/tasks/${taskId}/comments`] });
      setNewComment("");
      setIsSubmittingComment(false);
    },
    onError: () => {
      setIsSubmittingComment(false);
    }
  });

  const handleToggleCompletion = () => {
    if (task) {
      updateTaskMutation.mutate({ completed: !task.completed });
    }
  };

  const handleSubmitComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    
    setIsSubmittingComment(true);
    addCommentMutation.mutate({ comment: newComment });
  };

  const handleAddAttachment = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };
  
  const handleStatusChange = (newStatus: string) => {
    if (task && newStatus !== task.status) {
      updateTaskMutation.mutate({ status: newStatus });
    }
  };

  if (isLoadingTask) {
    return (
      <div className="fixed inset-y-0 right-0 bg-white shadow-lg w-[400px] transition-all duration-300 z-20 border-l border-gray-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  if (!task) {
    return (
      <div className="fixed inset-y-0 right-0 bg-white shadow-lg w-[400px] transition-all duration-300 z-20 border-l border-gray-100 p-4">
        <div className="flex justify-end">
          <Button variant="ghost" size="icon" onClick={onClose} className="h-6 w-6">
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex items-center justify-center h-full">
          <p className="text-gray-500">Tarefa não encontrada</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-y-0 right-0 bg-white shadow-lg w-[400px] transition-all duration-300 z-20 border-l border-gray-100 overflow-y-auto">
      {/* Header with close button */}
      <div className="sticky top-0 bg-white z-10 px-5 py-4 border-b border-gray-100 flex justify-between items-center">
        <h2 className="text-sm font-medium text-gray-500">Detalhes da Tarefa</h2>
        <Button variant="ghost" size="icon" onClick={onClose} className="h-6 w-6 -mr-1">
          <X className="h-4 w-4" />
        </Button>
      </div>
      
      {/* Content area */}
      <div className="px-6 py-4">
        {/* Task Title */}
        <h1 className="text-base font-medium text-gray-900 mb-1">{task.title}</h1>
        <p className="text-sm text-gray-500 mb-4">{task.description?.substring(0, 120) + (task.description?.length > 120 ? '...' : '')}</p>
        
        {/* Completion Checkbox */}
        <div className="mb-4 flex items-center">
          <Checkbox 
            id="completed" 
            checked={task.completed}
            onCheckedChange={handleToggleCompletion}
            className="mr-2 h-4 w-4 rounded-sm border-gray-300"
          />
          <label htmlFor="completed" className="text-sm cursor-pointer">
            Marcar como concluída
          </label>
          
          {/* Priority Badge - floating right */}
          <div className="ml-auto">
            <Badge 
              className={`${
                task.priority === 'baixa' ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-50' : 
                task.priority === 'media' ? 'bg-amber-50 text-amber-700 hover:bg-amber-50' : 
                task.priority === 'alta' ? 'bg-orange-50 text-orange-700 hover:bg-orange-50' : 
                'bg-red-50 text-red-700 hover:bg-red-50'
              }`}
            >
              {task.priority === 'baixa' ? 'Baixa' : 
               task.priority === 'media' ? 'Média' : 
               task.priority === 'alta' ? 'Alta' : 'Crítica'}
            </Badge>
          </div>
        </div>
        
        {/* Info Grid */}
        <div className="grid grid-cols-2 gap-x-4 gap-y-3 mb-6">
          <div>
            <p className="text-xs text-gray-500 mb-1">Projeto</p>
            <div className="flex items-center">
              <svg 
                className="h-4 w-4 text-gray-400 mr-1.5" 
                xmlns="http://www.w3.org/2000/svg" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="2" 
                strokeLinecap="round" 
                strokeLinejoin="round"
              >
                <rect width="18" height="18" x="3" y="3" rx="2" />
                <path d="M7 7h.01" />
                <path d="M10.5 7h.01" />
                <path d="M14 7h.01" />
                <path d="M7 10.5h.01" />
                <path d="M10.5 10.5h.01" />
                <path d="M14 10.5h.01" />
                <path d="M7 14h.01" />
                <path d="M10.5 14h.01" />
                <path d="M14 14h.01" />
              </svg>
              <span className="text-sm font-medium truncate">{project?.name || '-'}</span>
            </div>
          </div>
          
          <div>
            <p className="text-xs text-gray-500 mb-1">Responsável</p>
            <div className="flex items-center">
              <UserAvatar 
                user={assignedUser} 
                className="h-5 w-5 mr-1.5"
              />
              <span className="text-sm font-medium truncate">{assignedUser?.name || '-'}</span>
            </div>
          </div>
          
          <div>
            <p className="text-xs text-gray-500 mb-1">Data de Início</p>
            <div className="flex items-center">
              <svg 
                className="h-4 w-4 text-gray-400 mr-1.5" 
                xmlns="http://www.w3.org/2000/svg" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="2" 
                strokeLinecap="round" 
                strokeLinejoin="round"
              >
                <rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
              <span className="text-sm font-medium">{task.start_date ? formatDate(task.start_date) : '-'}</span>
            </div>
          </div>
          
          <div>
            <p className="text-xs text-gray-500 mb-1">Data de Entrega</p>
            <div className="flex items-center">
              <svg 
                className="h-4 w-4 text-gray-400 mr-1.5" 
                xmlns="http://www.w3.org/2000/svg" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="2" 
                strokeLinecap="round" 
                strokeLinejoin="round"
              >
                <rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
              <span className="text-sm font-medium">{task.due_date ? formatDate(task.due_date) : '-'}</span>
            </div>
          </div>
          
          <div>
            <p className="text-xs text-gray-500 mb-1">Estimativa</p>
            <div className="flex items-center">
              <svg 
                className="h-4 w-4 text-gray-400 mr-1.5" 
                xmlns="http://www.w3.org/2000/svg" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="2" 
                strokeLinecap="round" 
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
              <span className="text-sm font-medium">{task.estimated_hours ? `${task.estimated_hours} horas` : '-'}</span>
            </div>
          </div>
          
          <div>
            <p className="text-xs text-gray-500 mb-1">Status</p>
            <div className="flex items-center">
              <svg 
                className="h-4 w-4 text-gray-400 mr-1.5 flex-shrink-0" 
                xmlns="http://www.w3.org/2000/svg" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="2" 
                strokeLinecap="round" 
                strokeLinejoin="round"
              >
                <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" />
                <path d="m9 12 2 2 4-4" />
              </svg>
              <Select
                value={task.status || "pendente"}
                onValueChange={handleStatusChange}
                disabled={updateTaskMutation.isPending}
              >
                <SelectTrigger className="h-7 w-[160px] border-none px-0 font-medium">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TASK_STATUS_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        
        <Separator className="my-5" />
        
        {/* Description */}
        <div className="mb-6">
          <h3 className="text-sm font-medium mb-3">Descrição</h3>
          <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded-md">
            {task.description ? (
              <div className="space-y-2">
                {task.description.split('\n').map((line, i) => (
                  <p key={i}>{line}</p>
                ))}
              </div>
            ) : (
              <p className="italic text-gray-400">Sem descrição</p>
            )}
          </div>
        </div>
        
        {/* Attachments */}
        <div className="mb-6">
          <h3 className="text-sm font-medium mb-3">Anexos</h3>
          
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
          />
          
          {isLoadingAttachments ? (
            <div className="flex justify-center items-center py-4">
              <div className="animate-spin h-5 w-5 border-2 border-indigo-500 rounded-full border-t-transparent"></div>
            </div>
          ) : attachments && attachments.length > 0 ? (
            <div className="space-y-2">
              {attachments.map((attachment) => (
                <div key={attachment.id} className="flex items-center justify-between bg-gray-50 p-3 rounded-md">
                  <div className="flex items-center overflow-hidden">
                    <div className="shrink-0 mr-3">
                      {attachment.file_name.endsWith('.pdf') ? (
                        <div className="w-8 h-10 bg-red-100 rounded flex items-center justify-center">
                          <span className="text-red-600 text-xs font-bold">PDF</span>
                        </div>
                      ) : attachment.file_name.endsWith('.zip') ? (
                        <div className="w-8 h-10 bg-yellow-100 rounded flex items-center justify-center">
                          <span className="text-yellow-600 text-xs font-bold">ZIP</span>
                        </div>
                      ) : (
                        <div className="w-8 h-10 bg-blue-100 rounded flex items-center justify-center">
                          <span className="text-blue-600 text-xs font-bold">DOC</span>
                        </div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{attachment.file_name}</p>
                      <p className="text-xs text-gray-500">{attachment.file_size ? `${attachment.file_size} KB` : ''}</p>
                    </div>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8 text-gray-500 hover:text-blue-600"
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <Button 
              variant="outline" 
              size="sm" 
              className="w-full border-dashed border-gray-300 bg-gray-50"
              onClick={handleAddAttachment}
            >
              <Plus className="h-4 w-4 mr-2" />
              Adicionar
            </Button>
          )}
        </div>
        
        {/* Comments */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium">Comentários</h3>
            {comments && comments.length > 0 && (
              <Badge variant="secondary" className="text-xs font-normal">{comments.length} comentários</Badge>
            )}
          </div>
          
          {isLoadingComments ? (
            <div className="flex justify-center items-center py-4">
              <div className="animate-spin h-5 w-5 border-2 border-indigo-500 rounded-full border-t-transparent"></div>
            </div>
          ) : comments && comments.length > 0 ? (
            <div className="space-y-3 mb-4">
              {comments.map((comment) => (
                <div key={comment.id} className="bg-gray-50 rounded-md p-3">
                  <div className="flex items-start">
                    <UserAvatar 
                      user={comment.user} 
                      className="h-7 w-7 mt-0.5 mr-2" 
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-center mb-1">
                        <p className="text-sm font-medium">{comment.user?.name}</p>
                        <p className="text-xs text-gray-500">
                          {new Date(comment.created_at).toLocaleDateString('pt-BR', {
                            day: '2-digit',
                            month: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                      </div>
                      <p className="text-sm">{comment.content}</p>
                      <div className="flex gap-3 mt-2">
                        <button className="text-xs text-gray-500 hover:text-gray-700">Responder</button>
                        <span className="text-gray-300">•</span>
                        <button className="text-xs text-gray-500 hover:text-gray-700">Curtir</button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-4 mb-4 bg-gray-50 rounded-md">
              <p className="text-sm text-gray-500">Nenhum comentário ainda</p>
            </div>
          )}
          
          <form onSubmit={handleSubmitComment} className="mt-2">
            <Textarea
              placeholder="Adicionar um comentário..."
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              className="min-h-[80px] text-sm resize-none mb-2"
            />
            <div className="flex justify-end">
              <Button 
                type="submit" 
                size="sm" 
                className="bg-indigo-600 hover:bg-indigo-700 text-white"
                disabled={!newComment.trim() || isSubmittingComment}
              >
                {isSubmittingComment ? (
                  <div className="animate-spin h-3 w-3 border-2 border-white rounded-full border-t-transparent mr-1"></div>
                ) : (
                  <Send className="h-3 w-3 mr-1" />
                )}
                Enviar
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}