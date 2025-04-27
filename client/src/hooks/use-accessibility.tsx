import React, { createContext, useContext, useEffect, useState } from "react";

interface AccessibilityContextType {
  highContrast: boolean;
  largeText: boolean;
  reducedMotion: boolean;
  screenReaderMode: boolean;
  toggleHighContrast: () => void;
  toggleLargeText: () => void;
  toggleReducedMotion: () => void;
  toggleScreenReaderMode: () => void;
  resetAccessibility: () => void;
}

const AccessibilityContext = createContext<AccessibilityContextType | undefined>(undefined);

export function AccessibilityProvider({ children }: { children: React.ReactNode }) {
  // Tenta carregar configurações do localStorage, ou usa valores padrão
  const [highContrast, setHighContrast] = useState(() => {
    const saved = localStorage.getItem("accessibility_highContrast");
    return saved ? saved === "true" : false;
  });
  
  const [largeText, setLargeText] = useState(() => {
    const saved = localStorage.getItem("accessibility_largeText");
    return saved ? saved === "true" : false;
  });
  
  const [reducedMotion, setReducedMotion] = useState(() => {
    const saved = localStorage.getItem("accessibility_reducedMotion");
    return saved ? saved === "true" : false;
  });
  
  const [screenReaderMode, setScreenReaderMode] = useState(() => {
    const saved = localStorage.getItem("accessibility_screenReaderMode");
    return saved ? saved === "true" : false;
  });

  // Funções para alternar configurações
  const toggleHighContrast = () => {
    setHighContrast(prev => !prev);
  };

  const toggleLargeText = () => {
    setLargeText(prev => !prev);
  };

  const toggleReducedMotion = () => {
    setReducedMotion(prev => !prev);
  };

  const toggleScreenReaderMode = () => {
    setScreenReaderMode(prev => !prev);
  };

  const resetAccessibility = () => {
    setHighContrast(false);
    setLargeText(false);
    setReducedMotion(false);
    setScreenReaderMode(false);
  };

  // Efeito para salvar configurações no localStorage e aplicar classes CSS
  useEffect(() => {
    // Salvar no localStorage
    localStorage.setItem("accessibility_highContrast", String(highContrast));
    localStorage.setItem("accessibility_largeText", String(largeText));
    localStorage.setItem("accessibility_reducedMotion", String(reducedMotion));
    localStorage.setItem("accessibility_screenReaderMode", String(screenReaderMode));

    // Aplicar classes ao elemento HTML
    const htmlElement = document.documentElement;
    
    if (highContrast) {
      htmlElement.classList.add("high-contrast");
    } else {
      htmlElement.classList.remove("high-contrast");
    }
    
    if (largeText) {
      htmlElement.classList.add("large-text");
    } else {
      htmlElement.classList.remove("large-text");
    }
    
    if (reducedMotion) {
      htmlElement.classList.add("reduced-motion");
    } else {
      htmlElement.classList.remove("reduced-motion");
    }
    
    if (screenReaderMode) {
      htmlElement.classList.add("screen-reader");
      // Adiciona atributos ARIA quando necessário
      document.querySelectorAll("img:not([aria-hidden='true'])").forEach(img => {
        if (!img.getAttribute("alt")) {
          img.setAttribute("alt", img.getAttribute("src") || "Imagem sem descrição");
        }
      });
    } else {
      htmlElement.classList.remove("screen-reader");
    }
  }, [highContrast, largeText, reducedMotion, screenReaderMode]);

  return (
    <AccessibilityContext.Provider
      value={{
        highContrast,
        largeText,
        reducedMotion,
        screenReaderMode,
        toggleHighContrast,
        toggleLargeText,
        toggleReducedMotion,
        toggleScreenReaderMode,
        resetAccessibility
      }}
    >
      {children}
    </AccessibilityContext.Provider>
  );
}

export function useAccessibility() {
  const context = useContext(AccessibilityContext);
  if (context === undefined) {
    throw new Error("useAccessibility must be used within an AccessibilityProvider");
  }
  return context;
}