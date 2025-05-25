import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { z } from "zod";
import { CalendarIcon, Check, ChevronsUpDown, X } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";
import { cn, formatCurrency, showSuccessToast } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

// Schema para validação do formulário
const incomeSchema = z.object({
  type: z.literal("income"),
  document_number: z.string().optional(),
  clientId: z.string().min(1, { message: "Cliente é obrigatório" }),
  projectId: z.string().optional(),
  amount: z.string().min(1, { message: "Valor é obrigatório" }),
  issueDate: z.date({
    required_error: "Data de emissão é obrigatória",
  }),
  dueDate: z.date({
    required_error: "Data de vencimento é obrigatória",
  }),
  description: z.string().optional(),
});

const expenseSchema = z.object({
  type: z.literal("expense"),
  category: z.string().min(1, { message: "Categoria é obrigatória" }),
  projectId: z.string().optional(),
  amount: z.string().min(1, { message: "Valor é obrigatório" }),
  date: z.date({
    required_error: "Data é obrigatória",
  }),
  description: z.string().min(1, { message: "Descrição é obrigatória" }),
  paidBy: z.string().optional(),
});

// União dos schemas para usar no formulário
const formSchema = z.discriminatedUnion("type", [incomeSchema, expenseSchema]);

// Categorias de despesas
const expenseCategories = [
  { id: "equipment", name: "Equipamentos" },
  { id: "software", name: "Software" },
  { id: "location", name: "Locação" },
  { id: "personnel", name: "Pessoal" },
  { id: "marketing", name: "Marketing" },
  { id: "travel", name: "Viagens" },
  { id: "office", name: "Escritório" },
  { id: "utilities", name: "Utilidades" },
  { id: "scenography", name: "Cenografia" },
  { id: "food", name: "Alimentos" },
  { id: "other", name: "Outros" },
];

// Componente de Dialog para novo registro financeiro
export function NewFinancialRecordDialog({ 
  onSuccess, 
  initialTab 
}: { 
  onSuccess?: () => void;
  initialTab?: "income" | "expense";
}) {
  const [open, setOpen] = useState(false);
  const [recordType, setRecordType] = useState<"income" | "expense">(initialTab || "income");
  const [openClientCombobox, setOpenClientCombobox] = useState(false);
  const [openProjectCombobox, setOpenProjectCombobox] = useState(false);
  const [openUserCombobox, setOpenUserCombobox] = useState(false);

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Carregar dados de clientes e projetos
  const { data: clients } = useQuery({
    queryKey: ['/api/clients'],
    enabled: open,
  });

  const { data: projects } = useQuery({
    queryKey: ['/api/projects'],
    enabled: open,
  });

  const { data: users } = useQuery({
    queryKey: ['/api/users'],
    enabled: open && recordType === "expense",
  });

  // Configurar o formulário
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      type: recordType,
      amount: "",
      description: "",
      document_number: "",
    } as any,
  });

  // Atualizar valores padrão quando o tipo de registro muda
  const updateDefaultValues = (type: "income" | "expense") => {
    setRecordType(type);
    form.reset({
      type,
      amount: "",
      description: "",
      document_number: type === "income" ? "" : undefined,
      clientId: type === "income" ? "" : undefined,
      projectId: "",
      issueDate: type === "income" ? new Date() : undefined,
      dueDate: type === "income" ? new Date() : undefined,
      category: type === "expense" ? "" : undefined,
      date: type === "expense" ? new Date() : undefined,
      paidBy: type === "expense" ? "" : undefined,
    } as any);
  };

  // Lidar com submissão do formulário
  const handleSubmit = (data: z.infer<typeof formSchema>) => {
    const endpoint = data.type === "income" 
      ? "/api/financial-documents" 
      : "/api/expenses";

    // Converter valores
    // Extrai o valor numérico da string formatada
    const amountStr = data.amount;
    
    // Remove todos os caracteres não numéricos
    const numbers = amountStr.replace(/\D/g, "");
    
    // Determina se há um separador decimal no valor digitado
    const hasDecimalSeparator = amountStr.includes(',') || amountStr.includes('.');
    
    // Calcula o valor com base nas mesmas regras de formatAmount
    let numericAmount = 0;
    if (numbers) {
      if (hasDecimalSeparator) {
        // Se o usuário incluiu algum separador decimal, trata normalmente como valor em centavos
        numericAmount = parseInt(numbers, 10) / 100;
      } else {
        // Se NÃO tem separador decimal, trata como valor inteiro (ex: 50 = R$50,00)
        // ao invés de centavos (ex: 50 = R$0,50)
        numericAmount = parseInt(numbers, 10);
      }
    }
    
    const submissionData = {
      ...data,
      amount: numericAmount, // Valor já convertido para número
    };

    // Mapear para o formato esperado pela API
    const mappedData = data.type === "income" 
      ? {
          document_type: "invoice",
          document_number: submissionData.document_number,
          client_id: parseInt(submissionData.clientId),
          project_id: submissionData.projectId ? parseInt(submissionData.projectId) : null,
          amount: submissionData.amount,
          creation_date: submissionData.issueDate.toISOString(),
          due_date: submissionData.dueDate.toISOString(),
          description: submissionData.description || null,
          paid: false,
          status: "pending",
        }
      : {
          category: submissionData.category,
          project_id: submissionData.projectId ? parseInt(submissionData.projectId) : null,
          amount: submissionData.amount,
          date: submissionData.date.toISOString(),
          description: submissionData.description,
          paid_by: submissionData.paidBy ? parseInt(submissionData.paidBy) : null,
          approved: false,
        };

    mutation.mutate(mappedData);
  };

  // Mutação para enviar os dados
  const mutation = useMutation({
    mutationFn: async (data: any) => {
      const endpoint = recordType === "income" 
        ? "/api/financial-documents" 
        : "/api/expenses";
      
      const response = await apiRequest("POST", endpoint, data);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Erro ao salvar registro");
      }
      
      return response.json();
    },
    onSuccess: () => {
      showSuccessToast({
        title: "Registro salvo com sucesso",
        description: "O registro financeiro foi salvo com sucesso."
      });
      
      // Recarregar os dados
      if (recordType === "income") {
        queryClient.invalidateQueries({ queryKey: ['/api/financial-documents'] });
      } else {
        queryClient.invalidateQueries({ queryKey: ['/api/expenses'] });
      }
      
      setOpen(false);
      form.reset();
      
      if (onSuccess) {
        onSuccess();
      }
    },
    onError: (error) => {
      toast({
        title: "Erro ao salvar registro",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Formatar valor monetário no input
  const formatAmount = (value: string) => {
    // Remove todos os caracteres não numéricos
    const numbers = value.replace(/\D/g, "");
    
    // Verifica se é um número inteiro sem centavos (qualquer dígito sem separador)
    let amount = 0;
    if (numbers) {
      // Determina se há um separador decimal no valor digitado
      const hasDecimalSeparator = value.includes(',') || value.includes('.');
      
      if (hasDecimalSeparator) {
        // Se o usuário incluiu algum separador decimal, trata normalmente como valor em centavos
        amount = parseInt(numbers, 10) / 100;
      } else {
        // Se NÃO tem separador decimal, trata como valor inteiro (ex: 50 = R$50,00)
        // ao invés de centavos (ex: 50 = R$0,50)
        amount = parseInt(numbers, 10);
      }
    }
    
    // Formata como moeda
    return formatCurrency(amount);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <span className="hidden sm:inline">Novo Registro</span>
          <span className="sm:hidden">Novo</span>
          <span className="sr-only">Criar novo registro financeiro</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[550px] max-h-[90vh] overflow-auto">
        <DialogHeader>
          <DialogTitle>Novo Registro Financeiro</DialogTitle>
          <DialogDescription>
            Adicione uma receita ou despesa ao sistema financeiro.
          </DialogDescription>
        </DialogHeader>

        <Tabs 
          defaultValue={recordType} 
          onValueChange={(value) => updateDefaultValues(value as "income" | "expense")}
          className="mt-2"
        >
          <TabsList className="grid w-full grid-cols-2 h-12 p-1 bg-gray-100/80 rounded-lg">
            <TabsTrigger 
              value="income" 
              className="text-sm font-medium h-10 px-4 rounded-md data-[state=active]:bg-green-500 data-[state=active]:text-white data-[state=active]:shadow-sm data-[state=active]:font-semibold hover:bg-green-100 hover:text-green-700 transition-all duration-200"
            >
              💰 Receita
            </TabsTrigger>
            <TabsTrigger 
              value="expense" 
              className="text-sm font-medium h-10 px-4 rounded-md data-[state=active]:bg-red-500 data-[state=active]:text-white data-[state=active]:shadow-sm data-[state=active]:font-semibold hover:bg-red-100 hover:text-red-700 transition-all duration-200"
            >
              💸 Despesa
            </TabsTrigger>
          </TabsList>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4 mt-4">
              {/* Campo hidden para o tipo */}
              <input type="hidden" {...form.register("type")} value={recordType} />
              
              {/* Conteúdo da aba Receita */}
              <TabsContent value="income" className="space-y-4 mt-0">
                {/* Número do documento */}
                <FormField
                  control={form.control}
                  name="document_number"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Número da Fatura</FormLabel>
                      <FormControl>
                        <Input placeholder="F-1001" {...field} />
                      </FormControl>
                      <FormDescription>
                        O número identificador da fatura ou nota fiscal.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                {/* Seleção de Cliente */}
                <FormField
                  control={form.control}
                  name="clientId"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Cliente</FormLabel>
                      <Popover open={openClientCombobox} onOpenChange={setOpenClientCombobox}>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              role="combobox"
                              aria-expanded={openClientCombobox}
                              className={cn(
                                "w-full justify-between",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              {field.value
                                ? clients?.find(
                                    (client: any) => client.id.toString() === field.value
                                  )?.name
                                : "Selecionar cliente"}
                              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-full p-0">
                          <Command>
                            <CommandInput placeholder="Buscar cliente..." />
                            <CommandEmpty>Nenhum cliente encontrado.</CommandEmpty>
                            <CommandGroup>
                              {clients?.map((client: any) => (
                                <CommandItem
                                  key={client.id}
                                  value={client.name}
                                  onSelect={() => {
                                    form.setValue("clientId", client.id.toString());
                                    setOpenClientCombobox(false);
                                  }}
                                >
                                  <Check
                                    className={cn(
                                      "mr-2 h-4 w-4",
                                      client.id.toString() === field.value
                                        ? "opacity-100"
                                        : "opacity-0"
                                    )}
                                  />
                                  {client.name}
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </Command>
                        </PopoverContent>
                      </Popover>
                      <FormDescription>
                        O cliente associado a esta fatura.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                {/* Seleção de Projeto */}
                <FormField
                  control={form.control}
                  name="projectId"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Projeto (opcional)</FormLabel>
                      <Popover open={openProjectCombobox} onOpenChange={setOpenProjectCombobox}>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              role="combobox"
                              aria-expanded={openProjectCombobox}
                              className={cn(
                                "w-full justify-between",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              {field.value
                                ? projects?.find(
                                    (project: any) => project.id.toString() === field.value
                                  )?.name
                                : "Selecionar projeto"}
                              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-full p-0">
                          <Command>
                            <CommandInput placeholder="Buscar projeto..." />
                            <CommandEmpty>Nenhum projeto encontrado.</CommandEmpty>
                            <CommandGroup>
                              {projects?.map((project: any) => (
                                <CommandItem
                                  key={project.id}
                                  value={project.name}
                                  onSelect={() => {
                                    form.setValue("projectId", project.id.toString());
                                    setOpenProjectCombobox(false);
                                  }}
                                >
                                  <Check
                                    className={cn(
                                      "mr-2 h-4 w-4",
                                      project.id.toString() === field.value
                                        ? "opacity-100"
                                        : "opacity-0"
                                    )}
                                  />
                                  {project.name}
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </Command>
                        </PopoverContent>
                      </Popover>
                      <FormDescription>
                        Projeto associado a esta fatura, se aplicável.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                {/* Valor */}
                <FormField
                  control={form.control}
                  name="amount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Valor</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="R$ 0,00" 
                          {...field} 
                          onChange={(e) => {
                            // Formatação do valor enquanto digita
                            field.onChange(e.target.value);
                          }}
                          onBlur={(e) => {
                            // Formatação final ao remover foco
                            field.onChange(formatAmount(e.target.value));
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                {/* Datas de emissão e vencimento */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="issueDate"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>Data de Emissão</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant={"outline"}
                                className={cn(
                                  "w-full pl-3 text-left font-normal",
                                  !field.value && "text-muted-foreground"
                                )}
                              >
                                {field.value ? (
                                  format(field.value, "dd/MM/yyyy")
                                ) : (
                                  <span>Selecione uma data</span>
                                )}
                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={field.value}
                              onSelect={field.onChange}
                              disabled={(date) => date > new Date()}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="dueDate"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>Data de Vencimento</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant={"outline"}
                                className={cn(
                                  "w-full pl-3 text-left font-normal",
                                  !field.value && "text-muted-foreground"
                                )}
                              >
                                {field.value ? (
                                  format(field.value, "dd/MM/yyyy")
                                ) : (
                                  <span>Selecione uma data</span>
                                )}
                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={field.value}
                              onSelect={field.onChange}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                {/* Descrição */}
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Descrição (opcional)</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Descreva detalhes adicionais sobre esta fatura..." 
                          className="h-24 resize-none"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </TabsContent>
              
              {/* Conteúdo da aba Despesa */}
              <TabsContent value="expense" className="space-y-4 mt-0">
                {/* Categoria */}
                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Categoria</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecionar categoria" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {expenseCategories.map((category) => (
                            <SelectItem 
                              key={category.id} 
                              value={category.id}
                            >
                              {category.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Tipo de despesa para fins de classificação.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                {/* Seleção de Projeto */}
                <FormField
                  control={form.control}
                  name="projectId"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Projeto (opcional)</FormLabel>
                      <Popover open={openProjectCombobox} onOpenChange={setOpenProjectCombobox}>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              role="combobox"
                              aria-expanded={openProjectCombobox}
                              className={cn(
                                "w-full justify-between",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              {field.value
                                ? projects?.find(
                                    (project: any) => project.id.toString() === field.value
                                  )?.name
                                : "Selecionar projeto"}
                              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-full p-0">
                          <Command>
                            <CommandInput placeholder="Buscar projeto..." />
                            <CommandEmpty>Nenhum projeto encontrado.</CommandEmpty>
                            <CommandGroup>
                              {projects?.map((project: any) => (
                                <CommandItem
                                  key={project.id}
                                  value={project.name}
                                  onSelect={() => {
                                    form.setValue("projectId", project.id.toString());
                                    setOpenProjectCombobox(false);
                                  }}
                                >
                                  <Check
                                    className={cn(
                                      "mr-2 h-4 w-4",
                                      project.id.toString() === field.value
                                        ? "opacity-100"
                                        : "opacity-0"
                                    )}
                                  />
                                  {project.name}
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </Command>
                        </PopoverContent>
                      </Popover>
                      <FormDescription>
                        Projeto associado a esta despesa, se aplicável.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                {/* Valor */}
                <FormField
                  control={form.control}
                  name="amount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Valor</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="R$ 0,00" 
                          {...field} 
                          onChange={(e) => {
                            // Formatação do valor enquanto digita
                            field.onChange(e.target.value);
                          }}
                          onBlur={(e) => {
                            // Formatação final ao remover foco
                            field.onChange(formatAmount(e.target.value));
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                {/* Data */}
                <FormField
                  control={form.control}
                  name="date"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Data</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant={"outline"}
                              className={cn(
                                "w-full pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              {field.value ? (
                                format(field.value, "dd/MM/yyyy")
                              ) : (
                                <span>Selecione uma data</span>
                              )}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                {/* Responsável */}
                <FormField
                  control={form.control}
                  name="paidBy"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Responsável (opcional)</FormLabel>
                      <Popover open={openUserCombobox} onOpenChange={setOpenUserCombobox}>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              role="combobox"
                              aria-expanded={openUserCombobox}
                              className={cn(
                                "w-full justify-between",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              {field.value
                                ? users?.find(
                                    (user: any) => user.id.toString() === field.value
                                  )?.name
                                : "Selecionar responsável"}
                              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-full p-0">
                          <Command>
                            <CommandInput placeholder="Buscar usuário..." />
                            <CommandEmpty>Nenhum usuário encontrado.</CommandEmpty>
                            <CommandGroup>
                              {users?.map((user: any) => (
                                <CommandItem
                                  key={user.id}
                                  value={user.name}
                                  onSelect={() => {
                                    form.setValue("paidBy", user.id.toString());
                                    setOpenUserCombobox(false);
                                  }}
                                >
                                  <Check
                                    className={cn(
                                      "mr-2 h-4 w-4",
                                      user.id.toString() === field.value
                                        ? "opacity-100"
                                        : "opacity-0"
                                    )}
                                  />
                                  {user.name}
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </Command>
                        </PopoverContent>
                      </Popover>
                      <FormDescription>
                        Pessoa responsável por esta despesa.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                {/* Descrição */}
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Descrição</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Descreva detalhes sobre esta despesa..." 
                          className="h-24 resize-none"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </TabsContent>
              
              <DialogFooter className="pt-4">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setOpen(false)}
                  className="gap-1"
                >
                  <X className="h-4 w-4" />
                  Cancelar
                </Button>
                <Button 
                  type="submit" 
                  className="gap-1"
                  disabled={mutation.isPending}
                >
                  {mutation.isPending ? (
                    <div className="flex items-center gap-2">
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                      <span>Salvando...</span>
                    </div>
                  ) : (
                    <>
                      <Check className="h-4 w-4" />
                      Salvar Registro
                    </>
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}