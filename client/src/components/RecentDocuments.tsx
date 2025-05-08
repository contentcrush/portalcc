import { FC } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, FileSpreadsheet, FileImage, Download, File } from 'lucide-react';

interface Document {
  id: string;
  name: string;
  size: string;
  type: string;
  downloadUrl: string;
}

interface RecentDocumentsProps {
  documents: Document[];
  maxItems?: number;
  title?: string;
  viewAllHref?: string;
  onViewAll?: () => void;
  className?: string;
}

/**
 * Componente que exibe uma lista de documentos recentes
 */
const RecentDocuments: FC<RecentDocumentsProps> = ({
  documents,
  maxItems = 4,
  title = "DOCUMENTOS RECENTES",
  viewAllHref,
  onViewAll,
  className = "",
}) => {
  // Limitar o número de documentos mostrados
  const displayDocuments = documents.slice(0, maxItems);

  // Determinar o ícone baseado no tipo de arquivo
  const getFileIcon = (type: string) => {
    const iconClassName = "h-5 w-5";
    
    if (type.includes('excel') || type.includes('spreadsheet') || type.endsWith('.xlsx') || type.endsWith('.xls')) {
      return <FileSpreadsheet className={iconClassName} />;
    }
    
    if (type.includes('image') || type.includes('jpg') || type.includes('jpeg') || type.includes('png') || type.includes('gif')) {
      return <FileImage className={iconClassName} />;
    }
    
    if (type.includes('pdf')) {
      return <FileText className={iconClassName} />;
    }
    
    if (type.includes('document') || type.includes('doc') || type.includes('docx')) {
      return <FileText className={iconClassName} />;
    }
    
    return <File className={iconClassName} />;
  };

  // Determinar a cor de fundo baseada no tipo de arquivo
  const getFileColor = (type: string) => {
    if (type.includes('pdf') || type.endsWith('.pdf')) {
      return "bg-red-100";
    }
    if (type.includes('excel') || type.includes('spreadsheet') || type.endsWith('.xlsx') || type.endsWith('.xls')) {
      return "bg-green-100";
    }
    if (type.includes('word') || type.includes('document') || type.endsWith('.docx') || type.endsWith('.doc')) {
      return "bg-blue-100";
    }
    if (type.includes('presentation') || type.endsWith('.pptx') || type.endsWith('.ppt')) {
      return "bg-yellow-100";
    }
    
    return "bg-gray-100";
  };
  
  const getFileTextColor = (type: string) => {
    if (type.includes('pdf') || type.endsWith('.pdf')) {
      return "text-red-500";
    }
    if (type.includes('excel') || type.includes('spreadsheet') || type.endsWith('.xlsx') || type.endsWith('.xls')) {
      return "text-green-500";
    }
    if (type.includes('word') || type.includes('document') || type.endsWith('.docx') || type.endsWith('.doc')) {
      return "text-blue-500";
    }
    if (type.includes('presentation') || type.endsWith('.pptx') || type.endsWith('.ppt')) {
      return "text-yellow-500";
    }
    
    return "text-gray-500";
  };

  // Função de download
  const handleDownload = (doc: Document) => {
    // Se o documento tiver uma URL válida, abra em nova aba; caso contrário, exiba uma mensagem
    if (doc.downloadUrl && doc.downloadUrl !== '#') {
      window.open(doc.downloadUrl, '_blank');
    } else {
      // Em uma implementação real, você poderia usar um toast aqui
      console.log('URL de download não disponível para este documento');
    }
  };

  return (
    <Card className={className}>
      <CardHeader className="px-6 py-4">
        <div className="flex justify-between items-center">
          <CardTitle className="text-sm font-medium uppercase text-gray-500">{title}</CardTitle>
          {(viewAllHref || onViewAll) && (
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-8 text-xs"
              onClick={onViewAll}
              asChild={!!viewAllHref}
            >
              {viewAllHref ? (
                <a href={viewAllHref}>Ver todos</a>
              ) : (
                "Ver todos"
              )}
            </Button>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="px-6 pb-4 pt-0 space-y-3">
        {displayDocuments.length > 0 ? (
          displayDocuments.map((doc) => (
            <div key={doc.id} className="flex items-center justify-between py-1.5">
              <div className="flex items-center">
                <div className={`${getFileColor(doc.type)} ${getFileTextColor(doc.type)} p-1.5 rounded mr-3`}>
                  {getFileIcon(doc.type)}
                </div>
                <div>
                  <p className="font-medium text-sm">{doc.name}</p>
                  <p className="text-xs text-gray-500">{doc.size}</p>
                </div>
              </div>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => handleDownload(doc)}
                className="h-8 w-8 hover:bg-gray-100"
              >
                <Download className="h-4 w-4" />
              </Button>
            </div>
          ))
        ) : (
          <div className="flex flex-col items-center justify-center py-8 text-gray-500">
            <FileText className="h-12 w-12 mb-2 text-gray-300" />
            <p>Nenhum documento encontrado</p>
            <p className="text-xs text-gray-400 mt-1">Adicione documentos financeiros para visualizá-los aqui</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default RecentDocuments;