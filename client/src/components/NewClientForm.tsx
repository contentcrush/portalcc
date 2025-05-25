import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Building, 
  Mail, 
  Phone, 
  Search, 
  Circle,
  Command
} from "lucide-react";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { insertClientSchema } from "@shared/schema";

// Schema seguindo a referência anexada
const newClientFormSchema = insertClientSchema.extend({
  name: z.string().min(1, "Nome Fantasia é obrigatório"),
  contactEmail: z.string().email("E-mail principal é obrigatório").min(1, "E-mail principal é obrigatório"),
  cnpj: z.string().optional(),
  contactPhone: z.string().optional(),
});

type NewClientFormData = z.infer<typeof newClientFormSchema>;

interface NewClientFormProps {
  onSubmit: (data: NewClientFormData) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export default function NewClientForm({ onSubmit, onCancel, isLoading = false }: NewClientFormProps) {
  const [smartSearchValue, setSmartSearchValue] = useState("");

  const form = useForm<NewClientFormData>({
    resolver: zodResolver(newClientFormSchema),
    defaultValues: {
      name: "",
      contactEmail: "",
      cnpj: "",
      contactPhone: "",
    },
  });

  // Utility for safe field props
  const getSafeFieldProps = (field: any) => ({
    value: field.value || '',
    onChange: field.onChange,
    onBlur: field.onBlur,
    name: field.name,
    ref: field.ref,
  });

  // Handle keyboard shortcuts
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onCancel();
    }
    if (e.ctrlKey && e.key === 'Enter') {
      e.preventDefault();
      form.handleSubmit(onSubmit)();
    }
  };

  return (
    <Form {...form}>
      <form 
        onSubmit={form.handleSubmit(onSubmit)} 
        className="space-y-8" 
        onKeyDown={handleKeyDown}
      >
        {/* Campos Obrigatórios */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-red-500 text-sm">*</span>
            <h3 className="text-base font-medium text-gray-900">Campos Obrigatórios</h3>
          </div>
          
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm font-medium text-gray-700">
                  Nome Fantasia <span className="text-red-500">*</span>
                </FormLabel>
                <FormControl>
                  <div className="relative">
                    <Input 
                      placeholder="Rótulo que aparecerá no app"
                      className="h-11 pr-10"
                      {...getSafeFieldProps(field)} 
                      autoFocus
                    />
                    <Building className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  </div>
                </FormControl>
                <p className="text-xs text-gray-500">Este nome será exibido no aplicativo</p>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="contactEmail"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm font-medium text-gray-700">
                  E-mail principal <span className="text-red-500">*</span>
                </FormLabel>
                <FormControl>
                  <div className="relative">
                    <Input 
                      placeholder="email@exemplo.com"
                      type="email"
                      className="h-11 pr-10"
                      {...getSafeFieldProps(field)} 
                    />
                    <Mail className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  </div>
                </FormControl>
                <p className="text-xs text-gray-500">Validamos MX. Deve ser único por cliente.</p>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Campos Assistidos (Opcionais) */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-4">
            <Circle className="h-4 w-4 text-gray-400" />
            <h3 className="text-base font-medium text-gray-700">Campos Assistidos (Opcionais)</h3>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="cnpj"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium text-gray-700">CNPJ/CPF</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input 
                        placeholder="00.000.000/0000-00 ou 000.000.000-00"
                        className="h-11"
                        {...getSafeFieldProps(field)} 
                      />
                    </div>
                  </FormControl>
                  <p className="text-xs text-gray-500">Auto-preenche Razão Social + Endereço</p>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="contactPhone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium text-gray-700">Telefone</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input 
                        placeholder="(00) 00000-0000"
                        className="h-11 pr-10"
                        {...getSafeFieldProps(field)} 
                      />
                      <Phone className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    </div>
                  </FormControl>
                  <p className="text-xs text-gray-500">Máscara aplicada automaticamente</p>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        {/* Entrada Inteligente */}
        <div className="space-y-4">
          <h3 className="text-base font-medium text-gray-900">Entrada Inteligente</h3>
          
          <div className="mb-4">
            <Label className="text-sm font-medium text-gray-700">Nome ou CNPJ</Label>
            <div className="relative mt-1">
              <Input 
                placeholder='Ex: "Delícia 30...99" (separamos nome e CNPJ automaticamente)'
                className="h-11 pr-10"
                value={smartSearchValue}
                onChange={(e) => setSmartSearchValue(e.target.value)}
              />
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            </div>
          </div>
        </div>

        {/* Atalhos de Teclado */}
        <div className="flex items-center gap-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
          <div className="flex items-center gap-2 text-sm text-blue-700">
            <div className="flex items-center gap-1">
              <kbd className="px-2 py-1 text-xs bg-white border border-blue-300 rounded">
                <Command className="h-3 w-3 inline mr-1" />
                Ctrl
              </kbd>
              <span>+</span>
              <kbd className="px-2 py-1 text-xs bg-white border border-blue-300 rounded">Enter</kbd>
            </div>
            <span>Criar cliente</span>
          </div>
          
          <div className="flex items-center gap-2 text-sm text-blue-700">
            <kbd className="px-2 py-1 text-xs bg-white border border-blue-300 rounded">Esc</kbd>
            <span>Cancelar (salva rascunho por 24h)</span>
          </div>
        </div>

        {/* Botões de Ação */}
        <div className="flex gap-3 pt-4">
          <Button 
            variant="outline" 
            onClick={onCancel}
            className="flex-1"
            type="button"
          >
            Cancelar
          </Button>
          <Button 
            type="submit"
            disabled={isLoading}
            className="flex-1 bg-blue-600 hover:bg-blue-700"
          >
            {isLoading ? (
              <>
                <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                Criando...
              </>
            ) : (
              'Criar Cliente'
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
}