"use client"

import * as React from "react"
import * as AvatarPrimitive from "@radix-ui/react-avatar"

import { cn } from "@/lib/utils"

const Avatar = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Root>
>(({ className, ...props }, ref) => (
  <AvatarPrimitive.Root
    ref={ref}
    className={cn(
      "relative flex h-10 w-10 shrink-0 overflow-hidden rounded-full",
      className
    )}
    {...props}
  />
))
Avatar.displayName = AvatarPrimitive.Root.displayName

const AvatarImage = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Image>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Image>
>(({ className, src, ...props }, ref) => {
  // Verificar se temos um src válido antes de tentar renderizar
  const [validSrc, setValidSrc] = React.useState<string | undefined>(
    typeof src === 'string' && src.trim().length > 0 ? src.trim() : undefined
  );
  
  // Validar o src quando ele mudar
  React.useEffect(() => {
    if (typeof src === 'string' && src.trim().length > 0) {
      // Sanitize src, garantindo que temos uma string válida sem espaços extras
      const sanitizedSrc = src.trim();
      
      // Apenas aceitar URLs que começam com http://, https:// ou data:image/
      if (sanitizedSrc.startsWith('http://') || 
          sanitizedSrc.startsWith('https://') || 
          sanitizedSrc.startsWith('data:image/')) {
        setValidSrc(sanitizedSrc);
      } else {
        console.warn("URL de imagem inválida:", sanitizedSrc.substring(0, 50));
        setValidSrc(undefined);
      }
    } else {
      setValidSrc(undefined);
    }
  }, [src]);
  
  // Adicione um manipulador de erro padrão se não for fornecido
  const defaultOnError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    console.warn("Erro ao carregar imagem de avatar:", validSrc?.substring(0, 100));
    // Esconder a imagem com erro, o que mostrará o fallback automaticamente
    e.currentTarget.style.display = 'none';
  };

  // Se não temos um src válido, nem renderize o componente de imagem
  if (!validSrc) {
    return null;
  }

  return (
    <AvatarPrimitive.Image
      ref={ref}
      src={validSrc}
      className={cn("aspect-square h-full w-full object-cover", className)}
      onError={props.onError || defaultOnError}
      {...props}
    />
  );
})
AvatarImage.displayName = AvatarPrimitive.Image.displayName

const AvatarFallback = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Fallback>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Fallback>
>(({ className, ...props }, ref) => (
  <AvatarPrimitive.Fallback
    ref={ref}
    className={cn(
      "flex h-full w-full items-center justify-center rounded-full bg-muted",
      className
    )}
    {...props}
  />
))
AvatarFallback.displayName = AvatarPrimitive.Fallback.displayName

export { Avatar, AvatarImage, AvatarFallback }
