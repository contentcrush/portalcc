import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

// Interface para o contexto
interface FormPersistenceContextType {
  saveFormData: <T>(formId: string, data: T) => void;
  getFormData: <T>(formId: string) => T | null;
  clearFormData: (formId: string) => void;
  clearAllFormData: () => void;
}

// Criar contexto
const FormPersistenceContext = createContext<FormPersistenceContextType | undefined>(undefined);

// Prefixo para as chaves no localStorage
const STORAGE_PREFIX = 'content_crush_form_';

// Provider do contexto
export function FormPersistenceProvider({ children }: { children: ReactNode }) {
  // Função para salvar os dados do formulário
  const saveFormData = <T,>(formId: string, data: T) => {
    try {
      localStorage.setItem(`${STORAGE_PREFIX}${formId}`, JSON.stringify(data));
      console.log(`Formulário ${formId} salvo automaticamente`);
    } catch (error) {
      console.error('Erro ao salvar dados do formulário:', error);
    }
  };

  // Função para obter os dados do formulário
  const getFormData = <T,>(formId: string): T | null => {
    try {
      const storedData = localStorage.getItem(`${STORAGE_PREFIX}${formId}`);
      if (!storedData) return null;
      return JSON.parse(storedData) as T;
    } catch (error) {
      console.error('Erro ao recuperar dados do formulário:', error);
      return null;
    }
  };

  // Função para limpar os dados de um formulário específico
  const clearFormData = (formId: string) => {
    try {
      localStorage.removeItem(`${STORAGE_PREFIX}${formId}`);
    } catch (error) {
      console.error('Erro ao limpar dados do formulário:', error);
    }
  };

  // Função para limpar todos os dados de formulários
  const clearAllFormData = () => {
    try {
      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        if (key.startsWith(STORAGE_PREFIX)) {
          localStorage.removeItem(key);
        }
      });
    } catch (error) {
      console.error('Erro ao limpar todos os dados de formulários:', error);
    }
  };

  return (
    <FormPersistenceContext.Provider
      value={{ saveFormData, getFormData, clearFormData, clearAllFormData }}
    >
      {children}
    </FormPersistenceContext.Provider>
  );
}

// Hook para usar o contexto
export function useFormPersistence() {
  const context = useContext(FormPersistenceContext);
  if (context === undefined) {
    throw new Error('useFormPersistence deve ser usado dentro de um FormPersistenceProvider');
  }
  return context;
}

// Hook para persistir automaticamente um formulário específico
export function useFormPersistenceAutosave<T>(
  formId: string, 
  formData: T, 
  saveInterval = 3000, // Salvar a cada 3 segundos por padrão
  enabled = true
) {
  const { saveFormData, getFormData, clearFormData } = useFormPersistence();
  
  // Salvar dados do formulário periodicamente
  useEffect(() => {
    if (!enabled) return;
    
    const intervalId = setInterval(() => {
      saveFormData(formId, formData);
    }, saveInterval);
    
    // Também salvar ao desmontar o componente
    return () => {
      clearInterval(intervalId);
      saveFormData(formId, formData);
    };
  }, [formId, formData, saveInterval, enabled, saveFormData]);
  
  // Recuperar dados salvos (apenas uma vez durante a montagem)
  const getSavedData = (): T | null => {
    return getFormData<T>(formId);
  };
  
  // Limpar dados quando não forem mais necessários
  const clearSavedData = () => {
    clearFormData(formId);
  };
  
  return { getSavedData, clearSavedData };
}