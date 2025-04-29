import { ChangeEvent, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ImageIcon, UploadIcon, XIcon } from "lucide-react";

interface ImageUploadProps {
  value: string | null;
  onChange: (value: string | null) => void;
  onUpload?: (file: File) => Promise<string>;
}

export function ImageUpload({ value, onChange, onUpload }: ImageUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(value);

  const handleFilesChanged = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validar o tipo de arquivo
    const validImageTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/svg+xml', 'image/webp'];
    if (!validImageTypes.includes(file.type)) {
      console.error("Tipo de arquivo inválido:", file.type);
      alert("Por favor, selecione um formato de imagem válido (JPEG, PNG, GIF, SVG, WebP).");
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
          // Garantir que temos uma string limpa sem espaços extras
          const trimmedDataUrl = dataUrl.trim();
          
          // Verificar se a string base64 é válida
          if (trimmedDataUrl.startsWith('data:image/')) {
            const compressedDataUrl = trimmedDataUrl; // Mantenha a URL original por enquanto
            onChange(compressedDataUrl);
            setImagePreview(compressedDataUrl);
            console.log("Logo processado com sucesso, tamanho:", 
              Math.round(compressedDataUrl.length / 1024), "KB");
          } else {
            console.error("Formato de imagem inválido:", trimmedDataUrl.substring(0, 50));
            alert("Ocorreu um erro ao processar a imagem. Por favor, tente novamente.");
          }
        };
        reader.onerror = () => {
          console.error("Erro ao ler o arquivo");
          alert("Ocorreu um erro ao processar a imagem. Por favor, tente novamente.");
        };
        reader.readAsDataURL(file);
      }
    } catch (error) {
      console.error("Erro ao fazer upload da imagem:", error);
      alert("Ocorreu um erro ao processar a imagem. Por favor, tente novamente.");
    } finally {
      setIsUploading(false);
      // Limpar o input para permitir selecionar o mesmo arquivo novamente
      e.target.value = "";
    }
  };

  const handleRemoveImage = () => {
    onChange(null);
    setImagePreview(null);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Input
          type="file"
          accept="image/*"
          onChange={handleFilesChanged}
          className="hidden"
          id="image-upload"
          disabled={isUploading}
        />
        <label
          htmlFor="image-upload"
          className="flex cursor-pointer items-center justify-center gap-2 rounded-md border border-input bg-background px-3 py-2 text-sm font-medium text-muted-foreground shadow-sm hover:bg-accent hover:text-accent-foreground"
        >
          <UploadIcon className="h-4 w-4" />
          {isUploading ? "Enviando..." : "Selecionar imagem"}
        </label>
        {imagePreview && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleRemoveImage}
            type="button"
          >
            <XIcon className="h-4 w-4 mr-1" />
            Remover
          </Button>
        )}
      </div>

      {/* Preview da imagem se existir */}
      {imagePreview ? (
        <div className="relative mt-2 rounded-md overflow-hidden border border-border">
          <img
            src={imagePreview}
            alt="Preview"
            className="h-[180px] w-full object-cover"
          />
        </div>
      ) : (
        <div className="flex h-[180px] w-full items-center justify-center rounded-md border border-dashed border-muted-foreground/30 bg-muted/20">
          <div className="flex flex-col items-center justify-center text-sm text-muted-foreground">
            <ImageIcon className="h-8 w-8 mb-2" />
            <span>Nenhuma imagem selecionada</span>
          </div>
        </div>
      )}
    </div>
  );
}