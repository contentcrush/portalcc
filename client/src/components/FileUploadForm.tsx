import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, FileUp, X } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";

interface FileUploadFormProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialEntityType?: 'client' | 'project' | 'task';
  initialEntityId?: string;
}

type FormValues = {
  entityType: 'client' | 'project' | 'task';
  entityId: string;
  description?: string;
  tags?: string;
};

export default function FileUploadForm({
  open,
  onClose,
  onSuccess,
  initialEntityType = 'client',
  initialEntityId = 'all',
}: FileUploadFormProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [files, setFiles] = useState<FileList | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Busca clientes
  const { data: clients = [] } = useQuery({
    queryKey: ["/api/clients"],
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Busca projetos
  const { data: projects = [] } = useQuery({
    queryKey: ["/api/projects"],
    staleTime: 5 * 60 * 1000,
  });

  // Busca tarefas
  const { data: tasks = [] } = useQuery({
    queryKey: ["/api/tasks"],
    staleTime: 5 * 60 * 1000,
  });
  
  const form = useForm<FormValues>({
    defaultValues: {
      entityType: initialEntityType,
      entityId: initialEntityId,
      description: '',
      tags: '',
    },
  });

  const { entityType, entityId } = form.watch();

  // Reset form quando o diálogo for aberto
  useEffect(() => {
    if (open) {
      form.reset({
        entityType: initialEntityType,
        entityId: initialEntityId,
        description: '',
        tags: '',
      });
      setFiles(null);
      setUploadProgress(0);
    }
  }, [open, form, initialEntityType, initialEntityId]);

  const onSubmit = async (values: FormValues) => {
    if (!files || files.length === 0) {
      toast({
        title: "Nenhum arquivo selecionado",
        description: "Por favor, selecione pelo menos um arquivo para fazer upload.",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);
    setUploadProgress(10);

    try {
      // Para cada arquivo, criar um FormData separado e enviar
      const uploadResults = [];
      
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const formData = new FormData();
        formData.append('file', file);
        
        if (values.description) {
          formData.append('description', values.description);
        }
        
        if (values.tags) {
          formData.append('tags', values.tags);
        }
        
        // Construir URL baseada no tipo de entidade
        const endpoint = `/api/attachments/${values.entityType}s/${values.entityId}`;
        
        // Simular progresso de upload
        setUploadProgress(prev => Math.min(95, prev + (85 / files.length)));
        
        // Fazer upload
        const response = await apiRequest('POST', endpoint, formData, {
          headers: {}, // Remover headers padrão para o navegador configurar o Content-Type corretamente
        });
        
        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.message || `Erro ao fazer upload do arquivo ${file.name}`);
        }
        
        const result = await response.json();
        uploadResults.push(result);
      }
      
      setUploadProgress(100);
      
      // Mostrar toast de sucesso
      toast({
        title: "Upload realizado com sucesso",
        description: `${uploadResults.length} arquivo${uploadResults.length > 1 ? 's' : ''} enviado${uploadResults.length > 1 ? 's' : ''} com sucesso.`,
        variant: "default",
        className: "bg-green-50 text-green-900 border-green-200",
      });
      
      // Fechar formulário e notificar sucesso
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Erro no upload:', error);
      toast({
        title: "Erro no upload",
        description: error instanceof Error ? error.message : "Ocorreu um erro ao fazer upload dos arquivos",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFiles(e.target.files);
    }
  };

  return (
    <Dialog open={open} onOpenChange={open => !open && onClose()}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Anexar arquivo</DialogTitle>
          <DialogDescription>
            Selecione um arquivo para anexar a um cliente, projeto ou tarefa.
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="entityType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo de entidade</FormLabel>
                  <Select
                    disabled={uploading}
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o tipo" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="client">Cliente</SelectItem>
                      <SelectItem value="project">Projeto</SelectItem>
                      <SelectItem value="task">Tarefa</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Escolha a que tipo de item este arquivo estará associado.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="entityId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{entityType === 'client' ? 'Cliente' : entityType === 'project' ? 'Projeto' : 'Tarefa'}</FormLabel>
                  <Select
                    disabled={uploading}
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={`Selecione ${entityType === 'client' ? 'o cliente' : entityType === 'project' ? 'o projeto' : 'a tarefa'}`} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {entityType === 'client' && clients.map((client: any) => (
                        <SelectItem key={client.id} value={client.id.toString()}>
                          {client.name}
                        </SelectItem>
                      ))}
                      
                      {entityType === 'project' && projects.map((project: any) => (
                        <SelectItem key={project.id} value={project.id.toString()}>
                          {project.name}
                        </SelectItem>
                      ))}
                      
                      {entityType === 'task' && tasks.map((task: any) => (
                        <SelectItem key={task.id} value={task.id.toString()}>
                          {task.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrição (opcional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Adicione uma descrição para este arquivo"
                      disabled={uploading}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="tags"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tags (opcional)</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Tags separadas por vírgula (ex: importante, contrato, assinado)"
                      disabled={uploading}
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Adicione tags para facilitar a busca.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="space-y-3">
              <FormLabel htmlFor="files">Arquivos</FormLabel>
              <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-md p-4 text-center hover:bg-gray-50 dark:hover:bg-gray-800 transition cursor-pointer">
                <Input
                  id="files"
                  type="file"
                  disabled={uploading}
                  onChange={handleFileChange}
                  className="hidden"
                  multiple
                />
                <label htmlFor="files" className="cursor-pointer">
                  <FileUp className="mx-auto h-8 w-8 text-gray-400 mb-2" />
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    Clique para selecionar arquivos ou arraste e solte aqui
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Qualquer tipo de arquivo, até 10MB
                  </p>
                </label>
              </div>

              {files && files.length > 0 && (
                <div className="mt-4">
                  <h4 className="text-sm font-medium mb-2">Arquivos selecionados:</h4>
                  <ScrollArea className="h-32 rounded-md border p-2">
                    <div className="space-y-2">
                      {Array.from(files).map((file, index) => (
                        <div key={index} className="flex items-center justify-between text-sm p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800">
                          <div className="flex items-center space-x-2 overflow-hidden">
                            <span className="truncate max-w-[200px]">{file.name}</span>
                            <Badge variant="outline" className="whitespace-nowrap">
                              {(file.size / 1024).toFixed(0)} KB
                            </Badge>
                          </div>
                          <Button 
                            type="button" 
                            variant="ghost" 
                            size="icon" 
                            disabled={uploading}
                            onClick={() => setFiles(null)}
                            className="h-6 w-6"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              )}
            </div>
            
            {uploading && (
              <div className="space-y-2">
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-primary transition-all duration-300 ease-in-out" 
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
                <p className="text-xs text-gray-500 text-center">
                  Enviando... {uploadProgress}%
                </p>
              </div>
            )}
            
            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose} disabled={uploading}>
                Cancelar
              </Button>
              <Button type="submit" disabled={uploading || !files || files.length === 0}>
                {uploading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  'Enviar arquivo'
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}