import { useEffect, useState } from "react";
import { getInitials, generateAvatarColor } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

interface ClientAvatarProps {
  name: string;
  logoUrl: string | null | undefined;
  className?: string;
  size?: "xs" | "sm" | "md" | "lg";
}

export function ClientAvatar({ name, logoUrl, className = "", size = "md" }: ClientAvatarProps) {
  const [validLogo, setValidLogo] = useState<string | null>(null);
  const [error, setError] = useState(false);
  
  // Tamanhos pré-definidos
  const sizeClasses = {
    xs: "h-5 w-5",
    sm: "h-6 w-6",
    md: "h-10 w-10",
    lg: "h-16 w-16",
  };
  
  // Validar logo quando mudar
  useEffect(() => {
    setError(false);
    
    if (!logoUrl || typeof logoUrl !== 'string' || !logoUrl.trim()) {
      console.log(`ClientAvatar: Sem logo definido para "${name}"`);
      setValidLogo(null);
      return;
    }
    
    const trimmedLogo = logoUrl.trim();
    
    if (trimmedLogo.startsWith('data:image/') || 
        trimmedLogo.startsWith('http://') || 
        trimmedLogo.startsWith('https://')) {
      console.log(`ClientAvatar: Logo válido encontrado para "${name}"`);
      setValidLogo(trimmedLogo);
    } else {
      console.warn(`ClientAvatar: Formato de URL de logo inválido para "${name}"`);
      setValidLogo(null);
    }
  }, [logoUrl, name]);
  
  // Iniciais do cliente (fallback)
  const initials = getInitials(name);
  
  // Cor de fundo do avatar baseada no nome
  const backgroundColor = generateAvatarColor(name);

  return (
    <Avatar className={`${sizeClasses[size]} ${className} border border-gray-200`}>
      {!error && validLogo ? (
        <>
          <img 
            key={`logo-${name}-${Math.random()}`}
            src={validLogo} 
            alt={`Logo de ${name}`}
            className="h-full w-full object-cover relative z-10"
            style={{ position: 'absolute', top: 0, left: 0 }}
            onError={(e) => {
              console.error(`ClientAvatar: Erro ao carregar logo para "${name}"`, e);
              setError(true);
            }}
          />
        </>
      ) : null}
      <AvatarFallback 
        style={{ 
          backgroundColor, 
          color: 'white',
          position: !error && validLogo ? 'relative' : 'static',
          zIndex: !error && validLogo ? 5 : 10,
          fontSize: size === "xs" || size === "sm" ? "0.625rem" : undefined
        }}
      >
        {initials}
      </AvatarFallback>
    </Avatar>
  );
}