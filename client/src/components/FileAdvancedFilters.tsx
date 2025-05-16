import React, { useState } from 'react';
import { Filter, X, CalendarIcon, UserIcon, FileIcon, ArrowUpDown, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Calendar } from '@/components/ui/calendar';
import { formatFileSize } from '@/lib/utils';

interface FilterOptions {
  fileType?: string[];
  dateRange?: {
    from?: Date;
    to?: Date;
  };
  sizeRange?: {
    min?: number; // bytes
    max?: number; // bytes
  };
  uploadedBy?: number[];
  entities?: {
    clients?: number[];
    projects?: number[];
    tasks?: number[];
  };
  searchInContent?: boolean;
  tags?: string[];
}

interface GroupingOption {
  value: 'none' | 'date' | 'month' | 'client' | 'project' | 'type' | 'uploader';
  label: string;
}

interface FileAdvancedFiltersProps {
  filterOptions: FilterOptions;
  onFilterChange: (options: FilterOptions) => void;
  groupBy: GroupingOption['value'];
  onGroupChange: (option: GroupingOption['value']) => void;
  clients: any[];
  projects: any[];
  tasks: any[];
  users: any[];
  availableTags: string[];
}

const fileSizePresets = [
  { label: 'Qualquer tamanho', min: undefined, max: undefined },
  { label: 'Pequeno (< 1MB)', min: 0, max: 1024 * 1024 },
  { label: 'Médio (1MB - 10MB)', min: 1024 * 1024, max: 10 * 1024 * 1024 },
  { label: 'Grande (> 10MB)', min: 10 * 1024 * 1024, max: undefined },
];

const fileTypeGroups = [
  { 
    label: 'Documentos', 
    types: [
      'application/pdf', 
      'application/msword', 
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.oasis.opendocument.text',
      'text/plain'
    ]
  },
  { 
    label: 'Planilhas', 
    types: [
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.oasis.opendocument.spreadsheet',
      'text/csv'
    ]
  },
  { 
    label: 'Apresentações', 
    types: [
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'application/vnd.oasis.opendocument.presentation'
    ]
  },
  { 
    label: 'Imagens', 
    types: [
      'image/jpeg', 
      'image/png', 
      'image/gif', 
      'image/svg+xml', 
      'image/webp',
      'image/tiff'
    ]
  },
  { 
    label: 'Áudio', 
    types: [
      'audio/mpeg', 
      'audio/wav', 
      'audio/ogg', 
      'audio/webm'
    ]
  },
  { 
    label: 'Vídeo', 
    types: [
      'video/mp4', 
      'video/webm', 
      'video/ogg'
    ]
  },
  { 
    label: 'Arquivos Compactados', 
    types: [
      'application/zip', 
      'application/x-rar-compressed', 
      'application/x-7z-compressed',
      'application/gzip'
    ]
  }
];

const groupingOptions: GroupingOption[] = [
  { value: 'none', label: 'Sem agrupamento' },
  { value: 'date', label: 'Por data (dia)' },
  { value: 'month', label: 'Por mês' },
  { value: 'client', label: 'Por cliente' },
  { value: 'project', label: 'Por projeto' },
  { value: 'type', label: 'Por tipo de arquivo' },
  { value: 'uploader', label: 'Por usuário' },
];

const FileAdvancedFilters: React.FC<FileAdvancedFiltersProps> = ({
  filterOptions,
  onFilterChange,
  groupBy,
  onGroupChange,
  clients,
  projects,
  tasks,
  users,
  availableTags
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [localFilters, setLocalFilters] = useState<FilterOptions>(filterOptions);
  
  const countActiveFilters = () => {
    let count = 0;
    
    if (filterOptions.fileType && filterOptions.fileType.length > 0) count++;
    if (filterOptions.dateRange?.from || filterOptions.dateRange?.to) count++;
    if (filterOptions.sizeRange?.min !== undefined || filterOptions.sizeRange?.max !== undefined) count++;
    if (filterOptions.uploadedBy && filterOptions.uploadedBy.length > 0) count++;
    if (filterOptions.entities?.clients && filterOptions.entities.clients.length > 0) count++;
    if (filterOptions.entities?.projects && filterOptions.entities.projects.length > 0) count++;
    if (filterOptions.entities?.tasks && filterOptions.entities.tasks.length > 0) count++;
    if (filterOptions.searchInContent) count++;
    if (filterOptions.tags && filterOptions.tags.length > 0) count++;
    
    return count;
  };
  
  const handleApplyFilters = () => {
    onFilterChange(localFilters);
    setIsOpen(false);
  };
  
  const handleResetFilters = () => {
    const emptyFilters: FilterOptions = {};
    setLocalFilters(emptyFilters);
    onFilterChange(emptyFilters);
  };
  
  const handleRemoveFilter = (filterType: keyof FilterOptions) => {
    const newFilters = { ...filterOptions };
    delete newFilters[filterType];
    onFilterChange(newFilters);
  };
  
  return (
    <div className="mb-4">
      <div className="flex flex-col sm:flex-row gap-2 mb-2">
        <Popover open={isOpen} onOpenChange={setIsOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" className="flex items-center gap-1">
              <Filter className="h-4 w-4" />
              <span>Filtros</span>
              {countActiveFilters() > 0 && (
                <Badge variant="secondary" className="ml-1 h-5 px-1.5">
                  {countActiveFilters()}
                </Badge>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80 max-h-[80vh] overflow-y-auto" align="start">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-medium">Filtros avançados</h4>
                <Button variant="ghost" size="sm" onClick={handleResetFilters}>
                  Limpar tudo
                </Button>
              </div>
              
              <Separator />
              
              {/* Filtro de tipo de arquivo */}
              <div>
                <h5 className="text-sm font-medium mb-2">Tipo de arquivo</h5>
                <ScrollArea className="h-32">
                  <div className="space-y-2">
                    {fileTypeGroups.map(group => (
                      <div key={group.label} className="space-y-1">
                        <Label className="text-xs text-gray-500">{group.label}</Label>
                        {group.types.map(type => (
                          <div key={type} className="flex items-center">
                            <input
                              type="checkbox"
                              id={`filetype-${type}`}
                              className="mr-2"
                              checked={localFilters.fileType?.includes(type) || false}
                              onChange={(e) => {
                                const newTypes = localFilters.fileType || [];
                                if (e.target.checked) {
                                  setLocalFilters({
                                    ...localFilters,
                                    fileType: [...newTypes, type]
                                  });
                                } else {
                                  setLocalFilters({
                                    ...localFilters,
                                    fileType: newTypes.filter(t => t !== type)
                                  });
                                }
                              }}
                            />
                            <Label htmlFor={`filetype-${type}`} className="text-xs cursor-pointer">
                              {type.split('/')[1]}
                            </Label>
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
              
              <Separator />
              
              {/* Filtro de data */}
              <div>
                <h5 className="text-sm font-medium mb-2">Data de upload</h5>
                <div className="grid gap-2">
                  <div className="flex flex-col space-y-1">
                    <Label className="text-xs">De</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          className="justify-start text-left font-normal"
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {localFilters.dateRange?.from ? (
                            new Date(localFilters.dateRange.from).toLocaleDateString()
                          ) : (
                            <span>Selecionar data</span>
                          )}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={localFilters.dateRange?.from}
                          onSelect={(date) => {
                            setLocalFilters({
                              ...localFilters,
                              dateRange: {
                                ...localFilters.dateRange,
                                from: date || undefined
                              }
                            });
                          }}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                  
                  <div className="flex flex-col space-y-1">
                    <Label className="text-xs">Até</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          className="justify-start text-left font-normal"
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {localFilters.dateRange?.to ? (
                            new Date(localFilters.dateRange.to).toLocaleDateString()
                          ) : (
                            <span>Selecionar data</span>
                          )}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={localFilters.dateRange?.to}
                          onSelect={(date) => {
                            setLocalFilters({
                              ...localFilters,
                              dateRange: {
                                ...localFilters.dateRange,
                                to: date || undefined
                              }
                            });
                          }}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
              </div>
              
              <Separator />
              
              {/* Filtro de tamanho */}
              <div>
                <h5 className="text-sm font-medium mb-2">Tamanho do arquivo</h5>
                <Select
                  value={
                    localFilters.sizeRange?.min !== undefined || localFilters.sizeRange?.max !== undefined
                      ? `${localFilters.sizeRange?.min || 0}-${localFilters.sizeRange?.max || 'max'}`
                      : "any"
                  }
                  onValueChange={(value) => {
                    if (value === "any") {
                      setLocalFilters({
                        ...localFilters,
                        sizeRange: undefined
                      });
                    } else {
                      const [min, max] = value.split('-');
                      setLocalFilters({
                        ...localFilters,
                        sizeRange: {
                          min: min === '0' ? 0 : parseInt(min),
                          max: max === 'max' ? undefined : parseInt(max)
                        }
                      });
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Qualquer tamanho" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="any">Qualquer tamanho</SelectItem>
                    <SelectItem value="0-1048576">Pequeno (&lt; 1MB)</SelectItem>
                    <SelectItem value="1048576-10485760">Médio (1MB - 10MB)</SelectItem>
                    <SelectItem value="10485760-max">Grande (&gt; 10MB)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <Separator />
              
              {/* Filtro de usuário */}
              <div>
                <h5 className="text-sm font-medium mb-2">Enviado por</h5>
                <Select
                  value={localFilters.uploadedBy?.length === 1 ? localFilters.uploadedBy[0].toString() : ""}
                  onValueChange={(value) => {
                    if (value) {
                      setLocalFilters({
                        ...localFilters,
                        uploadedBy: [parseInt(value)]
                      });
                    } else {
                      setLocalFilters({
                        ...localFilters,
                        uploadedBy: undefined
                      });
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Qualquer usuário" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Qualquer usuário</SelectItem>
                    {users.map(user => (
                      <SelectItem key={user.id} value={user.id.toString()}>
                        {user.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <Separator />
              
              {/* Filtro de entidades */}
              <div>
                <h5 className="text-sm font-medium mb-2">Relacionado a</h5>
                <div className="space-y-2">
                  <div>
                    <Label className="text-xs">Cliente</Label>
                    <Select
                      value={
                        localFilters.entities?.clients?.length === 1 
                          ? localFilters.entities.clients[0].toString() 
                          : ""
                      }
                      onValueChange={(value) => {
                        if (value) {
                          setLocalFilters({
                            ...localFilters,
                            entities: {
                              ...localFilters.entities,
                              clients: [parseInt(value)]
                            }
                          });
                        } else {
                          const newEntities = {...localFilters.entities};
                          if (newEntities.clients) delete newEntities.clients;
                          setLocalFilters({
                            ...localFilters,
                            entities: newEntities
                          });
                        }
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Qualquer cliente" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">Qualquer cliente</SelectItem>
                        {clients.map(client => (
                          <SelectItem key={client.id} value={client.id.toString()}>
                            {client.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label className="text-xs">Projeto</Label>
                    <Select
                      value={
                        localFilters.entities?.projects?.length === 1 
                          ? localFilters.entities.projects[0].toString() 
                          : ""
                      }
                      onValueChange={(value) => {
                        if (value) {
                          setLocalFilters({
                            ...localFilters,
                            entities: {
                              ...localFilters.entities,
                              projects: [parseInt(value)]
                            }
                          });
                        } else {
                          const newEntities = {...localFilters.entities};
                          if (newEntities.projects) delete newEntities.projects;
                          setLocalFilters({
                            ...localFilters,
                            entities: newEntities
                          });
                        }
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Qualquer projeto" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">Qualquer projeto</SelectItem>
                        {projects.map(project => (
                          <SelectItem key={project.id} value={project.id.toString()}>
                            {project.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
              
              <Separator />
              
              {/* Busca em conteúdo */}
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="search-content"
                  checked={localFilters.searchInContent || false}
                  onChange={(e) => {
                    setLocalFilters({
                      ...localFilters,
                      searchInContent: e.target.checked
                    });
                  }}
                />
                <Label htmlFor="search-content">Buscar dentro do conteúdo dos arquivos</Label>
              </div>
              
              {/* Tags */}
              {availableTags.length > 0 && (
                <>
                  <Separator />
                  <div>
                    <h5 className="text-sm font-medium mb-2">Tags</h5>
                    <div className="flex flex-wrap gap-2">
                      {availableTags.map(tag => (
                        <Badge 
                          key={tag}
                          variant={localFilters.tags?.includes(tag) ? "default" : "outline"}
                          className="cursor-pointer"
                          onClick={() => {
                            const currentTags = localFilters.tags || [];
                            if (currentTags.includes(tag)) {
                              setLocalFilters({
                                ...localFilters,
                                tags: currentTags.filter(t => t !== tag)
                              });
                            } else {
                              setLocalFilters({
                                ...localFilters,
                                tags: [...currentTags, tag]
                              });
                            }
                          }}
                        >
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </>
              )}
              
              <div className="flex justify-between pt-2">
                <Button variant="outline" size="sm" onClick={() => setIsOpen(false)}>
                  Cancelar
                </Button>
                <Button size="sm" onClick={handleApplyFilters}>
                  Aplicar filtros
                </Button>
              </div>
            </div>
          </PopoverContent>
        </Popover>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="flex items-center gap-1">
              <ArrowUpDown className="h-4 w-4" />
              <span>Agrupar por</span>
              <span className="ml-1 text-sm text-muted-foreground">
                {groupingOptions.find(option => option.value === groupBy)?.label || 'Sem agrupamento'}
              </span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuLabel>Opções de agrupamento</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {groupingOptions.map(option => (
              <DropdownMenuCheckboxItem
                key={option.value}
                checked={groupBy === option.value}
                onCheckedChange={() => onGroupChange(option.value)}
              >
                {option.label}
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      
      {/* Exibição dos filtros ativos */}
      {countActiveFilters() > 0 && (
        <div className="flex flex-wrap gap-2 mt-2">
          {filterOptions.fileType && filterOptions.fileType.length > 0 && (
            <Badge variant="secondary" className="flex items-center gap-1">
              <FileIcon className="h-3 w-3" />
              <span>
                {filterOptions.fileType.length === 1
                  ? `Tipo: ${filterOptions.fileType[0].split('/')[1]}`
                  : `${filterOptions.fileType.length} tipos`}
              </span>
              <X 
                className="h-3 w-3 ml-1 cursor-pointer" 
                onClick={() => handleRemoveFilter('fileType')}
              />
            </Badge>
          )}
          
          {(filterOptions.dateRange?.from || filterOptions.dateRange?.to) && (
            <Badge variant="secondary" className="flex items-center gap-1">
              <CalendarIcon className="h-3 w-3" />
              <span>
                {filterOptions.dateRange?.from && filterOptions.dateRange?.to
                  ? `${new Date(filterOptions.dateRange.from).toLocaleDateString()} - ${new Date(filterOptions.dateRange.to).toLocaleDateString()}`
                  : filterOptions.dateRange?.from
                  ? `A partir de ${new Date(filterOptions.dateRange.from).toLocaleDateString()}`
                  : `Até ${new Date(filterOptions.dateRange.to!).toLocaleDateString()}`}
              </span>
              <X 
                className="h-3 w-3 ml-1 cursor-pointer" 
                onClick={() => handleRemoveFilter('dateRange')}
              />
            </Badge>
          )}
          
          {(filterOptions.sizeRange?.min !== undefined || filterOptions.sizeRange?.max !== undefined) && (
            <Badge variant="secondary" className="flex items-center gap-1">
              <span>
                {filterOptions.sizeRange?.min !== undefined && filterOptions.sizeRange?.max !== undefined
                  ? `${formatFileSize(filterOptions.sizeRange.min)} - ${formatFileSize(filterOptions.sizeRange.max)}`
                  : filterOptions.sizeRange?.min !== undefined
                  ? `> ${formatFileSize(filterOptions.sizeRange.min)}`
                  : `< ${formatFileSize(filterOptions.sizeRange.max!)}`}
              </span>
              <X 
                className="h-3 w-3 ml-1 cursor-pointer" 
                onClick={() => handleRemoveFilter('sizeRange')}
              />
            </Badge>
          )}
          
          {filterOptions.uploadedBy && filterOptions.uploadedBy.length > 0 && (
            <Badge variant="secondary" className="flex items-center gap-1">
              <UserIcon className="h-3 w-3" />
              <span>
                {users.find(u => u.id === filterOptions.uploadedBy![0])?.name || 'Usuário'}
              </span>
              <X 
                className="h-3 w-3 ml-1 cursor-pointer" 
                onClick={() => handleRemoveFilter('uploadedBy')}
              />
            </Badge>
          )}
          
          {filterOptions.entities?.clients && filterOptions.entities.clients.length > 0 && (
            <Badge variant="secondary" className="flex items-center gap-1">
              <span>
                Cliente: {clients.find(c => c.id === filterOptions.entities?.clients![0])?.name || 'Cliente'}
              </span>
              <X 
                className="h-3 w-3 ml-1 cursor-pointer" 
                onClick={() => {
                  const newFilters = { ...filterOptions };
                  if (newFilters.entities) {
                    delete newFilters.entities.clients;
                    if (Object.keys(newFilters.entities).length === 0) {
                      delete newFilters.entities;
                    }
                  }
                  onFilterChange(newFilters);
                }}
              />
            </Badge>
          )}
          
          {filterOptions.entities?.projects && filterOptions.entities.projects.length > 0 && (
            <Badge variant="secondary" className="flex items-center gap-1">
              <span>
                Projeto: {projects.find(p => p.id === filterOptions.entities?.projects![0])?.name || 'Projeto'}
              </span>
              <X 
                className="h-3 w-3 ml-1 cursor-pointer" 
                onClick={() => {
                  const newFilters = { ...filterOptions };
                  if (newFilters.entities) {
                    delete newFilters.entities.projects;
                    if (Object.keys(newFilters.entities).length === 0) {
                      delete newFilters.entities;
                    }
                  }
                  onFilterChange(newFilters);
                }}
              />
            </Badge>
          )}
          
          {filterOptions.searchInContent && (
            <Badge variant="secondary" className="flex items-center gap-1">
              <span>Busca em conteúdo</span>
              <X 
                className="h-3 w-3 ml-1 cursor-pointer" 
                onClick={() => handleRemoveFilter('searchInContent')}
              />
            </Badge>
          )}
          
          {filterOptions.tags && filterOptions.tags.length > 0 && (
            <Badge variant="secondary" className="flex items-center gap-1">
              <span>
                {filterOptions.tags.length === 1
                  ? `Tag: ${filterOptions.tags[0]}`
                  : `${filterOptions.tags.length} tags`}
              </span>
              <X 
                className="h-3 w-3 ml-1 cursor-pointer" 
                onClick={() => handleRemoveFilter('tags')}
              />
            </Badge>
          )}
          
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-7 px-2 text-xs" 
            onClick={handleResetFilters}
          >
            Limpar todos
          </Button>
        </div>
      )}
    </div>
  );
};

export default FileAdvancedFilters;