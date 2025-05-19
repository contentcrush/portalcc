import React, { useState, useEffect } from 'react';
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useFormPersistence } from "@/contexts/FormPersistenceContext";

// Criar schema de validação
const formSchema = z.object({
  titulo: z.string().min(3, { message: "Título deve ter pelo menos 3 caracteres" }),
  descricao: z.string().min(10, { message: "Descrição deve ter pelo menos 10 caracteres" }),
  email: z.string().email({ message: "Email inválido" })
});

type FormData = z.infer<typeof formSchema>;

export default function FormPersistenceExample() {
  const { toast } = useToast();
  const { saveFormData, getFormData, clearFormData } = useFormPersistence();
  const formId = "exemplo-persistencia";
  
  // Recuperar dados salvos
  const savedData = getFormData<FormData>(formId);
  
  // Configurar o formulário com dados salvos (se existirem)
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: savedData || {
      titulo: "",
      descricao: "",
      email: ""
    }
  });
  
  // Configurar salvamento automático
  const values = form.watch();
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (Object.values(values).some(value => value)) {
        saveFormData(formId, values);
        console.log("Formulário salvo automaticamente", values);
      }
    }, 2000); // Salvar 2 segundos após a última modificação
    
    return () => clearTimeout(timeoutId);
  }, [values, saveFormData]);
  
  // Manipulador de submissão
  const onSubmit = (data: FormData) => {
    toast({
      title: "Formulário enviado com sucesso!",
      description: "Dados salvos: " + JSON.stringify(data),
      variant: "default",
    });
    
    // Limpar os dados salvos após envio bem-sucedido
    clearFormData(formId);
    
    // Resetar formulário
    form.reset({
      titulo: "",
      descricao: "",
      email: ""
    });
  };
  
  return (
    <div className="p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-6">Exemplo de Persistência de Formulário</h2>
      <p className="mb-4 text-muted-foreground">
        Este formulário salva automaticamente seus dados a cada 2 segundos. 
        Se você fechar ou recarregar a página, os dados serão recuperados.
      </p>
      
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <FormField
            control={form.control}
            name="titulo"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Título</FormLabel>
                <FormControl>
                  <Input placeholder="Digite um título" {...field} />
                </FormControl>
                <FormDescription>
                  Insira um título com pelo menos 3 caracteres
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="descricao"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Descrição</FormLabel>
                <FormControl>
                  <Textarea 
                    placeholder="Digite uma descrição detalhada" 
                    {...field} 
                    rows={4}
                  />
                </FormControl>
                <FormDescription>
                  Descreva com pelo menos 10 caracteres
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email de contato</FormLabel>
                <FormControl>
                  <Input placeholder="seu@email.com" {...field} type="email" />
                </FormControl>
                <FormDescription>
                  Forneça um endereço de email válido
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <div className="flex justify-between">
            <Button 
              type="button" 
              variant="outline"
              onClick={() => {
                clearFormData(formId);
                form.reset({
                  titulo: "",
                  descricao: "",
                  email: ""
                });
                toast({
                  title: "Formulário limpo",
                  description: "Todos os dados salvos foram removidos",
                  variant: "default",
                });
              }}
            >
              Limpar Formulário
            </Button>
            <Button type="submit">Enviar</Button>
          </div>
        </form>
      </Form>
      
      {savedData && (
        <div className="mt-6 p-4 border border-gray-200 rounded-md bg-gray-50">
          <h3 className="text-sm font-medium text-gray-500 mb-2">Dados salvos automaticamente:</h3>
          <pre className="text-xs overflow-auto p-2 bg-gray-100 rounded">
            {JSON.stringify(savedData, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}