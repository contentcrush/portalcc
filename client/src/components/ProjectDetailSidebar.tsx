import { useState, useEffect, useRef } from "react";
import { useProjectForm } from "@/contexts/ProjectFormContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation, useRoute, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { UserPlus, X, Edit, CheckCircle2, Circle, MoreHorizontal, Copy, FileText, DollarSign, Trash2, Clock, Pause, Check, Loader2, Plus, File, Download } from "lucide-react";
import { formatCurrency, getInitials, formatTeamRole, getNormalizedProjectStatus, hasInteractiveStages, showSuccessToast } from "@/lib/utils";
import { apiRequest } from "@/lib/queryClient";
import { TEAM_ROLE_OPTIONS } from "@/lib/constants";
import { useToast } from "@/hooks/use-toast";
import { useDateFormatter } from "@/hooks/use-date-formatter";
import { DateDisplay } from "@/components/DateDisplay";
import { UserAvatar } from "./UserAvatar";
import { ClientAvatar } from "./ClientAvatar";
import { Badge } from "@/components/ui/badge";
import StatusBadge from "./StatusBadge";
import { ProjectProgress } from "./ProjectProgress";
import { ProjectTimeline } from "./ProjectTimeline";
import { TimelineProgressBar } from "./TimelineProgressBar";
import { ProjectCommentSection } from "./comments";
import ProjectAttachments from "./ProjectAttachments";
import { ProjectStageStatus, isProjectStage, isProjectSpecialStatus } from "@/lib/types";
import { ProjectSpecialStatus } from "./ProjectSpecialStatus";
import { 
  PROJECT_STATUS_CONFIG,
  isValidStatusTransition,
  calculateProgressFromStatus,
  type ProjectStatus,
  type SpecialStatus 
} from "@shared/schema";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ProjectFormDialog } from "./ProjectFormDialog";

interface ProjectDetailSidebarProps {
  projectId: number;
  onClose: () => void;
}

export default function ProjectDetailSidebar({ projectId, onClose }: ProjectDetailSidebarProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const dateFormatter = useDateFormatter();
  const [, navigate] = useLocation();
  const { openProjectForm, setProjectToEdit } = useProjectForm();
  const sidebarRef = useRef<HTMLDivElement>(null);
  
  // Estados para controlar os diálogos
  const [showAddMemberDialog, setShowAddMemberDialog] = useState(false);
  const [isUploadingFile, setIsUploadingFile] = useState(false);
  const [attachmentToDelete, setAttachmentToDelete] = useState<number | null>(null);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [confirmStatusChange, setConfirmStatusChange] = useState<{open: boolean, message: string, status: string}>({
    open: false,
    message: '',
    status: ''
  });
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Adiciona um event listener para detectar cliques fora da barra lateral
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      // Se qualquer diálogo estiver aberto, não fechar a barra lateral
      if (showAddMemberDialog || confirmDialogOpen || confirmStatusChange.open) {
        return;
      }
      
      // Verifica se o clique foi fora da barra lateral
      // E também verifica se o alvo não é um elemento de diálogo ou modal
      const target = event.target as HTMLElement;
      const isDialogElement = target.closest('[role="dialog"]') || 
                              target.closest('.alert-dialog') || 
                              target.closest('.dialog');
      
      if (isDialogElement) {
        return; // Não fechar se clicou em qualquer elemento de diálogo
      }
      
      if (sidebarRef.current && !sidebarRef.current.contains(target)) {
        onClose();
      }
    }
    
    // Adiciona o event listener ao body
    document.addEventListener('mousedown', handleClickOutside);
    
    // Limpa o event listener ao desmontar o componente
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [onClose, showAddMemberDialog, confirmDialogOpen, confirmStatusChange]);
  
  // Funções para navegação
  const handleManageTasks = () => {
    navigate(`/tasks?projectId=${projectId}`);
    onClose();
  };
  
  const handleProjectFinancial = () => {
    navigate(`/financial?projectId=${projectId}`);
    onClose();
  };

  const { data: project, isLoading: isLoadingProject } = useQuery({
    queryKey: [`/api/projects/${projectId}`],
    enabled: !!projectId,
    staleTime: 5 * 60 * 1000, // 5 minutos
    cacheTime: 10 * 60 * 1000 // 10 minutos
  });

  const { data: client } = useQuery({
    queryKey: [`/api/clients/${project?.client_id}`],
    enabled: !!project?.client_id,
    staleTime: 10 * 60 * 1000, // 10 minutos - clientes mudam com menos frequência
    cacheTime: 15 * 60 * 1000 // 15 minutos
  });

  // Carrega membros do projeto e usuários simultaneamente
  const { data: projectMembers } = useQuery({
    queryKey: [`/api/projects/${projectId}/members`],
    enabled: !!projectId,
    staleTime: 5 * 60 * 1000, // 5 minutos
    cacheTime: 10 * 60 * 1000 // 10 minutos
  });

  // Carregar todos os usuários uma única vez e reutilizar
  const { data: users } = useQuery({
    queryKey: ['/api/users'],
    staleTime: 15 * 60 * 1000, // 15 minutos - usuários não mudam com frequência
    cacheTime: 30 * 60 * 1000 // 30 minutos
  });

  const { data: stages } = useQuery({
    queryKey: [`/api/projects/${projectId}/stages`],
    enabled: !!projectId,
    staleTime: 5 * 60 * 1000, // 5 minutos
    cacheTime: 10 * 60 * 1000 // 10 minutos
  });
  
  // Carregar anexos do projeto
  const { data: attachments, isLoading: isLoadingAttachments } = useQuery({
    queryKey: [`/api/projects/${projectId}/attachments`],
    enabled: !!projectId,
    staleTime: 2 * 60 * 1000, // 2 minutos
    cacheTime: 5 * 60 * 1000 // 5 minutos
  });

  // Mutation to update a project stage
  const updateStageMutation = useMutation({
    mutationFn: async ({ stageId, data }: { stageId: number, data: any }) => {
      return apiRequest('PATCH', `/api/projects/${projectId}/stages/${stageId}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/stages`] });
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}`] });
      showSuccessToast({
        title: "Etapa atualizada",
        description: "A etapa do projeto foi atualizada com sucesso."
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao atualizar etapa",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const toggleStageCompletion = (stageId: number, completed: boolean) => {
    // Verificar se o projeto está cancelado
    if (project?.special_status === 'canceled') {
      toast({
        title: "Ação bloqueada",
        description: "Este projeto está cancelado. Não é possível alterar suas etapas.",
        variant: "destructive"
      });
      return;
    }
    
    updateStageMutation.mutate({
      stageId,
      data: { completed: !completed }
    });
  };
  
  // Mutation para duplicar um projeto
  const duplicateProjectMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', `/api/projects/${projectId}/duplicate`);
      const data = await response.json();
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/projects'] });
      showSuccessToast({
        title: "Projeto duplicado com sucesso",
        description: `O projeto "${data.name}" foi criado.`
      });
      onClose(); // Fechar o painel lateral após duplicação
    },
    onError: (error) => {
      toast({
        title: "Erro ao duplicar projeto",
        description: error.message,
        variant: "destructive"
      });
    }
  });
  
  // Mutation para excluir o projeto
  const deleteProjectMutation = useMutation({
    mutationFn: async () => {
      return apiRequest('DELETE', `/api/projects/${projectId}`);
    },
    onSuccess: () => {
      // Atualiza todos os dados relacionados, incluindo documentos financeiros
      queryClient.invalidateQueries({ queryKey: ['/api/projects'] });
      queryClient.invalidateQueries({ queryKey: ['/api/financial-documents'] });
      queryClient.invalidateQueries({ queryKey: ['/api/expenses'] });
      queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
      
      showSuccessToast({
        title: "Projeto excluído com sucesso",
        description: "O projeto e todos seus dados relacionados foram removidos permanentemente."
      });
      onClose(); // Fechar o painel lateral após exclusão
    },
    onError: (error) => {
      toast({
        title: "Erro ao excluir projeto",
        description: error.message,
        variant: "destructive"
      });
    }
  });
  
  // Query para verificar se já existe um documento financeiro para o projeto
  const { data: financialDocuments } = useQuery({
    queryKey: [`/api/financial-documents/project/${projectId}`],
    enabled: !!projectId,
    staleTime: 1 * 60 * 1000, // 1 minuto
  });

  // Mutation para criar um documento financeiro automaticamente quando o projeto atinge o estágio "proposta_aceita"
  const createFinancialDocumentMutation = useMutation({
    mutationFn: async (projectData: any) => {
      if (!projectData || !projectData.client_id || !projectData.id) {
        throw new Error('Dados do projeto incompletos para criar documento financeiro');
      }
      
      // Verifica se já existe um documento financeiro para este projeto
      const existingDocs = await apiRequest('GET', `/api/financial-documents/project/${projectData.id}`);
      const existingDocsData = await existingDocs.json();
      
      if (existingDocsData && existingDocsData.length > 0) {
        console.log("Documento financeiro já existe para este projeto. Não será criado um novo.");
        return null; // Retorna null para indicar que não foi necessário criar
      }
      
      // Calcula a data de vencimento com base no termo de pagamento do projeto
      // A partir da Data de Emissão + Prazo de Pagamento
      let dueDate;
      let issueDate;
      
      // Se o projeto tem data de emissão definida, usa ela
      if (projectData.issue_date) {
        issueDate = new Date(projectData.issue_date);
      } else if (projectData.endDate) {
        // Se não tem data de emissão, mas tem data de conclusão, usa a data de conclusão
        issueDate = new Date(projectData.endDate);
      } else {
        // Se não tem nem data de emissão nem de conclusão, usa a data atual
        issueDate = new Date();
      }
      
      // Calcula data de vencimento: Data de Emissão + Prazo de Pagamento
      dueDate = new Date(issueDate);
      dueDate.setDate(dueDate.getDate() + (projectData.payment_term || 30));
      
      // Formatando as datas para manterem apenas a parte da data (sem hora/minuto/segundo)
      // Isso garante que a exibição será consistente com o que foi configurado no projeto
      // Definimos a hora para meio-dia (12:00) para evitar problemas com fusos horários
      let issueDateFormatted, dueDateFormatted;

      if (issueDate) {
        // Formata para YYYY-MM-DDT12:00:00.000Z para garantir consistência
        issueDateFormatted = new Date(
          issueDate.getFullYear(),
          issueDate.getMonth(),
          issueDate.getDate(),
          12, 0, 0
        ).toISOString();
      }

      if (dueDate) {
        // Formata para YYYY-MM-DDT12:00:00.000Z para garantir consistência
        dueDateFormatted = new Date(
          dueDate.getFullYear(),
          dueDate.getMonth(),
          dueDate.getDate(),
          12, 0, 0
        ).toISOString();
      }

      const financialDocumentData = {
        project_id: projectData.id,
        client_id: projectData.client_id,
        document_type: 'invoice',
        amount: projectData.budget || 0,
        creation_date: issueDateFormatted,
        due_date: dueDateFormatted,
        status: 'pending',
        description: `Fatura referente ao projeto: ${projectData.name} (Prazo: ${projectData.payment_term || 30} dias)`
      };
      
      return apiRequest('POST', '/api/financial-documents', financialDocumentData);
    },
    onSuccess: (response) => {
      if (response) { // Se um novo documento foi criado
        queryClient.invalidateQueries({ queryKey: ['/api/financial-documents'] });
        queryClient.invalidateQueries({ queryKey: [`/api/financial-documents/project/${projectId}`] });
        toast({
          title: "Documento financeiro criado",
          description: "Um documento financeiro 'A Receber' foi criado para este projeto.",
          variant: "success"
        });
      }
    },
    onError: (error) => {
      console.error("Erro ao criar documento financeiro:", error);
      toast({
        title: "Erro ao criar documento financeiro",
        description: error.message || "Não foi possível criar o documento financeiro para o projeto.",
        variant: "destructive"
      });
    }
  });
  
  // Mutation para remover documentos financeiros quando o projeto volta para um estágio anterior
  const removeFinancialDocumentMutation = useMutation({
    mutationFn: async (projectId: number) => {
      // Primeiro obtém todos os documentos financeiros do projeto
      const response = await apiRequest('GET', `/api/financial-documents/project/${projectId}`);
      const documents = await response.json();
      
      // Se não houver documentos, não faz nada
      if (!documents || documents.length === 0) {
        return null;
      }
      
      // Remove apenas documentos com status "pending" (não pagos)
      const pendingDocs = documents.filter((doc: any) => doc.status === 'pending' && !doc.paid);
      
      // Executa a exclusão de cada documento pendente
      const deletePromises = pendingDocs.map((doc: any) => 
        apiRequest('DELETE', `/api/financial-documents/${doc.id}`)
      );
      
      return Promise.all(deletePromises);
    },
    onSuccess: (response) => {
      if (response) {
        queryClient.invalidateQueries({ queryKey: ['/api/financial-documents'] });
        queryClient.invalidateQueries({ queryKey: [`/api/financial-documents/project/${projectId}`] });
        toast({
          title: "Documentos financeiros removidos",
          description: "Os documentos financeiros pendentes foram removidos deste projeto.",
          variant: "success"
        });
      }
    },
    onError: (error) => {
      console.error("Erro ao remover documentos financeiros:", error);
      toast({
        title: "Erro ao remover documentos financeiros",
        description: error.message || "Não foi possível remover os documentos financeiros do projeto.",
        variant: "destructive"
      });
    }
  });

  // Mutation para atualizar o status do projeto
  const updateProjectStatusMutation = useMutation({
    mutationFn: async (status: string) => {
      if (!project) {
        throw new Error('Projeto não encontrado');
      }
      
      // Verificar se o projeto está cancelado e impedir avanços
      if (project.special_status === 'canceled' && status !== project.status) {
        throw new Error('Este projeto está cancelado. Não é possível alterar seu status.');
      }
      
      // Precisamos incluir os campos obrigatórios do projeto junto com o novo status
      const updateData = {
        name: project.name,
        client_id: project.client_id,
        status: status
      };
      
      // Retornamos a resposta da API
      const response = await apiRequest('PATCH', `/api/projects/${projectId}`, updateData);
      return response.json(); // Retorna os dados atualizados do projeto
    },
    onSuccess: (updatedProject, status) => {
      // Atualiza o cache do React Query imediatamente com os dados atualizados
      queryClient.setQueryData([`/api/projects/${projectId}`], updatedProject);
      
      // Invalida as queries para forçar um refetch quando necessário
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}`] });
      queryClient.invalidateQueries({ queryKey: ['/api/projects'] });
      
      if (project) {
        // Se o status foi alterado PARA "proposta_aceita", criar automaticamente o documento financeiro
        if (status === 'proposta_aceita') {
          console.log("Status alterado para 'proposta_aceita'. Criando documento financeiro...");
          createFinancialDocumentMutation.mutate(updatedProject);
        } 
        // Se o status foi alterado PARA "proposta" ou outro status anterior à "proposta_aceita", remover documentos financeiros
        else if (!['proposta_aceita', 'pre_producao', 'producao', 'pos_revisao', 'entregue', 'finalizado', 'atrasado'].includes(status)) {
          console.log(`Status alterado para '${status}' (etapa anterior à proposta aceita). Removendo documentos financeiros...`);
          removeFinancialDocumentMutation.mutate(projectId);
        }
      }
      
      // Notifica o usuário sobre a atualização bem-sucedida
      toast({
        title: "Status atualizado",
        description: "O status do projeto foi atualizado com sucesso.",
        variant: "success"
      });
      
      // Emite um evento via WebSocket para notificar outros usuários
      if (window.socket) {
        window.socket.emit('project_updated', { 
          projectId, 
          status,
          message: `Status do projeto atualizado para: ${status}`
        });
      }
    },
    onError: (error) => {
      console.error("Erro ao atualizar status:", error);
      toast({
        title: "Erro ao atualizar status",
        description: "Não foi possível atualizar o status do projeto.",
        variant: "destructive"
      });
    }
  });
  
  // Função para verificar se todos os documentos financeiros do projeto estão pagos
  const checkProjectPaymentStatus = async () => {
    try {
      // Buscar documentos financeiros do projeto
      const response = await apiRequest('GET', `/api/financial-documents/project/${projectId}`);
      const documents = await response.json();
      
      // Se não houver documentos financeiros, não pode ser marcado como concluído
      if (!documents || documents.length === 0) {
        return {
          isPaid: false,
          message: "Não existem documentos financeiros associados a este projeto. É necessário ter uma fatura para marcar como concluído."
        };
      }
      
      // Verifica se todos os documentos estão pagos
      const unpaidDocuments = documents.filter(doc => !doc.paid);
      
      if (unpaidDocuments.length > 0) {
        return {
          isPaid: false,
          message: "Existem faturas pendentes associadas a este projeto. Todas as faturas devem estar pagas antes de marcar o projeto como concluído.",
          documents: unpaidDocuments
        };
      }
      
      return {
        isPaid: true,
        message: "Todas as faturas estão pagas. O projeto pode ser marcado como concluído."
      };
    } catch (error) {
      console.error("Erro ao verificar status de pagamento:", error);
      return {
        isPaid: false,
        message: "Erro ao verificar o status de pagamento do projeto.",
        error
      };
    }
  };

  const handleUpdateProjectStatus = async (status: string) => {
    // Verifica se o status é diferente do atual para evitar chamadas desnecessárias
    if (project && project.status !== status) {
      // Se o usuário estiver tentando marcar como "concluido", verificar status de pagamento
      if (status === 'concluido') {
        // Abre um diálogo antes de verificar pagamento, para melhorar a experiência do usuário
        toast({
          title: "Verificando pagamento...",
          description: "Aguarde enquanto verificamos o status de pagamento do projeto.",
        });
        
        const paymentStatus = await checkProjectPaymentStatus();
        
        if (!paymentStatus.isPaid) {
          // Cria um diálogo personalizado usando o componente Dialog do shadcn
          toast({
            title: "Ação não permitida",
            description: (
              <div className="space-y-3">
                <p>{paymentStatus.message}</p>
                <p className="font-semibold mt-2">Para marcar este projeto como concluído:</p>
                <ol className="list-decimal pl-4 space-y-1">
                  <li>Acesse a página <Link to="/financial" className="text-primary underline font-medium">Financeiro</Link></li>
                  <li>Localize a fatura relacionada a este projeto</li>
                  <li>Clique em "Registrar Pagamento" e confirme a transação</li>
                  <li>Retorne a esta página para finalizar o projeto</li>
                </ol>
              </div>
            ),
            variant: "destructive",
            duration: 10000, // 10 segundos para dar tempo de ler
          });
          return;
        }
      }
      
      // Verificar se o projeto tem status especial e se o usuário está tentando alterar para uma etapa
      if (isProjectSpecialStatus(project.status) && isProjectStage(status)) {
        const { specialStatus } = getNormalizedProjectStatus(project);
        
        // Se o projeto tiver um status especial, mostrar diálogo de confirmação personalizado
        if (specialStatus) {
          setConfirmStatusChange({
            open: true,
            message: `Este projeto está marcado como "${specialStatus}". Deseja remover esse status e atualizar para "${status}"?`,
            status: status
          });
          return;
        }
      }
      
      // Confirmação para status especiais
      if (['cancelado', 'pausado'].includes(status)) {
        const statusLabel = status === 'cancelado' ? 'cancelar' : 'pausar';
        setConfirmStatusChange({
          open: true,
          message: `Tem certeza que deseja ${statusLabel} este projeto?`,
          status: status
        });
        return;
      }
      
      // Verificar se estamos saindo do status "proposta_aceita" para outro status (exceto proposta, concluido, cancelado)
      if (project.status === 'proposta_aceita' && !["proposta_aceita", "proposta", "concluido", "cancelado"].includes(status)) {
        // Mostrar diálogo de confirmação personalizado
        setConfirmStatusChange({
          open: true,
          message: "Ao mudar este status, o registro financeiro associado será removido. Tem certeza?",
          status: status
        });
        return;
      }
      
      // Atualização otimista da interface
      // Cria uma cópia atualizada do projeto para mostrar mudanças imediatamente
      const updatedProject = {
        ...project,
        status: status
      };
      
      // Atualiza o cache imediatamente para uma resposta instantânea da UI
      queryClient.setQueryData([`/api/projects/${projectId}`], updatedProject);
      
      // Em seguida, dispara a mutation para atualizar o servidor
      updateProjectStatusMutation.mutate(status);
    }
  };
  
  // Estado para o diálogo de confirmação de duplicação
  const [confirmDuplication, setConfirmDuplication] = useState(false);

  const handleDuplicateProject = () => {
    setConfirmDuplication(true);
  };
  
  const confirmDuplicateProject = () => {
    duplicateProjectMutation.mutate();
    setConfirmDuplication(false);
  };
  
  const handleDeleteProject = () => {
    deleteProjectMutation.mutate();
  };

  // Get team members with their user details
  const teamMembers = projectMembers?.map(member => {
    const user = users?.find(u => u.id === member.user_id);
    return {
      ...member,
      user
    };
  });

  // Mutation para remover um membro da equipe
  const removeMemberMutation = useMutation({
    mutationFn: async ({ projectId, userId }: { projectId: number, userId: number }) => {
      return apiRequest('DELETE', `/api/projects/${projectId}/members/${userId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/members`] });
      toast({
        title: "Membro removido",
        description: "O membro foi removido da equipe com sucesso."
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao remover membro",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const handleRemoveMember = (userId: number, userName: string) => {
    removeMemberMutation.mutate({ projectId, userId });
  };
  
  // Funções para manipulação de anexos
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;
    
    setIsUploadingFile(true);
    
    const formData = new FormData();
    // Adiciona apenas o primeiro arquivo selecionado
    formData.append('file', files[0]);
    
    uploadAttachmentMutation.mutate(formData);
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
  
  const handleDeleteClick = (attachmentId: number) => {
    setAttachmentToDelete(attachmentId);
    setConfirmDialogOpen(true);
  };
  
  const confirmDeleteAttachment = () => {
    if (attachmentToDelete !== null) {
      deleteAttachmentMutation.mutate(attachmentToDelete);
    }
  };
  
  const cancelDeleteAttachment = () => {
    setAttachmentToDelete(null);
    setConfirmDialogOpen(false);
  };
  
  // Mutation para upload de arquivo
  const uploadAttachmentMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const file = formData.get('file') as File;
      console.log("Iniciando upload do arquivo:", file.name);
      
      // Converte para base64 para enviar ao servidor
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          if (reader.result) {
            const base64String = reader.result.toString().split(',')[1];
            console.log("Arquivo convertido para base64, tamanho:", base64String.length);
            resolve(base64String);
          } else {
            reject(new Error("Falha ao ler o arquivo"));
          }
        };
        reader.onerror = (error) => {
          console.error("Erro ao ler arquivo:", error);
          reject(new Error("Erro ao ler o arquivo"));
        };
        reader.readAsDataURL(file);
      });
      
      // Dados para enviar ao servidor
      const attachmentData = {
        file_name: file.name,
        file_url: `data:${file.type};base64,${base64}`,
        file_size: file.size,
        file_type: file.type,
        project_id: projectId,
        // Campos opcionais não explicitamente necessários no servidor
        encrypted: false
      };
      
      console.log("Enviando dados para o servidor:", {
        fileName: attachmentData.file_name,
        fileType: attachmentData.file_type,
        fileSize: attachmentData.file_size,
        projectId: attachmentData.project_id,
        urlLength: attachmentData.file_url.length
      });
      
      try {
        const response = await apiRequest('POST', `/api/projects/${projectId}/attachments`, attachmentData);
        console.log("Resposta do servidor:", response);
        return response;
      } catch (err) {
        console.error("Erro na requisição:", err);
        throw err;
      }
    },
    onSuccess: () => {
      console.log("Anexo enviado com sucesso!");
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/attachments`] });
      setIsUploadingFile(false);
      toast({
        title: "Arquivo anexado",
        description: "O arquivo foi anexado ao projeto com sucesso."
      });
      
      // Limpa o input de arquivo
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    },
    onError: (error: any) => {
      console.error("Erro ao anexar arquivo:", error);
      setIsUploadingFile(false);
      toast({
        title: "Erro ao anexar arquivo",
        description: error.message || "Ocorreu um erro ao anexar o arquivo",
        variant: "destructive"
      });
    }
  });
  
  // Mutation para excluir anexo
  const deleteAttachmentMutation = useMutation({
    mutationFn: async (attachmentId: number) => {
      return apiRequest('DELETE', `/api/projects/attachments/${attachmentId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/attachments`] });
      setAttachmentToDelete(null);
      setConfirmDialogOpen(false);
      toast({
        title: "Anexo excluído",
        description: "O anexo foi removido do projeto com sucesso."
      });
    },
    onError: (error) => {
      setAttachmentToDelete(null);
      setConfirmDialogOpen(false);
      toast({
        title: "Erro ao excluir anexo",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  // Calculate progress
  const progress = project?.progress || 0;
  const completedStages = stages?.filter(stage => stage.completed)?.length || 0;
  const totalStages = stages?.length || 0;

  if (isLoadingProject) {
    return (
      <div ref={sidebarRef} className="fixed inset-y-0 right-0 bg-white shadow-lg w-96 transform transition-transform duration-300 z-20 border-l border-gray-200 p-6 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!project) {
    return (
      <div ref={sidebarRef} className="fixed inset-y-0 right-0 bg-white shadow-lg w-96 transform transition-transform duration-300 z-20 border-l border-gray-200 p-6">
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="font-semibold text-lg">Projeto não encontrado</h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div ref={sidebarRef} className="fixed inset-y-0 right-0 bg-white shadow-lg w-96 transform transition-all duration-300 z-20 border-l border-gray-200 overflow-y-auto">
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <h2 className="font-semibold text-lg">DETALHES DO PROJETO</h2>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-5 w-5" />
        </Button>
      </div>
      
      <div className="p-6">
        <div className="flex justify-center mb-6">
          {client ? (
            <ClientAvatar 
              name={client.name} 
              logoUrl={client.logo} 
              size="lg"
            />
          ) : (
            <div 
              className="w-16 h-16 rounded-full flex items-center justify-center font-semibold text-xl bg-gray-100 text-gray-500"
            >
              {''}
            </div>
          )}
        </div>
        
        <div className="text-center mb-6">
          <h3 className="font-medium text-lg">{project?.name || 'Carregando...'}</h3>
          <p className="text-sm text-gray-500">
            Criado em <DateDisplay date={project?.creation_date} />
          </p>
        </div>
        
        <div className="space-y-4 mb-8">
          <div className="flex items-center justify-between">
            <div className="text-sm font-medium text-gray-600">Status:</div>
            <StatusBadge 
              project={project}
            />
          </div>
          
          {/* Status Especial do Projeto */}
          <div className="flex items-center justify-between">
            <div className="text-sm font-medium text-gray-600">Status Especial:</div>
            <ProjectSpecialStatus 
              projectId={projectId}
              currentStatus={project?.special_status || 'none'}
            />
          </div>
          
          <div className="flex items-center justify-between">
            <div className="text-sm font-medium text-gray-600">Cliente:</div>
            <div className="text-sm font-medium">{client?.name || 'Não definido'}</div>
          </div>
          
          <div className="flex items-center justify-between">
            <div className="text-sm font-medium text-gray-600">Orçamento:</div>
            <div className="text-sm font-medium">
              {project?.budget ? formatCurrency(project.budget) : 'Não definido'}
            </div>
          </div>
          
          <div className="flex items-center justify-between">
            <div className="text-sm font-medium text-gray-600">Prazo:</div>
            <div className="text-sm font-medium">
              {project?.endDate ? <DateDisplay date={project.endDate} /> : 'Não definido'}
            </div>
          </div>
        </div>
        
        <div className="mb-8">
          <h4 className="font-medium text-sm mb-4">EQUIPE DO PROJETO</h4>
          <div className="space-y-4">
            {teamMembers && teamMembers.length > 0 ? (
              teamMembers.map(member => (
                <div key={member.id} className="flex items-start justify-between group">
                  <div className="flex items-start">
                    {member.user?.avatar ? (
                      <img 
                        src={member.user.avatar} 
                        alt={member.user?.name || 'Membro'}
                        className="w-8 h-8 rounded-full mr-3"
                      />
                    ) : (
                      <div className="w-8 h-8 bg-gray-200 rounded-full mr-3 flex items-center justify-center">
                        {getInitials(member.user?.name || 'U')}
                      </div>
                    )}
                    <div>
                      <p className="text-sm font-medium">{member.user?.name || 'Usuário'}</p>
                      <p className="text-xs text-gray-500">{formatTeamRole(member.role) || 'Membro'}</p>
                    </div>
                  </div>
                  
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6"
                      >
                        <Trash2 className="h-3.5 w-3.5 text-gray-400 hover:text-red-500" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Remover membro da equipe</AlertDialogTitle>
                        <AlertDialogDescription>
                          Tem certeza que deseja remover {member.user?.name || 'este membro'} da equipe do projeto?
                          Esta ação não pode ser desfeita.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction 
                          onClick={() => handleRemoveMember(member.user_id, member.user?.name || 'Usuário')}
                          className="bg-red-600 hover:bg-red-700 text-white"
                        >
                          Remover
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              ))
            ) : (
              <p className="text-sm text-gray-500">Nenhum membro na equipe</p>
            )}
            
            <div className="flex justify-center">
              <Button 
                variant="ghost" 
                size="sm" 
                className="text-indigo-600"
                onClick={() => setShowAddMemberDialog(true)}
              >
                + Adicionar membro
              </Button>
            </div>
          </div>
        </div>
        
        {/* Nova Timeline de Etapas */}
        <div className="mb-8">
          <h4 className="font-medium text-sm mb-4">TIMELINE DO PROJETO</h4>
          <ProjectTimeline 
            project={project}
            onStatusUpdate={handleUpdateProjectStatus}
          />
        </div>
        
        {/* Seção de etapas antiga (temporariamente mantida) */}
        <div className="mb-8" style={{ display: 'none' }}>
          <h4 className="font-medium text-sm mb-4">ETAPAS DO PROJETO (ANTIGA)</h4>
          
          {/* Mutation para atualizar o status do projeto */}
          {project ? (
            <div className="space-y-4">
              {/* Aviso quando o projeto está cancelado */}
              {project?.special_status === 'canceled' && (
                <div className="bg-red-50 border border-red-200 rounded-md p-3 mb-4 flex items-center gap-2">
                  <XCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
                  <p className="text-sm text-red-700">
                    Este projeto está <strong>cancelado</strong>. Não é possível alterar suas etapas.
                  </p>
                </div>
              )}
              
              {/* Etapas de fluxo padrão */}
              <div 
                className={`flex items-start cursor-pointer group ${
                  hasInteractiveStages(project) ? "" : "opacity-80"
                }`}
                onClick={() => handleUpdateProjectStatus('proposta')}
              >
                <div className={`w-6 h-6 rounded-full flex items-center justify-center mr-3 shrink-0 transition-colors
                  ${['proposta', 'proposta_aceita', 'pre_producao', 'producao', 'pos_revisao', 'entregue', 'concluido'].includes(getNormalizedProjectStatus(project).stageStatus)
                    ? 'bg-green-500'
                    : 'bg-slate-100'
                  }`}
                >
                  <Check className={`h-3.5 w-3.5 ${
                    ['proposta', 'proposta_aceita', 'pre_producao', 'producao', 'pos_revisao', 'entregue', 'concluido'].includes(getNormalizedProjectStatus(project).stageStatus) 
                      ? 'text-white'
                      : 'text-slate-300'
                  }`} />
                </div>
                <div>
                  <p className="text-sm font-medium">Proposta</p>
                  <p className={`text-xs ${
                    ['proposta', 'proposta_aceita', 'pre_producao', 'producao', 'pos_revisao', 'entregue', 'concluido'].includes(getNormalizedProjectStatus(project).stageStatus)
                      ? 'text-slate-600'
                      : 'text-gray-500'
                  }`}>
                    {['proposta', 'proposta_aceita', 'pre_producao', 'producao', 'pos_revisao', 'entregue', 'concluido'].includes(getNormalizedProjectStatus(project).stageStatus)
                      ? 'Concluído'
                      : 'Pendente'}
                  </p>
                </div>
              </div>
              
              <div 
                className={`flex items-start cursor-pointer group ${
                  hasInteractiveStages(project) ? "" : "opacity-80"
                }`}
                onClick={() => handleUpdateProjectStatus('proposta_aceita')}
              >
                <div className={`w-6 h-6 rounded-full flex items-center justify-center mr-3 shrink-0 transition-colors
                  ${['proposta_aceita', 'pre_producao', 'producao', 'pos_revisao', 'entregue', 'concluido'].includes(getNormalizedProjectStatus(project).stageStatus)
                    ? 'bg-green-500'
                    : 'bg-slate-100'
                  }`}
                >
                  <Check className={`h-3.5 w-3.5 ${
                    ['proposta_aceita', 'pre_producao', 'producao', 'pos_revisao', 'entregue', 'concluido'].includes(getNormalizedProjectStatus(project).stageStatus) 
                      ? 'text-white'
                      : 'text-slate-300'
                  }`} />
                </div>
                <div>
                  <p className="text-sm font-medium">Proposta Aceita</p>
                  <p className={`text-xs ${
                    ['proposta_aceita', 'pre_producao', 'producao', 'pos_revisao', 'entregue', 'concluido'].includes(getNormalizedProjectStatus(project).stageStatus)
                      ? 'text-slate-600'
                      : 'text-gray-500'
                  }`}>
                    {['proposta_aceita', 'pre_producao', 'producao', 'pos_revisao', 'entregue', 'concluido'].includes(getNormalizedProjectStatus(project).stageStatus)
                      ? 'Concluído'
                      : 'Pendente'}
                  </p>
                </div>
              </div>
              
              <div 
                className={`flex items-start cursor-pointer group ${
                  hasInteractiveStages(project) ? "" : "opacity-80"
                }`}
                onClick={() => handleUpdateProjectStatus('pre_producao')}
              >
                <div className={`w-6 h-6 rounded-full flex items-center justify-center mr-3 shrink-0 transition-colors
                  ${['pre_producao', 'producao', 'pos_revisao', 'entregue', 'concluido'].includes(getNormalizedProjectStatus(project).stageStatus)
                    ? 'bg-green-500'
                    : 'bg-slate-100'
                  }`}
                >
                  <Check className={`h-3.5 w-3.5 ${
                    ['pre_producao', 'producao', 'pos_revisao', 'entregue', 'concluido'].includes(getNormalizedProjectStatus(project).stageStatus) 
                      ? 'text-white'
                      : 'text-slate-300'
                  }`} />
                </div>
                <div>
                  <p className="text-sm font-medium">Pré-produção</p>
                  <p className={`text-xs ${
                    ['pre_producao', 'producao', 'pos_revisao', 'entregue', 'concluido'].includes(getNormalizedProjectStatus(project).stageStatus)
                      ? 'text-indigo-600'
                      : 'text-gray-500'
                  }`}>
                    {['pre_producao', 'producao', 'pos_revisao', 'entregue', 'concluido'].includes(getNormalizedProjectStatus(project).stageStatus)
                      ? 'Concluído'
                      : 'Pendente'}
                  </p>
                </div>
              </div>
              
              <div 
                className={`flex items-start cursor-pointer group ${
                  hasInteractiveStages(project) ? "" : "opacity-80"
                }`}
                onClick={() => handleUpdateProjectStatus('producao')}
              >
                <div className={`w-6 h-6 rounded-full flex items-center justify-center mr-3 shrink-0 transition-colors
                  ${getNormalizedProjectStatus(project).stageStatus === 'producao' 
                    ? 'bg-yellow-500' 
                    : ['pos_revisao', 'entregue', 'concluido'].includes(getNormalizedProjectStatus(project).stageStatus)
                      ? 'bg-green-500'
                      : 'bg-slate-100'
                  }`}
                >
                  <Check className={`h-3.5 w-3.5 ${
                    ['producao', 'pos_revisao', 'entregue', 'concluido'].includes(getNormalizedProjectStatus(project).stageStatus) 
                      ? 'text-white'
                      : 'text-slate-300'
                  }`} />
                </div>
                <div>
                  <p className="text-sm font-medium">Produção</p>
                  <p className={`text-xs ${
                    getNormalizedProjectStatus(project).stageStatus === 'producao'
                      ? 'text-yellow-600'
                      : ['pos_revisao', 'entregue', 'concluido'].includes(getNormalizedProjectStatus(project).stageStatus)
                        ? 'text-slate-600'
                        : 'text-gray-500'
                  }`}>
                    {getNormalizedProjectStatus(project).stageStatus === 'producao'
                      ? 'Em andamento'
                      : ['pos_revisao', 'entregue', 'concluido'].includes(getNormalizedProjectStatus(project).stageStatus)
                        ? 'Concluído'
                        : 'Pendente'}
                  </p>
                </div>
              </div>
              
              <div 
                className={`flex items-start cursor-pointer group ${
                  hasInteractiveStages(project) ? "" : "opacity-80"
                }`}
                onClick={() => handleUpdateProjectStatus('pos_revisao')}
              >
                <div className={`w-6 h-6 rounded-full flex items-center justify-center mr-3 shrink-0 transition-colors 
                  ${getNormalizedProjectStatus(project).stageStatus === 'pos_revisao'
                    ? 'bg-purple-500'
                    : ['entregue', 'concluido'].includes(getNormalizedProjectStatus(project).stageStatus)
                      ? 'bg-green-500'
                      : 'bg-slate-100'
                  }`}
                >
                  <Check className={`h-3.5 w-3.5 ${
                    ['pos_revisao', 'entregue', 'concluido'].includes(getNormalizedProjectStatus(project).stageStatus) 
                      ? 'text-white'
                      : 'text-slate-300'
                  }`} />
                </div>
                <div>
                  <p className="text-sm font-medium">Pós-produção</p>
                  <p className={`text-xs ${
                    getNormalizedProjectStatus(project).stageStatus === 'pos_revisao'
                      ? 'text-purple-600'
                      : ['entregue', 'concluido'].includes(getNormalizedProjectStatus(project).stageStatus)
                        ? 'text-slate-600'
                        : 'text-gray-500'
                  }`}>
                    {['pos_revisao', 'entregue', 'concluido'].includes(getNormalizedProjectStatus(project).stageStatus)
                      ? 'Concluído'
                      : 'Pendente'}
                  </p>
                </div>
              </div>
              
              <div 
                className={`flex items-start cursor-pointer group ${
                  hasInteractiveStages(project) ? "" : "opacity-80"
                }`}
                onClick={() => handleUpdateProjectStatus('entregue')}
              >
                <div className={`w-6 h-6 rounded-full flex items-center justify-center mr-3 shrink-0 transition-colors
                  ${getNormalizedProjectStatus(project).stageStatus === 'entregue'
                    ? 'bg-green-500'
                    : getNormalizedProjectStatus(project).stageStatus === 'concluido'
                      ? 'bg-green-500'
                      : 'bg-slate-100'
                  }`}
                >
                  <Check className={`h-3.5 w-3.5 ${
                    ['entregue', 'concluido'].includes(getNormalizedProjectStatus(project).stageStatus) 
                      ? 'text-white'
                      : 'text-slate-300'
                  }`} />
                </div>
                <div>
                  <p className="text-sm font-medium">Entregue / Aprovado</p>
                  <p className={`text-xs ${
                    ['entregue', 'concluido'].includes(getNormalizedProjectStatus(project).stageStatus)
                      ? 'text-slate-600'
                      : 'text-gray-500'
                  }`}>
                    {['entregue', 'concluido'].includes(getNormalizedProjectStatus(project).stageStatus)
                      ? 'Concluído'
                      : 'Pendente'}
                  </p>
                </div>
              </div>
              
              <div 
                className={`flex items-start cursor-pointer group ${
                  hasInteractiveStages(project) ? "" : "opacity-80"
                }`}
                onClick={() => handleUpdateProjectStatus('concluido')}
              >
                <div className={`w-6 h-6 rounded-full flex items-center justify-center mr-3 shrink-0 transition-colors
                  ${getNormalizedProjectStatus(project).stageStatus === 'concluido'
                    ? 'bg-green-500'
                    : 'bg-slate-100'
                  }`}
                >
                  <Check className={`h-3.5 w-3.5 ${
                    getNormalizedProjectStatus(project).stageStatus === 'concluido' 
                      ? 'text-white'
                      : 'text-slate-300'
                  }`} />
                </div>
                <div>
                  <p className="text-sm font-medium">Concluído (Pago)</p>
                  <p className={`text-xs ${
                    getNormalizedProjectStatus(project).stageStatus === 'concluido'
                      ? 'text-slate-600'
                      : 'text-gray-500'
                  }`}>
                    {getNormalizedProjectStatus(project).stageStatus === 'concluido'
                      ? 'Concluído'
                      : 'Pendente'}
                  </p>
                </div>
              </div>
              
              {/* Linha separadora */}
              <div className="border-t border-gray-200 my-4"></div>
              
              {/* Status especiais */}
              <div className="flex flex-wrap gap-3">
                <button
                  className={`flex items-center px-3 py-1.5 rounded text-sm
                    ${project.status === 'atrasado'
                      ? 'bg-rose-100 text-rose-600 border border-rose-300'
                      : 'bg-gray-50 text-gray-500 border border-gray-200 hover:bg-gray-100'
                    }`}
                  onClick={() => handleUpdateProjectStatus('atrasado')}
                >
                  <Clock className="h-3.5 w-3.5 mr-1.5" />
                  Atrasado
                </button>
                
                <button
                  className={`flex items-center px-3 py-1.5 rounded text-sm
                    ${project.status === 'pausado'
                      ? 'bg-amber-100 text-amber-600 border border-amber-300'
                      : 'bg-gray-50 text-gray-500 border border-gray-200 hover:bg-gray-100'
                    }`}
                  onClick={() => handleUpdateProjectStatus('pausado')}
                >
                  <Pause className="h-3.5 w-3.5 mr-1.5" />
                  Pausado
                </button>
                
                <button
                  className={`flex items-center px-3 py-1.5 rounded text-sm
                    ${project.status === 'cancelado'
                      ? 'bg-gray-100 text-gray-600 border border-gray-300'
                      : 'bg-gray-50 text-gray-500 border border-gray-200 hover:bg-gray-100'
                    }`}
                  onClick={() => handleUpdateProjectStatus('cancelado')}
                >
                  <X className="h-3.5 w-3.5 mr-1.5" />
                  Cancelado
                </button>
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-500">Carregando etapas...</p>
          )}
        </div>
        
        {/* Nova seção de progresso no estilo timeline */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-4">
            <div className="text-xs font-medium text-gray-500">PROGRESSO</div>
          </div>
          {project && (
            <TimelineProgressBar project={project} />
          )}
        </div>
        

        
        {/* Seção de anexos com ProjectAttachments */}
        <div className="mb-8">
          <ProjectAttachments 
            projectId={projectId} 
            className="mb-4"
          />
        </div>
        
        {/* Seção de comentários do projeto */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-2">
            <div className="text-xs font-medium text-gray-500">COMENTÁRIOS</div>
          </div>
          <ProjectCommentSection projectId={projectId} />
        </div>
        
        {/* Diálogo de confirmação para exclusão de anexo */}
        <AlertDialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Excluir anexo</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja excluir este anexo? Esta ação não pode ser desfeita.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={cancelDeleteAttachment}>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={confirmDeleteAttachment}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                Excluir
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Diálogo de confirmação para alteração de status do projeto */}
        <AlertDialog open={confirmStatusChange.open} onOpenChange={(open) => 
          setConfirmStatusChange(prev => ({...prev, open}))
        }>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmar alteração de status</AlertDialogTitle>
              <AlertDialogDescription>
                {confirmStatusChange.message}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  // Verifica se estamos saindo do status "proposta_aceita" para outro status
                  if (project.status === 'proposta_aceita' && confirmStatusChange.status !== 'proposta_aceita') {
                    console.log("Status alterado de 'proposta_aceita' para outro. Removendo documentos financeiros...");
                    // Remove documentos financeiros primeiro
                    removeFinancialDocumentMutation.mutate(projectId);
                  }
                  
                  // Atualização otimista da interface
                  const updatedProject = {
                    ...project,
                    status: confirmStatusChange.status
                  };
                  
                  // Atualiza o cache imediatamente para uma resposta instantânea da UI
                  queryClient.setQueryData([`/api/projects/${projectId}`], updatedProject);
                  
                  // Em seguida, dispara a mutation para atualizar o servidor
                  updateProjectStatusMutation.mutate(confirmStatusChange.status);
                  
                  // Fecha o diálogo
                  setConfirmStatusChange({open: false, message: '', status: ''});
                }}
              >
                Confirmar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Diálogo de confirmação para duplicação do projeto */}
        <AlertDialog open={confirmDuplication} onOpenChange={setConfirmDuplication}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Duplicar projeto</AlertDialogTitle>
              <AlertDialogDescription>
                Deseja duplicar este projeto? Uma cópia será criada com todos os membros da equipe e etapas.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={confirmDuplicateProject}>
                Duplicar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        
        <div>
          <Button 
            className="w-full bg-indigo-600 hover:bg-indigo-700 mb-3"
            onClick={() => {
              if (project) {
                setProjectToEdit(project);
                openProjectForm();
              }
            }}
          >
            <Edit className="h-4 w-4 mr-2" />
            Editar Projeto
          </Button>
          <Button 
            className="w-full" 
            variant="outline"
            onClick={handleManageTasks}
          >
            Gerenciar Tarefas
          </Button>
          <Button 
            className="w-full mt-3" 
            variant="outline"
            onClick={handleProjectFinancial}
          >
            Financeiro
          </Button>
          <Button 
            className="w-full mt-3" 
            variant="outline"
            onClick={handleDuplicateProject}
            disabled={duplicateProjectMutation.isPending}
          >
            {duplicateProjectMutation.isPending ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-indigo-600 mr-2"></div>
                Duplicando...
              </>
            ) : (
              <>
                <Copy className="h-4 w-4 mr-2" />
                Duplicar Projeto
              </>
            )}
          </Button>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button 
                className="w-full mt-3 border-red-600 text-red-600 hover:bg-red-50" 
                variant="outline"
                disabled={deleteProjectMutation.isPending}
              >
                {deleteProjectMutation.isPending ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600 mr-2"></div>
                    Excluindo...
                  </>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4 mr-2" />
                    Excluir Projeto
                  </>
                )}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Excluir projeto</AlertDialogTitle>
                <AlertDialogDescription>
                  Tem certeza que deseja excluir o projeto "{project.name}"? Esta ação não pode ser desfeita.
                  <br /><br />
                  <strong>Todos os dados associados, como tarefas e arquivos, também serão excluídos permanentemente.</strong>
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDeleteProject}
                  className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
                >
                  Excluir
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
      
      {/* Diálogo de adicionar membro */}
      <Dialog open={showAddMemberDialog} onOpenChange={setShowAddMemberDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Adicionar Membro à Equipe</DialogTitle>
            <DialogDescription>
              Selecione um usuário e defina seu papel no projeto.
            </DialogDescription>
          </DialogHeader>
          
          <AddMemberForm 
            projectId={projectId}
            users={users || []}
            projectMembers={projectMembers || []}
            onSuccess={() => {
              setShowAddMemberDialog(false);
              queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/members`] });
            }}
          />
        </DialogContent>
      </Dialog>
      
      {/* ProjectFormDialog é renderizado e gerenciado pelo contexto global */}
      <ProjectFormDialog />
    </div>
  );
}

// Componente de formulário para adicionar membro
function AddMemberForm({ projectId, onSuccess, users, projectMembers }: { 
  projectId: number, 
  onSuccess: () => void,
  users: any[],
  projectMembers: any[]
}) {
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [selectedRole, setSelectedRole] = useState<string>(TEAM_ROLE_OPTIONS[0].value); // Use o primeiro valor disponível como padrão
  const [isPending, setIsPending] = useState(false);
  const { toast } = useToast();
  
  // Filtra usuários que já são membros do projeto
  const availableUsers = users?.filter(user => {
    return !projectMembers?.some(member => member.user_id === user.id);
  }) || [];
  
  async function handleAddMember() {
    if (!selectedUserId) {
      toast({
        title: "Erro",
        description: "Selecione um usuário para adicionar à equipe.",
        variant: "destructive"
      });
      return;
    }
    
    setIsPending(true);
    
    try {
      console.log('Enviando dados para adicionar membro:', {
        user_id: selectedUserId,
        role: selectedRole,
        project_id: projectId // adiciona project_id explicitamente
      });
      
      await apiRequest('POST', `/api/projects/${projectId}/members`, {
        user_id: selectedUserId,
        role: selectedRole,
        project_id: projectId // adiciona project_id explicitamente para redundância
      });
      
      toast({
        title: "Membro adicionado",
        description: "O membro foi adicionado com sucesso à equipe do projeto."
      });
      
      onSuccess();
    } catch (error) {
      console.error('Erro ao adicionar membro:', error);
      toast({
        title: "Erro ao adicionar membro",
        description: error.message || "Falha ao adicionar membro à equipe",
        variant: "destructive"
      });
    } finally {
      setIsPending(false);
    }
  }
  
  return (
    <div className="grid gap-4 py-4">
      <div className="grid grid-cols-4 items-center gap-4">
        <label htmlFor="user" className="text-right text-sm font-medium">
          Usuário
        </label>
        <Select 
          onValueChange={(value) => setSelectedUserId(Number(value))}
        >
          <SelectTrigger className="col-span-3">
            <SelectValue placeholder="Selecione um usuário" />
          </SelectTrigger>
          <SelectContent>
            {availableUsers.length > 0 ? (
              availableUsers.map(user => (
                <SelectItem key={user.id} value={user.id.toString()}>
                  {user.name}
                </SelectItem>
              ))
            ) : (
              <SelectItem value="none" disabled>Não há usuários disponíveis</SelectItem>
            )}
          </SelectContent>
        </Select>
      </div>
      
      <div className="grid grid-cols-4 items-center gap-4">
        <label htmlFor="role" className="text-right text-sm font-medium">
          Função
        </label>
        <Select 
          value={selectedRole}
          onValueChange={setSelectedRole}
        >
          <SelectTrigger className="col-span-3">
            <SelectValue placeholder="Selecione uma função" />
          </SelectTrigger>
          <SelectContent>
            {TEAM_ROLE_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      
      <DialogFooter>
        <Button variant="outline" onClick={() => onSuccess()}>
          Cancelar
        </Button>
        <Button onClick={handleAddMember} disabled={isPending}>
          {isPending ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Adicionando...
            </>
          ) : "Adicionar Membro"}
        </Button>
      </DialogFooter>
    </div>
  );
}
