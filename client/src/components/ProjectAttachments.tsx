import { FC } from "react";
import EntityFileManager from "@/components/EntityFileManager";

interface ProjectAttachmentsProps {
  projectId: number;
  className?: string;
}

/**
 * Componente específico para gerenciar anexos de projetos
 * Utiliza o EntityFileManager com configurações específicas para projetos
 */
const ProjectAttachments: FC<ProjectAttachmentsProps> = ({
  projectId,
  className
}) => {
  return (
    <div className={className}>
      <EntityFileManager 
        entityId={projectId} 
        entityType="project" 
        title="ANEXOS"
        enableAdvancedUpload={true}
        className="border-none shadow-none px-0"
      />
    </div>
  );
};

export default ProjectAttachments;