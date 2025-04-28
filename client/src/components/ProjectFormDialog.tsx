import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery, useMutation } from "@tanstack/react-query";
import { CalendarIcon, Loader2, X } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { insertProjectSchema } from "@shared/schema";
import { useProjectForm } from "@/contexts/ProjectFormContext";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger
} from "@/components/ui/tabs";
import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { PROJECT_STATUS_OPTIONS } from "@/lib/constants";

// Estender o schema para adicionar validações específicas do formulário
const projectFormSchema = insertProjectSchema.extend({
  name: z.string().min(1, "Nome do projeto é obrigatório"),
  client_id: z.coerce.number({
    required_error: "Selecione um cliente",
    invalid_type_error: "Cliente inválido"
  }),
  // Transforme as datas para o formato ISO string ao validar
  startDate: z.date().nullable().optional(),
  endDate: z.date().nullable().optional(),
  primary_area: z.string().optional(),
  priority: z.enum(["baixa", "media", "alta", "urgente"]).default("media"),
  complexity: z.enum(["simples", "moderada", "complexa", "muito_complexa"]).default("moderada"),
  team_members: z.array(z.number()).optional(),
});

type ProjectFormValues = z.infer<typeof projectFormSchema>;

export function ProjectFormDialog() {
  const { isFormOpen, closeProjectForm, projectToEdit } = useProjectForm();
  const [activeTab, setActiveTab] = useState("info");
  const { toast } = useToast();

  // Fetch clients para o dropdown
  const { data: clients = [], isLoading: isLoadingClients } = useQuery({
    queryKey: ['/api/clients']
  });

  // Fetch users para seleção de membros da equipe
  const { data: users = [], isLoading: isLoadingUsers } = useQuery({
    queryKey: ['/api/users']
  });

  // Configurar react-hook-form
  const form = useForm<ProjectFormValues>({
    resolver: zodResolver(projectFormSchema),
    defaultValues: {
      name: projectToEdit?.name || "",
      description: projectToEdit?.description || "",
      client_id: projectToEdit?.client_id || undefined,
      status: projectToEdit?.status || "draft",
      budget: projectToEdit?.budget || undefined,
      startDate: projectToEdit?.startDate ? new Date(projectToEdit.startDate) : null,
      endDate: projectToEdit?.endDate ? new Date(projectToEdit.endDate) : null,
      primary_area: projectToEdit?.primary_area || "",
      priority: projectToEdit?.priority || "media",
      complexity: projectToEdit?.complexity || "moderada",
      team_members: projectToEdit?.team_members || [],
      thumbnail: projectToEdit?.thumbnail || ""
    }
  });

  // Mutation para criar projeto
  const createProjectMutation = useMutation({
    mutationFn: async (data: ProjectFormValues) => {
      // Formatação de alguns campos se necessário
      const formatted = {
        ...data,
        startDate: data.startDate ? data.startDate.toISOString() : null,
        endDate: data.endDate ? data.endDate.toISOString() : null,
        budget: data.budget || null
      };
      
      const res = await apiRequest("POST", "/api/projects", formatted);
      return await res.json();
    },
    onSuccess: (newProject) => {
      // Atualizar a cache após criação bem-sucedida
      queryClient.invalidateQueries({ queryKey: ['/api/projects'] });
      
      // Mostrar uma mensagem de sucesso
      toast({
        title: "Projeto criado com sucesso",
        description: `${newProject.name} foi adicionado aos seus projetos.`,
        variant: "default",
      });
      
      // Fechar o diálogo
      closeProjectForm();
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao criar projeto",
        description: error.message || "Não foi possível criar o projeto. Tente novamente.",
        variant: "destructive",
      });
    }
  });

  // Mutation para atualizar projeto existente
  const updateProjectMutation = useMutation({
    mutationFn: async (data: ProjectFormValues) => {
      if (!projectToEdit?.id) {
        throw new Error("ID do projeto não encontrado");
      }
      
      // Formatação de alguns campos se necessário
      const formatted = {
        ...data,
        startDate: data.startDate ? data.startDate.toISOString() : null,
        endDate: data.endDate ? data.endDate.toISOString() : null,
        budget: data.budget || null
      };
      
      const res = await apiRequest("PUT", `/api/projects/${projectToEdit.id}`, formatted);
      return await res.json();
    },
    onSuccess: (updatedProject) => {
      queryClient.invalidateQueries({ queryKey: ['/api/projects'] });
      if (projectToEdit?.id) {
        queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectToEdit.id}`] });
      }
      
      toast({
        title: "Projeto atualizado",
        description: `As alterações em ${updatedProject.name} foram salvas.`,
        variant: "default",
      });
      
      closeProjectForm();
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao atualizar projeto",
        description: error.message || "Não foi possível atualizar o projeto. Tente novamente.",
        variant: "destructive",
      });
    }
  });

  // Lidar com a submissão do formulário
  function onSubmit(data: ProjectFormValues) {
    if (projectToEdit) {
      updateProjectMutation.mutate(data);
    } else {
      createProjectMutation.mutate(data);
    }
  }

  // Estado de carregamento
  const isSubmitting = createProjectMutation.isPending || updateProjectMutation.isPending;
  const isLoading = isLoadingClients || isLoadingUsers;

  return (
    <Dialog open={isFormOpen} onOpenChange={closeProjectForm}>
      <DialogContent className="sm:max-w-[650px] max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-xl">
            {projectToEdit ? "Editar Projeto" : "Novo Projeto"}
          </DialogTitle>
          <DialogDescription>
            {projectToEdit 
              ? "Edite as informações do projeto existente."
              : "Adicione um novo projeto ao sistema."}
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col h-full">
            <Tabs defaultValue="info" value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid grid-cols-4 mb-4">
                <TabsTrigger value="info">Informações Básicas</TabsTrigger>
                <TabsTrigger value="dates">Datas e Orçamento</TabsTrigger>
                <TabsTrigger value="priority">Prioridade</TabsTrigger>
                <TabsTrigger value="team">Equipe</TabsTrigger>
              </TabsList>
              
              <div className="h-[50vh] overflow-y-auto pr-2 pb-2">
                {/* Tab: Informações Básicas */}
                <TabsContent value="info" className="space-y-4 mt-0">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nome do Projeto*</FormLabel>
                        <FormControl>
                          <Input placeholder="Nome do projeto" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Descrição</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Descreva o projeto" 
                            className="min-h-[120px]" 
                            value={field.value || ""}
                            onChange={field.onChange}
                            onBlur={field.onBlur}
                            name={field.name}
                            ref={field.ref}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="client_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Cliente*</FormLabel>
                        <Select 
                          onValueChange={(value) => field.onChange(parseInt(value))}
                          value={field.value?.toString()}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione um cliente" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {isLoading ? (
                              <div className="flex items-center justify-center p-2">
                                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                <span>Carregando clientes...</span>
                              </div>
                            ) : (
                              clients?.map((client: any) => (
                                <SelectItem 
                                  key={client.id} 
                                  value={client.id.toString()}
                                >
                                  {client.name}
                                </SelectItem>
                              ))
                            )}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="status"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Status</FormLabel>
                        <Select 
                          onValueChange={field.onChange}
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione o status" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {PROJECT_STATUS_OPTIONS.map(option => (
                              <SelectItem 
                                key={option.value} 
                                value={option.value}
                              >
                                {option.label}
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
                    name="primary_area"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Área Principal</FormLabel>
                        <Select 
                          onValueChange={field.onChange}
                          value={field.value || ""}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione a área principal" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="design">Design</SelectItem>
                            <SelectItem value="video">Vídeo</SelectItem>
                            <SelectItem value="social">Mídias Sociais</SelectItem>
                            <SelectItem value="marketing">Marketing</SelectItem>
                            <SelectItem value="audio">Áudio</SelectItem>
                            <SelectItem value="photo">Fotografia</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </TabsContent>
                
                {/* Tab: Prioridade e Complexidade */}
                <TabsContent value="priority" className="space-y-4 mt-0">
                  <div className="bg-blue-50 p-4 rounded-md border border-blue-100 mb-4">
                    <h3 className="text-sm font-medium text-blue-800 mb-2">Sistema de Prioridade Inteligente</h3>
                    <p className="text-xs text-blue-700">
                      Defina a prioridade e complexidade do projeto para ajudar a equipe a planejar e executar o trabalho de forma mais eficiente.
                    </p>
                  </div>
                  
                  <FormField
                    control={form.control}
                    name="priority"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Prioridade</FormLabel>
                        <Select 
                          onValueChange={field.onChange}
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione a prioridade" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="baixa">
                              <div className="flex items-center">
                                <div className="w-3 h-3 rounded-full bg-green-500 mr-2"></div>
                                <span>Baixa</span>
                              </div>
                            </SelectItem>
                            <SelectItem value="media">
                              <div className="flex items-center">
                                <div className="w-3 h-3 rounded-full bg-blue-500 mr-2"></div>
                                <span>Média</span>
                              </div>
                            </SelectItem>
                            <SelectItem value="alta">
                              <div className="flex items-center">
                                <div className="w-3 h-3 rounded-full bg-amber-500 mr-2"></div>
                                <span>Alta</span>
                              </div>
                            </SelectItem>
                            <SelectItem value="urgente">
                              <div className="flex items-center">
                                <div className="w-3 h-3 rounded-full bg-red-500 mr-2"></div>
                                <span>Urgente</span>
                              </div>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          Define a ordem de execução e alocação de recursos
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="complexity"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Complexidade</FormLabel>
                        <Select 
                          onValueChange={field.onChange}
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione a complexidade" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="simples">Simples (1-2 dias)</SelectItem>
                            <SelectItem value="moderada">Moderada (3-7 dias)</SelectItem>
                            <SelectItem value="complexa">Complexa (1-3 semanas)</SelectItem>
                            <SelectItem value="muito_complexa">Muito Complexa (1+ mês)</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          Ajuda a estimar tempo e recursos necessários
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <div className="mt-6 p-4 border rounded-md bg-gray-50">
                    <h3 className="font-medium text-sm mb-2">Recomendações Baseadas na Prioridade</h3>
                    <div className="space-y-2 text-sm">
                      {form.watch("priority") === "urgente" && (
                        <p className="text-red-600">
                          <span className="font-medium">Urgente:</span> Aloque pelo menos 2 membros sênior à equipe e considere postergar outros projetos.
                        </p>
                      )}
                      {form.watch("priority") === "alta" && (
                        <p className="text-amber-600">
                          <span className="font-medium">Alta:</span> Considere dar preferência a este projeto sobre outros de menor prioridade.
                        </p>
                      )}
                      {form.watch("priority") === "media" && (
                        <p className="text-blue-600">
                          <span className="font-medium">Média:</span> Equilibre com outros projetos de mesma prioridade.
                        </p>
                      )}
                      {form.watch("priority") === "baixa" && (
                        <p className="text-green-600">
                          <span className="font-medium">Baixa:</span> Pode ser executado quando houver disponibilidade de recursos.
                        </p>
                      )}
                    </div>
                  </div>
                </TabsContent>
                
                {/* Tab: Datas e Orçamento */}
                <TabsContent value="dates" className="space-y-4 mt-0">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="startDate"
                      render={({ field }) => (
                        <FormItem className="flex flex-col">
                          <FormLabel>Data de Início</FormLabel>
                          <Popover>
                            <PopoverTrigger asChild>
                              <FormControl>
                                <Button
                                  variant={"outline"}
                                  className={`w-full pl-3 text-left font-normal ${!field.value ? "text-muted-foreground" : ""}`}
                                >
                                  {field.value ? (
                                    format(field.value, "PPP", { locale: ptBR })
                                  ) : (
                                    <span>Selecione a data</span>
                                  )}
                                  <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                </Button>
                              </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <Calendar
                                mode="single"
                                selected={field.value || undefined}
                                onSelect={field.onChange}
                                initialFocus
                                locale={ptBR}
                              />
                            </PopoverContent>
                          </Popover>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="endDate"
                      render={({ field }) => (
                        <FormItem className="flex flex-col">
                          <FormLabel>Data de Conclusão</FormLabel>
                          <Popover>
                            <PopoverTrigger asChild>
                              <FormControl>
                                <Button
                                  variant={"outline"}
                                  className={`w-full pl-3 text-left font-normal ${!field.value ? "text-muted-foreground" : ""}`}
                                >
                                  {field.value ? (
                                    format(field.value, "PPP", { locale: ptBR })
                                  ) : (
                                    <span>Selecione a data</span>
                                  )}
                                  <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                </Button>
                              </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <Calendar
                                mode="single"
                                selected={field.value || undefined}
                                onSelect={field.onChange}
                                initialFocus
                                locale={ptBR}
                                disabled={(date) => {
                                  const startDate = form.getValues("startDate");
                                  return startDate ? date < startDate : false;
                                }}
                              />
                            </PopoverContent>
                          </Popover>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <FormField
                    control={form.control}
                    name="budget"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Orçamento (R$)</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            placeholder="0,00" 
                            value={field.value || ""}
                            name={field.name}
                            ref={field.ref}
                            onBlur={field.onBlur}
                            onChange={(e) => {
                              const value = e.target.value ? parseFloat(e.target.value) : undefined;
                              field.onChange(value);
                            }}
                          />
                        </FormControl>
                        <FormDescription>
                          O valor total do orçamento para este projeto
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="thumbnail"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Imagem de Capa (URL)</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="https://exemplo.com/imagem.png" 
                            value={field.value || ""}
                            onChange={field.onChange}
                            onBlur={field.onBlur}
                            name={field.name}
                            ref={field.ref}
                          />
                        </FormControl>
                        <FormDescription>
                          URL de uma imagem para representar o projeto
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </TabsContent>
                
                {/* Tab: Equipe */}
                <TabsContent value="team" className="mt-0">
                  <div className="space-y-4">
                    <div className="border rounded-md p-4">
                      <h3 className="font-medium mb-3">Membros da Equipe</h3>
                      <p className="text-sm text-muted-foreground mb-4">
                        Você poderá adicionar membros à equipe depois de criar o projeto.
                      </p>
                    </div>
                  </div>
                </TabsContent>
              </div>
            </Tabs>
            
            <DialogFooter className="pt-4 mt-auto border-t">
              <div className="flex items-center justify-between w-full gap-2">
                <div className="flex items-center gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setActiveTab(activeTab === "info" ? "dates" : activeTab === "dates" ? "team" : "info")}
                    disabled={isSubmitting}
                    className="flex-none"
                  >
                    {activeTab === "team" ? "Voltar" : "Próximo"}
                  </Button>
                  <div className="text-sm text-muted-foreground">Etapa {activeTab === "info" ? "1" : activeTab === "dates" ? "2" : "3"} de 3</div>
                </div>
                
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={closeProjectForm}
                    disabled={isSubmitting}
                  >
                    Cancelar
                  </Button>
                  <Button 
                    type="submit"
                    disabled={isSubmitting}
                  >
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {projectToEdit ? "Salvar Alterações" : "Criar Projeto"}
                  </Button>
                </div>
              </div>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}