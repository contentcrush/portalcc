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
  retryCount: number = 0
): Promise<Response> {
  // Constantes para configuração
  const MAX_RETRIES = 2; // Número máximo de tentativas de renovação
  
  console.log('API Request:', method, url, 'Com token:', !!getAuthToken(), 'Tentativa:', retryCount + 1);
  
  // Para dispositivos móveis, a prioridade é o token no cabeçalho
  const headers = getAuthHeaders(!!data);
  console.log('Enviando cabeçalhos:', Object.keys(headers).join(', '));
  
  try {
    let res = await fetch(url, {
      method,
      headers,
      body: data ? JSON.stringify(data) : undefined,
      credentials: "include", // Ainda mantém cookies como fallback
    });

    // Log para debug da resposta
    console.log('API Response status:', res.status, 'para', url);
    
    // Se recebemos um erro 401 (não autorizado), tentamos renovar o token primeiro
    if (res.status === 401 && retryCount < MAX_RETRIES) {
      console.log('Recebido 401 Unauthorized, tentando renovar token automaticamente...');
      const refreshSuccessful = await refreshToken();
      
      if (refreshSuccessful) {
        console.log('Token renovado com sucesso, retentando requisição original');
        // Retentar a requisição após renovar o token, incrementando o contador
        return apiRequest(method, url, data, retryCount + 1);
      } else {
        console.log('Falha ao renovar token, redirecionando para login');
        // Se não estamos já na página de autenticação, redirecionar
        if (!window.location.pathname.includes('/auth')) {
          window.location.href = '/auth';
        }
        throw new Error('Sessão expirada. Por favor, faça login novamente.');
      }
    }
    
    // Se chegamos ao limite de tentativas de renovação
    if (res.status === 401 && retryCount >= MAX_RETRIES) {
      console.log('Máximo de tentativas de renovação de token excedido');
      // Se não estamos já na página de autenticação, redirecionar
      if (!window.location.pathname.includes('/auth')) {
        window.location.href = '/auth';
      }
      throw new Error('Sessão expirada. Por favor, faça login novamente.');
    }
    
    // Se recebemos um erro 403 com "Token inválido ou expirado", tentamos renovar o token
    if (res.status === 403 && retryCount < MAX_RETRIES) {
      try {
        const responseText = await res.text();
        if (responseText.includes('Token inválido ou expirado')) {
          console.log('Token inválido ou expirado (403), tentando renovar...');
          // Tentar renovar o token
          const refreshSuccessful = await refreshToken();
          
          if (refreshSuccessful) {
            console.log('Token renovado com sucesso, retentando requisição original');
            // Retentar a requisição após renovar o token, incrementando o contador
            return apiRequest(method, url, data, retryCount + 1);
          } else {
            console.log('Falha ao renovar token, redirecionando para login');
            // Se não estamos já na página de autenticação, redirecionar
            if (!window.location.pathname.includes('/auth')) {
              window.location.href = '/auth';
            }
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

    // Se chegamos ao limite de tentativas e ainda temos erro 403
    if (res.status === 403 && retryCount >= MAX_RETRIES) {
      try {
        const responseText = await res.text();
        if (responseText.includes('Token inválido ou expirado')) {
          console.log('Máximo de tentativas excedido para renovação de token (403)');
          // Se não estamos já na página de autenticação, redirecionar
          if (!window.location.pathname.includes('/auth')) {
            window.location.href = '/auth';
          }
          throw new Error('Sessão expirada. Por favor, faça login novamente.');
        } else {
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
  } catch (error) {
    // Capturar erros de rede (falha na conexão)
    if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
      console.error('Erro de conexão na requisição:', error);
      throw new Error('Falha na conexão com o servidor. Verifique sua conexão de internet.');
    }
    
    // Repassar outros erros
    throw error;
  }
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn = <T>(options?: {
  on401?: UnauthorizedBehavior;
}): QueryFunction<T> =>
  (options) => {
    const unauthorizedBehavior = options?.on401 || "throw";
    
    // Função interna de execução de query com suporte a tentativas
    const executeQueryWithRetry = async (
      queryKey: string, 
      retryCount: number = 0
    ): Promise<any | null> => {
      // Constantes para configuração
      const MAX_RETRIES = 2; // Número máximo de tentativas de renovação
      
      console.log('Executando query:', queryKey, 'Com token:', !!getAuthToken(), 'Tentativa:', retryCount + 1);
      const headers = getAuthHeaders();
      console.log('Query headers:', Object.keys(headers).join(', '));
      
      try {
        let res = await fetch(queryKey, {
          credentials: "include",
          headers,
        });
    
        // Tentar renovar o token em caso de 401 Unauthorized
        if (res.status === 401 && retryCount < MAX_RETRIES) {
          console.log('Query recebeu 401 Unauthorized, tentando renovar token...');
          const refreshSuccessful = await refreshToken();
          
          if (refreshSuccessful) {
            console.log('Token renovado com sucesso, retentando query');
            return executeQueryWithRetry(queryKey, retryCount + 1);
          } else {
            // Se não conseguimos renovar, tratamos de acordo com unauthorizedBehavior
            if (unauthorizedBehavior === "returnNull") {
              return null;
            } else {
              // Se não estamos na página de autenticação, redirecionar
              if (!window.location.pathname.includes('/auth')) {
                window.location.href = '/auth';
              }
              throw new Error('Sessão expirada. Por favor, faça login novamente.');
            }
          }
        }
        
        // Se atingimos o limite de tentativas com 401
        if (res.status === 401 && retryCount >= MAX_RETRIES) {
          console.log('Máximo de tentativas de renovação de token excedido na query');
          if (unauthorizedBehavior === "returnNull") {
            return null;
          } else {
            // Se não estamos na página de autenticação, redirecionar
            if (!window.location.pathname.includes('/auth')) {
              window.location.href = '/auth';
            }
            throw new Error('Sessão expirada. Por favor, faça login novamente.');
          }
        }
    
        // Tratar token expirado em queries também (status 403)
        if (res.status === 403 && retryCount < MAX_RETRIES) {
          try {
            const responseText = await res.text();
            if (responseText.includes('Token inválido ou expirado')) {
              console.log('Query recebeu token inválido (403), tentando renovar...');
              // Tentar renovar o token
              const refreshSuccessful = await refreshToken();
              
              if (refreshSuccessful) {
                console.log('Token renovado com sucesso, retentando query');
                return executeQueryWithRetry(queryKey, retryCount + 1);
              } else {
                // Se não conseguimos renovar, tratamos de acordo com unauthorizedBehavior
                if (unauthorizedBehavior === "returnNull") {
                  return null;
                } else {
                  // Se não estamos na página de autenticação, redirecionar
                  if (!window.location.pathname.includes('/auth')) {
                    window.location.href = '/auth';
                  }
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
        
        // Se atingimos o limite de tentativas com 403
        if (res.status === 403 && retryCount >= MAX_RETRIES) {
          try {
            const responseText = await res.text();
            if (responseText.includes('Token inválido ou expirado')) {
              console.log('Máximo de tentativas de renovação de token excedido na query (403)');
              if (unauthorizedBehavior === "returnNull") {
                return null;
              } else {
                // Se não estamos na página de autenticação, redirecionar
                if (!window.location.pathname.includes('/auth')) {
                  window.location.href = '/auth';
                }
                throw new Error('Sessão expirada. Por favor, faça login novamente.');
              }
            } else {
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
        return await res.json();
      } catch (error) {
        // Capturar erros de rede (falha na conexão)
        if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
          console.error('Erro de conexão na query:', error);
          throw new Error('Falha na conexão com o servidor. Verifique sua conexão de internet.');
        }
        
        // Repassar outros erros
        throw error;
      }
    };
    
    // Função principal retornada pelo getQueryFn
    return async ({ queryKey }) => {
      return executeQueryWithRetry(queryKey[0] as string);
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
