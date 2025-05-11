import { useState, useEffect, useCallback } from 'react';

type AnimationState = 'idle' | 'processing' | 'success' | 'error';
type FeedbackOptions = {
  successDuration?: number;
  errorDuration?: number;
  onSuccess?: () => void;
  onError?: () => void;
  onProcessingStart?: () => void;
  onProcessingEnd?: () => void;
};

/**
 * Hook para fornecer feedback visual com animações para ações assíncronas
 * 
 * @param options Opções de configuração das animações e callbacks
 * @returns Objeto com estado atual da animação e funções para controlar o feedback
 */
export function useAnimationFeedback(options: FeedbackOptions = {}) {
  const {
    successDuration = 1500,
    errorDuration = 3000,
    onSuccess,
    onError,
    onProcessingStart,
    onProcessingEnd,
  } = options;

  const [state, setState] = useState<AnimationState>('idle');
  const [error, setError] = useState<Error | null>(null);

  // Resetar para o estado inicial após o timeout
  useEffect(() => {
    let timer: NodeJS.Timeout;

    if (state === 'success') {
      timer = setTimeout(() => {
        setState('idle');
      }, successDuration);
    } else if (state === 'error') {
      timer = setTimeout(() => {
        setState('idle');
        setError(null);
      }, errorDuration);
    }

    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [state, successDuration, errorDuration]);

  // Callback quando o processamento está iniciando
  useEffect(() => {
    if (state === 'processing') {
      onProcessingStart?.();
    }
  }, [state, onProcessingStart]);

  // Callback quando o processamento está terminando (success ou error)
  useEffect(() => {
    if (state === 'success' || state === 'error') {
      onProcessingEnd?.();
    }
  }, [state, onProcessingEnd]);

  // Callback específico para sucesso
  useEffect(() => {
    if (state === 'success') {
      onSuccess?.();
    }
  }, [state, onSuccess]);

  // Callback específico para erro
  useEffect(() => {
    if (state === 'error') {
      onError?.();
    }
  }, [state, onError]);

  // Executar uma ação assíncrona com feedback de animação
  const executeWithFeedback = useCallback(
    async <T>(asyncFn: () => Promise<T>): Promise<T> => {
      setState('processing');
      
      try {
        const result = await asyncFn();
        setState('success');
        return result;
      } catch (err) {
        setState('error');
        setError(err instanceof Error ? err : new Error(String(err)));
        throw err;
      }
    },
    []
  );

  // Configurar manualmente o estado
  const setSuccess = useCallback(() => {
    setState('success');
  }, []);

  const setError = useCallback((err: Error) => {
    setState('error');
    setError(err);
  }, []);

  const setProcessing = useCallback(() => {
    setState('processing');
  }, []);

  const reset = useCallback(() => {
    setState('idle');
    setError(null);
  }, []);

  return {
    state,
    error,
    isIdle: state === 'idle',
    isProcessing: state === 'processing',
    isSuccess: state === 'success',
    isError: state === 'error',
    executeWithFeedback,
    setSuccess,
    setError,
    setProcessing,
    reset,
  };
}

/**
 * Hook para animar elementos quando uma ação é completada com sucesso
 * 
 * @param duration Duração da animação em milissegundos
 * @returns Objeto com classe CSS para animação e função para disparar a animação
 */
export function useSuccessAnimation(duration = 1000) {
  const [isAnimating, setIsAnimating] = useState(false);

  const triggerAnimation = useCallback(() => {
    setIsAnimating(true);
    
    const timer = setTimeout(() => {
      setIsAnimating(false);
    }, duration);

    return () => clearTimeout(timer);
  }, [duration]);

  useEffect(() => {
    return () => {
      setIsAnimating(false);
    };
  }, []);

  // Aplique esta classe ao elemento que você deseja animar
  const animationClass = isAnimating ? 'animate-success-pulse' : '';

  return { 
    animationClass, 
    triggerAnimation,
    isAnimating
  };
}

/**
 * Hook para animar elementos quando uma ação falha
 * 
 * @param duration Duração da animação em milissegundos
 * @returns Objeto com classe CSS para animação e função para disparar a animação
 */
export function useErrorAnimation(duration = 820) {
  const [isAnimating, setIsAnimating] = useState(false);

  const triggerAnimation = useCallback(() => {
    setIsAnimating(true);
    
    const timer = setTimeout(() => {
      setIsAnimating(false);
    }, duration);

    return () => clearTimeout(timer);
  }, [duration]);

  useEffect(() => {
    return () => {
      setIsAnimating(false);
    };
  }, []);

  // Aplique esta classe ao elemento que você deseja animar
  const animationClass = isAnimating ? 'animate-error-shake' : '';

  return { 
    animationClass, 
    triggerAnimation,
    isAnimating
  };
}