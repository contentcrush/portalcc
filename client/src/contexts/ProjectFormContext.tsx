import { createContext, useState, useContext, ReactNode } from "react";

interface ProjectFormContextData {
  isFormOpen: boolean;
  openProjectForm: () => void;
  closeProjectForm: () => void;
  projectToEdit: any | null;
  setProjectToEdit: (project: any | null) => void;
}

const ProjectFormContext = createContext<ProjectFormContextData>({} as ProjectFormContextData);

export function ProjectFormProvider({ children }: { children: ReactNode }) {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [projectToEdit, setProjectToEdit] = useState<any | null>(null);

  function openProjectForm() {
    setIsFormOpen(true);
  }

  function closeProjectForm() {
    setIsFormOpen(false);
    setProjectToEdit(null);
  }

  return (
    <ProjectFormContext.Provider
      value={{
        isFormOpen,
        openProjectForm,
        closeProjectForm,
        projectToEdit,
        setProjectToEdit,
      }}
    >
      {children}
    </ProjectFormContext.Provider>
  );
}

export function useProjectForm() {
  const context = useContext(ProjectFormContext);

  if (!context) {
    throw new Error("useProjectForm must be used within a ProjectFormProvider");
  }

  return context;
}