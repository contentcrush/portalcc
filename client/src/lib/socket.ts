import { Socket, io } from 'socket.io-client';

// Função para determinar a URL base para conexão
function getWebSocketUrl() {
  // Determinar protocolo com base na URL atual
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const host = window.location.host;
  
  // URL para WebSocket nativo
  return `${protocol}//${host}/ws`;
}

// Exportar a função ao invés da URL estática
export const getWsUrl = getWebSocketUrl;

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
  financial_updated: [],
  financial_update: [], // Suporte para o formato antigo
  financial: [],        // Suporte para correspondência parcial
  calendar_updated: [],
  calendar_update: [],  // Suporte para o formato antigo
  calendar: [],         // Suporte para correspondência parcial
};

// Função auxiliar para acessar os handlers de mensagem a partir de outros arquivos
// sem expor diretamente a variável messageHandlers
export function getMessageHandlersForType(type: string): MessageHandler[] {
  return messageHandlers[type] || [];
}

/**
 * Inicializa a conexão WebSocket com tratamento de erro aprimorado
 */
export function initWebSocket(): Promise<WebSocket> {
  return new Promise((resolve, reject) => {
    // Se já estiver conectado, apenas retorne a conexão existente
    if (ws instanceof WebSocket && ws.readyState === WebSocket.OPEN) {
      console.log('WebSocket já está conectado');
      resolve(ws);
      return;
    }

    // Se estiver conectando, aguarde a conexão
    if (ws instanceof WebSocket && ws.readyState === WebSocket.CONNECTING) {
      console.log('WebSocket está conectando...');
      const originalOnOpen = ws.onopen;
      ws.onopen = (event) => {
        // Armazenar referência local para evitar problemas com nulo
        const currentWs = ws;
        
        if (originalOnOpen && currentWs) {
          try {
            // TypeScript não consegue inferir que ws não é nulo dentro do callback
            // Então usamos a variável local que sabemos que é do tipo WebSocket
            originalOnOpen.call(currentWs, event);
          } catch (err) {
            console.error('Erro ao chamar handler original de onopen:', err);
          }
        }
        console.log('WebSocket conexão completada');
        if (ws) {
          resolve(ws);
        } else {
          reject(new Error('WebSocket se tornou nulo durante a conexão'));
        }
      };
      return;
    }

    // Fechar conexão existente de forma segura se houver
    if (ws) {
      try {
        console.log('Fechando conexão WebSocket existente...');
        ws.onclose = null; // Remover handler de close para evitar reconexão automática
        ws.onerror = null; // Remover handler de erro
        ws.close();
      } catch (err) {
        console.warn('Erro ao fechar conexão WebSocket existente:', err);
      } finally {
        ws = null;
      }
    }

    try {
      // Obter token de autenticação para WebSocket se disponível
      const token = localStorage.getItem('access_token');
      
      // Obter URL atual e adicionar token como parâmetro de consulta se disponível
      const wsUrl = getWsUrl();
      let wsUrlWithAuth = wsUrl;
      if (token) {
        wsUrlWithAuth = `${wsUrl}?token=${encodeURIComponent(token)}`;
        console.log('Iniciando nova conexão WebSocket com token de autenticação');
      } else {
        console.log('Iniciando nova conexão WebSocket sem autenticação:', wsUrl);
      }
      
      // Criar nova conexão
      ws = new WebSocket(wsUrlWithAuth);

      // Defina um timeout para a conexão
      const connectionTimeout = setTimeout(() => {
        if (ws && ws.readyState !== WebSocket.OPEN) {
          console.warn('Timeout ao conectar WebSocket');
          if (ws.readyState !== WebSocket.CLOSED && ws.readyState !== WebSocket.CLOSING) {
            try {
              ws.close();
            } catch (err) {
              console.warn('Erro ao fechar conexão WebSocket após timeout:', err);
            }
          }
          ws = null;
          reject(new Error('Timeout de conexão WebSocket'));
        }
      }, 10000); // 10 segundos de timeout

      // Tratamento de abertura de conexão
      ws.onopen = () => {
        console.log('Conexão WebSocket estabelecida com sucesso');
        clearTimeout(connectionTimeout);
        
        // Enviar ping para manter a conexão viva
        const keepAliveInterval = setInterval(() => {
          if (ws && ws.readyState === WebSocket.OPEN) {
            try {
              ws.send(JSON.stringify({ type: 'ping', timestamp: Date.now() }));
            } catch (error) {
              console.warn('Erro ao enviar ping WebSocket:', error);
              clearInterval(keepAliveInterval);
            }
          } else {
            clearInterval(keepAliveInterval);
          }
        }, 30000); // A cada 30 segundos
        
        resolve(ws!);
      };

      // Processamento de mensagens recebidas
      ws.onmessage = (event) => {
        try {
          // Verificar mensagem de pong (resposta ao nosso ping)
          if (event.data === '{"type":"pong"}') {
            return; // Ignorar silenciosamente mensagens de pong
          }
          
          // Verifica se o evento tem dados e se não é uma string vazia
          if (!event.data || (typeof event.data === 'string' && event.data.trim() === '')) {
            console.warn('Mensagem WebSocket recebida vazia, ignorando');
            return;
          }

          const data = JSON.parse(event.data);
          
          // Verificar se o objeto data tem propriedades
          if (!data || typeof data !== 'object' || Object.keys(data).length === 0) {
            console.warn('Mensagem WebSocket recebida como objeto vazio, ignorando');
            return;
          }
          
          console.log('Mensagem WebSocket recebida:', data);

          // Verificar se é uma mensagem de ping do servidor
          if (data.type === 'ping') {
            // Responder com pong
            if (ws && ws.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify({ type: 'pong' }));
            }
            return;
          }

          // Determinar o tipo de mensagem
          let messageType = null;
          
          // Ordem de verificação: type, event, action
          if (data.type && typeof data.type === 'string') {
            messageType = data.type;
          } else if (data.event && typeof data.event === 'string') {
            messageType = data.event;
          } else if (data.action && typeof data.action === 'string') {
            messageType = data.action;
          }
          
          // Se não encontramos um tipo válido, não prosseguir
          if (!messageType) {
            console.warn('Mensagem WebSocket sem tipo definido:', data);
            return;
          }
          
          // Despachar para handlers apropriados
          if (messageHandlers[messageType]) {
            console.log(`Processando mensagem do tipo: ${messageType}`);
            messageHandlers[messageType].forEach(handler => handler(data));
          } else {
            // Tentar correspondência parcial para compatibilidade
            let matchFound = false;
            Object.keys(messageHandlers).forEach(handlerType => {
              if (messageType.includes(handlerType)) {
                console.log(`Correspondência parcial: '${messageType}' corresponde a '${handlerType}'`);
                messageHandlers[handlerType].forEach(handler => handler(data));
                matchFound = true;
              }
            });
            
            if (!matchFound) {
              console.log(`Nenhum handler encontrado para mensagem do tipo: ${messageType}`);
            }
          }
        } catch (error) {
          console.error('Erro ao processar mensagem WebSocket:', error);
        }
      };

      // Tratamento de erro da conexão
      ws.onerror = (error) => {
        console.error('Erro na conexão WebSocket:', error);
        clearTimeout(connectionTimeout);
        // Não rejeitar a promessa aqui, deixar o evento onclose lidar com isso
      };

      // Tratamento de fechamento da conexão
      ws.onclose = (event) => {
        console.log(`Conexão WebSocket fechada: ${event.code} - ${event.reason || ''}`);
        
        // Limpar qualquer timeout pendente
        clearTimeout(connectionTimeout);
        
        // Se o código for 1000 (fechamento normal) ou 1001 (indo embora), não reconectar
        if (event.code === 1000 || event.code === 1001) {
          console.log('Conexão WebSocket fechada normalmente, não reconectando');
          ws = null;
          reject(new Error(`Conexão WebSocket fechada: ${event.code}`));
          return;
        }
        
        // Para todos os outros códigos, tentar reconexão com backoff exponencial
        const maxReconnectDelay = 30000; // 30 segundos máximo
        const baseDelay = 2000; // 2 segundos base
        
        // Aumentar o delay exponencialmente até o máximo
        // Armazenar o número de tentativas em uma variável do módulo
        const reconnectAttempt = (ws as any)._reconnectAttempt || 0;
        const reconnectDelay = Math.min(
          baseDelay * Math.pow(1.5, reconnectAttempt),
          maxReconnectDelay
        );
        
        console.log(`Tentativa de reconexão ${reconnectAttempt + 1} em ${Math.round(reconnectDelay/1000)}s`);
        
        setTimeout(() => {
          // Só reconectar se a página estiver visível
          if (document.visibilityState !== 'hidden') {
            console.log(`Tentando reconectar WebSocket após ${Math.round(reconnectDelay/1000)}s...`);
            try {
              // Obter URL atual e atualizar contador de tentativas para a próxima reconexão
              const currentWsUrl = getWsUrl();
              const newWs = new WebSocket(currentWsUrl);
              (newWs as any)._reconnectAttempt = reconnectAttempt + 1;
              ws = newWs;
              
              // Configurar evento de abertura
              ws.onopen = () => {
                console.log('WebSocket reconectado com sucesso');
                (ws as any)._reconnectAttempt = 0; // Resetar contador ao conectar com sucesso
              };
              
              // Configurar eventos de erro e fechamento
              configureWebSocketEvents(ws);
            } catch (err) {
              console.error('Falha ao reconectar WebSocket:', err);
            }
          } else {
            console.log('Página em segundo plano, adiando reconexão do WebSocket');
            // Registrar um handler para reconectar quando a página voltar a ser visível
            const onVisibilityChange = () => {
              if (document.visibilityState === 'visible') {
                console.log('Página visível novamente, reconectando WebSocket...');
                document.removeEventListener('visibilitychange', onVisibilityChange);
                initWebSocket()
                  .then(() => console.log('WebSocket reconectado após página ficar visível'))
                  .catch(err => console.error('Falha ao reconectar WebSocket após visibilidade:', err));
              }
            };
            document.addEventListener('visibilitychange', onVisibilityChange);
          }
        }, reconnectDelay);
        
        reject(new Error(`Conexão WebSocket fechada: ${event.code}`));
      };

    } catch (error) {
      console.error('Falha ao inicializar WebSocket:', error);
      reject(error);
    }
  });
}

/**
 * Configura os eventos padrão do WebSocket (mensagem, erro, fechamento)
 */
function configureWebSocketEvents(socket: WebSocket): void {
  if (!socket) return;
  
  // Redefina apenas se não tiver manipuladores existentes
  if (!socket.onmessage) {
    socket.onmessage = (event) => {
      try {
        if (!event.data) return;
        const data = JSON.parse(event.data);
        console.log('Mensagem WebSocket recebida:', data);
        
        // Processar por tipo
        let messageType = data.type || data.event || data.action;
        if (!messageType) return;
        
        // Despachar para handlers
        if (messageHandlers[messageType]) {
          messageHandlers[messageType].forEach(handler => handler(data));
        }
      } catch (error) {
        console.error('Erro ao processar mensagem WebSocket:', error);
      }
    };
  }
  
  // Sempre reconfigure os manipuladores de erro e fechamento
  socket.onerror = (error) => {
    console.error('Erro na conexão WebSocket:', error);
  };
  
  if (!socket.onclose) {
    socket.onclose = (event) => {
      console.log(`Conexão WebSocket fechada: ${event.code} - ${event.reason || ''}`);
      
      // Iniciar reconexão automática em 3 segundos
      setTimeout(() => {
        if (document.visibilityState !== 'hidden') {
          console.log('Tentando reconectar WebSocket após 3s...');
          initWebSocket()
            .then(() => console.log('WebSocket reconectado com sucesso'))
            .catch(err => console.error('Falha ao reconectar WebSocket:', err));
        }
      }, 3000);
    };
  }
}

/**
 * Registra um handler para um tipo específico de mensagem e
 * garante que a conexão WebSocket esteja ativa
 */
export function onWebSocketMessage(
  type: string,
  handler: MessageHandler
): () => void {
  if (!messageHandlers[type]) {
    messageHandlers[type] = [];
  }

  messageHandlers[type].push(handler);

  // Garantir que a conexão WebSocket esteja ativa
  if (!ws || (ws.readyState !== WebSocket.OPEN && ws.readyState !== WebSocket.CONNECTING)) {
    console.log(`Inicializando WebSocket para manipular mensagens do tipo: ${type}`);
    
    // Inicializar a conexão WebSocket
    initWebSocket()
      .then(() => console.log(`WebSocket inicializado com sucesso para mensagens do tipo: ${type}`))
      .catch(error => console.error(`Erro ao inicializar WebSocket para mensagens do tipo: ${type}`, error));
  }

  // Retorna uma função para desregistrar este handler
  return () => {
    if (messageHandlers[type]) {
      messageHandlers[type] = messageHandlers[type].filter(h => h !== handler);
      console.log(`Handler removido para mensagens do tipo: ${type}. Restantes: ${messageHandlers[type].length}`);
    }
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

      // Obter token de autenticação do localStorage
      const storedToken = localStorage.getItem('access_token') || token;
      
      // Configurar parâmetros de conexão
      const connectionOptions: any = {
        path: '/socket.io',
        autoConnect: true,
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
      };
      
      // Adicionar token como parâmetro de consulta se disponível
      if (storedToken) {
        console.log('Iniciando Socket.IO com token de autenticação');
        connectionOptions.query = { token: storedToken };
      } else {
        console.log('Iniciando Socket.IO sem autenticação');
      }
      
      // Iniciar nova conexão
      socket = io(connectionOptions);

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
 * Entrar em uma sala de projeto
 */
export function joinProjectRoom(projectId: number): void {
  if (!socket || !socket.connected) {
    console.warn('Socket.IO não está conectado');
    return;
  }

  socket.emit('join-project', projectId);
  console.log(`Entrou na sala do projeto ${projectId}`);
}

/**
 * Sair de uma sala de projeto
 */
export function leaveProjectRoom(projectId: number): void {
  if (!socket || !socket.connected) {
    console.warn('Socket.IO não está conectado');
    return;
  }

  socket.emit('leave-project', projectId);
  console.log(`Saiu da sala do projeto ${projectId}`);
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
 * Adicionar um comentário em tempo real ao projeto
 */
export function addProjectComment(projectId: number, userId: number, comment: string): void {
  if (!socket || !socket.connected) {
    console.warn('Socket.IO não está conectado');
    return;
  }

  socket.emit('project-comment', { projectId, userId, comment });
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
    if (socket) {
      socket.off('new-comment', callback);
    }
  };
}

/**
 * Registra um listener para novos comentários em projetos
 */
export function onNewProjectComment(callback: (comment: any) => void): () => void {
  if (!socket) {
    console.warn('Socket.IO não está inicializado');
    return () => {};
  }

  socket.on('new-project-comment', callback);
  
  // Retorna função para remover o listener
  return () => {
    if (socket) {
      socket.off('new-project-comment', callback);
    }
  };
}

/**
 * Registra um listener para comentários de projeto atualizados
 */
export function onUpdatedProjectComment(callback: (comment: any) => void): () => void {
  if (!socket) {
    console.warn('Socket.IO não está inicializado');
    return () => {};
  }

  socket.on('updated-project-comment', callback);
  
  // Retorna função para remover o listener
  return () => {
    if (socket) {
      socket.off('updated-project-comment', callback);
    }
  };
}

/**
 * Registra um listener para comentários de projeto excluídos
 */
export function onDeletedProjectComment(callback: (data: { id: number }) => void): () => void {
  if (!socket) {
    console.warn('Socket.IO não está inicializado');
    return () => {};
  }

  socket.on('deleted-project-comment', callback);
  
  // Retorna função para remover o listener
  return () => {
    if (socket) {
      socket.off('deleted-project-comment', callback);
    }
  };
}

/**
 * Registra um listener para novas reações em comentários de projeto 
 */
export function onNewProjectCommentReaction(callback: (data: any) => void): () => void {
  if (!socket) {
    console.warn('Socket.IO não está inicializado');
    return () => {};
  }

  socket.on('new-project-comment-reaction', callback);
  
  // Retorna função para remover o listener
  return () => {
    if (socket) {
      socket.off('new-project-comment-reaction', callback);
    }
  };
}

/**
 * Registra um listener para reações excluídas em comentários de projeto
 */
export function onDeletedProjectCommentReaction(callback: (data: { id: number, comment_id: number }) => void): () => void {
  if (!socket) {
    console.warn('Socket.IO não está inicializado');
    return () => {};
  }

  socket.on('deleted-project-comment-reaction', callback);
  
  // Retorna função para remover o listener
  return () => {
    if (socket) {
      socket.off('deleted-project-comment-reaction', callback);
    }
  };
}

/**
 * Adicionar uma resposta a um comentário de projeto
 */
export function addProjectCommentReply(projectId: number, userId: number, comment: string, parentId: number): boolean {
  if (!socket || !socket.connected) {
    console.warn('Socket.IO não está conectado');
    return false;
  }

  try {
    socket.emit('project-comment-reply', {
      projectId,
      userId,
      comment,
      parentId
    });
    return true;
  } catch (error) {
    console.error('Erro ao enviar resposta a comentário de projeto:', error);
    return false;
  }
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