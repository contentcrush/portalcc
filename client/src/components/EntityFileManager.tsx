import { useState } from "react";
import FileAttachments, { ApiAttachment } from "./FileAttachments";
import AdvancedFileUpload from "./AdvancedFileUpload";
import FilePreview from "./FilePreview";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { UploadCloud } from "lucide-react";

interface EntityFileManagerProps {
  entityId: number;
  entityType: "client" | "project" | "task";
  className?: string;
  title?: string;
  enableAdvancedUpload?: boolean;
}

/**
 * Componente unificado para gerenciar arquivos de uma entidade (cliente, projeto ou tarefa)
 * Integra FileAttachments e AdvancedFileUpload em uma interface consistente
 */
export default function EntityFileManager({
  entityId,
  entityType,
  className = "",
  title = "Arquivos",
  enableAdvancedUpload = true,
}: EntityFileManagerProps) {
  const [previewOpen, setPreviewOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<ApiAttachment | null>(null);

  // Função para abrir a visualização do arquivo
  const handleOpenPreview = (attachment: ApiAttachment) => {
    setSelectedFile(attachment);
    setPreviewOpen(true);
  };

  // Função chamada quando o upload é bem-sucedido
  const handleUploadSuccess = (attachment: ApiAttachment) => {
    console.log("Upload concluído com sucesso:", attachment);
  };

  return (
    <div className={className}>
      <Card>
        <CardHeader className="px-6 py-4">
          <div className="flex justify-between items-center">
            <CardTitle className="text-sm font-medium uppercase text-gray-500">{title}</CardTitle>
            {enableAdvancedUpload && (
              <AdvancedFileUpload
                defaultEntityType={entityType}
                defaultEntityId={entityId}
                buttonVariant="outline"
                buttonClassName="h-8 text-xs"
                buttonText="Upload Avançado"
                buttonIcon={true}
                onSuccess={handleUploadSuccess}
              />
            )}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <FileAttachments
            entityId={entityId}
            entityType={entityType}
            autoFetch={true}
            onUploadSuccess={handleUploadSuccess}
            className="border-0 shadow-none"
          />
        </CardContent>
      </Card>

      {/* Modal de Visualização do Arquivo */}
      {selectedFile && (
        <FilePreview
          open={previewOpen}
          onClose={() => setPreviewOpen(false)}
          file={{
            id: selectedFile.id,
            name: selectedFile.file_name,
            file_name: selectedFile.file_name,
            file_size: selectedFile.file_size || 0,
            file_type: selectedFile.file_type || 'application/octet-stream',
            file_url: selectedFile.file_url || '',
            type: entityType,
            entity_id: entityId,
            uploaded_at: selectedFile.created_at || new Date().toISOString(),
            uploaded_by: selectedFile.uploaded_by || null
          }}
        />
      )}
    </div>
  );
}