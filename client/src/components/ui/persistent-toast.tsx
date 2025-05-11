import React, { useState, useEffect } from 'react';
import { toast, Toast, ToastClose, ToastDescription, ToastProvider, ToastTitle, ToastViewport } from '@/components/ui/toast';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { cn } from '@/lib/utils';
import { CheckCircle2, AlertTriangle, AlertCircle, XCircle, Bell } from 'lucide-react';
import { cva } from 'class-variance-authority';
import { AnimatePresence, motion } from 'framer-motion';

// Tipos para a notificação persistente
export type PersistentNotification = {
  id: string;
  title: string;
  description?: React.ReactNode;
  type: 'success' | 'warning' | 'error' | 'info';
  action?: React.ReactNode;
  duration?: number | null; // null para notificações que não expiram
  onClose?: () => void;
  timestamp: Date;
};

// Context para gerenciar as notificações persistentes
type NotificationsContextType = {
  notifications: PersistentNotification[];
  addNotification: (notification: Omit<PersistentNotification, 'id' | 'timestamp'>) => string;
  removeNotification: (id: string) => void;
  clearNotifications: () => void;
};

const defaultContext: NotificationsContextType = {
  notifications: [],
  addNotification: () => '',
  removeNotification: () => {},
  clearNotifications: () => {},
};

export const NotificationsContext = React.createContext<NotificationsContextType>(defaultContext);

// Estilização para os diferentes tipos de notificação
const notificationVariants = cva('', {
  variants: {
    type: {
      success: 'bg-green-50 text-green-800 border-green-200',
      warning: 'bg-amber-50 text-amber-800 border-amber-200',
      error: 'bg-red-50 text-red-800 border-red-200',
      info: 'bg-blue-50 text-blue-800 border-blue-200',
    },
  },
  defaultVariants: {
    type: 'info',
  },
});

const iconMap = {
  success: CheckCircle2,
  warning: AlertTriangle,
  error: XCircle,
  info: AlertCircle,
};

// Hook personalizado para usar o contexto de notificações
export const useNotifications = () => {
  const context = React.useContext(NotificationsContext);
  if (!context) {
    throw new Error('useNotifications deve ser usado dentro de um NotificationsProvider');
  }
  return context;
};

// Componente para exibir uma única notificação persistente
export const PersistentToast = ({
  notification,
  onClose,
}: {
  notification: PersistentNotification;
  onClose: () => void;
}) => {
  // Determinar o ícone com base no tipo
  const Icon = iconMap[notification.type];

  // Formatar a hora da notificação
  const formattedTime = notification.timestamp.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: 100 }}
      transition={{ duration: 0.3 }}
      className="mb-2 last:mb-0"
    >
      <Alert 
        className={cn(
          "relative border shadow-sm",
          notificationVariants({ type: notification.type })
        )}
      >
        <div className="flex">
          <Icon className="h-5 w-5 mr-2 flex-shrink-0" />
          <div className="flex-1">
            <AlertTitle className="mb-1 font-medium">{notification.title}</AlertTitle>
            {notification.description && (
              <AlertDescription>{notification.description}</AlertDescription>
            )}
            
            {notification.action && (
              <div className="mt-2">{notification.action}</div>
            )}
            
            <div className="text-xs opacity-70 mt-1">{formattedTime}</div>
          </div>
        </div>
        
        <ToastClose 
          className="absolute top-2 right-2 rounded-md p-1 hover:bg-gray-200/50" 
          onClick={onClose}
        />
      </Alert>
    </motion.div>
  );
};

// Componente para exibir a lista de notificações persistentes
export const PersistentToastList = () => {
  const { notifications, removeNotification } = useNotifications();

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-sm w-full flex flex-col gap-2">
      <AnimatePresence>
        {notifications.map((notification) => (
          <PersistentToast
            key={notification.id}
            notification={notification}
            onClose={() => {
              removeNotification(notification.id);
              notification.onClose?.();
            }}
          />
        ))}
      </AnimatePresence>
    </div>
  );
};

// Provider para o sistema de notificações
export const NotificationsProvider = ({ children }: { children: React.ReactNode }) => {
  const [notifications, setNotifications] = useState<PersistentNotification[]>([]);

  // Adicionar uma nova notificação
  const addNotification = (
    notification: Omit<PersistentNotification, 'id' | 'timestamp'>
  ): string => {
    const id = Math.random().toString(36).substring(2, 9);
    const newNotification: PersistentNotification = {
      ...notification,
      id,
      timestamp: new Date(),
    };

    setNotifications(prev => [...prev, newNotification]);

    // Se tiver duração, remover após o tempo especificado
    if (notification.duration !== null && notification.duration !== undefined) {
      setTimeout(() => {
        removeNotification(id);
        notification.onClose?.();
      }, notification.duration);
    }

    return id;
  };

  // Remover uma notificação pelo ID
  const removeNotification = (id: string) => {
    setNotifications(prev => prev.filter(notification => notification.id !== id));
  };

  // Limpar todas as notificações
  const clearNotifications = () => {
    setNotifications([]);
  };

  return (
    <NotificationsContext.Provider
      value={{
        notifications,
        addNotification,
        removeNotification,
        clearNotifications,
      }}
    >
      {children}
      <PersistentToastList />
    </NotificationsContext.Provider>
  );
};

// Função utilitária para criar uma notificação de sucesso
export const showSuccessPersistentToast = (
  title: string, 
  description?: React.ReactNode,
  options?: Omit<Partial<PersistentNotification>, 'id' | 'timestamp' | 'title' | 'description' | 'type'>
) => {
  const { addNotification } = useNotifications();
  return addNotification({
    title,
    description,
    type: 'success',
    duration: 7000, // 7 segundos por padrão
    ...options,
  });
};

// Função utilitária para criar uma notificação de erro
export const showErrorPersistentToast = (
  title: string, 
  description?: React.ReactNode,
  options?: Omit<Partial<PersistentNotification>, 'id' | 'timestamp' | 'title' | 'description' | 'type'>
) => {
  const { addNotification } = useNotifications();
  return addNotification({
    title,
    description,
    type: 'error',
    duration: null, // Não expira por padrão
    ...options,
  });
};

// Função utilitária para criar uma notificação de aviso
export const showWarningPersistentToast = (
  title: string, 
  description?: React.ReactNode,
  options?: Omit<Partial<PersistentNotification>, 'id' | 'timestamp' | 'title' | 'description' | 'type'>
) => {
  const { addNotification } = useNotifications();
  return addNotification({
    title,
    description,
    type: 'warning',
    duration: 10000, // 10 segundos por padrão
    ...options,
  });
};

// Função utilitária para criar uma notificação de informação
export const showInfoPersistentToast = (
  title: string, 
  description?: React.ReactNode,
  options?: Omit<Partial<PersistentNotification>, 'id' | 'timestamp' | 'title' | 'description' | 'type'>
) => {
  const { addNotification } = useNotifications();
  return addNotification({
    title,
    description,
    type: 'info',
    duration: 7000, // 7 segundos por padrão
    ...options,
  });
};