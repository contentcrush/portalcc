import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { TaskComment, User, InsertTaskComment, InsertCommentReaction } from "@shared/schema";
import { CommentItem } from "./CommentItem";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Send } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { useSocket } from "@/contexts/SocketContext";
import { cn, showSuccessToast } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

interface CommentSectionProps {
  taskId: number;
  className?: string;
}

export function CommentSection({ taskId, className = "" }: CommentSectionProps) {
  const { user: currentUser } = useAuth();
  const { socket } = useSocket();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [commentText, setCommentText] = useState("");
  
  // Buscar os comentários da tarefa
  const { 
    data: comments = [], 
    isLoading: isLoadingComments,
    error: commentsError
  } = useQuery<TaskComment[]>({ 
    queryKey: [`/api/tasks/${taskId}/comments`],
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
    mutationFn: async (commentData: InsertTaskComment) => {
      const res = await apiRequest('POST', `/api/tasks/${taskId}/comments`, commentData);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        queryKey: [`/api/tasks/${taskId}/comments`] 
      });
      setCommentText("");
      showSuccessToast({
        title: "Comentário adicionado",
        description: "Seu comentário foi adicionado com sucesso."
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao adicionar comentário",
        description: error.message,
        variant: "destructive"
      });
    }
  });
  
  // Mutation para editar um comentário
  const editCommentMutation = useMutation({
    mutationFn: async ({ commentId, text }: { commentId: number; text: string }) => {
      const res = await apiRequest('PATCH', `/api/comments/${commentId}`, { comment: text });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/tasks/${taskId}/comments`] });
      showSuccessToast({
        title: "Comentário atualizado",
        description: "Seu comentário foi atualizado com sucesso."
      });
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
      const res = await apiRequest('DELETE', `/api/comments/${commentId}`);
      if (!res.ok) throw new Error("Erro ao excluir comentário");
      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/tasks/${taskId}/comments`] });
      showSuccessToast({
        title: "Comentário excluído",
        description: "O comentário foi excluído com sucesso."
      });
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
      const reactionData: InsertCommentReaction = {
        comment_id: commentId,
        user_id: currentUser?.id as number,
        reaction_type: "like"
      };
      const res = await apiRequest('POST', `/api/comments/${commentId}/reactions`, reactionData);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/tasks/${taskId}/comments`] });
      showSuccessToast({
        title: "Reação adicionada",
        description: "Sua reação foi adicionada ao comentário"
      });
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
    
    const commentData: InsertTaskComment = {
      task_id: taskId,
      user_id: currentUser.id,
      comment: commentText.trim()
    };
    
    // Se temos WebSocket, enviar por ele, senão pela API REST
    if (socket) {
      socket.send(JSON.stringify({
        type: "comment",
        data: commentData
      }));
      setCommentText("");
    } else {
      addCommentMutation.mutate(commentData);
    }
  };
  
  // Lidar com a resposta a um comentário
  const handleReply = (comment: TaskComment) => {
    // Esta função é chamada pelo CommentItem quando o usuário submeter a resposta
    // O CommentItem já terá coletado o texto da resposta que está em comment.comment
    if (!comment.comment.trim() || !currentUser?.id) return;
    
    handleSendReply(comment.id, comment.comment);
  };
  
  // Enviar uma resposta a um comentário
  const handleSendReply = (parentId: number, replyText: string) => {
    if (!replyText.trim() || !currentUser?.id) return;
    
    const replyData: InsertTaskComment = {
      task_id: taskId,
      user_id: currentUser.id,
      comment: replyText.trim(),
      parent_id: parentId
    };
    
    // Se temos WebSocket, enviar por ele, senão pela API REST
    if (socket) {
      socket.send(JSON.stringify({
        type: "comment",
        data: replyData
      }));
    } else {
      addCommentMutation.mutate(replyData);
    }
  };
  
  // Reagir a um comentário
  const handleReaction = (commentId: number) => {
    reactToCommentMutation.mutate(commentId);
  };
  
  // Ouvir eventos do WebSocket
  useEffect(() => {
    if (!socket) return;
    
    const handleMessage = (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data);
        
        if (data.type === "comment" && data.task_id === taskId) {
          queryClient.invalidateQueries({ queryKey: [`/api/tasks/${taskId}/comments`] });
        } else if (data.type === "comment_reaction") {
          // As reações agora vêm junto com os comentários
          queryClient.invalidateQueries({ queryKey: [`/api/tasks/${taskId}/comments`] });
        }
      } catch (error) {
        console.error("Erro ao processar mensagem do WebSocket:", error);
      }
    };
    
    socket.addEventListener("message", handleMessage);
    
    return () => {
      socket.removeEventListener("message", handleMessage);
    };
  }, [socket, taskId, queryClient]);
  
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
  }, {} as Record<number, { comment?: TaskComment; replies: TaskComment[] }>);
  
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
        Comentários ({comments.filter(c => !c.parent_id).length})
      </h3>
      
      {/* Formulário para adicionar novo comentário */}
      <div className="mb-6 space-y-2">
        <Textarea
          placeholder="Escreva um comentário..."
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
          Nenhum comentário ainda. Seja o primeiro a comentar!
        </div>
      )}
      
      {/* Lista de comentários */}
      <div className="space-y-1 divide-y">
        {sortedThreads.map(thread => (
          <CommentItem
            key={thread.comment!.id}
            comment={thread.comment!}
            users={usersMap}
            onReply={(parentComment) => handleReply(parentComment as any)}
            onDelete={(commentId) => deleteCommentMutation.mutate(commentId)}
            onEdit={(commentId, newText) => 
              editCommentMutation.mutate({ commentId, text: newText })
            }
            reactions={[]} // Não é mais necessário passar reactions separadamente
            onReaction={handleReaction}
            replies={thread.replies}
          />
        ))}
      </div>
    </div>
  );
}