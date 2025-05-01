import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { MessageSquare, Send, X, MinusCircle, Maximize2, ChevronUp, ChevronDown } from 'lucide-react';
import { useSocket } from '@/contexts/SocketContext';
import { useAuth } from '@/hooks/use-auth';
import { cn } from '@/lib/utils';

interface Message {
  id: string;
  userId: number;
  userName: string;
  message: string;
  timestamp: string;
  type: 'chat' | 'system' | 'notification';
}

export function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  
  const { user } = useAuth();
  const { sendMessage, isConnected } = useSocket();

  // Adicionar mensagem de sistema no início
  useEffect(() => {
    if (isConnected) {
      setMessages([
        {
          id: 'system-welcome',
          userId: 0,
          userName: 'Sistema',
          message: 'Conectado ao chat. Você pode conversar com outros usuários conectados.',
          timestamp: new Date().toISOString(),
          type: 'system'
        }
      ]);
    }
  }, [isConnected]);

  // Registrar handler para mensagens de chat
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data);
        
        if (data.type === 'chat' || data.type === 'system' || data.type === 'notification') {
          const newMessage: Message = {
            id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            userId: data.userId || 0,
            userName: data.userName || 'Sistema',
            message: data.message,
            timestamp: data.timestamp || new Date().toISOString(),
            type: data.type
          };
          
          setMessages(prev => [...prev, newMessage]);
          
          // Incrementar contador de não lidos se o chat estiver minimizado
          if (!isOpen || isMinimized) {
            setUnreadCount(prev => prev + 1);
          }
        }
      } catch (error) {
        console.error('Erro ao processar mensagem:', error);
      }
    };

    // Adicionar evento para WebSocket
    window.addEventListener('message', handleMessage);
    
    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, [isOpen, isMinimized]);

  // Scroll para a última mensagem quando chegar uma nova
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Resetar contador de não lidos quando abrir o chat
  useEffect(() => {
    if (isOpen && !isMinimized) {
      setUnreadCount(0);
    }
  }, [isOpen, isMinimized]);

  // Focar no input quando abrir o chat
  useEffect(() => {
    if (isOpen && !isMinimized) {
      inputRef.current?.focus();
    }
  }, [isOpen, isMinimized]);

  const handleToggleOpen = () => {
    setIsOpen(!isOpen);
    if (!isOpen) {
      setIsMinimized(false);
    }
  };

  const handleToggleMinimize = () => {
    setIsMinimized(!isMinimized);
    if (!isMinimized) {
      inputRef.current?.blur();
    } else {
      inputRef.current?.focus();
      setUnreadCount(0);
    }
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!message.trim() || !user) return;
    
    const messageData = {
      type: 'chat',
      userId: user.id,
      userName: user.name,
      message: message.trim(),
      timestamp: new Date().toISOString()
    };
    
    // Enviar para o servidor via WebSocket
    if (sendMessage(messageData)) {
      // Adicionar à lista local (o eco virá do servidor)
      const newMessage: Message = {
        id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        userId: user.id,
        userName: user.name,
        message: message.trim(),
        timestamp: new Date().toISOString(),
        type: 'chat'
      };
      
      setMessages(prev => [...prev, newMessage]);
      setMessage('');
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    } else {
      // Falha ao enviar - mostrar mensagem de erro
      const errorMessage: Message = {
        id: `error-${Date.now()}`,
        userId: 0,
        userName: 'Sistema',
        message: 'Falha ao enviar mensagem. Tente novamente.',
        timestamp: new Date().toISOString(),
        type: 'system'
      };
      
      setMessages(prev => [...prev, errorMessage]);
    }
  };

  if (!isOpen) {
    return (
      <Button
        onClick={handleToggleOpen}
        className="fixed bottom-4 right-4 h-12 w-12 rounded-full p-0 shadow-lg"
        size="icon"
        variant="default"
      >
        <MessageSquare className="h-6 w-6" />
        {unreadCount > 0 && (
          <Badge
            variant="destructive"
            className="absolute -right-2 -top-2 h-6 w-6 rounded-full p-0 flex items-center justify-center"
          >
            {unreadCount}
          </Badge>
        )}
      </Button>
    );
  }

  return (
    <Card className={cn(
      "fixed bottom-4 right-4 shadow-lg transition-all duration-200",
      isMinimized ? "w-64 h-12" : "w-80 h-96 md:w-96"
    )}>
      <CardHeader className="px-4 py-2 flex flex-row items-center justify-between space-y-0 border-b">
        <CardTitle className="text-sm font-medium flex items-center">
          <MessageSquare className="h-4 w-4 mr-2" />
          Chat em Tempo Real
          {unreadCount > 0 && isMinimized && (
            <Badge
              variant="destructive"
              className="ml-2 h-5 w-5 rounded-full p-0 flex items-center justify-center"
            >
              {unreadCount}
            </Badge>
          )}
        </CardTitle>
        <div className="flex items-center space-x-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={handleToggleMinimize}
          >
            {isMinimized ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={handleToggleOpen}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      
      {!isMinimized && (
        <>
          <CardContent className="px-4 py-2 h-[calc(100%-96px)]">
            <ScrollArea className="h-full pr-4">
              <div className="space-y-4">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={cn(
                      "flex items-start space-x-2",
                      msg.userId === user?.id ? "justify-end" : "justify-start",
                      msg.type === 'system' && "justify-center"
                    )}
                  >
                    {msg.type === 'system' ? (
                      <div className="bg-muted text-muted-foreground text-xs p-2 rounded-md max-w-[80%] text-center">
                        {msg.message}
                      </div>
                    ) : (
                      <>
                        {msg.userId !== user?.id && (
                          <Avatar className="h-6 w-6">
                            <AvatarFallback className="text-xs">
                              {msg.userName.substring(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                        )}
                        <div
                          className={cn(
                            "rounded-lg p-2 text-sm max-w-[70%]",
                            msg.userId === user?.id
                              ? "bg-primary text-primary-foreground"
                              : "bg-accent"
                          )}
                        >
                          {msg.userId !== user?.id && (
                            <p className="text-xs font-medium mb-1">{msg.userName}</p>
                          )}
                          <p>{msg.message}</p>
                          <p className="text-xs opacity-70 text-right mt-1">
                            {new Date(msg.timestamp).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </p>
                        </div>
                      </>
                    )}
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>
          </CardContent>
          
          <CardFooter className="p-2 border-t">
            <form onSubmit={handleSendMessage} className="flex w-full space-x-2">
              <Input
                ref={inputRef}
                type="text"
                placeholder={isConnected ? "Digite sua mensagem..." : "Conectando..."}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="flex-1"
                disabled={!isConnected || !user}
              />
              <Button
                type="submit"
                size="icon"
                disabled={!isConnected || !message.trim() || !user}
              >
                <Send className="h-4 w-4" />
              </Button>
            </form>
          </CardFooter>
        </>
      )}
    </Card>
  );
}