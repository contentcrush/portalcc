import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { UploadCloud, X, FileText, File, Image, Film, Music } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

type FileUploadProps = {
  onUpload: (files: File[]) => void;
  onRemove?: (file: File) => void;
  maxFiles?: number;
  maxSize?: number;
  accept?: Record<string, string[]>;
  className?: string;
  uploading?: boolean;
  progress?: number;
  uploadedFiles?: (File & { id?: string; url?: string })[];
};

const getFileIcon = (file: File) => {
  const type = file.type.split('/')[0];
  
  switch (type) {
    case 'image':
      return <Image className="h-5 w-5 text-blue-500" />;
    case 'application':
      return <FileText className="h-5 w-5 text-red-500" />;
    case 'text':
      return <File className="h-5 w-5 text-green-500" />;
    case 'video':
      return <Film className="h-5 w-5 text-purple-500" />;
    case 'audio':
      return <Music className="h-5 w-5 text-yellow-500" />;
    default:
      return <FileText className="h-5 w-5 text-gray-500" />;
  }
};

export function FileUpload({
  onUpload,
  onRemove,
  maxFiles = 5,
  maxSize = 10 * 1024 * 1024, // 10MB
  accept,
  className,
  uploading = false,
  progress = 0,
  uploadedFiles = []
}: FileUploadProps) {
  const [files, setFiles] = useState<File[]>([]);

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      // Limitar o número de arquivos
      const totalFiles = [...files, ...acceptedFiles];
      
      if (totalFiles.length > maxFiles) {
        alert(`Você só pode enviar até ${maxFiles} arquivos de uma vez.`);
        return;
      }
      
      setFiles(prev => [...prev, ...acceptedFiles]);
      onUpload(acceptedFiles);
    },
    [files, maxFiles, onUpload]
  );

  const removeFile = (fileToRemove: File) => {
    setFiles(files.filter(file => file !== fileToRemove));
    if (onRemove) onRemove(fileToRemove);
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    maxSize,
    accept,
    disabled: uploading
  });

  const allFiles = [...files, ...uploadedFiles];

  return (
    <div className={className}>
      <div
        {...getRootProps()}
        className={cn(
          'flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-md cursor-pointer',
          isDragActive 
            ? 'border-primary bg-primary/5'
            : 'border-muted-foreground/25 hover:border-primary/50',
          className
        )}
      >
        <input {...getInputProps()} />
        <UploadCloud className="h-10 w-10 text-muted-foreground/70 mb-2" />
        <p className="text-sm text-muted-foreground text-center mb-1">
          {isDragActive
            ? 'Solte os arquivos aqui...'
            : 'Arraste arquivos ou clique para selecioná-los'}
        </p>
        <p className="text-xs text-muted-foreground text-center">
          Tamanho máximo: {Math.round(maxSize / 1024 / 1024)}MB. Máximo de {maxFiles} arquivos.
        </p>
        {!isDragActive && (
          <Button 
            variant="outline" 
            size="sm" 
            className="mt-2"
            type="button"
            disabled={uploading}
          >
            Selecionar arquivos
          </Button>
        )}
      </div>
      
      {uploading && progress > 0 && (
        <div className="mt-4">
          <Progress value={progress} className="h-2 w-full" />
          <p className="text-xs text-center mt-1">Enviando... {progress}%</p>
        </div>
      )}
      
      {allFiles.length > 0 && (
        <div className="mt-4 space-y-2">
          <p className="text-sm font-medium">Arquivos ({allFiles.length})</p>
          <div className="max-h-[200px] overflow-y-auto">
            {allFiles.map((file, index) => (
              <div 
                key={file.name + index} 
                className="flex items-center justify-between py-2 px-3 bg-accent/50 rounded-md"
              >
                <div className="flex items-center overflow-hidden">
                  {getFileIcon(file)}
                  <div className="ml-2 overflow-hidden">
                    <p className="text-sm font-medium truncate" title={file.name}>
                      {file.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {(file.size / 1024).toFixed(1)} KB
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-muted-foreground hover:text-destructive"
                  onClick={() => removeFile(file)}
                  disabled={uploading}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}