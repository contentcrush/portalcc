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
  addTaskComment,
  onNewComment,
  notifyUser,
  closeConnections
} from '@/lib/socket';

interface SocketContextType {
  isConnected: boolean;
  socketIoConnected: boolean;
  webSocket: WebSocket | null;
  socketIo: Socket | null;
  sendMessage: (data: any) => boolean;
  emitEvent: (event: string, data: any) => boolean;
  joinTask: (taskId: number) => void;
  leaveTask: (taskId: number) => void;
  addComment: (taskId: number, comment: string) => void;
  registerCommentListener: (callback: (comment: any) => void) => () => void;
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
    
    // Iniciar WebSocket
    initWebSocket()
      .then(ws => {
        if (mounted) {
          setWebSocket(ws);
          setIsConnected(true);
          console.log('WebSocket conectado com sucesso via SocketContext');
        }
      })
      .catch(error => {
        console.error('Erro ao conectar WebSocket via SocketContext:', error);
      });
      
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
    
    // Limpar conexões quando o componente desmontar
    return () => {
      mounted = false;
      unregisterNotifHandler();
      closeConnections();
    };
  }, [user, toast]);
  
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
    sendMessage: (data: any) => sendWebSocketMessage(data),
    emitEvent: (event: string, data: any) => emitSocketEvent(event, data),
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