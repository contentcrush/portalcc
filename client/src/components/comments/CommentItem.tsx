import { useState } from "react";
import { TaskComment, User } from "@shared/schema";
import { UserAvatar } from "./UserAvatar";
import { RelativeTime } from "./RelativeTime";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { 
  Heart, 
  Reply, 
  Trash2, 
  Edit, 
  Check, 
  X, 
  MoreVertical,
  MessageSquare
} from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { useSocket } from "@/contexts/SocketContext";
import { useAuth } from "@/hooks/use-auth";

interface CommentItemProps {
  comment: TaskComment;
  users: Record<number, User>;
  onReply: (comment: TaskComment) => void;
  onDelete: (commentId: number) => void;
  onEdit: (commentId: number, newText: string) => void;
  isReply?: boolean;
  reactions?: any[]; // Temporariamente usando 'any' durante a migração
  onReaction: (commentId: number) => void;
  replies?: TaskComment[];
}

export function CommentItem({ 
  comment, 
  users, 
  onReply, 
  onDelete, 
  onEdit,
  isReply = false,
  reactions,
  onReaction,
  replies = []
}: CommentItemProps) {
  const { user: currentUser } = useAuth();
  const { socket } = useSocket();
  const [isEditing, setIsEditing] = useState(false);
  const [editedText, setEditedText] = useState(comment.comment);
  const [isReplying, setIsReplying] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [showReplies, setShowReplies] = useState(false);

  // Obter o autor do comentário
  const author = users[comment.user_id];
  
  // Verificar se o usuário atual é o autor do comentário
  const isAuthor = currentUser?.id === comment.user_id;
  
  // Verificar se o usuário atual já reagiu a este comentário
  const hasReacted = comment.reactions?.some(r => 
    r.user_id === currentUser?.id
  ) || false;
  
  // Obter contagem de reações para este comentário
  const reactionCount = comment.reactions?.length || 0;
  
  // Verificar se este comentário foi editado
  const wasEdited = comment.edited;
  
  // Função para salvar a edição
  const handleSaveEdit = () => {
    onEdit(comment.id, editedText);
    setIsEditing(false);
  };
  
  // Função para enviar resposta
  const handleSubmitReply = () => {
    if (!replyText.trim()) return;
    
    const replyData = {
      task_id: comment.task_id,
      user_id: currentUser?.id,
      comment: replyText,
      parent_id: comment.id
    };
    
    // Enviar pelo Socket se disponível, senão via API normal
    if (socket) {
      socket.send(JSON.stringify({
        type: "comment",
        data: replyData
      }));
    }
    
    // Resetar state
    setReplyText("");
    setIsReplying(false);
    
    // Mostrar as respostas após responder
    setShowReplies(true);
  };

  // Formatar o conteúdo do comentário com suporte a quebras de linha
  const formattedComment = comment.comment.split("\n").map((line, i) => (
    <span key={i}>
      {line}
      {i < comment.comment.split("\n").length - 1 && <br />}
    </span>
  ));
  
  return (
    <div className={cn(
      "flex gap-3 py-3", 
      isReply ? "ml-10 border-l-2 border-muted pl-4" : ""
    )}>
      <div className="shrink-0">
        <UserAvatar user={author} size="md" />
      </div>
      
      <div className="flex-1 space-y-2">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-medium">{author?.name || "Usuário desconhecido"}</span>
              {wasEdited && (
                <span className="text-xs text-muted-foreground">(editado)</span>
              )}
            </div>
            <RelativeTime date={comment.creation_date} className="text-xs" />
          </div>
          
          {isAuthor && !isEditing && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setIsEditing(true)}>
                  <Edit className="mr-2 h-4 w-4" />
                  <span>Editar</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  onClick={() => onDelete(comment.id)}
                  className="text-red-600 focus:text-red-600"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  <span>Excluir</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
        
        {isEditing ? (
          <div className="space-y-2">
            <Textarea
              value={editedText}
              onChange={(e) => setEditedText(e.target.value)}
              className="min-h-[100px] w-full"
            />
            <div className="flex justify-end space-x-2">
              <Button 
                size="sm" 
                variant="outline" 
                onClick={() => {
                  setIsEditing(false);
                  setEditedText(comment.comment);
                }}
              >
                <X className="mr-1 h-4 w-4" />
                Cancelar
              </Button>
              <Button 
                size="sm" 
                onClick={handleSaveEdit}
              >
                <Check className="mr-1 h-4 w-4" />
                Salvar
              </Button>
            </div>
          </div>
        ) : (
          <div className="text-sm">{formattedComment}</div>
        )}
        
        {!isEditing && (
          <div className="flex items-center space-x-2 pt-1">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant={hasReacted ? "secondary" : "ghost"} 
                    size="sm" 
                    className="h-7 px-2 text-xs"
                    onClick={() => onReaction(comment.id)}
                  >
                    <Heart className={cn(
                      "mr-1 h-3 w-3", 
                      hasReacted ? "fill-primary text-primary" : ""
                    )} />
                    {reactionCount > 0 && reactionCount}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Curtir</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            
            {!isReply && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-7 px-2 text-xs"
                      onClick={() => setIsReplying(!isReplying)}
                    >
                      <Reply className="mr-1 h-3 w-3" />
                      Responder
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Responder</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
            
            {!isReply && replies.length > 0 && (
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-7 px-2 text-xs"
                onClick={() => setShowReplies(!showReplies)}
              >
                <MessageSquare className="mr-1 h-3 w-3" />
                {replies.length} {replies.length === 1 ? "resposta" : "respostas"}
              </Button>
            )}
          </div>
        )}
        
        {isReplying && (
          <div className="mt-3 space-y-2">
            <Textarea
              placeholder="Escreva sua resposta..."
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              className="min-h-[80px] w-full text-sm"
            />
            <div className="flex justify-end space-x-2">
              <Button 
                size="sm" 
                variant="outline" 
                onClick={() => {
                  setIsReplying(false);
                  setReplyText("");
                }}
              >
                Cancelar
              </Button>
              <Button 
                size="sm" 
                onClick={handleSubmitReply}
                disabled={!replyText.trim()}
              >
                Responder
              </Button>
            </div>
          </div>
        )}
        
        {!isReply && showReplies && replies.length > 0 && (
          <div className="mt-3 space-y-1">
            {replies.map((reply) => (
              <CommentItem
                key={reply.id}
                comment={reply}
                users={users}
                onReply={onReply}
                onDelete={onDelete}
                onEdit={onEdit}
                isReply={true}
                reactions={reactions}
                onReaction={onReaction}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}