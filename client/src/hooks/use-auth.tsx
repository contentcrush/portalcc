import { createContext, ReactNode, useContext } from "react";
import {
  useQuery,
  useMutation,
  UseMutationResult,
} from "@tanstack/react-query";
import { insertUserSchema, User as SelectUser, InsertUser } from "@shared/schema";
import { getQueryFn, apiRequest, queryClient } from "../lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { showSuccessToast } from "@/lib/utils";

type AuthResponse = {
  user: SelectUser;
  token: string;
};

type PasswordChangeData = {
  currentPassword: string;
  newPassword: string;
};

type AuthContextType = {
  user: SelectUser | null;
  isLoading: boolean;
  error: Error | null;
  loginMutation: UseMutationResult<AuthResponse, Error, LoginData>;
  logoutMutation: UseMutationResult<void, Error, void>;
  registerMutation: UseMutationResult<AuthResponse, Error, InsertUser>;
  updateProfileMutation: UseMutationResult<SelectUser, Error, Partial<SelectUser>>;
  changePasswordMutation: UseMutationResult<{ message: string, user: SelectUser }, Error, PasswordChangeData>;
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
      // O token agora é armazenado em cookies HTTP-only pelo servidor
      showSuccessToast({
        title: "Login bem-sucedido",
        description: `Bem-vindo de volta, ${data.user.name}!`
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
      // O token agora é armazenado em cookies HTTP-only pelo servidor
      showSuccessToast({
        title: "Registro bem-sucedido",
        description: `Bem-vindo, ${data.user.name}!`
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
      queryClient.setQueryData(["/api/auth/me"], null);
      // Limpar outras queries do cache para evitar dados antigos
      queryClient.clear();
      showSuccessToast({
        title: "Logout bem-sucedido",
        description: "Você foi desconectado com sucesso."
      });
      // Redirecionar para a página de login
      window.location.href = "/auth";
    },
    onError: (error: Error) => {
      toast({
        title: "Falha no logout",
        description: error.message || "Não foi possível desconectar",
        variant: "destructive",
      });
      // Mesmo com erro, redirecionar para a página de login para evitar estado inconsistente
      window.location.href = "/auth";
    },
  });

  // Mutação para atualizar dados do perfil
  const updateProfileMutation = useMutation({
    mutationFn: async (userData: Partial<SelectUser>) => {
      const userId = authData?.user?.id;
      if (!userId) throw new Error("Usuário não autenticado");
      
      const res = await apiRequest("PATCH", `/api/users/${userId}`, userData);
      return await res.json();
    },
    onSuccess: (updatedUser: SelectUser) => {
      // Atualiza os dados do usuário no cache
      if (authData) {
        queryClient.setQueryData(["/api/auth/me"], {
          ...authData,
          user: updatedUser
        });
      }
      
      showSuccessToast({
        title: "Perfil atualizado",
        description: "Suas informações de perfil foram atualizadas com sucesso."
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Falha na atualização",
        description: error.message || "Não foi possível atualizar o perfil",
        variant: "destructive",
      });
    },
  });

  // Os tokens são gerenciados automaticamente via cookies HTTP-only pelo servidor

  // Mutação para alterar a senha
  const changePasswordMutation = useMutation({
    mutationFn: async (passwordData: PasswordChangeData) => {
      const userId = authData?.user?.id;
      if (!userId) throw new Error("Usuário não autenticado");
      
      const res = await apiRequest("POST", `/api/users/${userId}/change-password`, passwordData);
      return await res.json();
    },
    onSuccess: (data) => {
      showSuccessToast({
        title: "Senha alterada com sucesso",
        description: "Sua senha foi atualizada. Use a nova senha no próximo login."
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Falha na alteração de senha",
        description: error.message || "Não foi possível alterar a senha. Verifique se a senha atual está correta.",
        variant: "destructive",
      });
    },
  });

  return (
    <AuthContext.Provider
      value={{
        user: authData?.user || null,
        isLoading,
        error,
        loginMutation,
        logoutMutation,
        registerMutation,
        updateProfileMutation,
        changePasswordMutation,
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