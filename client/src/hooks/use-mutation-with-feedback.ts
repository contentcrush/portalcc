import { 
  UseMutationOptions, 
  useMutation, 
  UseMutationResult, 
  MutationFunction,
  useQueryClient
} from "@tanstack/react-query";
import { notification } from "@/lib/notification";

type SuccessMessage = {
  title?: string;
  message: string;
};

interface MutationWithFeedbackOptions<TData, TError, TVariables, TContext> 
  extends Omit<UseMutationOptions<TData, TError, TVariables, TContext>, 'onSuccess' | 'onError'> {
  successMessage?: SuccessMessage | ((data: TData, variables: TVariables) => SuccessMessage);
  onSuccess?: (data: TData, variables: TVariables, context: TContext | undefined) => void | Promise<void>;
  onError?: (error: TError, variables: TVariables, context: TContext | undefined) => void | Promise<void>;
  invalidateQueries?: string[];
  showSuccessToast?: boolean;
  showErrorToast?: boolean;
}

/**
 * Hook personalizado para executar mutações com feedback consistente
 * 
 * @param mutationFn Função de mutação a ser executada
 * @param options Opções para a mutação e feedback
 * @returns Resultado da mutação do react-query
 */
export function useMutationWithFeedback<TData = unknown, TError = unknown, TVariables = void, TContext = unknown>(
  mutationFn: MutationFunction<TData, TVariables>,
  options?: MutationWithFeedbackOptions<TData, TError, TVariables, TContext>
): UseMutationResult<TData, TError, TVariables, TContext> {
  const queryClient = useQueryClient();
  
  // Configurar opções padrão
  const {
    successMessage,
    onSuccess,
    onError,
    invalidateQueries,
    showSuccessToast = true,
    showErrorToast = true,
    ...mutationOptions
  } = options || {};

  return useMutation({
    mutationFn,
    ...mutationOptions,
    onSuccess: async (data, variables, context) => {
      // Mostrar toast de sucesso se configurado
      if (showSuccessToast && successMessage) {
        const message = typeof successMessage === 'function' 
          ? successMessage(data, variables) 
          : successMessage;
          
        notification.success(message.message, message.title);
      }
      
      // Invalidar queries se configurado
      if (invalidateQueries && invalidateQueries.length > 0) {
        for (const query of invalidateQueries) {
          await queryClient.invalidateQueries({ queryKey: [query] });
        }
      }
      
      // Chamar onSuccess do usuário se fornecido
      if (onSuccess) {
        await onSuccess(data, variables, context);
      }
    },
    onError: async (error, variables, context) => {
      // Mostrar toast de erro se configurado
      if (showErrorToast) {
        notification.error(error);
      }
      
      // Chamar onError do usuário se fornecido
      if (onError) {
        await onError(error, variables, context);
      }
    },
  });
}

/**
 * Hook para criar, atualizar e excluir recursos com feedback padronizado
 */
export function useCrudMutations<TData, TError = unknown>(
  resourceName: string,
  resourceEndpoint: string,
  options?: {
    invalidateQueries?: string[];
    customMessages?: {
      create?: SuccessMessage;
      update?: SuccessMessage;
      delete?: SuccessMessage;
    }
  }
) {
  const defaultInvalidateQueries = options?.invalidateQueries || [resourceEndpoint];
  const singularName = resourceName.endsWith('s') 
    ? resourceName.slice(0, -1) 
    : resourceName;
  
  // Create mutation
  const createMutation = useMutationWithFeedback<TData, TError, Partial<TData>>(
    (data) => fetch(`/api/${resourceEndpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
      credentials: 'include'
    }).then(res => {
      if (!res.ok) throw new Error(`Erro ao criar ${singularName}`);
      return res.json();
    }),
    {
      successMessage: options?.customMessages?.create || {
        title: 'Item criado',
        message: `${singularName.charAt(0).toUpperCase() + singularName.slice(1)} criado com sucesso.`
      },
      invalidateQueries: defaultInvalidateQueries
    }
  );

  // Update mutation
  const updateMutation = useMutationWithFeedback<
    TData, 
    TError, 
    { id: number | string; data: Partial<TData> }
  >(
    ({ id, data }) => fetch(`/api/${resourceEndpoint}/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
      credentials: 'include'
    }).then(res => {
      if (!res.ok) throw new Error(`Erro ao atualizar ${singularName}`);
      return res.json();
    }),
    {
      successMessage: options?.customMessages?.update || {
        title: 'Item atualizado',
        message: `${singularName.charAt(0).toUpperCase() + singularName.slice(1)} atualizado com sucesso.`
      },
      invalidateQueries: defaultInvalidateQueries
    }
  );

  // Delete mutation
  const deleteMutation = useMutationWithFeedback<
    void, 
    TError, 
    number | string
  >(
    (id) => fetch(`/api/${resourceEndpoint}/${id}`, {
      method: 'DELETE',
      credentials: 'include'
    }).then(res => {
      if (!res.ok) throw new Error(`Erro ao excluir ${singularName}`);
      return;
    }),
    {
      successMessage: options?.customMessages?.delete || {
        title: 'Item excluído',
        message: `${singularName.charAt(0).toUpperCase() + singularName.slice(1)} excluído com sucesso.`
      },
      invalidateQueries: defaultInvalidateQueries
    }
  );

  return {
    createMutation,
    updateMutation,
    deleteMutation
  };
}