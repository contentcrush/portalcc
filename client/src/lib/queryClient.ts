import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

// Objeto global para armazenar listeners de websocket para invalidação de cache
export const cacheInvalidationListeners: { [key: string]: (() => void)[] } = {};

import { 
  isMobileDevice, 
  getMobileAuthHeader, 
  hasMobileTokens, 
  refreshMobileTokens,
  getAccessTokenFromLocalStorage
} from './mobile-auth';

// Adicionar os cabeçalhos necessários às requisições
function getAuthHeaders(hasContentType: boolean = false): HeadersInit {
  // Headers básicos
  const headers: HeadersInit = hasContentType ? { "Content-Type": "application/json" } : {};
  
  // Se for dispositivo móvel, adicionar o token de acesso no header Authorization
  if (isMobileDevice() && hasMobileTokens()) {
    const mobileHeaders = getMobileAuthHeader();
    if (mobileHeaders) {
      return { ...headers, ...mobileHeaders };
    }
  }
  
  return headers;
}

// Função para renovar o token expirado
async function refreshToken(): Promise<boolean> {
  // Para dispositivos móveis, tentamos usar a renovação otimizada
  if (isMobileDevice()) {
    const mobileRefreshResult = await refreshMobileTokens();
    if (mobileRefreshResult) {
      console.log('Token renovado com sucesso usando fluxo mobile');
      return true;
    }
  }
  
  // Fluxo padrão para navegadores desktop ou fallback para mobile
  try {
    const res = await fetch('/api/auth/refresh', {
      method: 'POST',
      credentials: 'include',
    });
    
    if (!res.ok) {
      // Se o refresh falhar, redirecionamos para o login
      return false;
    }
    
    // Se for bem-sucedido, o novo token estará nos cookies
    return true;
  } catch (error) {
    console.error('Error refreshing token:', error);
    return false;
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  let res = await fetch(url, {
    method,
    headers: getAuthHeaders(!!data),
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  // Se recebemos um erro 401 (não autorizado), verificamos se já estamos na página de autenticação
  if (res.status === 401) {
    // Verifica se já estamos na página de autenticação para evitar ciclos de redirecionamento
    if (!window.location.pathname.includes('/auth')) {
      window.location.href = '/auth';
    }
    throw new Error('Sessão expirada. Por favor, faça login novamente.');
  }
  
  // Se recebemos um erro 403 com "Token inválido ou expirado", tentamos renovar o token
  if (res.status === 403) {
    try {
      const responseText = await res.text();
      if (responseText.includes('Token inválido ou expirado')) {
        // Tentar renovar o token
        const refreshSuccessful = await refreshToken();
        
        if (refreshSuccessful) {
          // Retentar a requisição após renovar o token
          res = await fetch(url, {
            method,
            headers: getAuthHeaders(!!data),
            body: data ? JSON.stringify(data) : undefined,
            credentials: "include",
          });
        } else {
          // Se não conseguimos renovar o token, redirecionamos para login
          window.location.href = '/auth';
          throw new Error('Sessão expirada. Por favor, faça login novamente.');
        }
      } else {
        // Se for outro erro 403, lançamos o erro original
        throw new Error(`${res.status}: ${responseText}`);
      }
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Erro ao processar a requisição');
    }
  }

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options?: {
  on401?: UnauthorizedBehavior;
}) => QueryFunction<T> =
  (options) => {
    const unauthorizedBehavior = options?.on401 || "throw";
    return async ({ queryKey }) => {
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
          const refreshSuccessful = await refreshToken();
          
          if (refreshSuccessful) {
            // Retentar a query após renovar o token
            res = await fetch(queryKey[0] as string, {
              credentials: "include",
              headers: getAuthHeaders()
            });
          } else {
            // Se não conseguimos renovar, tratamos de acordo com unauthorizedBehavior
            if (unauthorizedBehavior === "returnNull") {
              return null;
            } else {
              throw new Error('Sessão expirada. Por favor, faça login novamente.');
            }
          }
        } else {
          // Se for outro erro 403, lançamos o erro original
          throw new Error(`${res.status}: ${responseText}`);
        }
      } catch (error) {
        if (error instanceof Error) {
          throw error;
        }
        throw new Error('Erro ao processar a requisição');
      }
    }

    if (res.status === 401) {
      if (unauthorizedBehavior === "returnNull") {
        return null;
      } else {
        // Redirecionar para a página de login quando não autorizado
        // Verificar se já estamos na página de autenticação para evitar ciclos
        if (!window.location.pathname.includes('/auth')) {
          window.location.href = '/auth';
        }
        throw new Error('Sessão expirada. Por favor, faça login novamente.');
      }
    }

    await throwIfResNotOk(res);
    return await res.json();
  };
};

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
