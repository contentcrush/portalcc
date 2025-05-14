import { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Componentes de animação desativados para melhorar a performance
 * Use apenas componentes estáticos no lugar
 */

type AnimatedElementProps = {
  children: ReactNode;
  className?: string;
  id?: string;
};

/**
 * Versão simplificada do componente AnimatedElement sem animações
 * para melhorar a performance da página
 */
export function AnimatedElement({
  children,
  className,
  id,
}: AnimatedElementProps) {
  return (
    <div id={id} className={cn(className)}>
      {children}
    </div>
  );
}

/**
 * Versão simplificada do componente AnimatedList sem animações
 * para melhorar a performance da página
 */
export function AnimatedList({
  children,
  className,
}: AnimatedElementProps) {
  return (
    <div className={cn(className)}>
      {children}
    </div>
  );
}

/**
 * Versão simplificada do componente AnimatedListItem sem animações
 * para melhorar a performance da página
 */
export function AnimatedListItem({
  children,
  className,
}: AnimatedElementProps) {
  return (
    <div className={cn(className)}>
      {children}
    </div>
  );
}