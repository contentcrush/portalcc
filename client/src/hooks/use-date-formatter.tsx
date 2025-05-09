import React, { createContext, useContext, ReactNode } from 'react';
import {
  formatDateToLocal,
  formatDateTimeToLocal,
  formatDateTimeWithTZ,
  getUserTimeZone,
  localDateToUTC,
  utcToLocalDate,
  isDateInPast
} from '@/lib/date-utils';

// Interface para o contexto
interface DateFormatterContextType {
  // Funções de formatação
  formatDate: (date: string | Date | null | undefined, format?: string) => string;
  formatDateTime: (date: string | Date | null | undefined, format?: string) => string;
  formatDateWithTZ: (date: string | Date | null | undefined, format?: string) => string;
  
  // Funções de conversão
  toUTC: (localDate: Date) => string;
  toLocal: (utcDate: string | Date) => Date;
  
  // Helpers
  getUserTZ: () => string;
  isPast: (date: string | Date | null | undefined) => boolean;
}

// Criar o contexto
const DateFormatterContext = createContext<DateFormatterContextType | undefined>(undefined);

// Provedor do contexto
export const DateFormatterProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Implementação das funções do contexto
  const contextValue: DateFormatterContextType = {
    formatDate: formatDateToLocal,
    formatDateTime: formatDateTimeToLocal,
    formatDateWithTZ: formatDateTimeWithTZ,
    toUTC: localDateToUTC,
    toLocal: utcToLocalDate,
    getUserTZ: getUserTimeZone,
    isPast: isDateInPast,
  };

  return (
    <DateFormatterContext.Provider value={contextValue}>
      {children}
    </DateFormatterContext.Provider>
  );
};

// Hook customizado
export const useDateFormatter = (): DateFormatterContextType => {
  const context = useContext(DateFormatterContext);
  
  if (context === undefined) {
    // Oferecer implementação padrão mesmo se não estiver em um provider
    // para flexibilidade nas importações
    return {
      formatDate: formatDateToLocal,
      formatDateTime: formatDateTimeToLocal,
      formatDateWithTZ: formatDateTimeWithTZ,
      toUTC: localDateToUTC,
      toLocal: utcToLocalDate,
      getUserTZ: getUserTimeZone,
      isPast: isDateInPast,
    };
  }
  
  return context;
};

// HOC para componentes que precisam de formatação de datas
export function withDateFormatter<T>(Component: React.ComponentType<T & { dateFormatter: DateFormatterContextType }>) {
  return (props: T) => {
    const dateFormatter = useDateFormatter();
    return <Component {...props} dateFormatter={dateFormatter} />;
  };
}