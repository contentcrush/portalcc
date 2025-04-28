import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { User } from "@shared/schema";
import { Building, User as UserIcon } from "lucide-react";

interface UserAvatarProps {
  user?: User | any; // Permitir que user seja opcional ou qualquer objeto
  className?: string;
}

function getInitials(name?: string): string {
  if (!name) return "US"; // User como fallback quando não há nome
  
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .substring(0, 2);
}

function getAvatarFallbackColor(name?: string): string {
  // Cores da nossa paleta para fallback (ajustar conforme paleta real do projeto)
  const colors = [
    "bg-blue-500",
    "bg-green-500",
    "bg-purple-500",
    "bg-orange-500",
    "bg-pink-500",
    "bg-teal-500",
    "bg-red-500",
    "bg-indigo-500",
  ];
  
  if (!name) return colors[0]; // Retornar a primeira cor se não houver nome
  
  // Gerar um índice baseado no nome
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  return colors[Math.abs(hash) % colors.length];
}

export function UserAvatar({ user, className = "" }: UserAvatarProps) {
  // Se user não for fornecido, usar um objeto vazio para evitar erros
  if (!user) {
    return (
      <Avatar className={className}>
        <AvatarFallback className="bg-gray-500 text-white">
          <UserIcon className="h-5 w-5" />
        </AvatarFallback>
      </Avatar>
    );
  }
  
  const userName = user.name || "Usuário";
  const fallbackClass = getAvatarFallbackColor(userName);
  
  return (
    <Avatar className={className}>
      <AvatarImage src={user.avatar_url || user.avatar || ""} alt={userName} />
      <AvatarFallback className={fallbackClass + " text-white"}>
        {user.user_type === 'pj' ? (
          <Building className="h-5 w-5" />
        ) : (
          getInitials(userName)
        )}
      </AvatarFallback>
    </Avatar>
  );
}

// Exportação padrão para compatibilidade com importações existentes
export default UserAvatar;