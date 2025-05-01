import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { User } from "@shared/schema";
import { useState, useEffect } from "react";

interface UserAvatarProps {
  user: User | undefined;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function UserAvatar({ user, size = "md", className = "" }: UserAvatarProps) {
  const [imageError, setImageError] = useState(false);
  
  // Resetar o erro da imagem se o usuário mudar
  useEffect(() => {
    setImageError(false);
  }, [user?.id]);
  
  // Determinar o tamanho do avatar
  const sizeClass = {
    sm: "h-6 w-6 text-xs",
    md: "h-8 w-8 text-sm",
    lg: "h-10 w-10 text-base"
  }[size];
  
  // Gerar iniciais do usuário
  const getUserInitials = () => {
    if (!user?.name) return "?";
    const parts = user.name.trim().split(" ");
    if (parts.length === 1) return parts[0][0].toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };
  
  // Gerar cor de fundo baseada no nome do usuário para consistência
  const getBackgroundColor = () => {
    if (!user?.name) return "bg-gray-400";
    
    // Cores disponíveis para avatares
    const colors = [
      "bg-red-500", "bg-amber-500", "bg-emerald-500", 
      "bg-cyan-500", "bg-blue-500", "bg-indigo-500", 
      "bg-purple-500", "bg-pink-500"
    ];
    
    // Usar o ID do usuário ou um hash simples do nome para escolher uma cor
    const colorIndex = user.id ? user.id % colors.length : 
      user.name.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0) % colors.length;
    
    return colors[colorIndex];
  };
  
  return (
    <Avatar className={`${sizeClass} ${className}`}>
      {user?.avatar && !imageError ? (
        <AvatarImage 
          src={user.avatar} 
          alt={user.name || "User"} 
          onError={() => setImageError(true)}
        />
      ) : null}
      <AvatarFallback className={getBackgroundColor()}>
        {getUserInitials()}
      </AvatarFallback>
    </Avatar>
  );
}