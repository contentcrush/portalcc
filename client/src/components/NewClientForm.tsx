import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { showSuccessToast } from "@/lib/utils";
import { CLIENT_TYPE_OPTIONS } from "@/lib/constants";

// Componentes UI
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Camera, Loader2 } from "lucide-react";

// Esquema básico e minimalista de validação
const clientFormSchema = z.object({
  name: z.string().min(2, "Nome deve ter pelo menos 2 caracteres").max(100),
  type: z.string().optional(),
  contactEmail: z.string().email("E-mail inválido").optional().or(z.literal("")),
  contactPhone: z.string().optional(),
  contactName: z.string().optional(),
  logo: z.string().optional(),
});

type ClientFormValues = z.infer<typeof clientFormSchema>;

interface NewClientFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function NewClientForm({ onSuccess, onCancel }: NewClientFormProps) {
  const { toast } = useToast();
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Formulário com campos mínimos
  const form = useForm<ClientFormValues>({
    resolver: zodResolver(clientFormSchema),
    defaultValues: {
      name: "",
      type: undefined,
      contactEmail: "",
      contactPhone: "",
      contactName: "",
      logo: "",
    },
  });

  // Mutation para criar o cliente
  const createClientMutation = useMutation({
    mutationFn: async (data: ClientFormValues) => {
      const res = await apiRequest("POST", "/api/clients", data);
      return res.json();
    },
    onSuccess: () => {
      showSuccessToast({
        title: "Cliente criado com sucesso!",
        description: "O novo cliente foi adicionado à sua lista"
      });
      queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
      form.reset();
      setLogoPreview(null);
      setIsSubmitting(false);
      if (onSuccess) onSuccess();
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao criar cliente",
        description: error.message || "Não foi possível criar o cliente",
        variant: "destructive",
      });
      setIsSubmitting(false);
    },
  });

  // Função para lidar com a submissão do formulário
  const onSubmit = (data: ClientFormValues) => {
    setIsSubmitting(true);
    createClientMutation.mutate(data);
  };

  // Função para lidar com o upload de logo
  const handleLogoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        setLogoPreview(base64String);
        form.setValue("logo", base64String);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <Card className="border-none shadow-none">
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <CardContent className="space-y-4 p-0">
          {/* Logo e upload */}
          <div className="flex justify-center mb-6">
            <div className="relative group">
              <Avatar className="w-28 h-28 border-2 border-muted">
                <AvatarImage src={logoPreview || ""} alt="Logo do cliente" />
                <AvatarFallback className="text-4xl bg-primary/10">
                  {form.watch("name") ? form.watch("name").charAt(0).toUpperCase() : "N"}
                </AvatarFallback>
              </Avatar>
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                <Label 
                  htmlFor="logo-upload" 
                  className="w-full h-full rounded-full flex items-center justify-center bg-black/40 cursor-pointer"
                >
                  <Camera className="h-6 w-6 text-white" />
                  <span className="sr-only">Upload logo</span>
                </Label>
                <Input 
                  id="logo-upload" 
                  type="file" 
                  accept="image/*" 
                  className="hidden" 
                  onChange={handleLogoUpload} 
                />
              </div>
            </div>
          </div>

          {/* Dois campos principais na mesma linha */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Nome do cliente - obrigatório */}
            <div className="space-y-2">
              <Label htmlFor="name" className="font-medium">
                Nome do cliente<span className="text-red-500">*</span>
              </Label>
              <Input
                id="name"
                placeholder="Ex: Studio Criativo"
                {...form.register("name")}
                className="w-full"
              />
              {form.formState.errors.name && (
                <p className="text-sm text-red-500">{form.formState.errors.name.message}</p>
              )}
            </div>

            {/* Tipo de cliente - opcional */}
            <div className="space-y-2">
              <Label htmlFor="type" className="font-medium">
                Tipo de cliente
              </Label>
              <Select
                onValueChange={(value) => form.setValue("type", value)}
                defaultValue={form.watch("type")}
              >
                <SelectTrigger id="type" className="w-full">
                  <SelectValue placeholder="Selecione um tipo" />
                </SelectTrigger>
                <SelectContent>
                  {CLIENT_TYPE_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Contato principal - todos opcionais */}
          <div className="space-y-2 mt-6">
            <h3 className="text-sm font-medium text-muted-foreground">Informações de contato</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="contactName" className="text-sm">
                  Nome do contato
                </Label>
                <Input
                  id="contactName"
                  placeholder="Ex: João Silva"
                  {...form.register("contactName")}
                  className="w-full mt-1"
                />
              </div>
              
              <div>
                <Label htmlFor="contactEmail" className="text-sm">
                  E-mail
                </Label>
                <Input
                  id="contactEmail"
                  type="email"
                  placeholder="contato@exemplo.com"
                  {...form.register("contactEmail")}
                  className="w-full mt-1"
                />
                {form.formState.errors.contactEmail && (
                  <p className="text-xs text-red-500">{form.formState.errors.contactEmail.message}</p>
                )}
              </div>
              
              <div>
                <Label htmlFor="contactPhone" className="text-sm">
                  Telefone
                </Label>
                <Input
                  id="contactPhone"
                  placeholder="(00) 00000-0000"
                  {...form.register("contactPhone")}
                  className="w-full mt-1"
                />
              </div>
            </div>
          </div>
        </CardContent>

        <CardFooter className="flex justify-between pt-6 pb-0 px-0">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isSubmitting}
          >
            Cancelar
          </Button>
          <Button type="submit" disabled={isSubmitting} className="min-w-[120px]">
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Salvando...
              </>
            ) : (
              "Criar cliente"
            )}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}