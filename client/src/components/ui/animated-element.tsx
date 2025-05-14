import { ReactNode } from "react";
import { motion, AnimatePresence, Variants, MotionProps } from "framer-motion";
import { animations } from "@/lib/utils";
import { cn } from "@/lib/utils";

type AnimationType = keyof typeof animations;

type AnimatedElementProps = {
  children: ReactNode;
  type?: AnimationType;
  className?: string;
  show?: boolean;
  customVariants?: Variants;
  asElement?: keyof JSX.IntrinsicElements;
  id?: string;
} & MotionProps;

/**
 * Componente utilitário para aplicar animações consistentes em elementos da UI
 * 
 * @param children Conteúdo do elemento
 * @param type Tipo de animação pré-definida (do objeto animations)
 * @param className Classes CSS adicionais
 * @param show Controla a visibilidade do elemento (para AnimatePresence)
 * @param customVariants Variantes personalizadas (substitui o tipo pré-definido)
 * @param asElement Elemento HTML a ser renderizado (padrão: div)
 * @param id ID do elemento
 * @param ...props Outras propriedades motion
 * 
 * @returns Elemento animado
 */
export function AnimatedElement({
  children,
  type = "fadeIn",
  className,
  show = true,
  customVariants,
  asElement = "div",
  id,
  ...props
}: AnimatedElementProps) {
  const MotionComponent = motion[asElement as keyof typeof motion] || motion.div;
  const variants = customVariants || animations[type];
  
  return (
    <AnimatePresence mode="wait">
      {show && (
        <MotionComponent
          id={id}
          className={cn(className)}
          initial={variants.initial}
          animate={variants.animate}
          exit={variants.exit || variants.initial}
          transition={variants.transition}
          {...props}
        >
          {children}
        </MotionComponent>
      )}
    </AnimatePresence>
  );
}

/**
 * Componente utilitário para animar entrada e saída de listas de items
 * 
 * @param children Conteúdo da lista
 * @param className Classes CSS adicionais
 * @param asElement Elemento HTML a ser renderizado (padrão: div)
 * @param staggerChildren Delay entre animações de filhos
 * @param ...props Outras propriedades motion
 * 
 * @returns Container animado para lista de itens
 */
export function AnimatedList({
  children,
  className,
  asElement = "div",
  staggerChildren = 0.05,
  ...props
}: Omit<AnimatedElementProps, "type" | "customVariants"> & { staggerChildren?: number }) {
  const MotionComponent = motion[asElement as keyof typeof motion] || motion.div;
  
  return (
    <MotionComponent
      className={cn(className)}
      initial="initial"
      animate="animate"
      exit="exit"
      variants={{
        animate: {
          transition: { staggerChildren }
        }
      }}
      {...props}
    >
      {children}
    </MotionComponent>
  );
}

/**
 * Componente utilitário para itens dentro de listas animadas
 * 
 * @param children Conteúdo do item
 * @param className Classes CSS adicionais
 * @param type Tipo de animação (padrão: itemAdded)
 * @param asElement Elemento HTML a ser renderizado (padrão: div)
 * @param ...props Outras propriedades motion
 * 
 * @returns Item animado para uso dentro de AnimatedList
 */
export function AnimatedListItem({
  children,
  className,
  type = "itemAdded",
  asElement = "div",
  ...props
}: Omit<AnimatedElementProps, "customVariants" | "show">) {
  const MotionComponent = motion[asElement as keyof typeof motion] || motion.div;
  const variants = animations[type];
  
  return (
    <MotionComponent
      className={cn(className)}
      variants={variants}
      {...props}
    >
      {children}
    </MotionComponent>
  );
}