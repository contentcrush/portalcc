import { useEffect, useState } from "react";
import { getInitials, generateAvatarColor } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

interface ClientAvatarProps {
  name: string;
  logoUrl: string | null | undefined;
  className?: string;
  size?: "sm" | "md" | "lg";
}

export function ClientAvatar({ name, logoUrl, className = "", size = "md" }: ClientAvatarProps) {
  const [validLogo, setValidLogo] = useState<string | null>(null);
  const [error, setError] = useState(false);
  
  // Tamanhos pré-definidos
  const sizeClasses = {
    sm: "h-8 w-8",
    md: "h-12 w-12",
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
  
  // Log para diagnóstico
  console.log(`ClientAvatar (${name}):`, { 
    logoUrl, 
    validLogo, 
    error, 
    hasLogo: !!validLogo && !error 
  });

  return (
    <Avatar className={`${sizeClasses[size]} ${className}`}>
      {!error && validLogo ? (
        <img 
          src={validLogo} 
          alt={`Logo de ${name}`}
          className="h-full w-full object-cover"
          onError={(e) => {
            console.error(`ClientAvatar: Erro ao carregar logo para "${name}"`, e);
            // Log do elemento que falhou
            console.error("Elemento que falhou:", e.currentTarget.outerHTML);
            // Log da URL que falhou
            console.error("URL que falhou:", e.currentTarget.src);
            setError(true);
          }}
        />
      ) : null}
      <AvatarFallback 
        style={{ 
          backgroundColor, 
          color: 'white' 
        }}
      >
        {initials}
      </AvatarFallback>
    </Avatar>
  );
}