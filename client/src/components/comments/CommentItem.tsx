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
  MessageSquare,
  ChevronDown,
  Send
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
  reactions?: any[]; // Mantido por compatibilidade, mas as reações agora vêm do próprio comentário
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
      "group rounded-md p-3 hover:bg-slate-100 dark:hover:bg-slate-800/50 transition-colors",
      isReply ? "ml-6 border-l-2 border-slate-200 dark:border-slate-700 pl-3" : "",
      "mb-1"
    )}>
      <div className="flex gap-2.5">
        <div className="shrink-0">
          <UserAvatar user={author} size="sm" />
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-1">
            <div className="flex items-center gap-2">
              <span className="font-medium text-sm text-slate-900 dark:text-slate-100">
                {author?.name || "Usuário desconhecido"}
              </span>
              <RelativeTime date={comment.creation_date} className="text-xs text-muted-foreground" />
              {wasEdited && (
                <span className="text-xs text-muted-foreground">(editado)</span>
              )}
            </div>
            
            <div className="flex items-center gap-1 self-end sm:self-auto">
              {isAuthor && !isEditing && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity">
                      <MoreVertical className="h-3.5 w-3.5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-[160px]">
                    <DropdownMenuItem onClick={() => setIsEditing(true)} className="text-xs">
                      <Edit className="mr-2 h-3.5 w-3.5" />
                      <span>Editar</span>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem 
                      onClick={() => onDelete(comment.id)}
                      className="text-red-600 focus:text-red-600 text-xs"
                    >
                      <Trash2 className="mr-2 h-3.5 w-3.5" />
                      <span>Excluir</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </div>
          
          {isEditing ? (
            <div className="mt-2 space-y-2">
              <Textarea
                value={editedText}
                onChange={(e) => setEditedText(e.target.value)}
                className="min-h-[80px] w-full text-sm"
              />
              <div className="flex justify-end gap-2">
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="h-7 text-xs"
                  onClick={() => {
                    setIsEditing(false);
                    setEditedText(comment.comment);
                  }}
                >
                  <X className="mr-1 h-3 w-3" />
                  Cancelar
                </Button>
                <Button 
                  size="sm"
                  className="h-7 text-xs"
                  onClick={handleSaveEdit}
                >
                  <Check className="mr-1 h-3 w-3" />
                  Salvar
                </Button>
              </div>
            </div>
          ) : (
            <div className="text-sm text-slate-800 dark:text-slate-200 mt-0.5 break-words">{formattedComment}</div>
          )}
          
          {!isEditing && (
            <div className="flex flex-wrap items-center gap-2 mt-2">
              <Button 
                variant={hasReacted ? "secondary" : "ghost"} 
                size="sm" 
                className={cn(
                  "h-6 px-2 text-xs rounded-full",
                  hasReacted ? "bg-blue-100 text-blue-700 hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-300" : ""
                )}
                onClick={() => onReaction(comment.id)}
              >
                <Heart className={cn(
                  "mr-1 h-3 w-3", 
                  hasReacted ? "fill-blue-500 text-blue-500" : ""
                )} />
                <span>{reactionCount > 0 ? "Curtir (" + reactionCount + ")" : "Curtir"}</span>
              </Button>
              
              {!isReply && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-6 px-2 text-xs rounded-full"
                  onClick={() => setIsReplying(!isReplying)}
                >
                  <Reply className="mr-1 h-3 w-3" />
                  <span>Responder</span>
                </Button>
              )}
            </div>
          )}
          
          {isReplying && (
            <div className="mt-3 space-y-2">
              <div className="flex gap-2.5">
                <div className="shrink-0 pt-1">
                  <UserAvatar user={currentUser} size="xs" />
                </div>
                <div className="flex-1 relative">
                  <Textarea
                    placeholder="Escreva sua resposta..."
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    className="min-h-[60px] resize-none text-sm pr-16"
                  />
                  <div className="absolute bottom-2 right-2 flex space-x-1">
                    <Button 
                      size="icon" 
                      variant="ghost" 
                      className="h-6 w-6 rounded-full"
                      onClick={() => {
                        setIsReplying(false);
                        setReplyText("");
                      }}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                    <Button 
                      size="icon"
                      className="h-6 w-6 rounded-full"
                      onClick={handleSubmitReply}
                      disabled={!replyText.trim()}
                    >
                      <Send className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {!isReply && replies.length > 0 && (
            <div className="mt-1">
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-6 px-0 text-xs hover:bg-transparent"
                onClick={() => setShowReplies(!showReplies)}
              >
                <ChevronDown className={cn(
                  "mr-1 h-3 w-3 transition-transform", 
                  showReplies ? "rotate-180" : ""
                )} />
                <span className="text-xs text-muted-foreground">
                  {replies.length} {replies.length === 1 ? "resposta" : "respostas"}
                </span>
              </Button>
            </div>
          )}
          
          {!isReply && showReplies && replies.length > 0 && (
            <div className="mt-1">
              {replies.map((reply) => (
                <CommentItem
                  key={reply.id}
                  comment={reply}
                  users={users}
                  onReply={onReply}
                  onDelete={onDelete}
                  onEdit={onEdit}
                  isReply={true}
                  reactions={[]} // Não é mais necessário passar reactions separadamente
                  onReaction={onReaction}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}