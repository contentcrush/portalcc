import React, { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Info, Download, ExternalLink, AlertTriangle, FileText, FileImage, FileSpreadsheet, FileArchive, FileAudio, FileVideo, File } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { formatFileSize } from "@/lib/utils";

// React PDF para visualização de PDFs
import { Document, Page, pdfjs } from 'react-pdf';

// Configurar o worker do PDF para a nova versão
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString();

// Interface para o arquivo a ser visualizado
interface FileData {
  id: number;
  type: 'client' | 'project' | 'task';
  entity_id: number;
  entity_name?: string;
  file_name: string;
  file_size: number;
  file_type: string;
  file_url: string;
  uploaded_by: number | null;
  uploaded_at: string;
  description?: string | null;
  tags?: string[] | null;
  uploader?: any;
}

interface FilePreviewProps {
  file: FileData | null;
  open: boolean;
  onClose: () => void;
  onDownload?: (file: FileData) => void;
}

export default function FilePreview({ file, open, onClose, onDownload }: FilePreviewProps) {
  const [activeTab, setActiveTab] = useState<string>("preview");
  const [pdfNumPages, setPdfNumPages] = useState<number | null>(null);
  const [pdfPage, setPdfPage] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  
  const containerRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    if (file && open) {
      setLoading(true);
      setError(null);
      setActiveTab("preview");
      setPdfPage(1);
      
      // Gerar URL para download/visualização
      const url = `/api/attachments/${file.type}s/${file.entity_id}/download/${file.id}`;
      setFileUrl(url);
      
      // Verificar se o arquivo é acessível
      fetch(url, { method: 'HEAD' })
        .then(response => {
          if (!response.ok) {
            throw new Error(`Arquivo não encontrado (status ${response.status})`);
          }
          setLoading(false);
        })
        .catch(err => {
          console.error('Erro ao verificar arquivo:', err);
          setError(`Não foi possível acessar o arquivo: ${err.message}`);
          setLoading(false);
        });
    } else {
      setFileUrl(null);
    }
  }, [file, open]);
  
  // Função para lidar com o download do arquivo
  const handleDownload = () => {
    if (file && onDownload) {
      onDownload(file);
    } else if (file && fileUrl) {
      // Download alternativo via link
      const a = document.createElement('a');
      a.href = fileUrl;
      a.download = file.file_name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  };

  // Função para abrir o arquivo em uma nova aba
  const handleOpenInNewTab = () => {
    if (fileUrl) {
      window.open(fileUrl, '_blank');
    }
  };

  // Função para renderizar o conteúdo adequado baseado no tipo de arquivo
  const renderFileContent = () => {
    if (!file || !fileUrl) return null;
    
    if (loading) {
      return (
        <div className="flex flex-col items-center justify-center h-96">
          <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
          <p className="text-muted-foreground">Carregando visualização...</p>
        </div>
      );
    }
    
    if (error) {
      return (
        <div className="flex flex-col items-center justify-center h-96 text-center">
          <AlertTriangle className="h-12 w-12 text-destructive mb-4" />
          <h3 className="text-lg font-semibold mb-2">Erro ao carregar o arquivo</h3>
          <p className="text-muted-foreground mb-4">{error}</p>
          <div className="flex gap-4">
            <Button onClick={handleOpenInNewTab} variant="outline">
              <ExternalLink className="mr-2 h-4 w-4" />
              Abrir em nova aba
            </Button>
            <Button onClick={handleDownload}>
              <Download className="mr-2 h-4 w-4" />
              Download
            </Button>
          </div>
        </div>
      );
    }
    
    // Visualização baseada no tipo de arquivo
    if (file.file_type.startsWith('image/')) {
      return (
        <div className="flex items-center justify-center max-h-[70vh] overflow-auto p-4">
          <img 
            src={fileUrl} 
            alt={file.file_name} 
            className="max-w-full max-h-full object-contain"
            onError={() => setError('Não foi possível carregar a imagem.')} 
          />
        </div>
      );
    } 
    
    if (file.file_type.includes('pdf')) {
      return (
        <div className="flex flex-col items-center max-h-[70vh]">
          <div className="flex items-center justify-between w-full mb-2">
            <div className="flex items-center gap-2">
              <Button 
                onClick={() => setPdfPage(prev => Math.max(prev - 1, 1))} 
                disabled={pdfPage <= 1}
                variant="outline" 
                size="sm"
              >
                Anterior
              </Button>
              <span className="text-sm">
                Página {pdfPage} {pdfNumPages ? `de ${pdfNumPages}` : ''}
              </span>
              <Button 
                onClick={() => setPdfPage(prev => Math.min(prev + 1, pdfNumPages || 1))} 
                disabled={pdfNumPages !== null && pdfPage >= pdfNumPages}
                variant="outline" 
                size="sm"
              >
                Próxima
              </Button>
            </div>
            <Button 
              onClick={handleOpenInNewTab} 
              variant="outline" 
              size="sm"
              title="Abrir PDF em nova aba"
            >
              <ExternalLink className="h-4 w-4" />
            </Button>
          </div>
          <div className="overflow-auto max-h-full w-full flex justify-center">
            <Document
              file={fileUrl}
              onLoadSuccess={({ numPages }) => setPdfNumPages(numPages)}
              onLoadError={() => setError('Erro ao carregar o PDF. Tente baixar o arquivo.')}
              loading={
                <div className="flex items-center justify-center h-96">
                  <Loader2 className="h-10 w-10 animate-spin text-primary" />
                </div>
              }
              error={
                <div className="flex flex-col items-center justify-center h-96">
                  <AlertTriangle className="h-10 w-10 text-destructive mb-2" />
                  <p className="text-muted-foreground">Erro ao carregar o PDF</p>
                </div>
              }
            >
              <Page 
                pageNumber={pdfPage} 
                renderTextLayer={false}
                renderAnnotationLayer={false}
                width={containerRef.current?.clientWidth ? containerRef.current.clientWidth - 40 : undefined}
              />
            </Document>
          </div>
        </div>
      );
    }
    
    // Para planilhas, formatos de texto, áudio, vídeo e formatos não suportados diretamente
    const fileTypeDisplay = () => {
      if (file.file_type.includes('sheet') || file.file_type.includes('excel') || file.file_type.includes('csv')) {
        return (
          <>
            <FileSpreadsheet className="h-16 w-16 text-green-500 mb-4" />
            <h3 className="text-lg font-semibold mb-2">Planilha</h3>
            <p className="text-muted-foreground mb-4">O formato de planilha não pode ser visualizado diretamente.</p>
          </>
        );
      }
      
      if (file.file_type.startsWith('audio/')) {
        return (
          <>
            <div className="mb-4">
              <FileAudio className="h-16 w-16 text-yellow-500 mb-4" />
              <h3 className="text-lg font-semibold mb-2">Arquivo de Áudio</h3>
            </div>
            <audio controls className="max-w-full">
              <source src={fileUrl} type={file.file_type} />
              Seu navegador não suporta o elemento de áudio.
            </audio>
          </>
        );
      }
      
      if (file.file_type.startsWith('video/')) {
        return (
          <>
            <div className="max-w-full max-h-[70vh] overflow-auto">
              <video controls className="max-w-full max-h-full">
                <source src={fileUrl} type={file.file_type} />
                Seu navegador não suporta o elemento de vídeo.
              </video>
            </div>
          </>
        );
      }
      
      if (file.file_type.includes('text/') || file.file_type.includes('json')) {
        return (
          <>
            <FileText className="h-16 w-16 text-blue-500 mb-4" />
            <h3 className="text-lg font-semibold mb-2">Arquivo de Texto</h3>
            <p className="text-muted-foreground mb-4">Use o botão abaixo para visualizar o arquivo.</p>
          </>
        );
      }
      
      // Formato não suportado
      return (
        <>
          <File className="h-16 w-16 text-gray-500 mb-4" />
          <h3 className="text-lg font-semibold mb-2">Visualização não disponível</h3>
          <p className="text-muted-foreground mb-4">Este tipo de arquivo não pode ser visualizado diretamente no navegador.</p>
        </>
      );
    };
    
    // Para formatos não suportados diretamente
    if (!file.file_type.startsWith('image/') && !file.file_type.includes('pdf')) {
      return (
        <div className="flex flex-col items-center justify-center h-96 text-center">
          {fileTypeDisplay()}
          <div className="flex gap-4">
            <Button onClick={handleOpenInNewTab} variant="outline">
              <ExternalLink className="mr-2 h-4 w-4" />
              Abrir em nova aba
            </Button>
            <Button onClick={handleDownload}>
              <Download className="mr-2 h-4 w-4" />
              Download
            </Button>
          </div>
        </div>
      );
    }
    
    return null;
  };
  
  // Renderizar detalhes do arquivo
  const renderFileDetails = () => {
    if (!file) return null;
    
    const getFileIcon = () => {
      if (file.file_type.startsWith('image/')) return <FileImage className="h-6 w-6 text-blue-500" />;
      if (file.file_type.includes('pdf')) return <FileText className="h-6 w-6 text-red-500" />;
      if (file.file_type.includes('spreadsheet') || file.file_type.includes('excel') || file.file_type.includes('sheet')) return <FileSpreadsheet className="h-6 w-6 text-green-500" />;
      if (file.file_type.includes('zip') || file.file_type.includes('compressed')) return <FileArchive className="h-6 w-6 text-purple-500" />;
      if (file.file_type.startsWith('audio/')) return <FileAudio className="h-6 w-6 text-yellow-500" />;
      if (file.file_type.startsWith('video/')) return <FileVideo className="h-6 w-6 text-pink-500" />;
      return <File className="h-6 w-6 text-gray-500" />;
    };
    
    return (
      <div className="space-y-4">
        <div className="flex items-start gap-3">
          {getFileIcon()}
          <div>
            <h2 className="text-xl font-semibold break-all">{file.file_name}</h2>
            <p className="text-muted-foreground">{formatFileSize(file.file_size)}</p>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <h3 className="text-sm font-medium mb-1">Detalhes</h3>
            <div className="space-y-2">
              <div>
                <span className="text-sm text-muted-foreground">Tipo: </span>
                <span className="text-sm">{file.file_type.split('/')[1] || file.file_type}</span>
              </div>
              <div>
                <span className="text-sm text-muted-foreground">Adicionado em: </span>
                <span className="text-sm">{format(new Date(file.uploaded_at), 'dd/MM/yyyy', { locale: ptBR })}</span>
              </div>
              <div>
                <span className="text-sm text-muted-foreground">Adicionado por: </span>
                <span className="text-sm">{file.uploader?.name || 'Usuário desconhecido'}</span>
              </div>
            </div>
          </div>
          
          <div>
            <h3 className="text-sm font-medium mb-1">Vinculado a</h3>
            <div className="space-y-2">
              <div>
                <span className="text-sm text-muted-foreground">Tipo: </span>
                <Badge variant="outline">
                  {file.type === 'client' ? 'Cliente' : file.type === 'project' ? 'Projeto' : 'Tarefa'}
                </Badge>
              </div>
              <div>
                <span className="text-sm text-muted-foreground">Nome: </span>
                <span className="text-sm">{file.entity_name}</span>
              </div>
            </div>
          </div>
        </div>
        
        {file.description && (
          <div>
            <h3 className="text-sm font-medium mb-1">Descrição</h3>
            <p className="text-sm border rounded-md p-3 bg-muted/30">{file.description}</p>
          </div>
        )}
        
        {file.tags && file.tags.length > 0 && (
          <div>
            <h3 className="text-sm font-medium mb-1">Tags</h3>
            <div className="flex flex-wrap gap-2">
              {file.tags.map((tag, index) => (
                <Badge key={index} variant="secondary">
                  {tag}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };
  
  if (!file) return null;
  
  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col" ref={containerRef}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Visualização de Arquivo
          </DialogTitle>
          <DialogDescription>
            {file.file_name}
          </DialogDescription>
        </DialogHeader>
        
        <Tabs defaultValue="preview" value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="mb-4 grid grid-cols-2">
            <TabsTrigger value="preview">Visualização</TabsTrigger>
            <TabsTrigger value="details">Detalhes</TabsTrigger>
          </TabsList>
          
          <TabsContent value="preview" className="flex-1 overflow-auto">
            {renderFileContent()}
          </TabsContent>
          
          <TabsContent value="details" className="flex-1 overflow-auto p-2">
            {renderFileDetails()}
          </TabsContent>
        </Tabs>
        
        <DialogFooter className="mt-4 border-t pt-4">
          <Button variant="outline" onClick={onClose}>
            Fechar
          </Button>
          <Button onClick={handleDownload}>
            <Download className="mr-2 h-4 w-4" />
            Download
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}