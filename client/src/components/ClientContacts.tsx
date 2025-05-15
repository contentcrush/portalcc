import { useState, useEffect } from "react";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plus, UserPlus, Phone, Mail, Star, X, Edit, Trash2 } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { insertClientContactSchema, type ClientContact } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { showSuccessToast } from "@/lib/utils";

const contactFormSchema = z.object({
  name: z.string().min(2, {
    message: "Nome deve ter pelo menos 2 caracteres.",
  }),
  position: z.string().optional(),
  email: z.string().email({
    message: "Email inválido.",
  }).optional().or(z.literal('')),
  phone: z.string().optional(),
  is_primary: z.boolean().default(false),
  notes: z.string().optional(),
});

type ContactFormValues = z.infer<typeof contactFormSchema>;

interface ClientContactsProps {
  clientId?: number;
  className?: string;
}

export default function ClientContacts({ clientId, className = "" }: ClientContactsProps) {
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedContact, setSelectedContact] = useState<ClientContact | null>(null);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Carregar contatos do cliente com cache otimizado
  const { 
    data: contacts, 
    isLoading: isLoadingContacts,
    error 
  } = useQuery<ClientContact[]>({
    queryKey: [`/api/clients/${clientId}/contacts`],
    enabled: !!clientId,
    staleTime: 3 * 60 * 1000, // 3 minutos de stale time
    gcTime: 10 * 60 * 1000, // 10 minutos de cache time
    refetchOnWindowFocus: false // Evita refetches constantes ao focar na janela
  });

  // Form para adicionar novo contato
  const addForm = useForm<ContactFormValues>({
    resolver: zodResolver(contactFormSchema),
    defaultValues: {
      name: "",
      position: "",
      email: "",
      phone: "",
      is_primary: false,
      notes: "",
    },
  });

  // Form para editar contato
  const editForm = useForm<ContactFormValues>({
    resolver: zodResolver(contactFormSchema),
    defaultValues: {
      name: "",
      position: "",
      email: "",
      phone: "",
      is_primary: false,
      notes: "",
    },
  });

  // Mutation para adicionar novo contato
  const addContactMutation = useMutation({
    mutationFn: async (data: ContactFormValues) => {
      if (!clientId) throw new Error("ID do cliente não informado");
      
      const contactData = {
        client_id: clientId,
        name: data.name,
        position: data.position || null,
        email: data.email || null,
        phone: data.phone || null,
        is_primary: data.is_primary,
        notes: data.notes || null,
      };
      
      const response = await apiRequest(
        'POST', 
        `/api/clients/${clientId}/contacts`, 
        contactData
      );
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/clients/${clientId}/contacts`] });
      showSuccessToast({
        title: "Contato adicionado",
        description: "O contato foi adicionado com sucesso."
      });
      setIsAddOpen(false);
      addForm.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao adicionar contato",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Mutation para editar contato
  const editContactMutation = useMutation({
    mutationFn: async (data: ContactFormValues) => {
      if (!clientId || !selectedContact) throw new Error("Dados incompletos");
      
      const contactData = {
        name: data.name,
        position: data.position || null,
        email: data.email || null,
        phone: data.phone || null,
        is_primary: data.is_primary,
        notes: data.notes || null,
      };
      
      const response = await apiRequest(
        'PATCH', 
        `/api/clients/${clientId}/contacts/${selectedContact.id}`, 
        contactData
      );
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/clients/${clientId}/contacts`] });
      showSuccessToast({
        title: "Contato atualizado",
        description: "O contato foi atualizado com sucesso."
      });
      setIsEditOpen(false);
      setSelectedContact(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao atualizar contato",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Mutation para excluir contato
  const deleteContactMutation = useMutation({
    mutationFn: async () => {
      if (!clientId || !selectedContact) throw new Error("Dados incompletos");
      
      const response = await apiRequest(
        'DELETE', 
        `/api/clients/${clientId}/contacts/${selectedContact.id}`
      );
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/clients/${clientId}/contacts`] });
      showSuccessToast({
        title: "Contato excluído",
        description: "O contato foi excluído com sucesso."
      });
      setIsDeleteOpen(false);
      setSelectedContact(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao excluir contato",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Mutation para marcar contato como principal
  const setPrimaryContactMutation = useMutation({
    mutationFn: async (contactId: number) => {
      if (!clientId) throw new Error("ID do cliente não informado");
      
      const response = await apiRequest(
        'PATCH', 
        `/api/clients/${clientId}/contacts/${contactId}/primary`
      );
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/clients/${clientId}/contacts`] });
      showSuccessToast({
        title: "Contato principal atualizado",
        description: "O contato principal foi atualizado com sucesso."
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao atualizar contato principal",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Preenche o formulário de edição quando um contato é selecionado
  useEffect(() => {
    if (selectedContact) {
      editForm.reset({
        name: selectedContact.name,
        position: selectedContact.position || "",
        email: selectedContact.email || "",
        phone: selectedContact.phone || "",
        is_primary: selectedContact.is_primary,
        notes: selectedContact.notes || "",
      });
    }
  }, [selectedContact, editForm]);

  // Manipuladores de eventos
  const handleAddSubmit = (data: ContactFormValues) => {
    addContactMutation.mutate(data);
  };

  const handleEditSubmit = (data: ContactFormValues) => {
    editContactMutation.mutate(data);
  };

  const handleDelete = () => {
    deleteContactMutation.mutate();
  };

  const handleSetPrimary = (contactId: number) => {
    setPrimaryContactMutation.mutate(contactId);
  };

  // Renderiza o componente
  return (
    <Card className={className}>
      <CardHeader className="p-4 pb-0 flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-lg font-semibold">Contatos</CardTitle>
          <CardDescription>Gerenciar contatos do cliente</CardDescription>
        </div>
        <Button 
          onClick={() => setIsAddOpen(true)} 
          variant="outline" 
          size="sm" 
          className="gap-1"
        >
          <Plus className="h-4 w-4" />
          <span className="sr-only md:not-sr-only md:inline-block">Adicionar</span>
        </Button>
      </CardHeader>
      <CardContent className="p-4">
        {isLoadingContacts && (
          <div className="flex justify-center py-6">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        )}
        
        {error && (
          <div className="text-center py-6 text-destructive">
            Erro ao carregar contatos. Tente novamente.
          </div>
        )}
        
        {contacts && contacts.length === 0 && (
          <div className="text-center py-6 text-muted-foreground">
            Nenhum contato cadastrado.
          </div>
        )}
        
        {contacts && contacts.length > 0 && (
          <div className="space-y-3">
            {contacts.map((contact) => (
              <div 
                key={contact.id} 
                className="rounded-lg border p-3 flex flex-col gap-1.5"
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium">{contact.name}</h4>
                      {contact.is_primary && (
                        <Badge variant="outline" className="text-yellow-600 border-yellow-300 bg-yellow-50 text-xs h-5">
                          <Star className="h-3 w-3 mr-1 fill-yellow-500 text-yellow-500" />
                          Principal
                        </Badge>
                      )}
                    </div>
                    
                    {contact.position && (
                      <p className="text-sm text-muted-foreground">{contact.position}</p>
                    )}
                  </div>
                  
                  <div className="flex gap-1">
                    {!contact.is_primary && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0"
                        title="Marcar como principal"
                        onClick={() => handleSetPrimary(contact.id)}
                      >
                        <Star className="h-4 w-4" />
                        <span className="sr-only">Marcar como principal</span>
                      </Button>
                    )}
                    
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0"
                      title="Editar contato"
                      onClick={() => {
                        setSelectedContact(contact);
                        setIsEditOpen(true);
                      }}
                    >
                      <Edit className="h-4 w-4" />
                      <span className="sr-only">Editar</span>
                    </Button>
                    
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 text-destructive"
                      title="Excluir contato"
                      onClick={() => {
                        setSelectedContact(contact);
                        setIsDeleteOpen(true);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                      <span className="sr-only">Excluir</span>
                    </Button>
                  </div>
                </div>
                
                <div className="flex flex-col gap-1 text-sm">
                  {contact.email && (
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <Mail className="h-3.5 w-3.5" />
                      <a href={`mailto:${contact.email}`} className="hover:underline">
                        {contact.email}
                      </a>
                    </div>
                  )}
                  
                  {contact.phone && (
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <Phone className="h-3.5 w-3.5" />
                      <a href={`tel:${contact.phone}`} className="hover:underline">
                        {contact.phone}
                      </a>
                    </div>
                  )}
                </div>
                
                {contact.notes && (
                  <div className="mt-2 text-sm border-t pt-2 text-muted-foreground">
                    {contact.notes}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
      
      {/* Dialog para adicionar contato */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Adicionar Contato</DialogTitle>
            <DialogDescription>
              Adicione um novo contato para este cliente.
            </DialogDescription>
          </DialogHeader>
          
          <Form {...addForm}>
            <form onSubmit={addForm.handleSubmit(handleAddSubmit)} className="space-y-4">
              <FormField
                control={addForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome</FormLabel>
                    <FormControl>
                      <Input placeholder="Nome do contato" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={addForm.control}
                name="position"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cargo</FormLabel>
                    <FormControl>
                      <Input placeholder="Cargo ou função" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={addForm.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input placeholder="Email" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={addForm.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Telefone</FormLabel>
                      <FormControl>
                        <Input placeholder="Telefone" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <FormField
                control={addForm.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Observações</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Informações adicionais sobre o contato" 
                        className="resize-none" 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={addForm.control}
                name="is_primary"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Contato principal</FormLabel>
                      <FormDescription>
                        Marque esta opção para definir como contato principal do cliente.
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />
              
              <DialogFooter>
                <Button type="submit" disabled={addContactMutation.isPending}>
                  {addContactMutation.isPending && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Adicionar
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
      
      {/* Dialog para editar contato */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Editar Contato</DialogTitle>
            <DialogDescription>
              Atualize as informações do contato.
            </DialogDescription>
          </DialogHeader>
          
          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit(handleEditSubmit)} className="space-y-4">
              <FormField
                control={editForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome</FormLabel>
                    <FormControl>
                      <Input placeholder="Nome do contato" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={editForm.control}
                name="position"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cargo</FormLabel>
                    <FormControl>
                      <Input placeholder="Cargo ou função" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={editForm.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input placeholder="Email" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={editForm.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Telefone</FormLabel>
                      <FormControl>
                        <Input placeholder="Telefone" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <FormField
                control={editForm.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Observações</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Informações adicionais sobre o contato" 
                        className="resize-none" 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={editForm.control}
                name="is_primary"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Contato principal</FormLabel>
                      <FormDescription>
                        Marque esta opção para definir como contato principal do cliente.
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />
              
              <DialogFooter>
                <Button type="submit" disabled={editContactMutation.isPending}>
                  {editContactMutation.isPending && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Salvar alterações
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
      
      {/* Dialog para confirmar exclusão */}
      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Excluir Contato</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir este contato? Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          
          <div className="mt-2 border rounded-md p-3">
            <p className="font-medium">{selectedContact?.name}</p>
            {selectedContact?.position && (
              <p className="text-sm text-muted-foreground">{selectedContact.position}</p>
            )}
            {selectedContact?.email && (
              <p className="text-sm mt-1">Email: {selectedContact.email}</p>
            )}
            {selectedContact?.phone && (
              <p className="text-sm">Telefone: {selectedContact.phone}</p>
            )}
          </div>
          
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setIsDeleteOpen(false)}
            >
              Cancelar
            </Button>
            
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteContactMutation.isPending}
            >
              {deleteContactMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}