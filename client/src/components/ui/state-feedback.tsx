import React from "react";
import { Loader2, AlertCircle, SearchX, FilePlus2 } from "lucide-react";
import { Button } from "./button";

type StateType = "loading" | "error" | "empty" | "no-results";

interface StateFeedbackProps {
  type: StateType;
  title?: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
  icon?: React.ReactNode;
}

/**
 * Componente para exibir estados de feedback (carregamento, erro, vazio, sem resultados)
 */
export function StateFeedback({
  type,
  title,
  message,
  actionLabel,
  onAction,
  icon,
}: StateFeedbackProps) {
  // Configurações padrão baseadas no tipo
  const defaults = getDefaultsForType(type);
  
  // Merge os valores fornecidos com os padrões
  const finalTitle = title || defaults.title;
  const finalMessage = message || defaults.message;
  const finalIcon = icon || defaults.icon;

  return (
    <div className="flex flex-col items-center justify-center p-8 text-center min-h-[200px]">
      <div className={`p-3 mb-4 rounded-full ${defaults.iconContainerClass}`}>
        {finalIcon}
      </div>
      <h3 className="text-lg font-medium mb-2">{finalTitle}</h3>
      <p className="text-gray-500 mb-6 max-w-md">{finalMessage}</p>
      
      {actionLabel && onAction && (
        <Button onClick={onAction} variant={defaults.buttonVariant}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
}

// Função para obter os valores padrão baseados no tipo
function getDefaultsForType(type: StateType): {
  title: string;
  message: string;
  icon: React.ReactNode;
  iconContainerClass: string;
  buttonVariant: "default" | "outline" | "destructive";
} {
  switch (type) {
    case "loading":
      return {
        title: "Carregando...",
        message: "Por favor, aguarde enquanto carregamos os dados.",
        icon: <Loader2 className="h-8 w-8 text-primary animate-spin" />,
        iconContainerClass: "bg-primary/10",
        buttonVariant: "outline",
      };
    case "error":
      return {
        title: "Ocorreu um erro",
        message: "Não foi possível carregar os dados. Tente novamente mais tarde.",
        icon: <AlertCircle className="h-8 w-8 text-destructive" />,
        iconContainerClass: "bg-destructive/10",
        buttonVariant: "destructive",
      };
    case "empty":
      return {
        title: "Nenhum dado encontrado",
        message: "Não há dados para exibir. Crie um novo item para começar.",
        icon: <FilePlus2 className="h-8 w-8 text-gray-400" />,
        iconContainerClass: "bg-gray-100",
        buttonVariant: "default",
      };
    case "no-results":
      return {
        title: "Nenhum resultado encontrado",
        message: "Tente ajustar os filtros ou use termos de busca diferentes.",
        icon: <SearchX className="h-8 w-8 text-gray-400" />,
        iconContainerClass: "bg-gray-100",
        buttonVariant: "outline",
      };
    default:
      return {
        title: "Aguarde",
        message: "Estamos processando sua solicitação.",
        icon: <Loader2 className="h-8 w-8 text-gray-400 animate-spin" />,
        iconContainerClass: "bg-gray-100",
        buttonVariant: "outline",
      };
  }
}

/**
 * Componente para exibir estado de carregamento
 */
export function LoadingState(props: Omit<StateFeedbackProps, "type">) {
  return <StateFeedback type="loading" {...props} />;
}

/**
 * Componente para exibir estado de erro
 */
export function ErrorState(props: Omit<StateFeedbackProps, "type">) {
  return <StateFeedback type="error" {...props} />;
}

/**
 * Componente para exibir estado vazio
 */
export function EmptyState(props: Omit<StateFeedbackProps, "type">) {
  return <StateFeedback type="empty" {...props} />;
}

/**
 * Componente para exibir estado sem resultados
 */
export function NoResultsState(props: Omit<StateFeedbackProps, "type">) {
  return <StateFeedback type="no-results" {...props} />;
}