import { ChangeEvent, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ImageIcon, UploadIcon, XIcon } from "lucide-react";
import { compressBase64Image, fileToCompressedBase64, getImageInfo } from "@/lib/image-compression";

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

    // Log para diagnóstico
    console.log("Upload iniciado - Tipo de arquivo:", file.type, "Tamanho:", Math.round(file.size/1024), "KB");

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
        console.log("Upload externo completo, URL recebida:", 
          uploadedUrl.length > 50 ? uploadedUrl.substring(0, 50) + "..." : uploadedUrl);
        onChange(uploadedUrl);
        setImagePreview(uploadedUrl);
      } else {
        // Usar compressão automática para converter o arquivo
        console.log("Iniciando conversão com compressão automática");
        
        try {
          const compressedDataUrl = await fileToCompressedBase64(file, {
            maxWidth: 800,
            maxHeight: 600,
            quality: 0.85,
            maxSizeKB: 500
          });
          
          const imageInfo = getImageInfo(compressedDataUrl);
          console.log("Compressão concluída:", {
            tipo: imageInfo.type,
            tamanhoFinal: `${imageInfo.sizeKB}KB`,
            otimizada: imageInfo.isLarge ? 'Sim' : 'Não'
          });
          
          // Importante: atualizar estado e chamar onChange com o valor comprimido
          setImagePreview(compressedDataUrl);
          onChange(compressedDataUrl);
          
          console.log("Preview e formulário atualizados com imagem otimizada");
          
        } catch (compressionError) {
          console.error("Erro na compressão, tentando método original:", compressionError);
          
          // Fallback para o método original se a compressão falhar
          const reader = new FileReader();
          reader.onload = (event) => {
            const dataUrl = event.target?.result as string;
            const trimmedDataUrl = dataUrl.trim();
            
            if (trimmedDataUrl.startsWith('data:image/')) {
              setImagePreview(trimmedDataUrl);
              onChange(trimmedDataUrl);
              console.log("Método de fallback aplicado com sucesso");
            } else {
              console.error("Formato de imagem inválido");
              alert("Ocorreu um erro ao processar a imagem. Por favor, tente novamente.");
            }
          };
          reader.onerror = () => {
            console.error("Erro ao ler o arquivo");
            alert("Ocorreu um erro ao processar a imagem. Por favor, tente novamente.");
          };
          reader.readAsDataURL(file);
        }
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