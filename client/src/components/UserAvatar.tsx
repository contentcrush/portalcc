import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { getInitials, generateAvatarColor } from "@/lib/utils";

interface UserAvatarProps {
  user?: {
    name?: string;
    avatar?: string;
  } | null;
  className?: string;
}

export default function UserAvatar({ user, className = "" }: UserAvatarProps) {
  if (!user) {
    return (
      <Avatar className={className}>
        <AvatarFallback className="bg-gray-200 text-gray-600">
          ?
        </AvatarFallback>
      </Avatar>
    );
  }
  
  const bgColor = generateAvatarColor(user.name || '');
  const initials = getInitials(user.name || '');
  
  return (
    <Avatar className={className}>
      {user.avatar ? (
        <AvatarImage src={user.avatar} alt={user.name || 'User'} />
      ) : null}
      <AvatarFallback style={{ backgroundColor: bgColor, color: 'white' }}>
        {initials}
      </AvatarFallback>
    </Avatar>
  );
}
