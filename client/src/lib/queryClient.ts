import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

// Objeto global para armazenar listeners de websocket para invalidação de cache
export const cacheInvalidationListeners: { [key: string]: (() => void)[] } = {};

// Token armazenado na memória (usado como fallback para dispositivos que não suportam bem cookies)
let inMemoryToken: string | null = null;

// Função para salvar o token na memória
export function setAuthToken(token: string | null) {
  inMemoryToken = token;
}

// Função para obter o token atual
export function getAuthToken(): string | null {
  return inMemoryToken;
}

// Adicionar os cabeçalhos necessários às requisições, incluindo autorização se disponível
function getAuthHeaders(hasContentType: boolean = false): HeadersInit {
  const headers: HeadersInit = hasContentType ? { "Content-Type": "application/json" } : {};
  
  // Adicionar o token de autenticação ao cabeçalho se disponível
  const token = getAuthToken();
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  
  return headers;
}

// Detectar se é um dispositivo móvel
function isMobileDevice(): boolean {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
         window.innerWidth < 768;
}

// Função para renovar o token expirado
async function refreshToken(): Promise<boolean> {
  try {
    console.log('Tentando renovar token...');
    
    // Escolher o endpoint adequado com base no tipo de dispositivo
    const endpoint = isMobileDevice() 
      ? '/api/auth/mobile/refresh' 
      : '/api/auth/refresh';
    
    console.log(`Usando endpoint para renovação: ${endpoint}`);
    
    // Para dispositivos móveis, enviamos o refreshToken no corpo
    const refreshTokenFromStorage = localStorage.getItem('refresh_token');
    const body = isMobileDevice() && refreshTokenFromStorage ? 
      { refreshToken: refreshTokenFromStorage } : undefined;
    
    const res = await fetch(endpoint, {
      method: 'POST',
      credentials: 'include',
      headers: {
        ...getAuthHeaders(),
        ...(body ? { 'Content-Type': 'application/json' } : {})
      },
      ...(body ? { body: JSON.stringify(body) } : {})
    });
    
    if (!res.ok) {
      console.log('Falha ao renovar token:', res.status);
      // Se o refresh falhar, limpamos o token em memória
      setAuthToken(null);
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      return false;
    }
    
    // Se for bem-sucedido, extraímos o novo token da resposta
    try {
      const data = await res.json();
      
      if (isMobileDevice()) {
        // Formato de resposta móvel tem accessToken
        if (data.accessToken) {
          console.log('Token renovado com sucesso (mobile)');
          setAuthToken(data.accessToken);
          
          // Atualizar também o refresh token armazenado
          if (data.refreshToken) {
            localStorage.setItem('refresh_token', data.refreshToken);
          }
          
          // Atualizar o token para WebSocket também
          localStorage.setItem('access_token', data.accessToken);
          return true;
        }
      } else {
        // Formato de resposta tradicional tem token
        if (data.token) {
          console.log('Token renovado com sucesso');
          setAuthToken(data.token);
          localStorage.setItem('access_token', data.token);
          return true;
        }
      }
    } catch (e) {
      console.error('Erro ao processar resposta de renovação de token:', e);
    }
    
    return false;
  } catch (error) {
    console.error('Erro ao renovar token:', error);
    setAuthToken(null);
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    return false;
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  console.log('API Request:', method, url, 'Com token:', !!getAuthToken());
  
  // Para dispositivos móveis, a prioridade é o token no cabeçalho
  const headers = getAuthHeaders(!!data);
  console.log('Enviando cabeçalhos:', Object.keys(headers).join(', '));
  
  let res = await fetch(url, {
    method,
    headers,
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include", // Ainda mantém cookies como fallback
  });

  // Log para debug da resposta
  console.log('API Response status:', res.status, 'para', url);
  
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
    console.log('Executando query:', queryKey[0], 'Com token:', !!getAuthToken());
    const headers = getAuthHeaders();
    console.log('Query headers:', Object.keys(headers).join(', '));
      
    let res = await fetch(queryKey[0] as string, {
      credentials: "include",
      headers,
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
