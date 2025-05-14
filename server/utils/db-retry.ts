/**
 * Utilitário para executar operações de banco de dados com retry automático
 * Útil para lidar com erros intermitentes de conexão
 */

// Função genérica para retry de operações
export async function withRetry<T>(
  operation: () => Promise<T>,
  options: {
    maxRetries?: number;
    initialDelay?: number;
    maxDelay?: number;
    shouldRetry?: (error: any) => boolean;
  } = {}
): Promise<T> {
  const {
    maxRetries = 3,
    initialDelay = 500,
    maxDelay = 3000,
    shouldRetry = (error) => {
      // Verificar se é um erro de conexão
      if (error.message && typeof error.message === 'string') {
        return (
          error.message.includes('Couldn\'t connect to compute node') ||
          error.message.includes('connection') ||
          error.code === 'XX000'
        );
      }
      return false;
    }
  } = options;
  
  let lastError: any;
  let delay = initialDelay;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      console.log(`Tentativa ${attempt + 1}/${maxRetries} de operação no banco...`);
      return await operation();
    } catch (error) {
      lastError = error;
      
      // Decidir se vale a pena tentar novamente
      if (!shouldRetry(error) || attempt === maxRetries - 1) {
        console.error(`Erro após ${attempt + 1} tentativas:`, error);
        throw error;
      }
      
      console.warn(`Erro na tentativa ${attempt + 1}, tentando novamente em ${delay}ms:`, error);
      
      // Esperar o delay antes da próxima tentativa
      await new Promise(resolve => setTimeout(resolve, delay));
      
      // Aumentar o delay (backoff exponencial) para a próxima tentativa
      delay = Math.min(delay * 2, maxDelay);
    }
  }
  
  // Se chegamos aqui, todas as tentativas falharam
  throw lastError;
}