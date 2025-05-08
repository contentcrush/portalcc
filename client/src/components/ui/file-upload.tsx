import React, { useCallback, useState } from 'react';
import { useDropzone, FileRejection, Accept } from 'react-dropzone';
import { Loader2, Upload, XCircle, CheckCircle2, File, AlertCircle } from 'lucide-react';
import { Button } from './button';
import { formatFileSize } from '@/lib/utils';

interface FileUploadProps {
  onUpload: (files: File[]) => void;
  isUploading?: boolean;
  maxFiles?: number;
  maxSize?: number; // em bytes
  accept?: Accept;
}

export function FileUpload({
  onUpload,
  isUploading = false,
  maxFiles = 5,
  maxSize = 10 * 1024 * 1024, // 10MB por padrão
  accept,
}: FileUploadProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [rejectedFiles, setRejectedFiles] = useState<FileRejection[]>([]);

  const onDrop = useCallback(
    (acceptedFiles: File[], rejected: FileRejection[]) => {
      // Verificar se ultrapassaria o limite de arquivos
      if (files.length + acceptedFiles.length > maxFiles) {
        const remainingSlots = Math.max(0, maxFiles - files.length);
        // Adicionar apenas até o limite
        const limitedFiles = acceptedFiles.slice(0, remainingSlots);
        setFiles((prev) => [...prev, ...limitedFiles]);
        
        // Mover os demais para rejeitados com motivo específico
        const overLimitFiles = acceptedFiles.slice(remainingSlots).map(file => ({
          file,
          errors: [{ code: 'too-many-files', message: `Limite de ${maxFiles} arquivos excedido` }]
        }));
        
        setRejectedFiles((prev) => [...prev, ...rejected, ...overLimitFiles]);
      } else {
        setFiles((prev) => [...prev, ...acceptedFiles]);
        setRejectedFiles((prev) => [...prev, ...rejected]);
      }
    },
    [files.length, maxFiles]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    maxFiles,
    maxSize,
    accept,
  });

  const removeFile = (name: string) => {
    setFiles((files) => files.filter((file) => file.name !== name));
  };

  const removeRejectedFile = (name: string) => {
    setRejectedFiles((files) => files.filter((file) => file.file.name !== name));
  };

  const handleSubmit = useCallback(() => {
    if (files.length > 0) {
      onUpload(files);
    }
  }, [files, onUpload]);

  return (
    <div className="w-full">
      <div
        {...getRootProps()}
        className={`
          p-6 border-2 border-dashed rounded-md cursor-pointer transition-colors
          ${isDragActive 
            ? 'border-primary bg-primary/10' 
            : 'border-muted-foreground/25 hover:border-primary/50'
          }
        `}
      >
        <input {...getInputProps()} />
        <div className="flex flex-col items-center justify-center gap-1 text-center">
          <Upload className="h-10 w-10 text-muted-foreground mb-2" />
          {isDragActive ? (
            <p className="text-sm font-medium">Solte os arquivos aqui...</p>
          ) : (
            <>
              <p className="text-sm font-medium">
                Arraste e solte arquivos aqui, ou clique para selecionar
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Até {maxFiles} arquivos &bull; Máximo {formatBytes(maxSize)} por arquivo
              </p>
            </>
          )}
        </div>
      </div>

      {/* Lista de arquivos aceitos */}
      {files.length > 0 && (
        <div className="mt-4">
          <h3 className="text-sm font-medium mb-3">Arquivos para upload ({files.length}/{maxFiles})</h3>
          <div className="space-y-2">
            {files.map((file) => (
              <div
                key={file.name}
                className="flex items-center justify-between p-3 border rounded-md bg-background"
              >
                <div className="flex items-center gap-2 overflow-hidden">
                  <File className="h-5 w-5 text-blue-500 flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate" title={file.name}>
                      {file.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatBytes(file.size)}
                    </p>
                  </div>
                </div>
                {!isUploading && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeFile(file.name)}
                    className="rounded-full"
                  >
                    <XCircle className="h-5 w-5 hover:text-destructive" />
                  </Button>
                )}
                {isUploading && (
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Lista de arquivos rejeitados */}
      {rejectedFiles.length > 0 && (
        <div className="mt-4">
          <h3 className="text-sm font-medium text-destructive mb-3">Arquivos rejeitados</h3>
          <div className="space-y-2">
            {rejectedFiles.map(({ file, errors }) => (
              <div
                key={file.name}
                className="flex items-center justify-between p-3 border border-destructive/50 rounded-md bg-destructive/5"
              >
                <div className="flex items-start gap-2 overflow-hidden">
                  <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate" title={file.name}>
                      {file.name}
                    </p>
                    <ul className="text-xs text-destructive mt-1">
                      {errors.map((error) => (
                        <li key={error.code}>{error.message}</li>
                      ))}
                    </ul>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removeRejectedFile(file.name)}
                  className="rounded-full"
                >
                  <XCircle className="h-5 w-5 hover:text-destructive" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {files.length > 0 && (
        <div className="mt-4 flex justify-end">
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={isUploading || files.length === 0}
            className="w-full sm:w-auto"
          >
            {isUploading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Enviando...
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                Enviar {files.length} arquivo{files.length !== 1 ? 's' : ''}
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}