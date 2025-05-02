import { toast } from "@/hooks/use-toast";

// Tipos de erros comuns
export enum ErrorType {
  API_ERROR = "API_ERROR",
  AUTH_ERROR = "AUTH_ERROR",
  VALIDATION_ERROR = "VALIDATION_ERROR",
  NETWORK_ERROR = "NETWORK_ERROR",
  UNKNOWN_ERROR = "UNKNOWN_ERROR",
}

// Interface para padronização dos erros
export interface AppError {
  type: ErrorType;
  message: string;
  details?: string;
  code?: number;
}

// Função de tratamento de erros para as queries
export function handleQueryError(error: unknown): AppError {
  // Se já estiver no formato AppError, retornar
  if (typeof error === 'object' && error !== null && 'type' in error) {
    return error as AppError;
  }

  // Erro padrão para quando não conseguirmos identificar
  let appError: AppError = {
    type: ErrorType.UNKNOWN_ERROR,
    message: "Ocorreu um erro inesperado",
  };

  // Se for um objeto Error
  if (error instanceof Error) {
    // Verificar mensagens específicas para classificar o erro
    const message = error.message.toLowerCase();
    
    if (message.includes("network") || message.includes("failed to fetch")) {
      appError = {
        type: ErrorType.NETWORK_ERROR,
        message: "Erro de conexão. Verifique sua internet e tente novamente.",
        details: error.message,
      };
    } else if (message.includes("unauthorized") || message.includes("401") || message.includes("forbidden") || message.includes("403") || message.includes("sessão expirada")) {
      appError = {
        type: ErrorType.AUTH_ERROR,
        message: "Erro de autenticação. Faça login novamente.",
        details: error.message,
      };
    } else if (message.includes("validation") || message.includes("required") || message.includes("invalid")) {
      appError = {
        type: ErrorType.VALIDATION_ERROR,
        message: "Dados inválidos. Verifique as informações e tente novamente.",
        details: error.message,
      };
    } else {
      // Se for um erro geral da API
      appError = {
        type: ErrorType.API_ERROR,
        message: error.message,
        details: error.stack || "",
      };
    }
  } else if (typeof error === 'string') {
    appError = {
      type: ErrorType.API_ERROR,
      message: error,
    };
  }

  return appError;
}

// Função para mostrar notificação de erro
export function showErrorToast(error: unknown) {
  const appError = handleQueryError(error);
  
  toast({
    title: getTitleFromErrorType(appError.type),
    description: appError.message,
    variant: "destructive",
  });
  
  // Logar o erro para debugging
  console.error("Error:", appError);
  
  return appError;
}

// Função para mostrar notificação de sucesso
export function showSuccessToast(message: string, title = "Sucesso") {
  toast({
    title,
    description: message,
    variant: "default",
    className: "bg-green-50 border-green-200 text-green-800",
  });
}

// Função para mostrar notificação de informação
export function showInfoToast(message: string, title = "Informação") {
  toast({
    title,
    description: message,
    variant: "default",
    className: "bg-blue-50 border-blue-200 text-blue-800",
  });
}

// Função para mostrar notificação de aviso
export function showWarningToast(message: string, title = "Atenção") {
  toast({
    title,
    description: message,
    variant: "default",
    className: "bg-amber-50 border-amber-200 text-amber-800",
  });
}

// Função para obter título com base no tipo de erro
function getTitleFromErrorType(type: ErrorType): string {
  switch (type) {
    case ErrorType.API_ERROR:
      return "Erro no servidor";
    case ErrorType.AUTH_ERROR:
      return "Erro de autenticação";
    case ErrorType.VALIDATION_ERROR:
      return "Erro de validação";
    case ErrorType.NETWORK_ERROR:
      return "Erro de conexão";
    case ErrorType.UNKNOWN_ERROR:
    default:
      return "Erro";
  }
}

// Exportamos um objeto único para facilitar o uso
export const notification = {
  success: showSuccessToast,
  error: showErrorToast,
  info: showInfoToast,
  warning: showWarningToast,
};