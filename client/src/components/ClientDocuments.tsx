import React, { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ClientDocument } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
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
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { insertClientDocumentSchema } from "@shared/schema";
import { 
  Download, 
  FileText, 
  FileUp, 
  Trash2,
  Calendar,
  FileArchive, 
  File, 
  FileImage,
  FileSpreadsheet,
  FileCode,
  FilePdf
} from "lucide-react";
import { 
  Tooltip, 
  TooltipContent, 
  TooltipProvider, 
  TooltipTrigger 
} from "@/components/ui/tooltip";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";

// Form schema for uploading documents
const uploadSchema = insertClientDocumentSchema.extend({
  file: z.instanceof(FileList).refine(files => files.length === 1, {
    message: "Por favor, selecione um arquivo"
  })
});

type UploadFormValues = z.infer<typeof uploadSchema>;

// Helper to format file size
const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

// Get appropriate icon based on file type
const getFileIcon = (fileType: string) => {
  if (fileType.includes('pdf')) {
    return <FilePdf className="h-5 w-5 text-red-500" />;
  } else if (fileType.includes('image')) {
    return <FileImage className="h-5 w-5 text-blue-500" />;
  } else if (fileType.includes('spreadsheet') || fileType.includes('excel') || fileType.includes('csv')) {
    return <FileSpreadsheet className="h-5 w-5 text-green-500" />;
  } else if (fileType.includes('zip') || fileType.includes('compressed')) {
    return <FileArchive className="h-5 w-5 text-yellow-500" />;
  } else if (fileType.includes('html') || fileType.includes('javascript') || fileType.includes('xml')) {
    return <FileCode className="h-5 w-5 text-purple-500" />;
  } else {
    return <FileText className="h-5 w-5 text-gray-500" />;
  }
};

interface ClientDocumentsProps {
  clientId: number;
  clientName: string;
  documents: ClientDocument[];
  isLoading: boolean;
}

export default function ClientDocuments({
  clientId,
  clientName,
  documents,
  isLoading
}: ClientDocumentsProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [uploading, setUploading] = useState(false);
  const [openUploadDialog, setOpenUploadDialog] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  // Form for document upload
  const form = useForm<UploadFormValues>({
    resolver: zodResolver(uploadSchema),
    defaultValues: {
      client_id: clientId,
      title: "",
      document_type: "",
      description: "",
    }
  });

  // Handle document upload
  const handleUpload = async (values: UploadFormValues) => {
    setUploading(true);
    
    try {
      const formData = new FormData();
      formData.append('file', values.file[0]);
      formData.append('title', values.title);
      formData.append('client_id', clientId.toString());
      formData.append('document_type', values.document_type);
      
      if (values.description) {
        formData.append('description', values.description);
      }

      const response = await fetch('/api/client-documents', {
        method: 'POST',
        body: formData,
        // Don't set Content-Type header, browser will set it with boundary
      });

      if (!response.ok) {
        throw new Error('Falha ao fazer upload do documento');
      }

      // Close dialog and reset form
      setOpenUploadDialog(false);
      form.reset();

      // Refresh documents list
      queryClient.invalidateQueries({ queryKey: [`/api/client/${clientId}/documents`] });

      toast({
        title: "Documento enviado com sucesso",
        description: "O documento foi adicionado à lista de documentos do cliente.",
      });
    } catch (error) {
      console.error('Erro ao fazer upload:', error);
      toast({
        title: "Erro ao enviar documento",
        description: "Ocorreu um erro ao tentar fazer o upload. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  // Handle document deletion
  const handleDeleteDocument = async (documentId: number) => {
    setDeletingId(documentId);
    
    try {
      const response = await apiRequest('DELETE', `/api/client-documents/${documentId}`);
      
      if (!response.ok) {
        throw new Error('Falha ao excluir documento');
      }

      // Refresh documents list
      queryClient.invalidateQueries({ queryKey: [`/api/client/${clientId}/documents`] });

      toast({
        title: "Documento excluído com sucesso",
        description: "O documento foi removido da lista de documentos do cliente.",
      });
    } catch (error) {
      console.error('Erro ao excluir documento:', error);
      toast({
        title: "Erro ao excluir documento",
        description: "Ocorreu um erro ao tentar excluir o documento. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setDeletingId(null);
    }
  };

  // Handle document download
  const handleDownloadDocument = (document: ClientDocument) => {
    window.open(`/api/client-documents/${document.id}/download`, '_blank');
  };

  return (
    <Card className="w-full">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-xl">Documentos</CardTitle>
            <CardDescription>
              Documentos, contratos e arquivos relacionados a {clientName}
            </CardDescription>
          </div>
          <Dialog open={openUploadDialog} onOpenChange={setOpenUploadDialog}>
            <DialogTrigger asChild>
              <Button className="gap-1">
                <FileUp className="h-4 w-4" />
                <span className="hidden sm:inline">Novo Documento</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Adicionar Documento</DialogTitle>
                <DialogDescription>
                  Faça upload de um novo documento para o cliente.
                </DialogDescription>
              </DialogHeader>
              <Form {...form}>
                <form
                  onSubmit={form.handleSubmit(handleUpload)}
                  className="space-y-4"
                >
                  <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Título</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Ex: Contrato de Serviço"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="document_type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tipo de Documento</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Ex: Contrato, Recibo, Briefing"
                            {...field}
                          />
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
                        <FormLabel>Descrição (opcional)</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Descreva brevemente o conteúdo do documento"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="file"
                    render={({ field: { value, onChange, ...fieldProps } }) => (
                      <FormItem>
                        <FormLabel>Arquivo</FormLabel>
                        <FormControl>
                          <Input
                            type="file"
                            onChange={(e) => onChange(e.target.files)}
                            {...fieldProps}
                          />
                        </FormControl>
                        <FormDescription>
                          Selecione o arquivo que deseja enviar (máx. 10MB)
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <DialogFooter className="mt-6">
                    <DialogClose asChild>
                      <Button 
                        type="button" 
                        variant="outline"
                        disabled={uploading}
                      >
                        Cancelar
                      </Button>
                    </DialogClose>
                    <Button 
                      type="submit"
                      disabled={uploading}
                    >
                      {uploading ? "Enviando..." : "Enviar Documento"}
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[365px] w-full pr-4">
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton className="h-10 w-10 rounded" />
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-56" />
                    <Skeleton className="h-4 w-32" />
                  </div>
                </div>
              ))}
            </div>
          ) : documents.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
              <File className="h-16 w-16 mb-4 opacity-30" />
              <h3 className="text-lg font-medium">Nenhum documento</h3>
              <p className="max-w-xs mt-2">
                Este cliente ainda não possui documentos cadastrados.
              </p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Documento</TableHead>
                    <TableHead className="hidden md:table-cell">Tipo</TableHead>
                    <TableHead className="hidden lg:table-cell">Data</TableHead>
                    <TableHead className="hidden lg:table-cell">Tamanho</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {documents.map((doc) => (
                    <TableRow key={doc.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          {getFileIcon(doc.file_type)}
                          <div className="truncate max-w-[160px] md:max-w-[240px]">
                            {doc.title}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        {doc.document_type || "N/A"}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        {format(new Date(doc.upload_date), "dd/MM/yyyy", { locale: ptBR })}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        {formatFileSize(doc.file_size)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleDownloadDocument(doc)}
                                >
                                  <Download className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Baixar documento</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleDeleteDocument(doc.id)}
                                  disabled={deletingId === doc.id}
                                >
                                  {deletingId === doc.id ? (
                                    <div className="h-4 w-4 animate-spin rounded-full border-b-2 border-red-600" />
                                  ) : (
                                    <Trash2 className="h-4 w-4 text-red-600" />
                                  )}
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Excluir documento</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </ScrollArea>
      </CardContent>
      <CardFooter className="pt-0 pb-4 text-xs text-muted-foreground">
        <div className="flex items-center">
          <Calendar className="h-3 w-3 mr-1" />
          <span>
            Última atualização: {documents.length > 0 
              ? format(new Date(documents[0].upload_date), "dd 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR })
              : "N/A"
            }
          </span>
        </div>
      </CardFooter>
    </Card>
  );
}