import { QueryClient, QueryFunction } from "@tanstack/react-query";
import { ErrorType, showErrorToast, notification } from "./notification";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

// Objeto global para armazenar listeners de websocket para invalidação de cache
export const cacheInvalidationListeners: { [key: string]: (() => void)[] } = {};

// Função para obter o token de autenticação
function getAuthToken(): string | null {
  return localStorage.getItem("authToken");
}

// Adicionar o token de autenticação às requisições
function getAuthHeaders(hasContentType: boolean = false): HeadersInit {
  const headers: HeadersInit = hasContentType ? { "Content-Type": "application/json" } : {};
  const token = getAuthToken();
  
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  
  return headers;
}

// Função para renovar o token expirado
async function refreshToken(): Promise<string | null> {
  try {
    const res = await fetch('/api/auth/refresh', {
      method: 'POST',
      credentials: 'include',
    });
    
    if (!res.ok) {
      // Se o refresh falhar, limpamos o token e redirecionamos para o login
      localStorage.removeItem('authToken');
      return null;
    }
    
    const data = await res.json();
    localStorage.setItem('authToken', data.token);
    return data.token;
  } catch (error) {
    console.error('Error refreshing token:', error);
    localStorage.removeItem('authToken');
    return null;
  }
}

// Função para tratar erros de rede genéricos
function handleNetworkError(error: unknown): Error {
  if (error instanceof Error) {
    // Se já for um erro, apenas retornamos
    return error;
  }
  
  // Caso contrário, criamos um novo erro
  return new Error("Erro de conexão. Verifique sua internet e tente novamente.");
}

// Função para exibir notificação de erro e redirecionar se necessário
function handleApiError(error: Error, shouldRedirect: boolean = true): void {
  // Adicionar verificações para tipos específicos de erros
  const errorMessage = error.message.toLowerCase();
  
  // Erros de autenticação
  if (errorMessage.includes("401") || 
      errorMessage.includes("unauthorized") || 
      errorMessage.includes("sessão expirada") ||
      errorMessage.includes("token inválido") ||
      errorMessage.includes("não autenticado")) {
    
    if (shouldRedirect && !window.location.pathname.includes('/auth')) {
      // Mostrar a notificação antes de redirecionar
      notification.error({
        type: ErrorType.AUTH_ERROR,
        message: "Sua sessão expirou. Você será redirecionado para a página de login."
      });
      
      // Atraso curto para garantir que a notificação seja exibida antes do redirecionamento
      setTimeout(() => {
        window.location.href = '/auth';
      }, 1500);
    } else {
      // Se não redirecionar ou já estiver na página de autenticação
      showErrorToast(error);
    }
    return;
  }
  
  // Erros de permissão
  if (errorMessage.includes("403") || errorMessage.includes("forbidden") || errorMessage.includes("acesso negado")) {
    notification.error({
      type: ErrorType.AUTH_ERROR,
      message: "Você não tem permissão para realizar esta ação."
    });
    return;
  }
  
  // Erros de validação
  if (errorMessage.includes("validation") || 
      errorMessage.includes("invalid") || 
      errorMessage.includes("campo") || 
      errorMessage.includes("required")) {
    notification.error({
      type: ErrorType.VALIDATION_ERROR,
      message: error.message
    });
    return;
  }
  
  // Para outros tipos de erros, mostramos o toast genérico
  showErrorToast(error);
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
  showNotificationOnError: boolean = true,
): Promise<Response> {
  try {
    let res = await fetch(url, {
      method,
      headers: getAuthHeaders(!!data),
      body: data ? JSON.stringify(data) : undefined,
      credentials: "include",
    });

    // Se recebemos um erro 401 (não autorizado), verificamos se já estamos na página de autenticação
    if (res.status === 401) {
      const error = new Error('Sessão expirada. Por favor, faça login novamente.');
      if (showNotificationOnError) {
        handleApiError(error);
      }
      throw error;
    }
    
    // Se recebemos um erro 403 com "Token inválido ou expirado", tentamos renovar o token
    if (res.status === 403) {
      try {
        const responseText = await res.text();
        if (responseText.includes('Token inválido ou expirado')) {
          // Tentar renovar o token
          const newToken = await refreshToken();
          
          if (newToken) {
            // Retentar a requisição com o novo token
            res = await fetch(url, {
              method,
              headers: {
                ...getAuthHeaders(!!data),
                'Authorization': `Bearer ${newToken}`
              },
              body: data ? JSON.stringify(data) : undefined,
              credentials: "include",
            });
          } else {
            // Se não conseguimos renovar o token, redirecionamos para login
            const error = new Error('Sessão expirada. Por favor, faça login novamente.');
            if (showNotificationOnError) {
              handleApiError(error);
            }
            throw error;
          }
        } else {
          // Se for outro erro 403, lançamos o erro original
          const error = new Error(`${res.status}: ${responseText}`);
          if (showNotificationOnError) {
            handleApiError(error, false); // Não redirecionar para erros 403 genéricos
          }
          throw error;
        }
      } catch (error) {
        // Já tratado no bloco acima
        throw error;
      }
    }

    // Para outros erros HTTP (400, 404, 500, etc.)
    if (!res.ok) {
      const text = await res.text();
      const error = new Error(`${res.status}: ${text || res.statusText}`);
      if (showNotificationOnError) {
        handleApiError(error, false);
      }
      throw error;
    }
    
    return res;
  } catch (error) {
    // Capturar erros de rede ou outros não capturados acima
    const networkError = handleNetworkError(error);
    if (showNotificationOnError) {
      handleApiError(networkError, false);
    }
    throw networkError;
  }
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options?: {
  on401?: UnauthorizedBehavior;
  showNotificationOnError?: boolean;
}) => QueryFunction<T> =
  (options) => {
    const unauthorizedBehavior = options?.on401 || "throw";
    const showNotificationOnError = options?.showNotificationOnError !== false; // Padrão é true
    
    return async ({ queryKey }) => {
      try {
        let res = await fetch(queryKey[0] as string, {
          credentials: "include",
          headers: getAuthHeaders(),
        });

        // Tratar token expirado em queries também
        if (res.status === 403) {
          try {
            const responseText = await res.text();
            if (responseText.includes('Token inválido ou expirado')) {
              // Tentar renovar o token
              const newToken = await refreshToken();
              
              if (newToken) {
                // Retentar a query com o novo token
                res = await fetch(queryKey[0] as string, {
                  credentials: "include",
                  headers: {
                    ...getAuthHeaders(),
                    'Authorization': `Bearer ${newToken}`
                  }
                });
              } else {
                // Se não conseguimos renovar, tratamos de acordo com unauthorizedBehavior
                if (unauthorizedBehavior === "returnNull") {
                  return null;
                } else {
                  const error = new Error('Sessão expirada. Por favor, faça login novamente.');
                  if (showNotificationOnError) {
                    handleApiError(error);
                  }
                  throw error;
                }
              }
            } else {
              // Se for outro erro 403, lançamos o erro original
              const error = new Error(`${res.status}: ${responseText}`);
              if (showNotificationOnError) {
                handleApiError(error, false);
              }
              throw error;
            }
          } catch (error) {
            throw error; // Já tratado acima
          }
        }

        if (res.status === 401) {
          if (unauthorizedBehavior === "returnNull") {
            return null;
          } else {
            // Redirecionar para a página de login quando não autorizado
            const error = new Error('Sessão expirada. Por favor, faça login novamente.');
            if (showNotificationOnError) {
              handleApiError(error);
            }
            throw error;
          }
        }

        // Para outros erros HTTP (400, 404, 500, etc.)
        if (!res.ok) {
          const text = await res.text();
          const error = new Error(`${res.status}: ${text || res.statusText}`);
          if (showNotificationOnError) {
            handleApiError(error, false);
          }
          throw error;
        }
        
        return await res.json();
      } catch (error) {
        // Capturar erros de rede ou outros não capturados acima
        const networkError = handleNetworkError(error);
        if (showNotificationOnError) {
          handleApiError(networkError, false);
        }
        throw networkError;
      }
    };
};

// Configuração do QueryClient com opções melhoradas
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ 
        on401: "throw",
        showNotificationOnError: true
      }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: 60000, // 1 minuto de staleTime para reduzir chamadas desnecessárias
      retry: 1, // Tentar novamente uma vez em caso de falha
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // Backoff exponencial
    },
    mutations: {
      retry: 1,
      retryDelay: 1000,
      // Adicionando handlers globais para mutations
      onError: (error) => {
        showErrorToast(error);
      }
    },
  },
});
