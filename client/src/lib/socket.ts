import { Socket, io } from 'socket.io-client';

// Determinar a URL base para conexão
const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
const host = window.location.host;

// URL para WebSocket nativo
export const wsUrl = `${protocol}//${host}/ws`;

// Referência ao socket nativo
let ws: WebSocket | null = null;

// Referência ao socket.io
let socket: Socket | null = null;

// Lista de handlers para mensagens
type MessageHandler = (data: any) => void;
const messageHandlers: { [key: string]: MessageHandler[] } = {
  chat: [],
  notification: [],
  system: [],
};

/**
 * Inicializa a conexão WebSocket
 */
export function initWebSocket(): Promise<WebSocket> {
  return new Promise((resolve, reject) => {
    if (ws instanceof WebSocket && ws.readyState === WebSocket.OPEN) {
      console.log('WebSocket já está conectado');
      resolve(ws);
      return;
    }

    // Fechar conexão existente se houver
    if (ws) {
      ws.close();
    }

    try {
      console.log('Iniciando conexão WebSocket:', wsUrl);
      ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        console.log('Conexão WebSocket estabelecida');
        resolve(ws!);
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('Mensagem WebSocket recebida:', data);

          // Despachar para os handlers apropriados
          if (data.type && messageHandlers[data.type]) {
            messageHandlers[data.type].forEach(handler => handler(data));
          }
        } catch (error) {
          console.error('Erro ao processar mensagem WebSocket:', error);
        }
      };

      ws.onerror = (error) => {
        console.error('Erro na conexão WebSocket:', error);
        reject(error);
      };

      ws.onclose = () => {
        console.log('Conexão WebSocket fechada');
        
        // Tentar reconectar após 3 segundos
        setTimeout(() => {
          if (document.visibilityState !== 'hidden') {
            console.log('Tentando reconectar WebSocket...');
            initWebSocket()
              .then(() => console.log('WebSocket reconectado com sucesso'))
              .catch(err => console.error('Falha ao reconectar WebSocket:', err));
          }
        }, 3000);
      };

    } catch (error) {
      console.error('Falha ao inicializar WebSocket:', error);
      reject(error);
    }
  });
}

/**
 * Registra um handler para um tipo específico de mensagem
 */
export function onWebSocketMessage(
  type: string,
  handler: MessageHandler
): () => void {
  if (!messageHandlers[type]) {
    messageHandlers[type] = [];
  }

  messageHandlers[type].push(handler);

  // Retorna uma função para desregistrar este handler
  return () => {
    messageHandlers[type] = messageHandlers[type].filter(h => h !== handler);
  };
}

/**
 * Envia uma mensagem pelo WebSocket
 */
export function sendWebSocketMessage(data: any): boolean {
  if (!ws || ws.readyState !== WebSocket.OPEN) {
    console.warn('WebSocket não está conectado');
    return false;
  }

  try {
    ws.send(JSON.stringify(data));
    return true;
  } catch (error) {
    console.error('Erro ao enviar mensagem WebSocket:', error);
    return false;
  }
}

/**
 * Inicializa a conexão Socket.IO
 */
export function initSocketIO(userId?: number, token?: string): Promise<Socket> {
  return new Promise((resolve, reject) => {
    try {
      if (socket && socket.connected) {
        console.log('Socket.IO já está conectado');
        resolve(socket);
        return;
      }

      // Desconectar socket existente se houver
      if (socket) {
        socket.disconnect();
      }

      // Iniciar nova conexão
      socket = io({
        path: '/socket.io',
        autoConnect: true,
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
      });

      socket.on('connect', () => {
        console.log('Socket.IO conectado:', socket!.id);

        // Se tem userId e token, autenticar
        if (userId && token) {
          socket!.emit('authenticate', { userId, token });
        }

        resolve(socket!);
      });

      socket.on('connect_error', (error) => {
        console.error('Erro de conexão Socket.IO:', error);
      });

      socket.on('disconnect', (reason) => {
        console.log('Socket.IO desconectado:', reason);
      });

      // Setup de eventos padrão
      socket.on('error', (error) => {
        console.error('Erro no Socket.IO:', error);
      });

      socket.on('authenticated', (response) => {
        if (response.success) {
          console.log('Autenticado com sucesso no Socket.IO:', response);
        } else {
          console.error('Falha na autenticação Socket.IO:', response.error);
        }
      });

      socket.on('notification', (notif) => {
        console.log('Notificação recebida:', notif);
        // Aqui você pode integrar com o sistema de notificações do frontend
        // Por exemplo, com o toast ou um componente de notificação personalizado
      });

    } catch (error) {
      console.error('Erro ao inicializar Socket.IO:', error);
      reject(error);
    }
  });
}

/**
 * Emite um evento para o servidor Socket.IO
 */
export function emitSocketEvent(event: string, data: any): boolean {
  if (!socket || !socket.connected) {
    console.warn('Socket.IO não está conectado');
    return false;
  }

  try {
    socket.emit(event, data);
    return true;
  } catch (error) {
    console.error(`Erro ao emitir evento '${event}':`, error);
    return false;
  }
}

/**
 * Entrar em uma sala de tarefa
 */
export function joinTaskRoom(taskId: number): void {
  if (!socket || !socket.connected) {
    console.warn('Socket.IO não está conectado');
    return;
  }

  socket.emit('join-task', taskId);
  console.log(`Entrou na sala da tarefa ${taskId}`);
}

/**
 * Sair de uma sala de tarefa
 */
export function leaveTaskRoom(taskId: number): void {
  if (!socket || !socket.connected) {
    console.warn('Socket.IO não está conectado');
    return;
  }

  socket.emit('leave-task', taskId);
  console.log(`Saiu da sala da tarefa ${taskId}`);
}

/**
 * Adicionar um comentário em tempo real à tarefa
 */
export function addTaskComment(taskId: number, userId: number, comment: string): void {
  if (!socket || !socket.connected) {
    console.warn('Socket.IO não está conectado');
    return;
  }

  socket.emit('task-comment', { taskId, userId, comment });
}

/**
 * Registra um listener para novos comentários
 */
export function onNewComment(callback: (comment: any) => void): () => void {
  if (!socket) {
    console.warn('Socket.IO não está inicializado');
    return () => {};
  }

  socket.on('new-comment', callback);
  
  // Retorna função para remover o listener
  return () => {
    socket.off('new-comment', callback);
  };
}

/**
 * Enviar notificação para um usuário específico
 */
export function notifyUser(targetUserId: number, notification: { 
  title: string; 
  message: string; 
  type?: 'info' | 'success' | 'warning' | 'error';
  link?: string;
}): void {
  if (!socket || !socket.connected) {
    console.warn('Socket.IO não está conectado');
    return;
  }

  socket.emit('notify-user', { 
    targetUserId, 
    notification
  });
}

/**
 * Fecha todas as conexões
 */
export function closeConnections(): void {
  if (ws) {
    ws.close();
    ws = null;
  }

  if (socket) {
    socket.disconnect();
    socket = null;
  }
}