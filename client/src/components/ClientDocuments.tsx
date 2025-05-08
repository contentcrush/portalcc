import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { AlertCircle, File, FileText, FilePlus, Download, Trash2, Upload } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ClientDocument } from '@shared/schema';
import { apiRequest } from '@/lib/queryClient';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { formatBytes } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

const documentCategories = [
  { value: "contrato", label: "Contrato" },
  { value: "proposta", label: "Proposta" },
  { value: "relatorio", label: "Relatório" },
  { value: "nota_fiscal", label: "Nota Fiscal" },
  { value: "recibo", label: "Recibo" },
  { value: "termo", label: "Termo" },
  { value: "outro", label: "Outro" }
];

interface ClientDocumentsProps {
  clientId: number;
}

const ClientDocuments: React.FC<ClientDocumentsProps> = ({ clientId }) => {
  const [uploadOpen, setUploadOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Query para buscar documentos do cliente
  const { data: documents = [], isLoading, error } = useQuery<ClientDocument[]>({
    queryKey: ['/api/clients', clientId, 'documents'],
    enabled: !!clientId,
  });

  // Mutation para fazer upload de documento
  const uploadMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const xhr = new XMLHttpRequest();
      const promise = new Promise<any>((resolve, reject) => {
        xhr.open("POST", `/api/clients/${clientId}/documents`);
        
        xhr.upload.addEventListener("progress", (event) => {
          if (event.lengthComputable) {
            const percentComplete = Math.round((event.loaded / event.total) * 100);
            setUploadProgress(percentComplete);
          }
        });
        
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve(JSON.parse(xhr.responseText));
          } else {
            reject(new Error(`Upload failed with status ${xhr.status}`));
          }
        };
        
        xhr.onerror = () => {
          reject(new Error("Network error during upload"));
        };
        
        xhr.send(formData);
      });
      
      return promise;
    },
    onSuccess: () => {
      setFile(null);
      setDescription('');
      setCategory('');
      setUploadProgress(0);
      setUploadOpen(false);
      queryClient.invalidateQueries({ queryKey: ['/api/clients', clientId, 'documents'] });
      toast({
        title: "Documento enviado",
        description: "O documento foi enviado com sucesso.",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao enviar documento",
        description: error.message || "Houve um erro ao enviar o documento. Tente novamente.",
        variant: "destructive",
      });
    },
  });

  // Mutation para deletar documento
  const deleteMutation = useMutation({
    mutationFn: async (documentId: number) => {
      const response = await apiRequest(
        "DELETE",
        `/api/clients/${clientId}/documents/${documentId}`
      );
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/clients', clientId, 'documents'] });
      toast({
        title: "Documento excluído",
        description: "O documento foi excluído com sucesso.",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao excluir documento",
        description: error.message || "Houve um erro ao excluir o documento. Tente novamente.",
        variant: "destructive",
      });
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleUpload = () => {
    if (!file) {
      toast({
        title: "Nenhum arquivo selecionado",
        description: "Por favor, selecione um arquivo para enviar.",
        variant: "destructive",
      });
      return;
    }

    if (!category) {
      toast({
        title: "Categoria não selecionada",
        description: "Por favor, selecione uma categoria para o documento.",
        variant: "destructive",
      });
      return;
    }

    const formData = new FormData();
    formData.append("file", file);
    formData.append("description", description);
    formData.append("category", category);

    uploadMutation.mutate(formData);
  };

  const handleDelete = (documentId: number) => {
    if (window.confirm("Tem certeza que deseja excluir este documento?")) {
      deleteMutation.mutate(documentId);
    }
  };

  const handleDownload = async (document: ClientDocument) => {
    try {
      const response = await fetch(`/api/clients/${clientId}/documents/${document.id}/download`);
      if (!response.ok) throw new Error("Erro ao baixar arquivo");
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.style.display = "none";
      a.href = url;
      a.download = document.file_name;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      toast({
        title: "Erro ao baixar documento",
        description: "Houve um erro ao baixar o documento. Tente novamente.",
        variant: "destructive",
      });
    }
  };

  const getFileIcon = (fileType: string) => {
    if (!fileType) return <File className="h-6 w-6 text-muted-foreground" />;
    
    if (fileType.includes('pdf')) {
      return <FileText className="h-6 w-6 text-red-500" />;
    } else if (fileType.includes('image')) {
      return <File className="h-6 w-6 text-blue-500" />;
    } else if (fileType.includes('word') || fileType.includes('doc')) {
      return <FileText className="h-6 w-6 text-blue-700" />;
    } else if (fileType.includes('excel') || fileType.includes('sheet')) {
      return <FileText className="h-6 w-6 text-green-600" />;
    } else {
      return <File className="h-6 w-6 text-muted-foreground" />;
    }
  };

  const getCategoryLabel = (categoryValue: string) => {
    const category = documentCategories.find(c => c.value === categoryValue);
    return category ? category.label : categoryValue;
  };

  if (isLoading) {
    return <div className="p-4 text-center text-muted-foreground">Carregando documentos...</div>;
  }

  if (error) {
    return (
      <Alert variant="destructive" className="mb-4">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Erro</AlertTitle>
        <AlertDescription>
          Erro ao carregar os documentos. Por favor, tente novamente mais tarde.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium">Documentos</h3>
          <p className="text-sm text-muted-foreground">
            Gerencie documentos relacionados a este cliente
          </p>
        </div>
        
        <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <FilePlus className="mr-2 h-4 w-4" />
              Novo Documento
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Enviar novo documento</DialogTitle>
              <DialogDescription>
                Faça upload de documentos relacionados a este cliente.
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              <div className="grid w-full max-w-sm items-center gap-1.5">
                <Label htmlFor="file-upload">Arquivo</Label>
                <Input 
                  id="file-upload" 
                  type="file" 
                  onChange={handleFileChange} 
                />
                {file && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {file.name} ({formatBytes(file.size)})
                  </p>
                )}
              </div>
              
              <div className="grid w-full gap-1.5">
                <Label htmlFor="doc-category">Categoria</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger id="doc-category">
                    <SelectValue placeholder="Selecione uma categoria" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectLabel>Categorias</SelectLabel>
                      {documentCategories.map((category) => (
                        <SelectItem key={category.value} value={category.value}>
                          {category.label}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="grid w-full gap-1.5">
                <Label htmlFor="doc-description">Descrição</Label>
                <Textarea
                  id="doc-description"
                  placeholder="Adicione uma descrição sobre este documento"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>
              
              {uploadMutation.isPending && (
                <div className="space-y-2">
                  <Progress value={uploadProgress} className="h-2 w-full" />
                  <p className="text-xs text-center text-muted-foreground">
                    Enviando... {uploadProgress}%
                  </p>
                </div>
              )}
            </div>
            
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setUploadOpen(false)}
                disabled={uploadMutation.isPending}
              >
                Cancelar
              </Button>
              <Button 
                onClick={handleUpload}
                disabled={!file || !category || uploadMutation.isPending}
              >
                <Upload className="mr-2 h-4 w-4" />
                {uploadMutation.isPending ? "Enviando..." : "Enviar"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      
      <Separator />
      
      {documents.length === 0 ? (
        <div className="flex flex-col items-center justify-center space-y-3 p-8 text-center">
          <FileText className="h-12 w-12 text-muted-foreground opacity-40" />
          <div>
            <p className="text-lg font-medium">Nenhum documento</p>
            <p className="text-sm text-muted-foreground">
              Este cliente não possui documentos cadastrados
            </p>
          </div>
          <Button 
            variant="outline" 
            onClick={() => setUploadOpen(true)}
            className="mt-2"
          >
            <FilePlus className="mr-2 h-4 w-4" />
            Adicionar Documento
          </Button>
        </div>
      ) : (
        <ScrollArea className="h-[320px]">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {documents.map((doc) => (
              <Card key={doc.id} className="overflow-hidden">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center">
                      {getFileIcon(doc.file_type || '')}
                      <div className="ml-2">
                        <CardTitle className="text-base truncate">
                          {doc.file_name}
                        </CardTitle>
                        <CardDescription className="text-xs">
                          {formatBytes(doc.file_size || 0)}
                        </CardDescription>
                      </div>
                    </div>
                    <Badge variant="outline">
                      {getCategoryLabel(doc.category || 'outro')}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="pb-2">
                  {doc.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {doc.description}
                    </p>
                  )}
                </CardContent>
                <CardFooter className="flex justify-between pt-2 text-xs text-muted-foreground">
                  <span>
                    {new Date(doc.upload_date).toLocaleDateString('pt-BR')}
                  </span>
                  <div className="flex space-x-1">
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => handleDownload(doc)}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => handleDelete(doc.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardFooter>
              </Card>
            ))}
          </div>
        </ScrollArea>
      )}
    </div>
  );
};

export default ClientDocuments;