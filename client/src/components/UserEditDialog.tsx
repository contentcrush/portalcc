import { useState, useEffect } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest, queryClient } from "@/lib/queryClient";

import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle,
  DialogFooter
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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { UserCog } from "lucide-react";

// Esquema de validação para formulário de usuário
const userFormSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  email: z.string().email("Email inválido").min(1, "Email é obrigatório"),
  username: z.string().optional(),
  role: z.enum(["admin", "manager", "editor", "viewer"]).default("viewer"),
  user_type: z.enum(["pf", "pj"]).default("pf").optional(),
  document: z.string().optional(),
  department: z.string().optional(),
  position: z.string().optional(),
  phone: z.string().optional(),
  mobile_phone: z.string().optional(),
  website: z.string().optional(),
  address: z.string().optional(),
  area: z.string().optional(),
  contact_name: z.string().optional(),
  contact_position: z.string().optional(),
  contact_email: z.string().optional(),
  bank: z.string().optional(),
  bank_agency: z.string().optional(),
  bank_account: z.string().optional(),
  account_type: z.enum(["corrente", "poupanca", "pagamento", "investimento"]).default("corrente").optional(),
  pix_key: z.string().optional(),
  is_active: z.boolean().default(true),
  bio: z.string().optional(),
  notes: z.string().optional(),
});

// Tipo inferido do esquema
type UserFormValues = z.infer<typeof userFormSchema>;

// Componente de diálogo para adicionar/editar usuário
export function UserEditDialog({ 
  isOpen, 
  onClose, 
  user = null
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  user?: any;
}) {
  const { user: currentUser } = useAuth();
  const isAdmin = currentUser?.role === "admin";
  const { toast } = useToast();
  
  // Setup react-hook-form com valores padrão vazios
  const form = useForm<UserFormValues>({
    resolver: zodResolver(userFormSchema),
    defaultValues: {
      name: "",
      email: "",
      username: "",
      role: "viewer",
      department: "",
      position: "",
      phone: "",
      mobile_phone: "",
      user_type: "pf",
      document: "",
      website: "",
      address: "",
      area: "",
      contact_name: "",
      contact_position: "",
      contact_email: "",
      bank: "",
      bank_agency: "",
      bank_account: "",
      account_type: "corrente",
      pix_key: "",
      is_active: true,
      bio: "",
      notes: "",
    },
  });
  
  // Atualizar o formulário quando o usuário for alterado
  useEffect(() => {
    console.log("UserEditDialog: user changed", user);
    if (user) {
      form.reset({
        name: user.name || "",
        email: user.email || "",
        username: user.username || "",
        role: user.role || "viewer",
        department: user.department || "",
        position: user.position || "",
        phone: user.phone || "",
        mobile_phone: user.mobile_phone || "",
        user_type: user.user_type || "pf",
        document: user.document || "",
        website: user.website || "",
        address: user.address || "",
        area: user.area || "",
        contact_name: user.contact_name || "",
        contact_position: user.contact_position || "",
        contact_email: user.contact_email || "",
        bank: user.bank || "",
        bank_agency: user.bank_agency || "",
        bank_account: user.bank_account || "",
        account_type: user.account_type || "corrente",
        pix_key: user.pix_key || "",
        is_active: user.is_active ?? true,
        bio: user.bio || "",
        notes: user.notes || "",
      });
    } else {
      form.reset({
        name: "",
        email: "",
        username: "",
        role: "viewer",
        department: "",
        position: "",
        phone: "",
        mobile_phone: "",
        user_type: "pf",
        document: "",
        website: "",
        address: "",
        area: "",
        contact_name: "",
        contact_position: "",
        contact_email: "",
        bank: "",
        bank_agency: "",
        bank_account: "",
        account_type: "corrente",
        pix_key: "",
        is_active: true,
        bio: "",
        notes: "",
      });
    }
  }, [user, form]);
  
  // Criar usuário mutation
  const createUserMutation = useMutation({
    mutationFn: async (data: UserFormValues) => {
      const res = await apiRequest("POST", "/api/users", {
        ...data,
        username: data.email.split('@')[0], // Usa parte do email como nome de usuário
        password: "senha123", // Senha temporária - usuário deve alterá-la depois
      });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      toast({
        title: "Usuário criado",
        description: "O usuário foi criado com sucesso.",
        variant: "default",
      });
      onClose();
    },
    onError: (error: Error) => {
      toast({
        title: "Erro",
        description: error.message || "Não foi possível criar o usuário",
        variant: "destructive",
      });
    }
  });
  
  // Atualizar usuário mutation
  const updateUserMutation = useMutation({
    mutationFn: async (data: UserFormValues) => {
      const res = await apiRequest("PUT", `/api/users/${user.id}`, data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      toast({
        title: "Usuário atualizado",
        description: "O usuário foi atualizado com sucesso.",
        variant: "default",
      });
      onClose();
    },
    onError: (error: Error) => {
      toast({
        title: "Erro",
        description: error.message || "Não foi possível atualizar o usuário",
        variant: "destructive",
      });
    }
  });

  function onSubmit(data: UserFormValues) {
    console.log("Submitting form with data:", data);
    if (user) {
      // Atualizar usuário existente
      updateUserMutation.mutate(data);
    } else {
      // Criar novo usuário
      createUserMutation.mutate(data);
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle className="flex items-center text-xl">
            <UserCog className="mr-2 h-5 w-5" />
            {user ? "Editar Usuário" : "Novo Usuário"}
          </DialogTitle>
          <DialogDescription>
            {user 
              ? "Edite as informações do usuário abaixo." 
              : "Adicione um novo usuário ao sistema."
            }
          </DialogDescription>
        </DialogHeader>
        
        <div className="mt-4">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
              <Tabs defaultValue="info_basica" className="w-full">
                <TabsList className="grid grid-cols-3 mb-4">
                  <TabsTrigger value="info_basica">Informações Básicas</TabsTrigger>
                  <TabsTrigger value="info_adicional">Dados Adicionais</TabsTrigger>
                  <TabsTrigger value="dados_bancarios">Dados Bancários</TabsTrigger>
                </TabsList>
                
                <div className="h-[55vh] overflow-y-auto pr-2 pb-2">
                  {/* Tab: Informações Básicas */}
                  <TabsContent value="info_basica" className="space-y-4 mt-0">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nome/Razão Social*</FormLabel>
                          <FormControl>
                            <Input placeholder="Nome completo ou razão social" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email*</FormLabel>
                          <FormControl>
                            <Input placeholder="exemplo@contentcrush.com" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    {isAdmin && (
                      <FormField
                        control={form.control}
                        name="role"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Função/Nível de Acesso</FormLabel>
                            {!user && (
                              // Novo usuário - Admin pode escolher o nível de acesso
                              <>
                                <Select
                                  onValueChange={field.onChange}
                                  value={field.value}
                                >
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Selecione uma função" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    <SelectItem value="admin">Admin</SelectItem>
                                    <SelectItem value="manager">Gestor</SelectItem>
                                    <SelectItem value="editor">Editor</SelectItem>
                                    <SelectItem value="viewer">Visualizador</SelectItem>
                                  </SelectContent>
                                </Select>
                                <FormDescription>
                                  Define as permissões do usuário no sistema.
                                </FormDescription>
                              </>
                            )}
                            {user && isAdmin && (
                              // Admin editando usuário existente - pode alterar a função
                              <>
                                <Select
                                  onValueChange={field.onChange}
                                  value={field.value}
                                >
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Selecione uma função" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    <SelectItem value="admin">Admin</SelectItem>
                                    <SelectItem value="manager">Gestor</SelectItem>
                                    <SelectItem value="editor">Editor</SelectItem>
                                    <SelectItem value="viewer">Visualizador</SelectItem>
                                  </SelectContent>
                                </Select>
                                <FormDescription>
                                  Define as permissões do usuário no sistema.
                                </FormDescription>
                              </>
                            )}
                            {user && !isAdmin && (
                              // Usuário não-admin editando - não pode mudar papéis
                              <Input 
                                value={field.value === "admin" ? "Admin" : 
                                      field.value === "manager" ? "Gestor" :
                                      field.value === "editor" ? "Editor" : "Visualizador"} 
                                disabled 
                                className="bg-gray-50"
                              />
                            )}
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}
                    
                    <FormField
                      control={form.control}
                      name="user_type"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Tipo</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            value={field.value || "pf"}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Selecione o tipo" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="pf">Pessoa Física</SelectItem>
                              <SelectItem value="pj">Pessoa Jurídica</SelectItem>
                            </SelectContent>
                          </Select>
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="document"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>CNPJ/CPF</FormLabel>
                          <FormControl>
                            <Input placeholder="Documento de identificação" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="is_active"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>Ativo</FormLabel>
                            <FormDescription>
                              Usuários inativos não poderão acessar o sistema.
                            </FormDescription>
                          </div>
                        </FormItem>
                      )}
                    />
                  </TabsContent>
                  
                  {/* Tab: Dados Adicionais */}
                  <TabsContent value="info_adicional" className="space-y-4 mt-0">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="phone"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Telefone</FormLabel>
                            <FormControl>
                              <Input placeholder="(00) 0000-0000" {...field} />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="mobile_phone"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Celular</FormLabel>
                            <FormControl>
                              <Input placeholder="(00) 00000-0000" {...field} />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="website"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Website</FormLabel>
                            <FormControl>
                              <Input placeholder="https://www.exemplo.com" {...field} />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="area"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Área de Atuação</FormLabel>
                            <FormControl>
                              <Input placeholder="Ex: Marketing, Design, Desenvolvimento" {...field} />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="department"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Departamento</FormLabel>
                            <FormControl>
                              <Input placeholder="Ex: Marketing, Design, TI" {...field} />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="position"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Cargo</FormLabel>
                            <FormControl>
                              <Input placeholder="Ex: Analista, Coordenador, Gerente" {...field} />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    <FormField
                      control={form.control}
                      name="address"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Endereço</FormLabel>
                          <FormControl>
                            <Input placeholder="Endereço completo" {...field} />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    {form.watch("user_type") === "pj" && (
                      <>
                        <FormField
                          control={form.control}
                          name="contact_name"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Nome do Contato</FormLabel>
                              <FormControl>
                                <Input placeholder="Nome da pessoa de contato" {...field} />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <FormField
                            control={form.control}
                            name="contact_position"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Cargo do Contato</FormLabel>
                                <FormControl>
                                  <Input placeholder="Ex: Diretor, Gerente" {...field} />
                                </FormControl>
                              </FormItem>
                            )}
                          />
                          
                          <FormField
                            control={form.control}
                            name="contact_email"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Email do Contato</FormLabel>
                                <FormControl>
                                  <Input placeholder="contato@exemplo.com" {...field} />
                                </FormControl>
                              </FormItem>
                            )}
                          />
                        </div>
                      </>
                    )}
                    
                    <FormField
                      control={form.control}
                      name="bio"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Biografia/Descrição</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Uma breve descrição sobre o usuário ou empresa"
                              className="min-h-[100px]"
                              {...field}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="notes"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Observações</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Observações adicionais"
                              className="min-h-[100px]"
                              {...field}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </TabsContent>
                  
                  {/* Tab: Dados Bancários */}
                  <TabsContent value="dados_bancarios" className="space-y-4 mt-0">
                    <FormField
                      control={form.control}
                      name="bank"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Banco</FormLabel>
                          <FormControl>
                            <Input placeholder="Nome do banco" {...field} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="bank_agency"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Agência</FormLabel>
                            <FormControl>
                              <Input placeholder="Número da agência" {...field} />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="bank_account"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Conta</FormLabel>
                            <FormControl>
                              <Input placeholder="Número da conta" {...field} />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    <FormField
                      control={form.control}
                      name="account_type"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Tipo de Conta</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            value={field.value || "corrente"}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Selecione o tipo de conta" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="corrente">Conta Corrente</SelectItem>
                              <SelectItem value="poupanca">Conta Poupança</SelectItem>
                              <SelectItem value="pagamento">Conta Pagamento</SelectItem>
                              <SelectItem value="investimento">Conta Investimento</SelectItem>
                            </SelectContent>
                          </Select>
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="pix_key"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Chave PIX</FormLabel>
                          <FormControl>
                            <Input placeholder="Chave PIX (CPF, CNPJ, Email, Telefone ou Chave Aleatória)" {...field} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </TabsContent>
                </div>
              </Tabs>
              
              <DialogFooter className="mt-6">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onClose}
                >
                  Cancelar
                </Button>
                <Button 
                  type="submit"
                  disabled={createUserMutation.isPending || updateUserMutation.isPending}
                >
                  {(createUserMutation.isPending || updateUserMutation.isPending) && (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  )}
                  {user ? "Salvar alterações" : "Criar usuário"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </div>
      </DialogContent>
    </Dialog>
  );
}