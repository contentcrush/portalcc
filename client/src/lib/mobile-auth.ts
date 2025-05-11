/**
 * mobile-auth.ts
 * 
 * Funções específicas para lidar com autenticação em dispositivos móveis
 * e resolver problemas de "sessão expirada" em navegadores móveis.
 */

import { queryClient } from "./queryClient";
import { toast } from "@/hooks/use-toast";

// Chaves para armazenamento local
const ACCESS_TOKEN_KEY = 'content_crush_access_token';
const REFRESH_TOKEN_KEY = 'content_crush_refresh_token';
const TOKEN_EXPIRY_KEY = 'content_crush_token_expiry';

// Verifica se estamos em um dispositivo móvel
export function isMobileDevice(): boolean {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

// Armazena tokens no localStorage como fallback para dispositivos móveis
export function saveTokensToLocalStorage(accessToken: string, refreshToken: string, expiresIn: number = 15 * 60): void {
  if (!isMobileDevice()) return;
  
  try {
    localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
    localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
    
    // Calcular e armazenar o timestamp de expiração
    const expiryTime = Date.now() + expiresIn * 1000; // converter segundos para milissegundos
    localStorage.setItem(TOKEN_EXPIRY_KEY, expiryTime.toString());
    
    console.log('Tokens salvos no localStorage para suporte mobile');
  } catch (error) {
    console.error('Erro ao salvar tokens no localStorage:', error);
  }
}

// Limpa tokens do localStorage
export function clearTokensFromLocalStorage(): void {
  try {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(TOKEN_EXPIRY_KEY);
    
    console.log('Tokens removidos do localStorage');
  } catch (error) {
    console.error('Erro ao remover tokens do localStorage:', error);
  }
}

// Obtém o token de acesso do localStorage
export function getAccessTokenFromLocalStorage(): string | null {
  if (!isMobileDevice()) return null;
  
  try {
    return localStorage.getItem(ACCESS_TOKEN_KEY);
  } catch (error) {
    console.error('Erro ao obter access token do localStorage:', error);
    return null;
  }
}

// Obtém o token de refresh do localStorage
export function getRefreshTokenFromLocalStorage(): string | null {
  if (!isMobileDevice()) return null;
  
  try {
    return localStorage.getItem(REFRESH_TOKEN_KEY);
  } catch (error) {
    console.error('Erro ao obter refresh token do localStorage:', error);
    return null;
  }
}

// Verifica se o token está expirado
export function isTokenExpired(): boolean {
  try {
    const expiryTimeStr = localStorage.getItem(TOKEN_EXPIRY_KEY);
    if (!expiryTimeStr) return true;
    
    const expiryTime = parseInt(expiryTimeStr, 10);
    return Date.now() > expiryTime;
  } catch (error) {
    console.error('Erro ao verificar expiração do token:', error);
    return true; // Em caso de erro, considerar expirado para forçar reautenticação
  }
}

// Tenta renovar os tokens para dispositivos móveis
export async function refreshMobileTokens(): Promise<boolean> {
  if (!isMobileDevice()) return false;
  
  try {
    const refreshToken = getRefreshTokenFromLocalStorage();
    if (!refreshToken) return false;
    
    // Tentar renovar usando a nova rota otimizada para mobile
    const response = await fetch('/api/auth/mobile-refresh', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ refreshToken }),
      credentials: 'include',
    });
    
    if (!response.ok) {
      console.error('Falha ao renovar tokens mobile:', response.status);
      clearTokensFromLocalStorage();
      return false;
    }
    
    const data = await response.json();
    
    // Salvar os novos tokens
    if (data.accessToken && data.refreshToken) {
      saveTokensToLocalStorage(data.accessToken, data.refreshToken, data.expiresIn || 15 * 60);
      
      // Atualizar dados do usuário no cache
      if (data.user) {
        queryClient.setQueryData(['/api/auth/me'], { 
          user: data.user, 
          token: data.accessToken 
        });
      }
      
      console.log('Tokens mobile renovados com sucesso');
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('Erro ao renovar tokens mobile:', error);
    return false;
  }
}

// Realiza login direto em dispositivos móveis
export async function performMobileLogin(username: string, password: string): Promise<boolean> {
  try {
    const response = await fetch('/api/auth/mobile-login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ username, password }),
      credentials: 'include',
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      toast({
        title: "Falha na autenticação",
        description: errorData.message || "Não foi possível fazer login. Verifique suas credenciais.",
        variant: "destructive"
      });
      return false;
    }
    
    const data = await response.json();
    
    // Salvar tokens no localStorage para dispositivos móveis
    if (data.token && data.refreshToken) {
      saveTokensToLocalStorage(data.token, data.refreshToken, data.expiresIn || 15 * 60);
      
      // Atualizar dados do usuário no cache
      if (data.user) {
        queryClient.setQueryData(['/api/auth/me'], { 
          user: data.user
        });
        
        toast({
          title: "Login efetuado com sucesso",
          description: `Bem-vindo de volta, ${data.user.name}!`,
          variant: "default"
        });
        
        // Se for administrador, mostrar informação adicional
        if (data.user.role === 'admin') {
          toast({
            title: "Acesso administrativo",
            description: "Você está conectado com privilégios de administrador.",
            variant: "default"
          });
        }
      }
      
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('Erro ao fazer login mobile:', error);
    toast({
      title: "Erro de conexão",
      description: "Não foi possível conectar ao servidor. Verifique sua conexão com a internet.",
      variant: "destructive"
    });
    return false;
  }
}

// Verifica se temos tokens válidos localmente
export function hasMobileTokens(): boolean {
  const accessToken = getAccessTokenFromLocalStorage();
  return accessToken !== null && !isTokenExpired();
}

// Obtém o cabeçalho de autenticação para dispositivos móveis
export function getMobileAuthHeader(): Record<string, string> | null {
  if (!isMobileDevice()) return null;
  
  const accessToken = getAccessTokenFromLocalStorage();
  if (!accessToken) return null;
  
  return {
    'Authorization': `Bearer ${accessToken}`
  };
}