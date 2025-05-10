import { ChangeEvent, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { User, UploadCloud, Check, X } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface AvatarUploadProps {
  value: string | null;
  onChange: (value: string | null) => void;
  name: string; // Nome do usuário para o fallback
  onUpload?: (file: File) => Promise<string>;
  size?: "sm" | "md" | "lg" | "xl";
}

export function AvatarUpload({ 
  value, 
  onChange, 
  name, 
  onUpload,
  size = "xl"
}: AvatarUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(value);

  // Definir tamanhos responsivos baseado no prop size
  const sizeClasses = {
    sm: "h-16 w-16",
    md: "h-24 w-24",
    lg: "h-32 w-32",
    xl: "h-40 w-40"
  };

  const avatarClass = sizeClasses[size];

  // Gerar iniciais para fallback
  const getInitials = (name: string) => {
    const names = name.split(' ');
    if (names.length === 1) return names[0].substring(0, 2).toUpperCase();
    return (names[0][0] + names[names.length - 1][0]).toUpperCase();
  };

  const handleFilesChanged = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validar o tipo e tamanho do arquivo
    const validImageTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!validImageTypes.includes(file.type)) {
      alert("Por favor, selecione um formato de imagem válido (JPEG, PNG, GIF, WebP).");
      e.target.value = "";
      return;
    }

    // Verificar tamanho (máximo 2MB)
    if (file.size > 2 * 1024 * 1024) {
      alert("A imagem deve ter no máximo 2MB.");
      e.target.value = "";
      return;
    }

    try {
      setIsUploading(true);
      
      // Se uma função de upload foi fornecida, use-a
      if (onUpload) {
        const uploadedUrl = await onUpload(file);
        onChange(uploadedUrl);
        setImagePreview(uploadedUrl);
      } else {
        // Caso contrário, use FileReader para criar uma prévia local
        const reader = new FileReader();
        reader.onload = (event) => {
          const dataUrl = event.target?.result as string;
          
          if (dataUrl && dataUrl.startsWith('data:image/')) {
            setImagePreview(dataUrl);
            onChange(dataUrl);
          } else {
            alert("Ocorreu um erro ao processar a imagem. Por favor, tente novamente.");
          }
        };
        reader.onerror = () => {
          alert("Ocorreu um erro ao processar a imagem. Por favor, tente novamente.");
        };
        
        reader.readAsDataURL(file);
      }
    } catch (error) {
      console.error("Erro ao fazer upload da imagem:", error);
      alert("Ocorreu um erro ao processar a imagem. Por favor, tente novamente.");
    } finally {
      setIsUploading(false);
      e.target.value = "";
    }
  };

  const handleRemoveImage = () => {
    onChange(null);
    setImagePreview(null);
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative">
        <Avatar className={`${avatarClass} border-4 border-background shadow-lg`}>
          <AvatarImage src={imagePreview || undefined} alt={name} className="object-cover" />
          <AvatarFallback className="bg-primary text-primary-foreground text-xl">
            {getInitials(name)}
          </AvatarFallback>
        </Avatar>
        
        <div className="absolute -bottom-2 -right-2 flex gap-1">
          <div className="relative group">
            <Input
              type="file"
              accept="image/*"
              onChange={handleFilesChanged}
              className="hidden"
              id="avatar-upload"
              disabled={isUploading}
            />
            <label
              htmlFor="avatar-upload"
              className="flex cursor-pointer items-center justify-center rounded-full border bg-background p-2 shadow-sm hover:bg-gray-100 transition-colors"
            >
              {isUploading ? 
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" /> : 
                <UploadCloud className="h-5 w-5 text-primary" />
              }
            </label>
            <span className="absolute bottom-full right-0 mb-2 hidden rounded-md bg-black px-2 py-1 text-xs text-white group-hover:block">
              Enviar foto
            </span>
          </div>

          {imagePreview && (
            <div className="relative group">
              <button
                type="button"
                onClick={handleRemoveImage}
                className="flex items-center justify-center rounded-full border bg-background p-2 shadow-sm hover:bg-gray-100 transition-colors"
              >
                <X className="h-5 w-5 text-destructive" />
              </button>
              <span className="absolute bottom-full right-0 mb-2 hidden rounded-md bg-black px-2 py-1 text-xs text-white group-hover:block">
                Remover foto
              </span>
            </div>
          )}
        </div>
      </div>
      
      <div className="text-center">
        <p className="text-sm text-muted-foreground">
          JPG, PNG ou GIF. Máximo 2MB.
        </p>
      </div>
    </div>
  );
}