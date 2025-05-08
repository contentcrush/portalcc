import { useState, useRef, useEffect, useCallback } from "react";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  Sheet, 
  SheetContent, 
  SheetHeader, 
  SheetTitle, 
  SheetDescription 
} from "@/components/ui/sheet";
import { 
  Form, 
  FormControl, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage, 
  FormDescription 
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowRight,
  Check,
  ChevronLeft,
  Search,
  Upload,
  Loader2,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { insertClientSchema, type InsertClient } from "@shared/schema";
import { CLIENT_TYPE_OPTIONS } from "@/lib/constants";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { cn, getInitials, getSafeFieldProps } from "@/lib/utils";

// Schema para validação do formulário
const formSchema = insertClientSchema.extend({
  name: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
  contactEmail: z.string().email("Email inválido").nullable().optional(),
});

type NewClientSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onClientCreated?: (clientId: number) => void;
};

export function NewClientSheet({ open, onOpenChange, onClientCreated }: NewClientSheetProps) {
  const [formStep, setFormStep] = useState<number>(0);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [isLookupCnpj, setIsLookupCnpj] = useState(false);
  const [showSegments, setShowSegments] = useState(false);
  const firstInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      shortName: "",
      type: "",
      cnpj: "",
      website: "",
      contactName: "",
      contactPosition: "",
      contactEmail: "",
      contactPhone: "",
      address: "",
      city: "",
      segments: [],
      active: true,
    },
  });

  // Autofocus no primeiro campo ao abrir o modal
  useEffect(() => {
    if (open && formStep === 0) {
      // Pequeno delay para garantir que o campo esteja renderizado
      const timer = setTimeout(() => {
        firstInputRef.current?.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [open, formStep]);

  // Resetar o form ao fechar o modal
  useEffect(() => {
    if (!open) {
      setTimeout(() => {
        form.reset();
        setFormStep(0);
        setAvatarPreview(null);
        setIsLookupCnpj(false);
        setShowSegments(false);
      }, 300);
    }
  }, [open, form]);

  // Mutation para criar novo cliente
  const createClientMutation = useMutation({
    mutationFn: async (data: InsertClient) => {
      const res = await apiRequest("POST", "/api/clients", data);
      const json = await res.json();
      return json;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
      toast({
        title: "Cliente criado com sucesso",
        description: "O cliente foi adicionado à sua base de dados.",
        variant: "success",
      });
      onOpenChange(false);
      onClientCreated?.(data.id);
    },
    onError: (error) => {
      toast({
        title: "Erro ao criar cliente",
        description: error.message || "Houve um erro ao criar o cliente. Tente novamente.",
        variant: "destructive",
      });
    },
  });

  // Função para buscar dados pelo CNPJ
  const handleCnpjLookup = async () => {
    const cnpj = form.getValues("cnpj");
    if (!cnpj || cnpj.length < 14) {
      toast({
        title: "CNPJ inválido",
        description: "Por favor, digite um CNPJ válido.",
        variant: "destructive",
      });
      return;
    }

    setIsLookupCnpj(true);
    try {
      // Simulando a consulta à Receita Federal
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Preenchendo dados fictícios - em produção, deve vir da API
      form.setValue("name", "Empresa Exemplo Ltda");
      form.setValue("address", "Rua das Flores, 123");
      form.setValue("city", "São Paulo");
      
      toast({
        title: "Empresa encontrada",
        description: "Os dados foram preenchidos automaticamente.",
        variant: "success",
      });
      
      // Avançar para próximo passo automaticamente
      handleNextStep();
    } catch (error) {
      toast({
        title: "Erro na consulta",
        description: "Não foi possível consultar os dados. Continue o cadastro manualmente.",
        variant: "destructive",
      });
    } finally {
      setIsLookupCnpj(false);
    }
  };

  // Permitir pressionar Enter no campo CNPJ para acionar a busca
  const handleCnpjKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleCnpjLookup();
    }
  };

  // Função para navegar entre etapas do formulário
  const handleNextStep = () => {
    const currentValues = form.getValues();
    
    // Validar campos da etapa 1
    if (formStep === 0) {
      if (!currentValues.cnpj && !currentValues.name) {
        form.trigger(['name', 'cnpj']);
        return;
      }
      
      // Se apenas o CNPJ foi preenchido, faça a consulta
      if (currentValues.cnpj && !currentValues.name) {
        handleCnpjLookup();
        return;
      }
    }
    
    // Validar campos da etapa 2
    if (formStep === 1) {
      if (!currentValues.contactEmail) {
        form.trigger('contactEmail');
        return;
      }
    }
    
    // Avançar para próxima etapa se não for a última
    if (formStep < 1) {
      setFormStep(prev => prev + 1);
    }
  };

  const handlePrevStep = () => {
    setFormStep(prev => prev - 1);
  };

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setAvatarPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const onSubmit = (data: z.infer<typeof formSchema>) => {
    // Validar manualmente os campos obrigatórios
    if (!data.name || !data.type) {
      form.setError("name", { message: "Nome é obrigatório" });
      form.setError("type", { message: "Tipo é obrigatório" });
      return;
    }

    // Se o nome abreviado não foi preenchido, use as iniciais do nome principal
    if (!data.shortName && data.name) {
      data.shortName = getInitials(data.name);
    }

    // Aplicando eventuais transformações nos dados antes do envio
    const clientData: InsertClient = {
      ...data,
      logo: avatarPreview || "",
    };

    console.log("Enviando dados do cliente:", clientData);
    createClientMutation.mutate(clientData);
  };

  // Obtenha uma propriedade segura para KeyboardEvent para o campo CNPJ
  const getCnpjKeyboardProps = (field: any) => ({
    ...getSafeFieldProps(field),
    onKeyDown: handleCnpjKeyDown,
  });

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent 
        side="bottom" 
        className="h-[95%] sm:h-[90%] rounded-t-xl border-t border-border p-0"
      >
        <div className="flex flex-col h-full">
          <SheetHeader className="sticky top-0 z-20 bg-background pb-2 pt-0 px-6 shadow-sm">
            <div className="flex justify-center items-center -mt-1 mb-1">
              <div className="h-1.5 w-16 bg-muted rounded-full" />
            </div>
            <SheetTitle className="text-xl font-semibold">Novo Cliente</SheetTitle>
            <SheetDescription className="text-sm">
              Fluxo ultra-rápido para cadastro de cliente (30-45 seg)
            </SheetDescription>
            
            <div className="w-full flex justify-center my-3">
              <div className="flex items-center space-x-3">
                <div className={cn(
                  "flex items-center justify-center h-6 w-6 rounded-full border transition-colors text-xs font-medium",
                  formStep === 0 
                    ? "border-primary bg-primary text-primary-foreground" 
                    : "border-primary bg-primary/10 text-primary"
                )}>1</div>
                <div className={cn("h-px w-4 transition-colors", 
                  formStep > 0 ? "bg-primary" : "bg-muted"
                )} />
                <div className={cn(
                  "flex items-center justify-center h-6 w-6 rounded-full border transition-colors text-xs font-medium",
                  formStep === 1
                    ? "border-primary bg-primary text-primary-foreground" 
                    : "border-muted bg-muted/50 text-muted-foreground"
                )}>2</div>
              </div>
            </div>
          </SheetHeader>
          
          <div className="overflow-y-auto flex-1 pb-24">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 px-6 py-2" id="client-form">
                <div className="relative mt-1">
                  {formStep > 0 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute -left-2 -top-1 flex items-center p-1 h-8 rounded-full"
                      onClick={handlePrevStep}
                    >
                      <ChevronLeft className="h-5 w-5" />
                      <span className="ml-1 text-sm">Voltar</span>
                    </Button>
                  )}
                
                {formStep === 0 && (
                  <>
                    <div className="mb-6 flex justify-center">
                      <div className="relative">
                        <Avatar className="h-28 w-28">
                          {avatarPreview ? (
                            <AvatarImage src={avatarPreview} alt="Preview" />
                          ) : (
                            <AvatarFallback className="bg-primary/10 text-primary text-2xl">
                              {getInitials(form.watch('name') || "NC")}
                            </AvatarFallback>
                          )}
                        </Avatar>
                        <div className="absolute bottom-0 right-0">
                          <label htmlFor="avatar-upload" className="cursor-pointer">
                            <div className="bg-primary text-white p-2 rounded-full shadow-sm">
                              <Upload className="h-5 w-5" />
                            </div>
                          </label>
                          <input 
                            id="avatar-upload" 
                            type="file" 
                            className="hidden" 
                            accept="image/*"
                            onChange={handleAvatarUpload}
                          />
                        </div>
                      </div>
                    </div>
                    
                    <div className="space-y-5">
                      <div>
                        <FormField
                          control={form.control}
                          name="cnpj"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-base font-medium">CNPJ/CPF</FormLabel>
                              <div className="flex gap-2">
                                <FormControl>
                                  <Input 
                                    placeholder="00.000.000/0001-00" 
                                    className="h-12 text-base" 
                                    {...getCnpjKeyboardProps(field)}
                                    ref={firstInputRef}
                                  />
                                </FormControl>
                                <Button 
                                  type="button" 
                                  variant="outline"
                                  size="icon"
                                  disabled={isLookupCnpj}
                                  onClick={handleCnpjLookup}
                                  className="flex-shrink-0 h-12 w-12"
                                >
                                  {isLookupCnpj ? (
                                    <Loader2 className="h-5 w-5 animate-spin" />
                                  ) : (
                                    <Search className="h-5 w-5" />
                                  )}
                                </Button>
                              </div>
                              <FormDescription className="text-xs">
                                Digite o CNPJ e pressione Enter para busca automática
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      
                      <div>
                        <FormField
                          control={form.control}
                          name="name"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-base font-medium">Nome do Cliente*</FormLabel>
                              <FormControl>
                                <Input 
                                  placeholder="Razão Social" 
                                  className="h-12 text-base" 
                                  {...getSafeFieldProps(field)} 
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      
                      <div>
                        <FormField
                          control={form.control}
                          name="shortName"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-base font-medium">Nome no Dashboard</FormLabel>
                              <FormControl>
                                <Input 
                                  placeholder="Nome Fantasia (ex: Gradina, Delicia)" 
                                  className="h-12 text-base" 
                                  {...getSafeFieldProps(field)} 
                                />
                              </FormControl>
                              <FormDescription className="text-xs">
                                Obrigatório, curto e claro
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      
                      <div>
                        <FormField
                          control={form.control}
                          name="type"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-base font-medium">Tipo de Cliente*</FormLabel>
                              <Select
                                value={field.value || ''}
                                onValueChange={field.onChange}
                              >
                                <FormControl>
                                  <SelectTrigger className="h-12 text-base">
                                    <SelectValue placeholder="Selecione o tipo" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {CLIENT_TYPE_OPTIONS.map(option => (
                                    <SelectItem key={option.value} value={option.value}>
                                      {option.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <div>
                        <Button 
                          type="button" 
                          variant="outline" 
                          className="w-full h-10 text-muted-foreground"
                          onClick={() => setShowSegments(!showSegments)}
                        >
                          {showSegments ? "Ocultar segmentos" : "Adicionar segmentos"} (opcional)
                        </Button>
                        
                        {showSegments && (
                          <FormField
                            control={form.control}
                            name="segments"
                            render={({ field }) => (
                              <FormItem className="mt-2">
                                <FormControl>
                                  <Input 
                                    placeholder="Segmentos (separados por vírgula)" 
                                    className="h-12 text-base" 
                                    {...getSafeFieldProps(field)} 
                                  />
                                </FormControl>
                                <FormDescription className="text-xs">
                                  Ex: Alimentação, Bebidas
                                </FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        )}
                      </div>
                    </div>
                  </>
                )}
                
                {formStep === 1 && (
                  <>
                    <h3 className="font-medium text-lg text-center mb-5 mt-1">Contato Principal</h3>
                    
                    <div className="space-y-5">
                      <div>
                        <FormField
                          control={form.control}
                          name="contactEmail"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-base font-medium">Email de contato*</FormLabel>
                              <FormControl>
                                <Input 
                                  placeholder="Ex: contato@empresa.com" 
                                  className="h-12 text-base"
                                  type="email"
                                  {...getSafeFieldProps(field)} 
                                  autoFocus
                                />
                              </FormControl>
                              <FormDescription className="text-xs">
                                Validação de formato + MX
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      
                      <div>
                        <FormField
                          control={form.control}
                          name="contactName"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-base font-medium">Nome do contato</FormLabel>
                              <FormControl>
                                <Input 
                                  placeholder="Nome do contato principal" 
                                  className="h-12 text-base" 
                                  {...getSafeFieldProps(field)}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      
                      <div>
                        <FormField
                          control={form.control}
                          name="contactPhone"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-base font-medium">Telefone</FormLabel>
                              <FormControl>
                                <Input 
                                  placeholder="(00) 00000-0000" 
                                  className="h-12 text-base"
                                  {...getSafeFieldProps(field)} 
                                />
                              </FormControl>
                              <FormDescription className="text-xs">
                                Telefone com máscara automática
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>
                  </>
                )}
                </div>
              </form>
            </Form>
          </div>
          
          <div className="px-6 pb-8 pt-3 sticky bottom-0 bg-background z-20 border-t">
            {formStep < 1 ? (
              <Button 
                type="button" 
                onClick={handleNextStep}
                className="w-full h-14 text-base font-medium"
              >
                Próximo Passo
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            ) : (
              <Button 
                type="submit" 
                form="client-form"
                disabled={createClientMutation.isPending}
                className="w-full h-14 text-base font-medium"
              >
                {createClientMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Criando...
                  </>
                ) : (
                  <>
                    <Check className="mr-2 h-5 w-5" />
                    Criar Cliente (⌘/Ctrl + Enter)
                  </>
                )}
              </Button>
            )}
            
            {formStep === 0 && (
              <div className="text-xs text-center text-muted-foreground mt-2">
                Apenas nome, tipo e e-mail são obrigatórios
              </div>
            )}
            
            {formStep === 1 && (
              <div className="text-xs text-center text-muted-foreground mt-2">
                Pressione ⌘/Ctrl + Enter para criar rapidamente
              </div>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}