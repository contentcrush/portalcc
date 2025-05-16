import { useState, useRef, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Upload, X, Plus, File, FileText, ImageIcon, FileArchive } from "lucide-react";
import { useDropzone } from "react-dropzone";
import { ApiAttachment } from "@/components/FileAttachments";
import { formatFileSize } from "@/lib/utils";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Card } from "@/components/ui/card";

// Schema para validação do formulário
const fileUploadSchema = z.object({
  description: z.string().optional(),
  tags: z.array(z.string()).optional(),
  client_id: z.string().optional(),
  project_id: z.string().optional(),
  task_id: z.string().optional(),
});

type FileUploadFormValues = z.infer<typeof fileUploadSchema>;

interface AdvancedFileUploadProps {
  onSuccess?: (attachment: ApiAttachment) => void;
  defaultEntityType?: "client" | "project" | "task";
  defaultEntityId?: number;
  buttonClassName?: string;
  buttonVariant?: "default" | "outline" | "secondary" | "ghost" | "link" | "destructive";
  buttonText?: string;
  buttonIcon?: boolean;
}

export default function AdvancedFileUpload({
  onSuccess,
  defaultEntityType,
  defaultEntityId,
  buttonClassName = "",
  buttonVariant = "default",
  buttonText = "Enviar Arquivo",
  buttonIcon = true,
}: AdvancedFileUploadProps) {
  const [open, setOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [customTags, setCustomTags] = useState<string[]>([]);
  const [customTagInput, setCustomTagInput] = useState("");
  const [entityType, setEntityType] = useState<string>(defaultEntityType || "");
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Referência para controlar o contador de progresso simulado
  const progressIntervalRef = useRef<number | null>(null);
  
  // Buscar clientes, projetos e tarefas para os selects
  const { data: clients = [] } = useQuery({
    queryKey: ['/api/clients'],
    enabled: open,
  });
  
  const { data: projects = [] } = useQuery({
    queryKey: ['/api/projects'],
    enabled: open,
  });
  
  const { data: tasks = [] } = useQuery({
    queryKey: ['/api/tasks'],
    enabled: open,
  });

  // Filtrar projetos com base no cliente selecionado
  const filteredProjects = (clientId: string) => {
    if (!clientId || clientId === "") return projects;
    return projects.filter((project: any) => project.client_id === parseInt(clientId));
  };

  // Filtrar tarefas com base no projeto selecionado
  const filteredTasks = (projectId: string) => {
    if (!projectId || projectId === "") return tasks;
    return tasks.filter((task: any) => task.project_id === parseInt(projectId));
  };

  // Configuração do formulário com react-hook-form e zod
  const form = useForm<FileUploadFormValues>({
    resolver: zodResolver(fileUploadSchema),
    defaultValues: {
      description: "",
      tags: [],
      client_id: defaultEntityType === "client" && defaultEntityId ? String(defaultEntityId) : "",
      project_id: defaultEntityType === "project" && defaultEntityId ? String(defaultEntityId) : "",
      task_id: defaultEntityType === "task" && defaultEntityId ? String(defaultEntityId) : "",
    },
  });

  // Resetar o formulário quando o diálogo abre
  useEffect(() => {
    if (open) {
      form.reset({
        description: "",
        tags: [],
        client_id: defaultEntityType === "client" && defaultEntityId ? String(defaultEntityId) : "",
        project_id: defaultEntityType === "project" && defaultEntityId ? String(defaultEntityId) : "",
        task_id: defaultEntityType === "task" && defaultEntityId ? String(defaultEntityId) : "",
      });
      setSelectedFile(null);
      setUploadProgress(0);
      setCustomTags([]);
      setCustomTagInput("");
      setEntityType(defaultEntityType || "");
    }
  }, [open, defaultEntityType, defaultEntityId]);

  // Limpar o intervalo quando o componente é desmontado
  useEffect(() => {
    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
    };
  }, []);

  // Configuração do dropzone
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: (acceptedFiles) => {
      if (acceptedFiles.length > 0) {
        setSelectedFile(acceptedFiles[0]);
      }
    },
    maxFiles: 1,
    multiple: false,
  });

  // Mutation para fazer upload do arquivo
  const uploadMutation = useMutation({
    mutationFn: async (data: { formData: FormData, entityType: string, entityId: string }) => {
      setUploadProgress(0);
      
      // Simular progresso de upload
      progressIntervalRef.current = window.setInterval(() => {
        setUploadProgress((prev) => {
          const increment = Math.floor(Math.random() * 10) + 1;
          const newProgress = Math.min(prev + increment, 95); // Vai até 95% antes da confirmação
          return newProgress;
        });
      }, 300);
      
      try {
        const response = await fetch(`/api/attachments/${data.entityType}s/${data.entityId}/upload`, {
          method: 'POST',
          body: data.formData,
          credentials: 'include'
        });
        
        // Limpar o intervalo após a resposta
        if (progressIntervalRef.current) {
          clearInterval(progressIntervalRef.current);
          progressIntervalRef.current = null;
        }
        
        if (!response.ok) {
          setUploadProgress(0);
          const errorData = await response.json();
          throw new Error(errorData.message || 'Erro ao fazer upload do arquivo');
        }
        
        setUploadProgress(100);
        return await response.json();
      } catch (error) {
        // Limpar o intervalo em caso de erro
        if (progressIntervalRef.current) {
          clearInterval(progressIntervalRef.current);
          progressIntervalRef.current = null;
        }
        setUploadProgress(0);
        throw error;
      }
    },
    onSuccess: (data) => {
      // Invalidar queries relevantes
      if (entityType === "client") {
        queryClient.invalidateQueries({ queryKey: [`/api/attachments/clients/${form.getValues().client_id}`] });
      } else if (entityType === "project") {
        queryClient.invalidateQueries({ queryKey: [`/api/attachments/projects/${form.getValues().project_id}`] });
      } else if (entityType === "task") {
        queryClient.invalidateQueries({ queryKey: [`/api/attachments/tasks/${form.getValues().task_id}`] });
      }
      
      // Invalidar a lista completa de anexos
      queryClient.invalidateQueries({ queryKey: ['/api/attachments/all'] });
      
      toast({
        title: "Arquivo enviado com sucesso",
        description: `O arquivo ${data.file_name} foi anexado com sucesso.`,
        variant: "default",
        className: "bg-green-100 border-green-400 text-green-900",
      });
      
      if (onSuccess) {
        onSuccess(data);
      }
      
      // Fechar o modal após 1 segundo para mostrar o progresso completo
      setTimeout(() => {
        setOpen(false);
      }, 1000);
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao enviar arquivo",
        description: error.message || "Ocorreu um erro ao enviar o arquivo. Tente novamente.",
        variant: "destructive",
      });
    },
  });

  // Manipular envio do formulário
  const onSubmit = async (values: FileUploadFormValues) => {
    if (!selectedFile) {
      toast({
        title: "Nenhum arquivo selecionado",
        description: "Por favor, selecione um arquivo para upload.",
        variant: "destructive",
      });
      return;
    }
    
    // Determinar entityType e entityId
    let finalEntityType = "";
    let finalEntityId = "";
    
    if (entityType === "client" && values.client_id) {
      finalEntityType = "client";
      finalEntityId = values.client_id;
    } else if (entityType === "project" && values.project_id) {
      finalEntityType = "project";
      finalEntityId = values.project_id;
    } else if (entityType === "task" && values.task_id) {
      finalEntityType = "task";
      finalEntityId = values.task_id;
    }
    
    if (!finalEntityType || !finalEntityId) {
      toast({
        title: "Dados incompletos",
        description: "Por favor, selecione um cliente, projeto ou tarefa para o upload.",
        variant: "destructive",
      });
      return;
    }
    
    // Criar FormData
    const formData = new FormData();
    formData.append('file', selectedFile);
    
    // Adicionar descrição se existir
    if (values.description) {
      formData.append('description', values.description);
    }
    
    // Adicionar tags combinadas
    const combinedTags = [...(values.tags || []), ...customTags];
    if (combinedTags.length > 0) {
      formData.append('tags', JSON.stringify(combinedTags));
    }
    
    // Fazer upload
    uploadMutation.mutate({ 
      formData, 
      entityType: finalEntityType, 
      entityId: finalEntityId 
    });
  };

  // Função para adicionar tag personalizada
  const handleAddCustomTag = () => {
    if (customTagInput.trim() && !customTags.includes(customTagInput.trim())) {
      setCustomTags([...customTags, customTagInput.trim()]);
      setCustomTagInput("");
    }
  };

  // Função para remover tag personalizada
  const handleRemoveCustomTag = (tag: string) => {
    setCustomTags(customTags.filter(t => t !== tag));
  };

  // Função para obter o ícone do arquivo
  const getFileIcon = () => {
    if (!selectedFile) return <Upload className="h-10 w-10 text-muted-foreground" />;
    
    const type = selectedFile.type;
    
    if (type.startsWith('image/')) {
      return <ImageIcon className="h-10 w-10 text-blue-500" />;
    }
    
    if (type.includes('pdf') || type.includes('document') || type.includes('text/')) {
      return <FileText className="h-10 w-10 text-red-500" />;
    }
    
    if (type.includes('zip') || type.includes('compressed')) {
      return <FileArchive className="h-10 w-10 text-purple-500" />;
    }
    
    return <File className="h-10 w-10 text-gray-500" />;
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant={buttonVariant} className={buttonClassName}>
          {buttonIcon && <Plus className="h-4 w-4 mr-2" />}
          {buttonText}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle>Upload de Arquivo</DialogTitle>
          <DialogDescription>
            Envie um arquivo e associe-o a um cliente, projeto ou tarefa.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Área de upload do arquivo */}
            <div 
              {...getRootProps()} 
              className={`border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors
                ${isDragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/20'}
                ${selectedFile ? 'bg-muted/20' : 'hover:bg-muted/10'}`}
            >
              <input {...getInputProps()} />
              
              {selectedFile ? (
                <div className="flex flex-col items-center justify-center p-2">
                  {getFileIcon()}
                  <p className="mt-2 font-medium">{selectedFile.name}</p>
                  <p className="text-xs text-muted-foreground">{formatFileSize(selectedFile.size)}</p>
                  <Button 
                    type="button" 
                    variant="ghost" 
                    size="sm" 
                    className="mt-2" 
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedFile(null);
                    }}
                  >
                    <X className="h-4 w-4 mr-1" />
                    Remover
                  </Button>
                </div>
              ) : (
                <div className="py-4">
                  <Upload className="h-10 w-10 mx-auto text-muted-foreground" />
                  <p className="mt-2">Arraste e solte um arquivo ou clique para selecionar</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Suporta arquivos de até 10MB
                  </p>
                </div>
              )}
            </div>
            
            {/* Seleção de tipo de entidade */}
            <div className="grid grid-cols-3 gap-2">
              <Button
                type="button"
                variant={entityType === "client" ? "default" : "outline"}
                className="w-full"
                onClick={() => setEntityType("client")}
              >
                Cliente
              </Button>
              <Button
                type="button"
                variant={entityType === "project" ? "default" : "outline"}
                className="w-full"
                onClick={() => setEntityType("project")}
              >
                Projeto
              </Button>
              <Button
                type="button"
                variant={entityType === "task" ? "default" : "outline"}
                className="w-full"
                onClick={() => setEntityType("task")}
              >
                Tarefa
              </Button>
            </div>
            
            {/* Campos condicionais com base no tipo de entidade */}
            {entityType === "client" && (
              <FormField
                control={form.control}
                name="client_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cliente</FormLabel>
                    <Select
                      value={field.value}
                      onValueChange={(value) => {
                        field.onChange(value);
                        // Limpar projetos e tarefas relacionadas quando o cliente muda
                        form.setValue("project_id", "");
                        form.setValue("task_id", "");
                      }}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione um cliente" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {clients.map((client: any) => (
                          <SelectItem key={client.id} value={String(client.id)}>
                            {client.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            
            {entityType === "project" && (
              <>
                <FormField
                  control={form.control}
                  name="client_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cliente (opcional)</FormLabel>
                      <Select
                        value={field.value}
                        onValueChange={(value) => {
                          field.onChange(value);
                          // Limpar projeto quando o cliente muda
                          form.setValue("project_id", "");
                        }}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Filtrar por cliente" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="">Todos os clientes</SelectItem>
                          {clients.map((client: any) => (
                            <SelectItem key={client.id} value={String(client.id)}>
                              {client.name}
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
                  name="project_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Projeto</FormLabel>
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione um projeto" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {filteredProjects(form.getValues().client_id).map((project: any) => (
                            <SelectItem key={project.id} value={String(project.id)}>
                              {project.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </>
            )}
            
            {entityType === "task" && (
              <>
                <FormField
                  control={form.control}
                  name="project_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Projeto</FormLabel>
                      <Select
                        value={field.value}
                        onValueChange={(value) => {
                          field.onChange(value);
                          // Limpar tarefa quando o projeto muda
                          form.setValue("task_id", "");
                        }}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione um projeto" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {projects.map((project: any) => (
                            <SelectItem key={project.id} value={String(project.id)}>
                              {project.name}
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
                  name="task_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tarefa</FormLabel>
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                        disabled={!form.getValues().project_id}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione uma tarefa" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {filteredTasks(form.getValues().project_id).map((task: any) => (
                            <SelectItem key={task.id} value={String(task.id)}>
                              {task.title}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </>
            )}
            
            {/* Descrição do arquivo */}
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrição (opcional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Digite uma descrição para este arquivo..."
                      {...field}
                      rows={2}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {/* Tags personalizadas */}
            <div className="space-y-2">
              <FormLabel>Tags (opcional)</FormLabel>
              <div className="flex gap-2">
                <Input
                  value={customTagInput}
                  onChange={(e) => setCustomTagInput(e.target.value)}
                  placeholder="Adicionar tag..."
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddCustomTag();
                    }
                  }}
                />
                <Button 
                  type="button"
                  variant="outline"
                  onClick={handleAddCustomTag}
                >
                  Adicionar
                </Button>
              </div>
              
              {customTags.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {customTags.map((tag, index) => (
                    <Badge 
                      key={index} 
                      variant="secondary"
                      className="gap-1"
                    >
                      {tag}
                      <X 
                        className="h-3 w-3 cursor-pointer hover:text-destructive"
                        onClick={() => handleRemoveCustomTag(tag)}
                      />
                    </Badge>
                  ))}
                </div>
              )}
            </div>
            
            {/* Barra de progresso do upload */}
            {uploadProgress > 0 && (
              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span>Progresso do upload</span>
                  <span>{uploadProgress}%</span>
                </div>
                <Progress value={uploadProgress} />
              </div>
            )}
            
            <DialogFooter>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setOpen(false)}
                disabled={uploadMutation.isPending}
              >
                Cancelar
              </Button>
              <Button 
                type="submit" 
                disabled={!selectedFile || !entityType || uploadMutation.isPending}
              >
                {uploadMutation.isPending ? (
                  <>
                    <div className="animate-spin h-4 w-4 mr-2 border-2 border-current border-t-transparent rounded-full"></div>
                    Enviando...
                  </>
                ) : (
                  "Enviar arquivo"
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}