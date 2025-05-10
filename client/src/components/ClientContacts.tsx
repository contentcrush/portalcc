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
import { showSuccessToast } from "@/lib/utils";
import { Loader2, Plus, UserPlus, Phone, Mail, Star, X, Edit, Trash2 } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { insertClientContactSchema, type ClientContact } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";

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
  clientId: number;
  clientName: string;
}

export default function ClientContacts({ clientId, clientName }: ClientContactsProps) {
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedContact, setSelectedContact] = useState<ClientContact | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Carregar contatos do cliente
  const { 
    data: contacts, 
    isLoading: isLoadingContacts,
    error 
  } = useQuery<ClientContact[]>({
    queryKey: [`/api/clients/${clientId}/contacts`],
    enabled: !!clientId
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
    }
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
    }
  });

  // Mutation para adicionar contato
  const addMutation = useMutation({
    mutationFn: async (data: ContactFormValues) => {
      const response = await apiRequest(
        "POST", 
        `/api/clients/${clientId}/contacts`, 
        data
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
  const editMutation = useMutation({
    mutationFn: async (data: ContactFormValues) => {
      if (!selectedContact) return null;
      const response = await apiRequest(
        "PUT", 
        `/api/client-contacts/${selectedContact.id}`, 
        data
      );
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/clients/${clientId}/contacts`] });
      toast({
        title: "Contato atualizado",
        description: "O contato foi atualizado com sucesso.",
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
  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!selectedContact) return null;
      await apiRequest(
        "DELETE", 
        `/api/client-contacts/${selectedContact.id}`
      );
      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/clients/${clientId}/contacts`] });
      toast({
        title: "Contato excluído",
        description: "O contato foi excluído com sucesso.",
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

  // Mutation para definir contato como primário
  const setPrimaryMutation = useMutation({
    mutationFn: async (contactId: number) => {
      const response = await apiRequest(
        "POST", 
        `/api/client-contacts/${contactId}/set-primary`
      );
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/clients/${clientId}/contacts`] });
      toast({
        title: "Contato principal atualizado",
        description: "O contato principal foi atualizado com sucesso.",
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

  const onAddSubmit = (data: ContactFormValues) => {
    addMutation.mutate(data);
  };

  const onEditSubmit = (data: ContactFormValues) => {
    editMutation.mutate(data);
  };

  const handleEditClick = (contact: ClientContact) => {
    setSelectedContact(contact);
    editForm.reset({
      name: contact.name,
      position: contact.position || "",
      email: contact.email || "",
      phone: contact.phone || "",
      is_primary: contact.is_primary || false,
      notes: contact.notes || "",
    });
    setIsEditOpen(true);
  };

  const handleDeleteClick = (contact: ClientContact) => {
    setSelectedContact(contact);
    setIsDeleteOpen(true);
  };

  const handleSetPrimary = (contactId: number) => {
    setPrimaryMutation.mutate(contactId);
  };

  // Renderizar contatos
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-medium">Contatos</h3>
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-1">
              <UserPlus className="h-4 w-4" />
              <span>Adicionar</span>
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Adicionar Contato</DialogTitle>
              <DialogDescription>
                Adicione um novo contato para {clientName}.
              </DialogDescription>
            </DialogHeader>
            <Form {...addForm}>
              <form onSubmit={addForm.handleSubmit(onAddSubmit)} className="space-y-4">
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
                        <Input placeholder="Cargo do contato" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={addForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input placeholder="Email do contato" type="email" {...field} />
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
                          <Input placeholder="Telefone do contato" {...field} />
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
                          placeholder="Observações sobre o contato" 
                          className="min-h-[80px]"
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
                    <FormItem className="flex flex-row items-center space-x-3 space-y-0 rounded-md border p-4">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>Contato principal</FormLabel>
                        <FormDescription>
                          Este é o contato principal para este cliente
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />
                <DialogFooter>
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setIsAddOpen(false)}
                  >
                    Cancelar
                  </Button>
                  <Button 
                    type="submit"
                    disabled={addMutation.isPending}
                  >
                    {addMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Adicionando...
                      </>
                    ) : (
                      "Adicionar"
                    )}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoadingContacts ? (
        <div className="flex justify-center py-6">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : error ? (
        <div className="text-center py-6 text-destructive">
          Erro ao carregar contatos. Por favor, tente novamente.
        </div>
      ) : contacts && contacts.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {contacts.map((contact) => (
            <Card key={contact.id} className="relative">
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-base flex items-center gap-2">
                      {contact.name}
                      {contact.is_primary && (
                        <Badge variant="secondary" className="text-xs">
                          <Star className="h-3 w-3 mr-1 text-amber-500" /> 
                          Principal
                        </Badge>
                      )}
                    </CardTitle>
                    {contact.position && (
                      <CardDescription>{contact.position}</CardDescription>
                    )}
                  </div>
                  <div className="flex gap-1">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-7 w-7" 
                      title="Editar contato"
                      onClick={() => handleEditClick(contact)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-7 w-7 text-destructive" 
                      title="Excluir contato"
                      onClick={() => handleDeleteClick(contact)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pb-2">
                <div className="space-y-1.5">
                  {contact.email && (
                    <div className="flex items-center text-sm">
                      <Mail className="h-3.5 w-3.5 mr-2 text-muted-foreground" />
                      <a href={`mailto:${contact.email}`} className="hover:underline">
                        {contact.email}
                      </a>
                    </div>
                  )}
                  {contact.phone && (
                    <div className="flex items-center text-sm">
                      <Phone className="h-3.5 w-3.5 mr-2 text-muted-foreground" />
                      <a href={`tel:${contact.phone}`} className="hover:underline">
                        {contact.phone}
                      </a>
                    </div>
                  )}
                  {contact.notes && (
                    <div className="text-sm mt-2 text-muted-foreground">
                      {contact.notes}
                    </div>
                  )}
                </div>
              </CardContent>
              {!contact.is_primary && (
                <CardFooter className="pt-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="text-xs w-full"
                    onClick={() => handleSetPrimary(contact.id)}
                    disabled={setPrimaryMutation.isPending}
                  >
                    {setPrimaryMutation.isPending ? (
                      <Loader2 className="h-3 w-3 animate-spin mr-1" />
                    ) : (
                      <Star className="h-3 w-3 mr-1" />
                    )}
                    Definir como principal
                  </Button>
                </CardFooter>
              )}
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center p-6 border rounded-lg bg-muted/30">
          <p className="text-muted-foreground">Nenhum contato cadastrado.</p>
          <Button 
            variant="outline" 
            size="sm" 
            className="mt-2"
            onClick={() => setIsAddOpen(true)}
          >
            <UserPlus className="h-4 w-4 mr-1" />
            Adicionar contato
          </Button>
        </div>
      )}

      {/* Dialog de edição de contato */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Contato</DialogTitle>
            <DialogDescription>
              Edite as informações do contato.
            </DialogDescription>
          </DialogHeader>
          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4">
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
                      <Input placeholder="Cargo do contato" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={editForm.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input placeholder="Email do contato" type="email" {...field} />
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
                        <Input placeholder="Telefone do contato" {...field} />
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
                        placeholder="Observações sobre o contato" 
                        className="min-h-[80px]"
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
                  <FormItem className="flex flex-row items-center space-x-3 space-y-0 rounded-md border p-4">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Contato principal</FormLabel>
                      <FormDescription>
                        Este é o contato principal para este cliente
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsEditOpen(false)}
                >
                  Cancelar
                </Button>
                <Button 
                  type="submit"
                  disabled={editMutation.isPending}
                >
                  {editMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    "Salvar"
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Dialog de confirmação de exclusão */}
      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir Contato</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir este contato? Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <p className="font-medium">
            {selectedContact?.name}
            {selectedContact?.is_primary && (
              <Badge variant="secondary" className="ml-2">
                Contato Principal
              </Badge>
            )}
          </p>
          {selectedContact?.position && (
            <p className="text-sm text-muted-foreground">{selectedContact.position}</p>
          )}
          <DialogFooter>
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => setIsDeleteOpen(false)}
            >
              Cancelar
            </Button>
            <Button 
              type="button"
              variant="destructive"
              onClick={() => deleteMutation.mutate()}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Excluindo...
                </>
              ) : (
                "Excluir"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}