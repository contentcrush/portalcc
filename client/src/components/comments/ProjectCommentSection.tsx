import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ProjectComment, User, InsertProjectComment, InsertProjectCommentReaction } from "@shared/schema";
import { CommentItem } from "./CommentItem";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Send } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { useSocket } from "@/contexts/SocketContext";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

interface ProjectCommentSectionProps {
  projectId: number;
  className?: string;
}

export function ProjectCommentSection({ projectId, className = "" }: ProjectCommentSectionProps) {
  const { user: currentUser } = useAuth();
  const { 
    socketIoConnected, 
    joinProject, 
    leaveProject, 
    addProjectComment,
    addProjectCommentReply,
    registerProjectCommentListener,
    registerUpdatedProjectCommentListener,
    registerDeletedProjectCommentListener,
    registerProjectCommentReactionListener,
    registerDeletedProjectCommentReactionListener
  } = useSocket();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [commentText, setCommentText] = useState("");

  // Entrar na sala do projeto quando o componente montar
  useEffect(() => {
    if (socketIoConnected) {
      joinProject(projectId);
    }
    
    // Sair da sala do projeto quando desmontar
    return () => {
      if (socketIoConnected) {
        leaveProject(projectId);
      }
    };
  }, [projectId, socketIoConnected, joinProject, leaveProject]);
  
  // Buscar os comentários do projeto
  const { 
    data: comments = [], 
    isLoading: isLoadingComments,
    error: commentsError
  } = useQuery<ProjectComment[]>({ 
    queryKey: [`/api/projects/${projectId}/comments`],
    staleTime: 1000 * 60 * 5 // 5 minutos
  });
  
  // Buscar todos os usuários para exibir as informações nos comentários
  const { 
    data: allUsers = [], 
    isLoading: isLoadingUsers 
  } = useQuery<User[]>({ 
    queryKey: ['/api/users'],
    staleTime: 1000 * 60 * 15 // 15 minutos
  });
  
  // As reações já vêm junto com os comentários na resposta da API,
  // não há necessidade de uma consulta separada
  const isLoadingReactions = false;
  
  // Criar um objeto de usuários indexado por ID para acesso rápido
  const usersMap = allUsers.reduce((acc, user) => {
    acc[user.id] = user;
    return acc;
  }, {} as Record<number, User>);
  
  // Mutation para adicionar novo comentário
  const addCommentMutation = useMutation({
    mutationFn: async (commentData: InsertProjectComment) => {
      const res = await apiRequest('POST', `/api/projects/${projectId}/comments`, commentData);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        queryKey: [`/api/projects/${projectId}/comments`] 
      });
      setCommentText("");
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao adicionar comentário",
        description: error.message,
        variant: "destructive"
      });
    }
  });
  
  // Mutation para adicionar resposta a um comentário
  const addReplyMutation = useMutation({
    mutationFn: async (data: { parentId: number; text: string }) => {
      const commentData: InsertProjectComment = {
        project_id: projectId,
        user_id: currentUser?.id as number,
        comment: data.text,
        parent_id: data.parentId
      };
      const res = await apiRequest('POST', `/api/projects/${projectId}/comments`, commentData);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        queryKey: [`/api/projects/${projectId}/comments`] 
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao adicionar resposta",
        description: error.message,
        variant: "destructive"
      });
    }
  });
  
  // Mutation para editar um comentário
  const editCommentMutation = useMutation({
    mutationFn: async ({ commentId, text }: { commentId: number; text: string }) => {
      const res = await apiRequest('PATCH', `/api/project-comments/${commentId}`, { comment: text });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/comments`] });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao editar comentário",
        description: error.message,
        variant: "destructive"
      });
    }
  });
  
  // Mutation para excluir um comentário
  const deleteCommentMutation = useMutation({
    mutationFn: async (commentId: number) => {
      const res = await apiRequest('DELETE', `/api/project-comments/${commentId}`);
      if (!res.ok) throw new Error("Erro ao excluir comentário");
      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/comments`] });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao excluir comentário",
        description: error.message,
        variant: "destructive"
      });
    }
  });
  
  // Mutation para reagir a um comentário
  const reactToCommentMutation = useMutation({
    mutationFn: async (commentId: number) => {
      const reactionData: InsertProjectCommentReaction = {
        comment_id: commentId,
        user_id: currentUser?.id as number,
        reaction_type: "like"
      };
      const res = await apiRequest('POST', `/api/project-comments/${commentId}/reactions`, reactionData);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/comments`] });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao reagir ao comentário",
        description: error.message,
        variant: "destructive"
      });
    }
  });
  
  // Submeter um novo comentário
  const handleSubmitComment = () => {
    if (!commentText.trim() || !currentUser?.id) return;
    
    const commentData: InsertProjectComment = {
      project_id: projectId,
      user_id: currentUser.id,
      comment: commentText.trim()
    };
    
    // Se temos Socket.IO conectado, enviar por ele, senão pela API REST
    if (socketIoConnected) {
      addProjectComment(projectId, commentText.trim());
      setCommentText("");
    } else {
      addCommentMutation.mutate(commentData);
    }
  };
  
  // Lidar com a resposta a um comentário
  const handleReply = (comment: ProjectComment) => {
    // Esta função é chamada pelo CommentItem quando o usuário submeter a resposta
    // O CommentItem já terá coletado o texto da resposta que está em comment.comment
    if (!comment.comment.trim() || !currentUser?.id) return;
    
    handleSendReply(comment.id, comment.comment);
  };
  
  // Enviar uma resposta a um comentário
  const handleSendReply = (parentId: number, replyText: string) => {
    if (!replyText.trim() || !currentUser?.id) return;
    
    // Se temos Socket.IO conectado, enviar por ele, senão pela API REST
    if (socketIoConnected) {
      addProjectCommentReply(projectId, replyText.trim(), parentId);
    } else {
      addReplyMutation.mutate({ parentId, text: replyText.trim() });
    }
  };
  
  // Reagir a um comentário
  const handleReaction = (commentId: number) => {
    reactToCommentMutation.mutate(commentId);
  };
  
  // Ouvir eventos do Socket.IO
  useEffect(() => {
    if (!socketIoConnected) return;
    
    // Registrar listeners para eventos de comentários
    const unregisterNewComment = registerProjectCommentListener((newComment) => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/comments`] });
    });
    
    const unregisterUpdatedComment = registerUpdatedProjectCommentListener((updatedComment) => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/comments`] });
    });
    
    const unregisterDeletedComment = registerDeletedProjectCommentListener((data) => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/comments`] });
    });
    
    // Registrar listeners para eventos de reações
    const unregisterNewReaction = registerProjectCommentReactionListener((data) => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/comments`] });
    });
    
    const unregisterDeletedReaction = registerDeletedProjectCommentReactionListener((data) => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/comments`] });
    });
    
    // Limpar listeners quando o componente desmontar
    return () => {
      unregisterNewComment();
      unregisterUpdatedComment();
      unregisterDeletedComment();
      unregisterNewReaction();
      unregisterDeletedReaction();
    };
  }, [
    socketIoConnected, 
    projectId, 
    queryClient, 
    registerProjectCommentListener, 
    registerUpdatedProjectCommentListener, 
    registerDeletedProjectCommentListener,
    registerProjectCommentReactionListener,
    registerDeletedProjectCommentReactionListener
  ]);
  
  // Organizar comentários em threads (comentários principais e respostas)
  const commentThreads = comments.reduce((acc, comment) => {
    if (!comment.parent_id) {
      // Comentário principal
      if (!acc[comment.id]) {
        acc[comment.id] = {
          comment,
          replies: []
        };
      } else {
        acc[comment.id].comment = comment;
      }
    } else {
      // Resposta a um comentário
      if (!acc[comment.parent_id]) {
        acc[comment.parent_id] = {
          replies: [comment]
        };
      } else {
        acc[comment.parent_id].replies.push(comment);
      }
    }
    return acc;
  }, {} as Record<number, { comment?: ProjectComment; replies: ProjectComment[] }>);
  
  // Converter para array ordenado por data (mais recente primeiro para mais antigo)
  const sortedThreads = Object.values(commentThreads)
    .filter(thread => thread.comment) // Apenas threads com comentário principal
    .sort((a, b) => {
      const dateA = a.comment?.creation_date ? new Date(a.comment.creation_date).getTime() : 0;
      const dateB = b.comment?.creation_date ? new Date(b.comment.creation_date).getTime() : 0;
      return dateB - dateA; // Ordem decrescente
    });
  
  const isLoading = isLoadingComments || isLoadingUsers || isLoadingReactions;
  
  if (commentsError) {
    return (
      <div className={cn("mt-4 rounded-md p-4 border border-destructive/50 bg-destructive/10", className)}>
        <p className="text-destructive">Erro ao carregar comentários. Tente novamente mais tarde.</p>
      </div>
    );
  }
  
  return (
    <div className={cn("mt-4", className)}>
      <h3 className="text-lg font-medium mb-4">
        Comentários do Projeto ({comments.filter(c => !c.parent_id).length})
      </h3>
      
      {/* Formulário para adicionar novo comentário */}
      <div className="mb-6 space-y-2">
        <Textarea
          placeholder="Escreva um comentário sobre o projeto..."
          value={commentText}
          onChange={(e) => setCommentText(e.target.value)}
          className="min-h-[100px] w-full"
        />
        <div className="flex justify-end">
          <Button 
            onClick={handleSubmitComment} 
            disabled={!commentText.trim() || addCommentMutation.isPending}
          >
            <Send className="mr-2 h-4 w-4" />
            Comentar
          </Button>
        </div>
      </div>
      
      {/* Exibir mensagem de carregamento */}
      {isLoading && (
        <div className="py-4 text-center text-muted-foreground">
          Carregando comentários...
        </div>
      )}
      
      {/* Exibir mensagem quando não há comentários */}
      {!isLoading && sortedThreads.length === 0 && (
        <div className="py-4 text-center text-muted-foreground">
          Nenhum comentário ainda. Seja o primeiro a comentar sobre este projeto!
        </div>
      )}
      
      {/* Lista de comentários */}
      <div className="space-y-1 divide-y">
        {sortedThreads.map(thread => (
          <CommentItem
            key={thread.comment!.id}
            comment={thread.comment! as any} // Tipo compatível com TaskComment para reutilizar o componente
            users={usersMap}
            onReply={(parentComment) => handleReply(parentComment as any)}
            onDelete={(commentId) => deleteCommentMutation.mutate(commentId)}
            onEdit={(commentId, newText) => 
              editCommentMutation.mutate({ commentId, text: newText })
            }
            reactions={[]} // Não é mais necessário passar reactions separadamente
            onReaction={handleReaction}
            replies={thread.replies as any[]} // Tipo compatível com TaskComment
          />
        ))}
      </div>
    </div>
  );
}