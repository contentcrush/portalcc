import React, { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { X, Download, Plus, Send, ChevronDown, Trash2, CheckCircle2 } from "lucide-react";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { motion } from "framer-motion";
import { formatDate, formatDateWithTime, showSuccessToast, animations } from "@/lib/utils";
import { AnimatedElement } from "@/components/ui/animated-element";
import PriorityBadge from "@/components/PriorityBadge";
import { UserAvatar } from "./UserAvatar";
import { Separator } from "@/components/ui/separator";
import { TASK_STATUS_OPTIONS } from "@/lib/constants";
import { CommentSection } from "@/components/comments/CommentSection";
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
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [descriptionValue, setDescriptionValue] = useState("");
  const [isUploadingFile, setIsUploadingFile] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const taskDetailsRef = useRef<HTMLDivElement>(null);

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
    mutationFn: async (data: { completed?: boolean, status?: string, description?: string }) => {
      return apiRequest('PATCH', `/api/tasks/${taskId}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
      queryClient.invalidateQueries({ queryKey: [`/api/tasks/${taskId}`] });
      showSuccessToast({
        title: "Tarefa atualizada",
        description: "Tarefa atualizada com sucesso"
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
  
  // Upload file mutation - usando JSON em vez de FormData
  const uploadFileMutation = useMutation({
    mutationFn: async (attachmentData: { 
      file_name: string; 
      file_size?: number;
      file_type?: string;
      file_url: string;
    }) => {
      return apiRequest('POST', `/api/tasks/${taskId}/attachments`, attachmentData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/tasks/${taskId}/attachments`] });
      setIsUploadingFile(false);
      showSuccessToast({
        title: "Arquivo anexado",
        description: "Arquivo anexado à tarefa com sucesso"
      });
    },
    onError: (error) => {
      console.error("Erro ao anexar arquivo:", error);
      setIsUploadingFile(false);
      toast({
        title: "Erro ao anexar arquivo",
        description: error.message || "Não foi possível anexar o arquivo. Verifique o console para mais detalhes.",
        variant: "destructive",
      });
    }
  });
  
  // Delete file mutation
  const deleteFileMutation = useMutation({
    mutationFn: async (attachmentId: number) => {
      return apiRequest('DELETE', `/api/tasks/attachments/${attachmentId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/tasks/${taskId}/attachments`] });
      showSuccessToast({
        title: "Arquivo excluído",
        description: "Arquivo foi excluído com sucesso"
      });
    },
    onError: (error) => {
      console.error("Erro ao excluir arquivo:", error);
      toast({
        title: "Erro ao excluir arquivo",
        description: error.message || "Não foi possível excluir o arquivo",
        variant: "destructive",
      });
    }
  });

  const handleToggleCompletion = () => {
    if (task) {
      if (!task.completed) {
        // Se está marcando como concluída, também alterar o status para "concluido"
        updateTaskMutation.mutate({ 
          completed: true,
          status: "concluido"
        });
      } else {
        // Se está desmarcando, apenas remove o completed
        updateTaskMutation.mutate({ completed: false });
      }
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
  
  // Função para baixar um arquivo
  const handleDownloadFile = (attachment: any) => {
    // Verificar se é um arquivo com dados base64
    if (attachment.file_url?.startsWith('data:')) {
      // Criar um link para download do arquivo base64
      const link = document.createElement('a');
      link.href = attachment.file_url;
      link.download = attachment.file_name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      // Se não for base64, abrir em uma nova aba
      window.open(attachment.file_url, '_blank');
    }
  };
  
  // Estado para controlar o diálogo de confirmação
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [attachmentToDelete, setAttachmentToDelete] = useState<number | null>(null);

  // Função para abrir o diálogo de confirmação de exclusão
  const handleDeleteFile = (attachmentId: number) => {
    setAttachmentToDelete(attachmentId);
    setConfirmDialogOpen(true);
  };
  
  // Função para confirmar a exclusão
  const confirmDelete = () => {
    if (attachmentToDelete !== null) {
      deleteFileMutation.mutate(attachmentToDelete);
      setAttachmentToDelete(null);
    }
    setConfirmDialogOpen(false);
  };
  
  // Handler for file selection - Usando abordagem JSON com base64
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    const file = files[0];
    
    // Calcular tamanho do arquivo em KB
    const fileSizeKB = Math.round(file.size / 1024);
    
    // Obter o tipo de arquivo
    const fileType = file.type || `application/${file.name.split('.').pop()}`;
    
    // Usar FileReader para converter arquivo para base64
    const reader = new FileReader();
    
    reader.onload = () => {
      // Extrair a string base64 do resultado
      const base64String = (reader.result as string).split(',')[1];
      
      // Criar URL de dados completa que pode ser usada diretamente
      const dataUrl = `data:${fileType};base64,${base64String}`;
      
      // Preparar os dados para envio como JSON
      const fileData = {
        file_name: file.name,
        file_size: fileSizeKB,
        file_type: fileType,
        file_url: dataUrl
      };
      
      setIsUploadingFile(true);
      uploadFileMutation.mutate(fileData);
    };
    
    reader.onerror = () => {
      console.error("Erro ao ler o arquivo");
      toast({
        title: "Erro ao anexar arquivo",
        description: "Não foi possível processar o arquivo. Por favor, tente novamente.",
        variant: "destructive"
      });
      setIsUploadingFile(false);
    };
    
    // Iniciar leitura como URL de dados (data URL)
    reader.readAsDataURL(file);
    
    // Limpar o input para permitir selecionar o mesmo arquivo novamente
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };
  
  const handleStatusChange = (newStatus: string) => {
    if (task && newStatus !== task.status) {
      updateTaskMutation.mutate({ status: newStatus });
    }
  };
  
  // Iniciar edição da descrição
  const handleStartEditingDescription = () => {
    if (task) {
      setDescriptionValue(task.description || "");
      setIsEditingDescription(true);
    }
  };
  
  // Salvar descrição editada
  const handleSaveDescription = () => {
    if (task) {
      updateTaskMutation.mutate({ 
        description: descriptionValue 
      });
      setIsEditingDescription(false);
    }
  };
  
  // Cancelar edição da descrição
  const handleCancelEditDescription = () => {
    setIsEditingDescription(false);
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
      {/* Diálogo de confirmação para excluir anexo */}
      <ConfirmDialog
        isOpen={confirmDialogOpen}
        onClose={() => setConfirmDialogOpen(false)}
        onConfirm={confirmDelete}
        title="Excluir anexo"
        description="Tem certeza que deseja excluir este anexo? Esta ação não pode ser desfeita."
        confirmLabel="Excluir"
        cancelLabel="Cancelar"
      />
      
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
              <span className="text-sm font-medium">
                {task.due_date ? (
                  formatDateWithTime(task.due_date, task.due_time)
                ) : '-'}
              </span>
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
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-sm font-medium">Descrição</h3>
            {!isEditingDescription && (
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-7 px-2 text-xs text-gray-500 hover:text-indigo-600"
                onClick={handleStartEditingDescription}
              >
                Editar
              </Button>
            )}
          </div>
          
          {isEditingDescription ? (
            <div className="space-y-2">
              <Textarea
                value={descriptionValue}
                onChange={(e) => setDescriptionValue(e.target.value)}
                className="min-h-[120px] text-sm"
                placeholder="Digite a descrição da tarefa"
              />
              <div className="flex justify-end gap-2 mt-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleCancelEditDescription}
                >
                  Cancelar
                </Button>
                <Button 
                  size="sm" 
                  onClick={handleSaveDescription}
                  disabled={updateTaskMutation.isPending}
                >
                  Salvar
                </Button>
              </div>
            </div>
          ) : (
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
          )}
        </div>
        
        {/* Attachments */}
        <div className="mb-6">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-sm font-medium">Anexos</h3>
            {attachments && attachments.length > 0 && (
              <Badge variant="secondary" className="text-xs font-normal">{attachments.length} arquivo{attachments.length !== 1 && 's'}</Badge>
            )}
          </div>
          
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            onChange={handleFileChange}
            accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png,.zip"
          />
          
          {isLoadingAttachments ? (
            <div className="flex justify-center items-center py-4">
              <div className="animate-spin h-5 w-5 border-2 border-indigo-500 rounded-full border-t-transparent"></div>
            </div>
          ) : isUploadingFile ? (
            <div className="p-4 bg-gray-50 rounded-md text-center">
              <div className="animate-spin h-5 w-5 border-2 border-indigo-500 rounded-full border-t-transparent mx-auto mb-2"></div>
              <p className="text-sm text-gray-600">Enviando arquivo...</p>
            </div>
          ) : (
            <>
              {attachments && attachments.length > 0 && (
                <div className="space-y-2 mb-3">
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
                          ) : attachment.file_name.match(/\.(jpg|jpeg|png|gif)$/i) ? (
                            <div className="w-8 h-10 bg-green-100 rounded flex items-center justify-center">
                              <span className="text-green-600 text-xs font-bold">IMG</span>
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
                      <div className="flex">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-gray-500 hover:text-blue-600"
                          onClick={() => handleDownloadFile(attachment)}
                          title="Baixar arquivo"
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-gray-500 hover:text-red-600"
                          onClick={() => handleDeleteFile(attachment.id)}
                          title="Excluir anexo"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full border-dashed border-gray-300 bg-gray-50"
                onClick={handleAddAttachment}
              >
                <Plus className="h-4 w-4 mr-2" />
                {attachments && attachments.length > 0 ? 'Adicionar mais' : 'Adicionar anexo'}
              </Button>
            </>
          )}
        </div>
        
        {/* Advanced Comments System */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium">Comentários</h3>
            {comments && comments.length > 0 && (
              <Badge variant="secondary" className="text-xs font-normal">{comments.length} comentários</Badge>
            )}
          </div>
          
          {/* Using the CommentSection component */}
          <div className="mb-4">
            {taskId && (
              <CommentSection taskId={taskId} className="pt-0" />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}