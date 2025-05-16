import React from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Star, Clock, FileIcon, FileText, FileImage, FileSpreadsheet, FileArchive, FileAudio, FileVideo, MoreHorizontal, Eye, Download, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { formatFileSize, cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface FileItem {
  id: number | string;
  name: string;
  type: string;
  fileType: string;
  size: number;
  entity: {
    type: 'client' | 'project' | 'task';
    id: number | string;
    name: string;
  };
  url: string;
  uploadedAt: string;
  uploadedBy?: string;
  isFavorite?: boolean;
}

interface FileRecentsAndFavoritesProps {
  recentFiles: FileItem[];
  favoriteFiles: FileItem[];
  onView: (file: FileItem) => void;
  onDownload: (file: FileItem) => void;
  onDelete: (file: FileItem) => void;
  onToggleFavorite: (file: FileItem) => void;
}

// Função para obter o ícone do arquivo com base no tipo MIME
const getFileIcon = (fileType: string) => {
  if (fileType.startsWith('image/')) {
    return <FileImage className="h-10 w-10 text-blue-500" />;
  } else if (fileType === 'application/pdf') {
    return <FileText className="h-10 w-10 text-red-500" />;
  } else if (
    fileType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
    fileType === 'application/vnd.ms-excel' ||
    fileType === 'text/csv'
  ) {
    return <FileSpreadsheet className="h-10 w-10 text-green-500" />;
  } else if (
    fileType === 'application/zip' ||
    fileType === 'application/x-zip-compressed' ||
    fileType === 'application/x-rar-compressed'
  ) {
    return <FileArchive className="h-10 w-10 text-orange-500" />;
  } else if (fileType.startsWith('audio/')) {
    return <FileAudio className="h-10 w-10 text-purple-500" />;
  } else if (fileType.startsWith('video/')) {
    return <FileVideo className="h-10 w-10 text-pink-500" />;
  } else {
    return <FileIcon className="h-10 w-10 text-gray-500" />;
  }
};

// Componente de card individual para um arquivo
const FileCard: React.FC<{
  file: FileItem;
  onView: (file: FileItem) => void;
  onDownload: (file: FileItem) => void;
  onDelete: (file: FileItem) => void;
  onToggleFavorite: (file: FileItem) => void;
}> = ({ file, onView, onDownload, onDelete, onToggleFavorite }) => {
  return (
    <Card className="overflow-hidden hover:shadow-md transition-all group">
      <div className="relative">
        <div className="w-full aspect-square flex items-center justify-center bg-gray-50 dark:bg-gray-800">
          {file.fileType.startsWith('image/') ? (
            <img 
              src={file.url} 
              alt={file.name}
              className="object-cover w-full h-full"
            />
          ) : (
            <div className="flex items-center justify-center w-full h-full">
              {getFileIcon(file.fileType)}
            </div>
          )}
        </div>
        
        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8 bg-black/20 text-white hover:bg-black/40 rounded-full"
            onClick={() => onToggleFavorite(file)}
          >
            <Star className={cn("h-4 w-4", file.isFavorite && "fill-yellow-400")} />
          </Button>
        </div>
      </div>
      
      <CardHeader className="p-3 pb-2">
        <CardTitle className="text-sm font-medium truncate" title={file.name}>
          {file.name}
        </CardTitle>
        <CardDescription className="text-xs truncate">
          {formatFileSize(file.size)} · {format(new Date(file.uploadedAt), 'dd/MM/yyyy', { locale: ptBR })}
        </CardDescription>
      </CardHeader>
      
      <CardFooter className="p-3 pt-0 flex items-center justify-between">
        <Badge variant="outline" className="text-xs">
          {file.entity.type === 'client' ? 'Cliente' : 
           file.entity.type === 'project' ? 'Projeto' : 'Tarefa'}
        </Badge>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onView(file)}>
              <Eye className="mr-2 h-4 w-4" />
              <span>Visualizar</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onDownload(file)}>
              <Download className="mr-2 h-4 w-4" />
              <span>Download</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => onDelete(file)} className="text-red-600">
              <Trash2 className="mr-2 h-4 w-4" />
              <span>Excluir</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </CardFooter>
    </Card>
  );
};

const EmptyState: React.FC<{ message: string; icon?: React.ReactNode }> = ({ message, icon }) => (
  <div className="flex flex-col items-center justify-center p-8 text-center">
    {icon || <FileIcon className="h-10 w-10 text-gray-400 mb-2" />}
    <p className="text-sm text-gray-500">{message}</p>
  </div>
);

const FileRecentsAndFavorites: React.FC<FileRecentsAndFavoritesProps> = ({
  recentFiles,
  favoriteFiles,
  onView,
  onDownload,
  onDelete,
  onToggleFavorite
}) => {
  return (
    <Tabs defaultValue="recents" className="w-full">
      <div className="flex items-center justify-between mb-4">
        <TabsList>
          <TabsTrigger value="recents" className="flex items-center">
            <Clock className="h-4 w-4 mr-2" />
            Recentes
          </TabsTrigger>
          <TabsTrigger value="favorites" className="flex items-center">
            <Star className="h-4 w-4 mr-2" />
            Favoritos
          </TabsTrigger>
        </TabsList>
      </div>
      
      <TabsContent value="recents">
        <ScrollArea className="max-h-[300px]">
          {recentFiles.length === 0 ? (
            <EmptyState 
              message="Nenhum arquivo recente" 
              icon={<Clock className="h-10 w-10 text-gray-400 mb-2" />} 
            />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {recentFiles.map((file) => (
                <FileCard
                  key={`${file.id}-${file.type}`}
                  file={file}
                  onView={onView}
                  onDownload={onDownload}
                  onDelete={onDelete}
                  onToggleFavorite={onToggleFavorite}
                />
              ))}
            </div>
          )}
        </ScrollArea>
      </TabsContent>
      
      <TabsContent value="favorites">
        <ScrollArea className="max-h-[300px]">
          {favoriteFiles.length === 0 ? (
            <EmptyState 
              message="Nenhum arquivo favorito" 
              icon={<Star className="h-10 w-10 text-gray-400 mb-2" />} 
            />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {favoriteFiles.map((file) => (
                <FileCard
                  key={`${file.id}-${file.type}`}
                  file={file}
                  onView={onView}
                  onDownload={onDownload}
                  onDelete={onDelete}
                  onToggleFavorite={onToggleFavorite}
                />
              ))}
            </div>
          )}
        </ScrollArea>
      </TabsContent>
    </Tabs>
  );
};

export default FileRecentsAndFavorites;