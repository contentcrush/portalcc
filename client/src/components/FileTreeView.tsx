import React, { useState } from 'react';
import { ChevronRight, ChevronDown, Folder, File, Star, Clock, Calendar, Download, Trash2, Share, Eye, Star as StarFilled } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface TreeItem {
  id: string;
  name: string;
  type: 'client' | 'project' | 'task' | 'file';
  children?: TreeItem[];
  fileType?: string;
  fileSize?: number;
  uploadDate?: string;
  path?: string;
  isFavorite?: boolean;
  originalItem?: any;
}

interface TreeNodeProps {
  item: TreeItem;
  level: number;
  onSelect: (item: TreeItem) => void;
  selectedItems: TreeItem[];
  onToggleFavorite: (item: TreeItem) => void;
  onViewFile: (item: TreeItem) => void;
  onDownloadFile: (item: TreeItem) => void;
  onDeleteFile: (item: TreeItem) => void;
  onShareFile: (item: TreeItem) => void;
  onToggleExpand?: (item: TreeItem) => void;
  expandedNodes: Record<string, boolean>;
}

const TreeNode: React.FC<TreeNodeProps> = ({ 
  item, 
  level, 
  onSelect, 
  selectedItems, 
  onToggleFavorite, 
  onViewFile, 
  onDownloadFile, 
  onDeleteFile, 
  onShareFile,
  onToggleExpand,
  expandedNodes 
}) => {
  const isSelected = selectedItems.some(i => i.id === item.id);
  const isExpanded = expandedNodes[item.id] || false;
  const hasChildren = item.children && item.children.length > 0;
  const isFile = item.type === 'file';

  const handleToggleExpand = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onToggleExpand) {
      onToggleExpand(item);
    }
  };

  const handleSelect = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelect(item);
  };

  // Determine icon based on type
  const getIcon = () => {
    if (isFile) {
      return <File className="h-4 w-4 mr-2 text-blue-500" />;
    } else if (item.type === 'client') {
      return <Folder className="h-4 w-4 mr-2 text-yellow-500" />;
    } else if (item.type === 'project') {
      return <Folder className="h-4 w-4 mr-2 text-green-500" />;
    } else if (item.type === 'task') {
      return <Folder className="h-4 w-4 mr-2 text-purple-500" />;
    }
    return <Folder className="h-4 w-4 mr-2" />;
  };

  return (
    <div>
      <div 
        className={cn(
          "flex items-center py-1 px-2 rounded-md cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800",
          isSelected && "bg-primary/20 hover:bg-primary/30"
        )}
        style={{ paddingLeft: `${level * 12 + 4}px` }}
        onClick={handleSelect}
      >
        {hasChildren ? (
          <div className="mr-1" onClick={handleToggleExpand}>
            {isExpanded ? (
              <ChevronDown className="h-4 w-4 text-gray-500" />
            ) : (
              <ChevronRight className="h-4 w-4 text-gray-500" />
            )}
          </div>
        ) : (
          <div className="w-5"></div>
        )}
        
        {getIcon()}
        
        <span className="flex-grow truncate">{item.name}</span>
        
        {isFile && (
          <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={(e) => {
                    e.stopPropagation();
                    onViewFile(item);
                  }}>
                    <Eye className="h-3.5 w-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Visualizar</TooltipContent>
              </Tooltip>
            </TooltipProvider>
            
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={(e) => {
                    e.stopPropagation();
                    onDownloadFile(item);
                  }}>
                    <Download className="h-3.5 w-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Download</TooltipContent>
              </Tooltip>
            </TooltipProvider>
            
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={(e) => {
                    e.stopPropagation();
                    onToggleFavorite(item);
                  }}>
                    {item.isFavorite ? (
                      <StarFilled className="h-3.5 w-3.5 text-yellow-400 fill-yellow-400" />
                    ) : (
                      <Star className="h-3.5 w-3.5" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  {item.isFavorite ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={(e) => {
                    e.stopPropagation();
                    onShareFile(item);
                  }}>
                    <Share className="h-3.5 w-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Compartilhar</TooltipContent>
              </Tooltip>
            </TooltipProvider>
            
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={(e) => {
                    e.stopPropagation();
                    onDeleteFile(item);
                  }}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Excluir</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        )}
      </div>
      
      {isExpanded && hasChildren && (
        <div>
          {item.children!.map((child) => (
            <TreeNode
              key={child.id}
              item={child}
              level={level + 1}
              onSelect={onSelect}
              selectedItems={selectedItems}
              onToggleFavorite={onToggleFavorite}
              onViewFile={onViewFile}
              onDownloadFile={onDownloadFile}
              onDeleteFile={onDeleteFile}
              onShareFile={onShareFile}
              onToggleExpand={onToggleExpand}
              expandedNodes={expandedNodes}
            />
          ))}
        </div>
      )}
    </div>
  );
};

interface FileTreeViewProps {
  data: TreeItem[];
  onSelect: (item: TreeItem) => void;
  onToggleFavorite: (item: TreeItem) => void;
  onViewFile: (item: TreeItem) => void;
  onDownloadFile: (item: TreeItem) => void;
  onDeleteFile: (item: TreeItem) => void;
  onShareFile: (item: TreeItem) => void;
}

export const FileTreeView: React.FC<FileTreeViewProps> = ({
  data,
  onSelect,
  onToggleFavorite,
  onViewFile,
  onDownloadFile,
  onDeleteFile,
  onShareFile
}) => {
  const [selectedItems, setSelectedItems] = useState<TreeItem[]>([]);
  const [expandedNodes, setExpandedNodes] = useState<Record<string, boolean>>({});

  const handleSelect = (item: TreeItem) => {
    // Check if we're adding to selection (with Ctrl/Cmd key) or replacing
    const newSelectedItems = [...selectedItems];
    const index = newSelectedItems.findIndex(i => i.id === item.id);
    
    if (index >= 0) {
      newSelectedItems.splice(index, 1);
    } else {
      newSelectedItems.push(item);
    }
    
    setSelectedItems(newSelectedItems);
    onSelect(item);
  };

  const handleToggleExpand = (item: TreeItem) => {
    setExpandedNodes(prev => ({
      ...prev,
      [item.id]: !prev[item.id]
    }));
  };

  return (
    <div className="border rounded p-2 overflow-auto max-h-[calc(100vh-300px)]">
      {data.map((item) => (
        <TreeNode
          key={item.id}
          item={item}
          level={0}
          onSelect={handleSelect}
          selectedItems={selectedItems}
          onToggleFavorite={onToggleFavorite}
          onViewFile={onViewFile}
          onDownloadFile={onDownloadFile}
          onDeleteFile={onDeleteFile}
          onShareFile={onShareFile}
          onToggleExpand={handleToggleExpand}
          expandedNodes={expandedNodes}
        />
      ))}
    </div>
  );
};

export const transformDataToTree = (
  clients: any[],
  projects: any[],
  tasks: any[],
  attachments: any[]
): TreeItem[] => {
  const clientMap = new Map();
  const projectMap = new Map();
  const taskMap = new Map();
  
  // Create client nodes
  clients.forEach(client => {
    clientMap.set(client.id, {
      id: `client-${client.id}`,
      name: client.name,
      type: 'client',
      children: [],
      originalItem: client
    });
  });
  
  // Create project nodes and link to clients
  projects.forEach(project => {
    const projectNode = {
      id: `project-${project.id}`,
      name: project.name,
      type: 'project',
      children: [],
      originalItem: project
    };
    
    projectMap.set(project.id, projectNode);
    
    // Add project to client's children
    const clientNode = clientMap.get(project.client_id);
    if (clientNode) {
      clientNode.children.push(projectNode);
    }
  });
  
  // Create task nodes and link to projects
  tasks.forEach(task => {
    const taskNode = {
      id: `task-${task.id}`,
      name: task.title,
      type: 'task',
      children: [],
      originalItem: task
    };
    
    taskMap.set(task.id, taskNode);
    
    // Add task to project's children
    const projectNode = projectMap.get(task.project_id);
    if (projectNode) {
      projectNode.children.push(taskNode);
    }
  });
  
  // Add attachments to their respective parents
  attachments.forEach(attachment => {
    const fileNode = {
      id: `file-${attachment.id}-${attachment.type}`,
      name: attachment.file_name,
      type: 'file',
      fileType: attachment.file_type,
      fileSize: attachment.file_size,
      uploadDate: attachment.uploaded_at,
      path: attachment.file_url,
      isFavorite: attachment.isFavorite || false,
      originalItem: attachment
    };
    
    if (attachment.type === 'client' && clientMap.has(attachment.entity_id)) {
      clientMap.get(attachment.entity_id).children.push(fileNode);
    } else if (attachment.type === 'project' && projectMap.has(attachment.entity_id)) {
      projectMap.get(attachment.entity_id).children.push(fileNode);
    } else if (attachment.type === 'task' && taskMap.has(attachment.entity_id)) {
      taskMap.get(attachment.entity_id).children.push(fileNode);
    }
  });
  
  // Convert the client map to an array
  return Array.from(clientMap.values());
};

export default FileTreeView;