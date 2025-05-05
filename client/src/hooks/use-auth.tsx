import { createContext, ReactNode, useContext, useEffect } from "react";
import {
  useQuery,
  useMutation,
  UseMutationResult,
} from "@tanstack/react-query";
import { insertUserSchema, User as SelectUser, InsertUser } from "@shared/schema";
import { getQueryFn, apiRequest, queryClient, setAuthToken, getAuthToken } from "../lib/queryClient";
import { useToast } from "@/hooks/use-toast";

type AuthResponse = {
  user: SelectUser;
  token: string;
};

type AuthContextType = {
  user: SelectUser | null;
  isLoading: boolean;
  error: Error | null;
  loginMutation: UseMutationResult<AuthResponse, Error, LoginData>;
  logoutMutation: UseMutationResult<void, Error, void>;
  registerMutation: UseMutationResult<AuthResponse, Error, InsertUser>;
};

type LoginData = {
  username: string;
  password: string;
};

export const AuthContext = createContext<AuthContextType | null>(null);
export function AuthProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  const {
    data: authData,
    error,
    isLoading,
  } = useQuery<{ user: SelectUser, token: string } | null, Error>({
    queryKey: ["/api/auth/me"],
    queryFn: getQueryFn({ on401: "returnNull" }),
    retry: false,
    refetchOnWindowFocus: false,
  });

  const loginMutation = useMutation({
    mutationFn: async (credentials: LoginData) => {
      const res = await apiRequest("POST", "/api/auth/login", credentials);
      return await res.json();
    },
    onSuccess: (data: { user: SelectUser, token: string }) => {
      queryClient.setQueryData(["/api/auth/me"], data);
      // Armazenar o token em memória além de nos cookies para dispositivos móveis
      setAuthToken(data.token);
      toast({
        title: "Login bem-sucedido",
        description: `Bem-vindo de volta, ${data.user.name}!`,
        variant: "default",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Falha no login",
        description: error.message || "Credenciais inválidas",
        variant: "destructive",
      });
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (userData: InsertUser) => {
      const res = await apiRequest("POST", "/api/auth/register", userData);
      return await res.json();
    },
    onSuccess: (data: { user: SelectUser, token: string }) => {
      queryClient.setQueryData(["/api/auth/me"], data);
      // Armazenar o token em memória além de nos cookies para dispositivos móveis
      setAuthToken(data.token);
      toast({
        title: "Registro bem-sucedido",
        description: `Bem-vindo, ${data.user.name}!`,
        variant: "default",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Falha no registro",
        description: error.message || "Não foi possível criar a conta",
        variant: "destructive",
      });
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/auth/logout");
      // Os cookies são removidos pelo servidor na resposta
    },
    onSuccess: () => {
      // Limpar token em memória e dados do usuário
      setAuthToken(null);
      queryClient.setQueryData(["/api/auth/me"], null);
      // Limpar outras queries do cache para evitar dados antigos
      queryClient.clear();
      toast({
        title: "Logout bem-sucedido",
        description: "Você foi desconectado com sucesso.",
        variant: "default",
      });
      // Redirecionar para a página de login
      window.location.href = "/auth";
    },
    onError: (error: Error) => {
      // Ainda assim, limpar token em memória por segurança
      setAuthToken(null);
      toast({
        title: "Falha no logout",
        description: error.message || "Não foi possível desconectar",
        variant: "destructive",
      });
      // Mesmo com erro, redirecionar para a página de login para evitar estado inconsistente
      window.location.href = "/auth";
    },
  });

  // Extrair e salvar o token em memória quando o usuário for carregado ou alterado
  useEffect(() => {
    if (authData?.token) {
      setAuthToken(authData.token);
    }
  }, [authData]);

  return (
    <AuthContext.Provider
      value={{
        user: authData?.user || null,
        isLoading,
        error,
        loginMutation,
        logoutMutation,
        registerMutation,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}