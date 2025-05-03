import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { Socket } from 'socket.io-client';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { 
  initWebSocket, 
  initSocketIO, 
  sendWebSocketMessage,
  emitSocketEvent,
  onWebSocketMessage,
  joinTaskRoom,
  leaveTaskRoom,
  joinProjectRoom,
  leaveProjectRoom,
  addTaskComment,
  addProjectComment,
  onNewComment,
  onNewProjectComment,
  onUpdatedProjectComment,
  onDeletedProjectComment,
  onNewProjectCommentReaction,
  onDeletedProjectCommentReaction,
  notifyUser,
  closeConnections,
  getMessageHandlersForType
} from '@/lib/socket';

interface SocketContextType {
  isConnected: boolean;
  socketIoConnected: boolean;
  webSocket: WebSocket | null;
  socketIo: Socket | null;
  socket: WebSocket | null; // Alias para webSocket para compatibilidade com componentes
  sendMessage: (data: any) => boolean;
  emitEvent: (event: string, data: any) => boolean;
  
  // Métodos para salas de tarefas
  joinTask: (taskId: number) => void;
  leaveTask: (taskId: number) => void;
  addComment: (taskId: number, comment: string) => void;
  registerCommentListener: (callback: (comment: any) => void) => () => void;
  
  // Métodos para salas de projetos
  joinProject: (projectId: number) => void;
  leaveProject: (projectId: number) => void;
  addProjectComment: (projectId: number, comment: string) => void;
  addProjectCommentReply: (projectId: number, comment: string, parentId: number) => void;
  registerProjectCommentListener: (callback: (comment: any) => void) => () => void;
  registerUpdatedProjectCommentListener: (callback: (comment: any) => void) => () => void;
  registerDeletedProjectCommentListener: (callback: (data: { id: number }) => void) => () => void;
  
  // Métodos para reações em comentários de projetos
  registerProjectCommentReactionListener: (callback: (data: any) => void) => () => void;
  registerDeletedProjectCommentReactionListener: (callback: (data: { id: number, comment_id: number }) => void) => () => void;
  
  // Notificações
  sendNotification: (targetUserId: number, notification: {
    title: string;
    message: string;
    type?: 'info' | 'success' | 'warning' | 'error';
    link?: string;
  }) => void;
}

const SocketContext = createContext<SocketContextType | null>(null);

export function SocketProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isConnected, setIsConnected] = useState(false);
  const [socketIoConnected, setSocketIoConnected] = useState(false);
  const [webSocket, setWebSocket] = useState<WebSocket | null>(null);
  const [socketIo, setSocketIo] = useState<Socket | null>(null);

  // Inicializar conexões quando o componente montar
  useEffect(() => {
    let mounted = true;
    let reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
    
    // Função para iniciar ou reiniciar o WebSocket
    const connectWebSocket = () => {
      if (!mounted) return;
      
      console.log('Tentativa de conexão WebSocket via SocketContext...');
      
      initWebSocket()
        .then(ws => {
          if (!mounted) return;
          
          setWebSocket(ws);
          setIsConnected(true);
          console.log('WebSocket conectado com sucesso via SocketContext');
          
          // Monitorar estado da conexão
          const checkConnectionInterval = setInterval(() => {
            if (!mounted) {
              clearInterval(checkConnectionInterval);
              return;
            }
            
            if (ws.readyState !== WebSocket.OPEN) {
              console.warn('Conexão WebSocket não está aberta, readyState:', ws.readyState);
              setIsConnected(false);
              
              // Se a conexão foi fechada ou está com erro, tentar reconectar
              if (ws.readyState === WebSocket.CLOSED || ws.readyState === WebSocket.CLOSING) {
                clearInterval(checkConnectionInterval);
                
                // Evitar múltiplas tentativas simultâneas
                if (reconnectTimeout) {
                  clearTimeout(reconnectTimeout);
                }
                
                // Agendar nova tentativa após um atraso
                const delay = 2000 + Math.random() * 3000;
                reconnectTimeout = setTimeout(() => {
                  console.log(`Tentando reconectar WebSocket após ${Math.round(delay/1000)}s...`);
                  connectWebSocket();
                }, delay);
              }
            } else if (!isConnected) {
              // Atualizar estado se a conexão está aberta mas o estado não reflete isso
              setIsConnected(true);
            }
          }, 5000); // Verificar a cada 5 segundos
          
          // Limpar intervalo quando o componente for desmontado
          return () => {
            clearInterval(checkConnectionInterval);
          };
        })
        .catch(error => {
          console.error('Erro ao conectar WebSocket via SocketContext:', error);
          setIsConnected(false);
          
          // Tentar reconectar após um atraso
          if (mounted) {
            const delay = 3000 + Math.random() * 4000; // Usar delay maior para erros
            if (reconnectTimeout) {
              clearTimeout(reconnectTimeout);
            }
            reconnectTimeout = setTimeout(() => {
              console.log(`Tentando reconectar WebSocket após falha (${Math.round(delay/1000)}s)...`);
              connectWebSocket();
            }, delay);
          }
        });
    };
    
    // Iniciar conexão
    connectWebSocket();
      
    // Iniciar Socket.IO (passando o token se o usuário estiver autenticado)
    if (user) {
      const token = localStorage.getItem('access_token');
      if (token) {
        initSocketIO(user.id, token)
          .then(socket => {
            if (mounted) {
              setSocketIo(socket);
              setSocketIoConnected(true);
              console.log('Socket.IO conectado com sucesso via SocketContext');
            }
          })
          .catch(error => {
            console.error('Erro ao conectar Socket.IO via SocketContext:', error);
          });
      }
    }
    
    // Registrar handler para notificações via WebSocket
    const unregisterNotifHandler = onWebSocketMessage('notification', (data) => {
      toast({
        title: data.title || 'Nova notificação',
        description: data.message,
        variant: (data.type as any) || 'default',
      });
    });
    
    // Registrar handlers para eventos financeiros e de calendário no nível global
    const unregisterFinancialHandler = onWebSocketMessage('financial_updated', (data) => {
      console.log('Evento global financial_updated recebido:', data);
      // Não precisamos fazer nada aqui, apenas garantir que o socket está registrado
    });
    
    const unregisterCalendarHandler = onWebSocketMessage('calendar_updated', (data) => {
      console.log('Evento global calendar_updated recebido:', data);
      // Não precisamos fazer nada aqui, apenas garantir que o socket está registrado
    });
    
    // Registrar também para os formatos antigos para compatibilidade
    const unregisterOldFinancialHandler = onWebSocketMessage('financial_update', (data) => {
      console.log('Evento global financial_update (formato antigo) recebido:', data);
      // Reenviar como financial_updated para manter compatibilidade
      if (webSocket && webSocket.readyState === WebSocket.OPEN) {
        const newEvent = { ...data, type: 'financial_updated' };
        try {
          // Processar manualmente a mensagem como se tivesse vindo do servidor
          // Usando a função auxiliar para acessar os handlers
          const handlers = getMessageHandlersForType('financial_updated');
          if (handlers && handlers.length > 0) {
            handlers.forEach(h => h(newEvent));
          }
        } catch (error) {
          console.error('Erro ao processar evento financial_update para financial_updated:', error);
        }
      }
    });
    
    // Limpar conexões quando o componente desmontar
    return () => {
      mounted = false;
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
      }
      unregisterNotifHandler();
      unregisterFinancialHandler();
      unregisterCalendarHandler();
      unregisterOldFinancialHandler();
      closeConnections();
    };
  }, [user, toast, isConnected]);
  
  // Reconectar Socket.IO quando o usuário mudar
  useEffect(() => {
    let mounted = true;
    
    if (user) {
      const token = localStorage.getItem('access_token');
      if (token && (!socketIo || !socketIoConnected)) {
        initSocketIO(user.id, token)
          .then(socket => {
            if (mounted) {
              setSocketIo(socket);
              setSocketIoConnected(true);
            }
          })
          .catch(error => {
            console.error('Erro ao reconectar Socket.IO:', error);
          });
      }
    }
    
    return () => {
      mounted = false;
    };
  }, [user, socketIo, socketIoConnected]);

  const value: SocketContextType = {
    isConnected,
    socketIoConnected,
    webSocket,
    socketIo,
    socket: webSocket, // Adicionando aliás para webSocket
    sendMessage: (data: any) => sendWebSocketMessage(data),
    emitEvent: (event: string, data: any) => emitSocketEvent(event, data),
    
    // Métodos para salas de tarefas
    joinTask: (taskId: number) => joinTaskRoom(taskId),
    leaveTask: (taskId: number) => leaveTaskRoom(taskId),
    addComment: (taskId: number, comment: string) => {
      if (user) {
        addTaskComment(taskId, user.id, comment);
      } else {
        console.warn('Usuário não autenticado para adicionar comentário');
      }
    },
    registerCommentListener: (callback: (comment: any) => void) => onNewComment(callback),
    
    // Métodos para salas de projetos
    joinProject: (projectId: number) => joinProjectRoom(projectId),
    leaveProject: (projectId: number) => leaveProjectRoom(projectId),
    addProjectComment: (projectId: number, comment: string) => {
      if (user) {
        addProjectComment(projectId, user.id, comment);
      } else {
        console.warn('Usuário não autenticado para adicionar comentário');
      }
    },
    addProjectCommentReply: (projectId: number, comment: string, parentId: number) => {
      if (user && socketIo) {
        if (socketIo.connected) {
          socketIo.emit('project-comment-reply', {
            projectId,
            userId: user.id,
            comment,
            parentId
          });
        } else {
          console.warn('Socket.IO não está conectado para adicionar resposta a comentário');
        }
      } else {
        console.warn('Usuário não autenticado ou Socket.IO não inicializado para adicionar resposta a comentário');
      }
    },
    registerProjectCommentListener: (callback: (comment: any) => void) => onNewProjectComment(callback),
    registerUpdatedProjectCommentListener: (callback: (comment: any) => void) => onUpdatedProjectComment(callback),
    registerDeletedProjectCommentListener: (callback: (data: { id: number }) => void) => onDeletedProjectComment(callback),
    
    // Métodos para reações em comentários de projetos
    registerProjectCommentReactionListener: (callback: (data: any) => void) => onNewProjectCommentReaction(callback),
    registerDeletedProjectCommentReactionListener: (callback: (data: { id: number, comment_id: number }) => void) => 
      onDeletedProjectCommentReaction(callback),
    
    // Notificações
    sendNotification: (targetUserId: number, notification: {
      title: string;
      message: string;
      type?: 'info' | 'success' | 'warning' | 'error';
      link?: string;
    }) => notifyUser(targetUserId, notification),
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket deve ser usado dentro de um SocketProvider');
  }
  return context;
}