import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

// Objeto global para armazenar listeners de websocket para invalidação de cache
export const cacheInvalidationListeners: { [key: string]: (() => void)[] } = {};

// Adicionar os cabeçalhos necessários às requisições
function getAuthHeaders(hasContentType: boolean = false): HeadersInit {
  const headers: HeadersInit = hasContentType ? { "Content-Type": "application/json" } : {};
  return headers;
}

// Função para renovar o token expirado
async function refreshToken(): Promise<boolean> {
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
  options?: { headers?: HeadersInit }
): Promise<Response> {
  // Configuração padrão para headers
  let headers = options?.headers;
  
  if (!headers) {
    // Se não houver headers especificados, usamos os padrões
    headers = getAuthHeaders(!!data && !(data instanceof FormData));
  }
  
  // Configuração da requisição
  const requestOptions: RequestInit = {
    method,
    headers,
    credentials: "include",
  };
  
  // Processar o corpo da requisição
  if (data) {
    if (data instanceof FormData) {
      // FormData é tratado automaticamente pelo fetch, não precisamos definir Content-Type
      requestOptions.body = data;
    } else {
      // Outros tipos de dados são convertidos para JSON
      requestOptions.body = JSON.stringify(data);
    }
  }
  
  let res = await fetch(url, requestOptions);

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
          const requestOptions: RequestInit = {
            method,
            credentials: "include",
          };
          
          if (data) {
            if (data instanceof FormData) {
              requestOptions.body = data;
            } else {
              requestOptions.headers = getAuthHeaders(true);
              requestOptions.body = JSON.stringify(data);
            }
          } else {
            requestOptions.headers = getAuthHeaders(false);
          }
          
          res = await fetch(url, requestOptions);
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
