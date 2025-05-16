import React, { useState, useEffect } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import Spreadsheet from 'react-spreadsheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { 
  ChevronLeft, 
  ChevronRight, 
  Download, 
  ZoomIn, 
  ZoomOut, 
  X, 
  Share, 
  Star,
  Printer,
  Eye,
  Info,
  RotateCw
} from 'lucide-react';
import { cn, formatFileSize } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// Configurar worker para PDF.js
pdfjs.GlobalWorkerOptions.workerSrc = 
  `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

interface FileViewerProps {
  file: {
    id: number | string;
    name: string;
    url: string;
    type: string;
    size?: number;
    uploadedAt?: string;
    uploadedBy?: string;
    description?: string;
    entity?: {
      type: 'client' | 'project' | 'task';
      id: number | string;
      name: string;
    };
  };
  onClose: () => void;
  onDownload: () => void;
  onShare?: () => void;
  onToggleFavorite?: () => void;
  isFavorite?: boolean;
}

const FileViewer: React.FC<FileViewerProps> = ({ 
  file, 
  onClose, 
  onDownload, 
  onShare,
  onToggleFavorite,
  isFavorite = false
}) => {
  const [numPages, setNumPages] = useState<number | null>(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [scale, setScale] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('preview');
  const [error, setError] = useState<string | null>(null);
  const [rotation, setRotation] = useState(0);

  useEffect(() => {
    setIsLoading(true);
    setError(null);
    setPageNumber(1);
    setScale(1);
    setRotation(0);
  }, [file]);

  const handleDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setIsLoading(false);
  };

  const handleDocumentLoadError = (error: Error) => {
    console.error('Erro ao carregar PDF:', error);
    setError(`Não foi possível carregar o arquivo: ${error.message}`);
    setIsLoading(false);
  };

  const handlePrevPage = () => {
    setPageNumber(prev => Math.max(prev - 1, 1));
  };

  const handleNextPage = () => {
    if (numPages) {
      setPageNumber(prev => Math.min(prev + 1, numPages));
    }
  };

  const handleZoomIn = () => {
    setScale(prev => Math.min(prev + 0.2, 3));
  };

  const handleZoomOut = () => {
    setScale(prev => Math.max(prev - 0.2, 0.5));
  };

  const handleRotate = () => {
    setRotation(prev => (prev + 90) % 360);
  };

  const renderThumbnails = () => {
    if (!numPages) return null;
    
    const thumbnails = [];
    for (let i = 1; i <= Math.min(numPages, 20); i++) {
      thumbnails.push(
        <div 
          key={i} 
          className={cn(
            "relative cursor-pointer p-1 border rounded mb-2",
            pageNumber === i ? "border-primary" : "border-gray-200 hover:border-gray-300"
          )}
          onClick={() => setPageNumber(i)}
        >
          <Document file={file.url}>
            <Page 
              pageNumber={i} 
              width={80} 
              renderTextLayer={false}
              renderAnnotationLayer={false}
            />
          </Document>
          <div className="absolute bottom-0 right-0 text-xs bg-white px-1 rounded-sm">
            {i}
          </div>
        </div>
      );
    }
    
    return (
      <div className="w-24 flex-shrink-0 overflow-y-auto">
        {thumbnails}
      </div>
    );
  };

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="flex items-center justify-center h-96">
          <Skeleton className="h-96 w-full" />
        </div>
      );
    }
    
    if (error) {
      return (
        <div className="flex flex-col items-center justify-center h-96 text-center p-6">
          <div className="text-red-500 mb-4">
            <X className="h-16 w-16 mx-auto mb-2" />
            <h3 className="text-lg font-medium">Erro ao abrir o arquivo</h3>
          </div>
          <p className="text-sm text-gray-500 mb-4">{error}</p>
          <Button variant="outline" onClick={onDownload}>
            <Download className="h-4 w-4 mr-2" />
            Baixar arquivo original
          </Button>
        </div>
      );
    }
    
    if (file.type.startsWith('image/')) {
      return (
        <div className="flex justify-center p-4 bg-gray-100 dark:bg-gray-800 rounded-md overflow-hidden">
          <img 
            src={file.url} 
            alt={file.name} 
            className="max-w-full max-h-[70vh] object-contain"
            style={{ transform: `scale(${scale}) rotate(${rotation}deg)` }}
          />
        </div>
      );
    }
    
    if (file.type === 'application/pdf') {
      return (
        <div className="flex">
          {numPages && numPages > 1 && renderThumbnails()}
          
          <div className="flex-grow bg-gray-100 dark:bg-gray-800 rounded-md overflow-auto">
            <Document
              file={file.url}
              onLoadSuccess={handleDocumentLoadSuccess}
              onLoadError={handleDocumentLoadError}
              className="flex justify-center p-4"
            >
              <Page 
                pageNumber={pageNumber} 
                scale={scale} 
                rotate={rotation}
                className="shadow-lg"
              />
            </Document>
          </div>
        </div>
      );
    }
    
    if (file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
        file.type === 'application/vnd.ms-excel' ||
        file.type === 'text/csv') {
      return (
        <div className="p-4 bg-white rounded-md overflow-auto">
          <p className="text-center mb-4 text-sm text-gray-500">
            Visualização de planilha não disponível. Por favor, faça o download do arquivo para visualizá-lo.
          </p>
          <div className="flex justify-center">
            <Button onClick={onDownload} className="mr-2">
              <Download className="h-4 w-4 mr-2" />
              Download
            </Button>
          </div>
        </div>
      );
    }
    
    // Para outros tipos de arquivo
    return (
      <div className="flex flex-col items-center justify-center h-96 text-center p-6">
        <div className="text-gray-500 mb-4">
          <Eye className="h-16 w-16 mx-auto mb-2" />
          <h3 className="text-lg font-medium">Visualização não disponível</h3>
          <p className="text-sm text-gray-500 mb-4">
            O formato deste arquivo ({file.type || 'desconhecido'}) não pode ser visualizado diretamente.
          </p>
        </div>
        <Button onClick={onDownload}>
          <Download className="h-4 w-4 mr-2" />
          Baixar arquivo
        </Button>
      </div>
    );
  };

  const renderFileInfo = () => {
    return (
      <div className="p-4">
        <h3 className="text-lg font-medium mb-4">Informações do arquivo</h3>
        
        <div className="space-y-3">
          <div>
            <p className="text-sm text-gray-500">Nome</p>
            <p className="font-medium">{file.name}</p>
          </div>
          
          <div>
            <p className="text-sm text-gray-500">Tipo</p>
            <p>{file.type || 'Desconhecido'}</p>
          </div>
          
          <div>
            <p className="text-sm text-gray-500">Tamanho</p>
            <p>{file.size ? formatFileSize(file.size) : 'Desconhecido'}</p>
          </div>
          
          {file.uploadedAt && (
            <div>
              <p className="text-sm text-gray-500">Data de upload</p>
              <p>{format(new Date(file.uploadedAt), 'dd/MM/yyyy HH:mm', { locale: ptBR })}</p>
            </div>
          )}
          
          {file.uploadedBy && (
            <div>
              <p className="text-sm text-gray-500">Enviado por</p>
              <p>{file.uploadedBy}</p>
            </div>
          )}
          
          {file.entity && (
            <div>
              <p className="text-sm text-gray-500">
                {file.entity.type === 'client' ? 'Cliente' : 
                 file.entity.type === 'project' ? 'Projeto' : 'Tarefa'}
              </p>
              <p>{file.entity.name}</p>
            </div>
          )}
          
          {file.description && (
            <div>
              <p className="text-sm text-gray-500">Descrição</p>
              <p>{file.description}</p>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full max-h-[80vh]">
      <div className="flex items-center justify-between p-4 border-b">
        <h2 className="text-xl font-semibold truncate max-w-md">{file.name}</h2>
        
        <div className="flex items-center space-x-2">
          <Button variant="ghost" size="icon" onClick={onDownload} title="Download">
            <Download className="h-5 w-5" />
          </Button>
          
          {onShare && (
            <Button variant="ghost" size="icon" onClick={onShare} title="Compartilhar">
              <Share className="h-5 w-5" />
            </Button>
          )}
          
          {onToggleFavorite && (
            <Button variant="ghost" size="icon" onClick={onToggleFavorite} title={isFavorite ? "Remover dos favoritos" : "Adicionar aos favoritos"}>
              <Star className={cn("h-5 w-5", isFavorite && "fill-yellow-400 text-yellow-400")} />
            </Button>
          )}
          
          <Button variant="ghost" size="icon" onClick={onClose} title="Fechar">
            <X className="h-5 w-5" />
          </Button>
        </div>
      </div>
      
      <Tabs defaultValue="preview" className="flex-grow flex flex-col" value={activeTab} onValueChange={setActiveTab}>
        <div className="border-b px-4">
          <TabsList className="mt-2">
            <TabsTrigger value="preview">Visualização</TabsTrigger>
            <TabsTrigger value="info">Informações</TabsTrigger>
          </TabsList>
        </div>
        
        <TabsContent value="preview" className="flex-grow flex flex-col overflow-hidden p-4">
          {file.type === 'application/pdf' && (
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handlePrevPage} 
                  disabled={pageNumber <= 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="mx-2 text-sm">
                  Página {pageNumber} de {numPages || '--'}
                </span>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleNextPage} 
                  disabled={numPages === null || pageNumber >= numPages}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
              
              <div className="flex items-center">
                <Button variant="outline" size="sm" onClick={handleZoomOut} className="mr-1">
                  <ZoomOut className="h-4 w-4" />
                </Button>
                <span className="mx-1 text-sm">{Math.round(scale * 100)}%</span>
                <Button variant="outline" size="sm" onClick={handleZoomIn} className="ml-1">
                  <ZoomIn className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm" onClick={handleRotate} className="ml-2">
                  <RotateCw className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
          
          <div className="flex-grow overflow-auto">
            <ScrollArea className="h-full">
              {renderContent()}
            </ScrollArea>
          </div>
        </TabsContent>
        
        <TabsContent value="info" className="flex-grow overflow-auto">
          <ScrollArea className="h-full">
            {renderFileInfo()}
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default FileViewer;