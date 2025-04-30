import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { getQueryFn, queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";

// Tipos para preferências do usuário
type ThemeType = "light" | "dark" | "system";
type AccentColorType = "blue" | "green" | "purple" | "orange" | "red" | "pink";
type ViewModeType = "grid" | "list" | "table";

export interface UserPreference {
  id?: number;
  user_id: number;
  theme: ThemeType;
  accent_color: AccentColorType;
  clients_view_mode: ViewModeType;
  sidebar_collapsed: boolean;
  dashboard_widgets: string[];
  quick_actions: string[];
  updated_at?: Date;
}

interface PreferencesContextType {
  preferences: UserPreference | null;
  isLoading: boolean;
  error: Error | null;
  updatePreferences: (newPrefs: Partial<UserPreference>) => void;
  setTheme: (theme: ThemeType) => void;
  setAccentColor: (color: AccentColorType) => void;
  setClientsViewMode: (mode: ViewModeType) => void;
  toggleSidebar: () => void;
  updateDashboardWidgets: (widgets: string[]) => void;
  updateQuickActions: (actions: string[]) => void;
}

// Valores padrão para as preferências
const defaultPreferences: UserPreference = {
  user_id: 0,
  theme: "light",
  accent_color: "blue",
  clients_view_mode: "grid",
  sidebar_collapsed: false,
  dashboard_widgets: ["tasks", "projects", "clients"],
  quick_actions: ["new-task", "new-project", "new-client"]
};

const PreferencesContext = createContext<PreferencesContextType | undefined>(undefined);

export function PreferencesProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [preferences, setPreferences] = useState<UserPreference | null>(null);

  // Buscar preferências do usuário
  const { 
    data: fetchedPreferences,
    isLoading,
    error
  } = useQuery({
    queryKey: ["/api/user-preferences"],
    queryFn: getQueryFn({ on401: "returnNull" }),
    enabled: !!user // Só executa se o usuário estiver autenticado
  });

  // Atualizar preferências no estado quando vierem do servidor
  useEffect(() => {
    if (fetchedPreferences) {
      setPreferences(fetchedPreferences);
    } else if (user && !isLoading) {
      // Create default preferences if none exist
      const defaultPrefs: UserPreference = {
        ...defaultPreferences,
        user_id: user.id
      };
      setPreferences(defaultPrefs);
    }
  }, [fetchedPreferences, user, isLoading]);

  // Mutation para atualizar preferências
  const updatePreferencesMutation = useMutation({
    mutationFn: async (newPrefs: Partial<UserPreference>) => {
      const response = await apiRequest("PATCH", "/api/user-preferences", newPrefs);
      return await response.json();
    },
    onSuccess: (updatedPreferences: UserPreference) => {
      queryClient.setQueryData(["/api/user-preferences"], updatedPreferences);
      setPreferences(updatedPreferences);
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao atualizar preferências",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Funções auxiliares para operações específicas
  const updatePreferences = (newPrefs: Partial<UserPreference>) => {
    updatePreferencesMutation.mutate(newPrefs);
  };

  const setTheme = (theme: ThemeType) => {
    updatePreferences({ theme });
  };

  const setAccentColor = (accent_color: AccentColorType) => {
    updatePreferences({ accent_color });
  };

  const setClientsViewMode = (clients_view_mode: ViewModeType) => {
    updatePreferences({ clients_view_mode });
  };

  const toggleSidebar = () => {
    if (preferences) {
      updatePreferences({ sidebar_collapsed: !preferences.sidebar_collapsed });
    }
  };

  const updateDashboardWidgets = (dashboard_widgets: string[]) => {
    updatePreferences({ dashboard_widgets });
  };

  const updateQuickActions = (quick_actions: string[]) => {
    updatePreferences({ quick_actions });
  };

  // Aplicar o tema quando as preferências mudarem
  useEffect(() => {
    if (preferences) {
      // Aplicar o tema ao elemento HTML
      const htmlElement = document.documentElement;
      const theme = preferences.theme === "system" 
        ? window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"
        : preferences.theme;

      if (theme === "dark") {
        htmlElement.classList.add("dark");
      } else {
        htmlElement.classList.remove("dark");
      }

      // Aplicar cor de destaque
      htmlElement.setAttribute("data-accent", preferences.accent_color);
    }
  }, [preferences?.theme, preferences?.accent_color]);

  return (
    <PreferencesContext.Provider
      value={{
        preferences,
        isLoading,
        error,
        updatePreferences,
        setTheme,
        setAccentColor,
        setClientsViewMode,
        toggleSidebar,
        updateDashboardWidgets,
        updateQuickActions
      }}
    >
      {children}
    </PreferencesContext.Provider>
  );
}

export function usePreferences() {
  const context = useContext(PreferencesContext);
  if (context === undefined) {
    throw new Error("usePreferences must be used within a PreferencesProvider");
  }
  return context;
}