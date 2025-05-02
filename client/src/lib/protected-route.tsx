import React from "react";
import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";
import { Redirect, Route } from "wouter";

const PageLoader = () => (
  <div className="flex justify-center items-center min-h-screen">
    <div className="flex flex-col items-center">
      <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      <p className="mt-4 text-muted-foreground">Carregando...</p>
    </div>
  </div>
);

interface ProtectedRouteProps {
  path?: string;
  component: React.ComponentType<any>;
}

export function ProtectedRoute({ component: Component, ...props }: ProtectedRouteProps) {
  const { user, isLoading } = useAuth();

  // Se estiver carregando, mostra o indicador de carregamento
  if (isLoading) {
    return <PageLoader />;
  }

  // Se não houver usuário autenticado e não estiver na página de login,
  // redireciona para a página de login
  if (!user && window.location.pathname !== '/auth') {
    // Limpar token inválido do localStorage para garantir novo login limpo
    localStorage.removeItem("authToken");
    
    // Redirecionar para página de login
    window.location.href = '/auth';
    return <PageLoader />;
  }

  // Se tudo estiver ok, renderiza o componente protegido
  return <Component {...props} />;
}