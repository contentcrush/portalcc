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
    window.open(doc.downloadUrl, '_blank');
  };

  return (
    <Card className={className}>
      <CardHeader className="px-6 py-4 flex flex-row items-center justify-between">
        <CardTitle className="text-lg font-medium text-gray-700">{title}</CardTitle>
        {(viewAllHref || onViewAll) && (
          <Button 
            variant="link" 
            className="text-sm font-medium text-primary px-0"
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
      </CardHeader>
      
      <CardContent className="px-6 pb-4 pt-0 space-y-4">
        {displayDocuments.length > 0 ? (
          displayDocuments.map((doc) => (
            <div key={doc.id} className="flex items-center justify-between">
              <div className="flex items-center">
                <div className={`${getFileColor(doc.type)} rounded-md p-2 mr-3 ${getFileTextColor(doc.type)}`}>
                  {getFileIcon(doc.type)}
                </div>
                <div>
                  <p className="font-medium text-sm">{doc.name}</p>
                  <p className="text-sm text-gray-500">{doc.size}</p>
                </div>
              </div>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => handleDownload(doc)}
                className="hover:bg-gray-100"
              >
                <Download className="h-5 w-5" />
              </Button>
            </div>
          ))
        ) : (
          <div className="text-center py-6 text-gray-500">
            Nenhum documento encontrado
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default RecentDocuments;